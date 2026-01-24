// Edge function para gerar mensagem de agradecimento a visitantes usando Lovable AI

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome } = await req.json();

    if (!nome) {
      return new Response(
        JSON.stringify({ error: "Nome é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar Lovable AI (OpenRouter) para gerar a mensagem
    const prompt = `Gere uma mensagem curta e calorosa de agradecimento pela visita à igreja para uma pessoa chamada ${nome}. 
A mensagem deve:
- Ser acolhedora e genuína
- Mencionar que foi uma alegria ter a pessoa presente
- Convidar para voltar
- Usar emojis de forma moderada (1-3 emojis)
- Ter no máximo 5 linhas
- Assinar como "Igreja Gileade"
- Ser em português brasileiro

Retorne apenas a mensagem, sem explicações adicionais.`;

    const LOVABLE_API_URL = Deno.env.get("LOVABLE_API_URL") || "https://lovable-api.lovable.dev";

    const response = await fetch(`${LOVABLE_API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("Lovable AI error:", await response.text());
      // Fallback para mensagem padrão se a API falhar
      const mensagemPadrao = `Olá, ${nome}! 🙏

Foi uma alegria ter você conosco em nossa igreja! Esperamos que tenha se sentido acolhido(a) e abençoado(a).

Fique à vontade para voltar quando quiser. Você sempre terá um lugar especial aqui!

Com carinho,
Igreja Gileade 💙`;

      return new Response(
        JSON.stringify({ mensagem: mensagemPadrao }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const mensagem = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "";

    if (!mensagem) {
      // Fallback
      const mensagemPadrao = `Olá, ${nome}! 🙏

Foi uma alegria ter você conosco em nossa igreja! Esperamos que tenha se sentido acolhido(a).

Fique à vontade para voltar quando quiser. Você sempre terá um lugar especial aqui!

Com carinho,
Igreja Gileade 💙`;

      return new Response(
        JSON.stringify({ mensagem: mensagemPadrao }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ mensagem }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao gerar mensagem:", error);
    
    // Fallback para mensagem padrão em caso de erro
    const mensagemPadrao = `Olá! 🙏

Foi uma alegria ter você conosco em nossa igreja! Esperamos que tenha se sentido acolhido(a).

Fique à vontade para voltar quando quiser. Você sempre terá um lugar especial aqui!

Com carinho,
Igreja Gileade 💙`;

    return new Response(
      JSON.stringify({ mensagem: mensagemPadrao }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
