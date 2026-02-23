import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: _authUser }, error: _authErr } = await _authClient.auth.getUser();
    if (_authErr || !_authUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { tema, pastor, textoBase, arquivoPath, dataCulto } = await req.json();

    if (!tema || !pastor || !textoBase) {
      return new Response(
        JSON.stringify({ error: "Tema, pastor e texto base são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch upcoming events for "avisos importantes" - only cultos, impactos, manains
    const today = new Date().toISOString().split("T")[0];
    const { data: eventos } = await supabaseAdmin
      .from("agenda_igreja")
      .select("titulo, data_evento, hora_inicio, local, tipo_evento")
      .gte("data_evento", today)
      .eq("ativo", true)
      .in("tipo_evento", ["culto", "impacto", "manaim"])
      .order("data_evento", { ascending: true })
      .limit(2);

    // Fetch weekly schedule - only cultos, impactos, manains
    const { data: programacao } = await supabaseAdmin
      .from("agenda_igreja")
      .select("titulo, data_evento, hora_inicio, local, tipo_evento")
      .gte("data_evento", today)
      .eq("ativo", true)
      .eq("recorrente", true)
      .in("tipo_evento", ["culto", "impacto", "manaim"])
      .order("data_evento", { ascending: true })
      .limit(10);

    let fileContent = "";
    
    // If there's an uploaded file, download and encode it
    if (arquivoPath) {
      const { data: fileData, error: fileError } = await supabaseAdmin
        .storage
        .from("cr-express-files")
        .download(arquivoPath);

      if (fileError) {
        console.error("Error downloading file:", fileError);
      } else if (fileData) {
        const buffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Convert to base64 in chunks to avoid stack overflow
        const chunkSize = 8192;
        let binary = "";
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
        }
        const base64 = btoa(binary);
        
        // Determine mime type
        const ext = arquivoPath.split(".").pop()?.toLowerCase();
        let mimeType = "application/octet-stream";
        if (ext === "pdf") mimeType = "application/pdf";
        else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (ext === "doc") mimeType = "application/msword";
        else if (ext === "pptx") mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        else if (ext === "ppt") mimeType = "application/vnd.ms-powerpoint";
        else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
        else if (ext === "png") mimeType = "image/png";

        fileContent = `data:${mimeType};base64,${base64}`;
      }
    }

    // Helper to format date YYYY-MM-DD -> DD/MM/AAAA
    const formatDateBR = (d: string) => {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    };

    const eventosText = eventos?.map(e => 
      `- ${e.titulo} em ${formatDateBR(e.data_evento)}${e.hora_inicio ? ` às ${e.hora_inicio.substring(0, 5)}` : ""}${e.local ? ` no ${e.local}` : ""}`
    ).join("\n") || "Nenhum evento próximo.";

    const programacaoText = programacao?.map(e =>
      `- ${e.titulo} (${e.tipo_evento}) em ${formatDateBR(e.data_evento)}${e.hora_inicio ? ` às ${e.hora_inicio.substring(0, 5)}` : ""}`
    ).join("\n") || "Sem programação especial.";

    // Build structured avisos data for the frontend
    const avisosEstruturados = {
      programacao_igreja: programacao?.map(e => ({
        evento: e.titulo,
        data: e.data_evento,
        hora: e.hora_inicio,
      })) || [],
      proximos_eventos_agenda: eventos?.map(e => ({
        evento: e.titulo,
        data: e.data_evento,
        hora: e.hora_inicio,
        local: e.local,
      })) || [],
      lembretes_fixos: [
        "Oferta para missões (meta da CR – R$ 50,00)",
        "pix@gileade.com.br",
        "Quilo do Amor (meta da CR – 28 kgs)",
        "Reforçar importância da participação nos cultos e programações da Igreja.",
      ],
    };

    const systemPrompt = `Você é um assistente da igreja que cria RESUMOS de pregações/mensagens para as Casas Refúgio (células/pequenos grupos).

REGRA FUNDAMENTAL: Você deve RESUMIR o conteúdo do material fornecido (arquivo, imagem ou texto). NÃO crie conteúdo novo nem acrescente informações externas. Tudo deve ser baseado exclusivamente no material enviado.

TEMA DA MINISTRAÇÃO: ${tema}
PASTOR/MINISTRADOR: ${pastor}
TEXTO BASE: ${textoBase}

O documento "Casa Refúgio Express" deve conter:
1. **Introdução** - Um parágrafo introdutório objetivo mas completo, contextualizando o tema conforme apresentado no material original
2. **Desenvolvimento** - De 3 a 5 tópicos principais extraídos da mensagem original, cada um com um subtítulo e um parágrafo explicativo. Apenas resuma o que foi dito, sem acrescentar interpretações ou conteúdos externos.
3. **Conclusão (prática)** - Uma conclusão com aplicação prática para o dia a dia, baseada no que foi ministrado
4. **Avisos Importantes** - Incluir:
   - Programação da igreja (apenas Cultos, Impactos e Manains):
${programacaoText}
   - Próximos 2 eventos da agenda:
${eventosText}
   - Lembretes fixos: Oferta para missões (meta da CR – R$ 50,00), pix@gileade.com.br, Quilo do Amor (meta da CR – 28 kgs), reforçar importância da participação nos cultos e programações da Igreja.

Responda APENAS em formato JSON com as chaves: introducao, desenvolvimento, conclusao, avisos_importantes
O desenvolvimento deve ser um texto corrido com os tópicos numerados.
Todos os campos devem ser strings com o texto formatado.`;

    // Build messages
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (fileContent) {
      // Image files - send as multimodal
      if (fileContent.startsWith("data:image/")) {
      messages.push({
          role: "user",
          content: [
            { type: "text", text: `RESUMA esta imagem da mensagem/pregação para gerar o Casa Refúgio Express. Use APENAS o conteúdo visível na imagem, sem acrescentar informações externas. Tema: ${tema}, Pastor: ${pastor}, Texto Base: ${textoBase}` },
            { type: "image_url", image_url: { url: fileContent } },
          ],
        });
      } else {
        // For documents, encode as text description
        messages.push({
          role: "user",
          content: `O arquivo da mensagem foi anexado (formato: ${arquivoPath.split(".").pop()}). RESUMA o conteúdo deste arquivo para gerar o Casa Refúgio Express. NÃO acrescente informações externas, use APENAS o que está no material. Tema: "${tema}", Pastor/Ministrador: "${pastor}", Texto Base: "${textoBase}".`,
        });
      }
    } else {
      messages.push({
        role: "user",
        content: `Gere um resumo para o Casa Refúgio Express sobre o tema "${tema}", ministrado por "${pastor}", com texto base "${textoBase}". Baseie-se apenas nas informações fornecidas.`,
      });
    }

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar conteúdo com IA");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed: any;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback: use the content as-is
      parsed = {
        introducao: content,
        desenvolvimento: "",
        conclusao: "",
        avisos_importantes: "",
      };
    }

    // Generate numero based on cult date (DDMMYYYY)
    const dateParts = dataCulto.split("-");
    const numero = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;

    return new Response(
      JSON.stringify({
        success: true,
        numero,
        introducao: parsed.introducao || "",
        desenvolvimento: parsed.desenvolvimento || "",
        conclusao: parsed.conclusao || "",
        avisos_importantes: JSON.stringify(avisosEstruturados),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
