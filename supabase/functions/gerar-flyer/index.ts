import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface HorarioDia {
  data: string;
  periodo: string;
  hora_inicio: string;
  hora_fim: string;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('pt-BR', options);
};

const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short'
  };
  return date.toLocaleDateString('pt-BR', options);
};

const getPeriodoLabel = (periodo: string): string => {
  const labels: Record<string, string> = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
  };
  return labels[periodo] || periodo;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      titulo, 
      descricao, 
      tipoEvento, 
      dataEvento, 
      dataFim,
      horaInicio, 
      horaFim,
      local, 
      publicoAlvo,
      temRefeicao,
      comentariosRefeicao,
      temCusto,
      valorCusto,
      comentariosCusto,
      horariosPorDia,
      corFundo,
      linkInscricao
    } = await req.json();

    if (!titulo) {
      throw new Error('Título do evento é obrigatório');
    }

    if (!dataEvento) {
      throw new Error('Data do evento é obrigatória');
    }

    console.log(`Gerando flyer informativo para: ${titulo}`);

    // Construir informações de data/horário
    let dataHorarioInfo = `Data Principal: ${formatDate(dataEvento)}`;
    
    if (horaInicio) {
      dataHorarioInfo += ` às ${horaInicio}`;
      if (horaFim) {
        dataHorarioInfo += ` - ${horaFim}`;
      }
    }

    // Se for evento multidatas, adicionar cronograma
    let cronogramaMultidatas = "";
    if (dataFim && dataEvento !== dataFim && horariosPorDia && horariosPorDia.length > 0) {
      cronogramaMultidatas = "\n\nCRONOGRAMA DETALHADO:\n";
      
      // Agrupar horários por data
      const horariosPorData: Record<string, HorarioDia[]> = {};
      horariosPorDia.forEach((h: HorarioDia) => {
        if (!horariosPorData[h.data]) {
          horariosPorData[h.data] = [];
        }
        horariosPorData[h.data].push(h);
      });

      // Ordenar datas e formatar
      const datasOrdenadas = Object.keys(horariosPorData).sort();
      datasOrdenadas.forEach((data) => {
        const horariosData = horariosPorData[data];
        cronogramaMultidatas += `\n${formatShortDate(data)}:\n`;
        horariosData.forEach((h) => {
          cronogramaMultidatas += `  - ${getPeriodoLabel(h.periodo)}: ${h.hora_inicio} às ${h.hora_fim}\n`;
        });
      });
    }

    // Informações de refeição
    let refeicaoInfo = "";
    if (temRefeicao) {
      refeicaoInfo = "\n\nREFEIÇÕES: Haverá refeição no local";
      if (comentariosRefeicao) {
        refeicaoInfo += `\n${comentariosRefeicao}`;
      }
    }

    // Informações de custo
    let custoInfo = "";
    if (temCusto) {
      custoInfo = "\n\nINVESTIMENTO:";
      if (valorCusto) {
        custoInfo += ` R$ ${parseFloat(valorCusto).toFixed(2).replace('.', ',')}`;
      }
      if (comentariosCusto) {
        custoInfo += `\n${comentariosCusto}`;
      }
    } else {
      custoInfo = "\n\nINVESTIMENTO: Evento gratuito";
    }

    // Informações de local com instrução para Google Maps
    let localInfo = "";
    if (local) {
      localInfo = `\n\nLOCAL: ${local}`;
      localInfo += "\n(Incluir ícone de localização sugerindo Google Maps)";
    }

    // Mapear cor hex para nome descritivo
    const getColorName = (hex: string): string => {
      const colorMap: Record<string, string> = {
        "#1e3a5f": "deep navy blue",
        "#7b1e3a": "burgundy red",
        "#2d4a3e": "dark forest green",
        "#4a2d6b": "royal purple",
        "#3d3d3d": "charcoal gray",
        "#dc2626": "bright red",
        "#2563eb": "royal blue",
        "#7c3aed": "vivid purple",
        "#16a34a": "emerald green",
        "#ea580c": "vibrant orange",
        "#0891b2": "cyan blue",
        "#db2777": "hot pink",
        "#b45309": "amber brown",
        "#0d9488": "teal green",
        "#6366f1": "indigo blue",
        "#84cc16": "lime green",
        "#f97316": "tangerine orange",
        "#8b5cf6": "violet purple",
      };
      return colorMap[hex] || "deep navy blue";
    };

    const backgroundColorName = getColorName(corFundo || "#1e3a5f");
    const backgroundColorHex = corFundo || "#1e3a5f";

    // Informação do link de inscrição
    let inscricaoInfo = "";
    if (linkInscricao) {
      inscricaoInfo = `\n\nINSCRIÇÕES:\nAcesse: ${linkInscricao}`;
    }

    // Criar prompt detalhado para o flyer informativo - 100% PORTUGUÊS BRASILEIRO
    const prompt = `VOCÊ É UM DESIGNER BRASILEIRO. GERE UM FLYER 100% EM PORTUGUÊS DO BRASIL.

REGRA ABSOLUTA: TODO TEXTO DEVE ESTAR EM PORTUGUÊS BRASILEIRO.
PROIBIDO: Qualquer palavra em inglês (Registration, Location, Date, Time, Event, etc.)
OBRIGATÓRIO: Apenas português brasileiro em todos os textos.

=== CONTEÚDO DO FLYER ===

TÍTULO (letras grandes e em destaque):
${titulo.toUpperCase()}

INFORMAÇÕES DE DATA E HORÁRIO:
📅 ${formatDate(dataEvento)}
${horaInicio ? `🕐 ${horaInicio}${horaFim ? ` às ${horaFim}` : ''}` : ''}
${cronogramaMultidatas ? `\nPROGRAMAÇÃO:\n${cronogramaMultidatas}` : ''}

${descricao ? `DESCRIÇÃO:\n${descricao}\n` : ''}

PÚBLICO ALVO: ${publicoAlvo === 'masculino' ? 'Homens' : publicoAlvo === 'feminino' ? 'Mulheres' : publicoAlvo === 'jovens' ? 'Jovens' : 'Todos'}

${temRefeicao ? `🍽️ ALIMENTAÇÃO: Refeições inclusas${comentariosRefeicao ? ` (${comentariosRefeicao})` : ''}` : ''}

${temCusto && valorCusto ? `💰 INVESTIMENTO: R$ ${parseFloat(valorCusto).toFixed(2).replace('.', ',')}${comentariosCusto ? ` - ${comentariosCusto}` : ''}` : '✅ ENTRADA GRATUITA'}

${local ? `📍 LOCAL: ${local}` : ''}

${linkInscricao ? `\n📝 INSCRIÇÕES: ${linkInscricao}` : ''}

MARCA: "GILEADE" (canto inferior direito, letras brancas)

=== INSTRUÇÕES DE DESIGN ===

FORMATO: Vertical (retrato) 9:16
COR DE FUNDO: ${backgroundColorHex} (cor sólida, sem gradiente, sem padrões)
COR DO TEXTO: Branco (#FFFFFF)
TIPOGRAFIA: Moderna (estilo Montserrat ou similar)
LAYOUT: Limpo, organizado, profissional, minimalista
ELEMENTOS: Apenas texto e pequenos ícones (calendário, relógio, local)
PROIBIDO: Fotos, ilustrações, imagens de pessoas, padrões decorativos

=== TRADUÇÃO OBRIGATÓRIA ===
NÃO escreva: Date, Time, Location, Event, Register, Registration, Investment, Free
ESCREVA: Data, Horário, Local, Evento, Inscrever, Inscrições, Investimento, Gratuito

GERE A IMAGEM DO FLYER AGORA.`;

    console.log("Prompt gerado:", prompt.substring(0, 500) + "...");

    // Função para gerar a imagem
    const generateImage = async (customPrompt: string): Promise<string | null> => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [{ role: 'user', content: customPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API de imagem:', response.status, errorText);
        throw new Error(`Erro ao gerar imagem: ${response.status}`);
      }

      const data = await response.json();
      let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageData) {
        const images = data.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          imageData = images[0]?.url || images[0]?.image_url?.url;
        }
      }
      
      return imageData;
    };

    // Função para revisar a imagem com IA
    const reviewImage = async (imageUrl: string): Promise<{ approved: boolean; errors: string[] }> => {
      console.log("Revisando imagem gerada...");
      
      const reviewPrompt = `Você é um revisor de flyers em português brasileiro. Analise esta imagem de flyer e verifique:

1. SE HÁ ALGUM TEXTO EM INGLÊS (erros comuns: "Date", "Time", "Location", "Event", "Register", "Registration", "Free", "Investment")
2. SE HÁ ERROS DE PORTUGUÊS (acentuação, ortografia, concordância)
3. SE AS INFORMAÇÕES ESTÃO LEGÍVEIS E BEM FORMATADAS

Responda APENAS em formato JSON:
{
  "approved": true ou false,
  "errors": ["lista de erros encontrados em português"]
}

Se o flyer estiver 100% correto em português e sem erros, retorne approved: true e errors: [].
Se houver QUALQUER palavra em inglês ou erro de português, retorne approved: false com a lista de erros.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: reviewPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        console.error('Erro na revisão:', response.status);
        return { approved: true, errors: [] }; // Se falhar revisão, aceita a imagem
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log("Resultado da revisão:", content);

      try {
        // Extrair JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            approved: result.approved === true,
            errors: Array.isArray(result.errors) ? result.errors : []
          };
        }
      } catch (e) {
        console.log("Erro ao parsear revisão:", e);
      }

      return { approved: true, errors: [] };
    };

    // Tentar gerar e revisar a imagem
    let imageData: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastErrors: string[] = [];

    while (!imageData && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentativa ${attempts} de gerar flyer...`);

      // Adicionar correções baseadas em erros anteriores
      let currentPrompt = prompt;
      if (lastErrors.length > 0) {
        currentPrompt += `\n\n⚠️ CORREÇÕES NECESSÁRIAS (erros da tentativa anterior):\n`;
        lastErrors.forEach((err, i) => {
          currentPrompt += `${i + 1}. ${err}\n`;
        });
        currentPrompt += `\nCORRIJA TODOS OS ERROS ACIMA. USE APENAS PORTUGUÊS BRASILEIRO.`;
      }

      const generatedImage = await generateImage(currentPrompt);
      
      if (!generatedImage) {
        console.log('Imagem não gerada na tentativa', attempts);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      console.log("Imagem gerada, iniciando revisão...");
      
      // Revisar a imagem
      const review = await reviewImage(generatedImage);
      
      if (review.approved) {
        console.log("✅ Flyer aprovado na revisão!");
        imageData = generatedImage;
      } else {
        console.log("❌ Flyer reprovado. Erros:", review.errors);
        lastErrors = review.errors;
        
        if (attempts < maxAttempts) {
          console.log("Gerando nova versão com correções...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Se após todas as tentativas não conseguiu aprovar, usar a última imagem gerada
    if (!imageData) {
      console.log("Usando última imagem gerada após", maxAttempts, "tentativas");
      imageData = await generateImage(prompt + "\n\nATENÇÃO MÁXIMA: APENAS PORTUGUÊS BRASILEIRO. NENHUMA PALAVRA EM INGLÊS.");
      
      if (!imageData) {
        throw new Error('Não foi possível gerar a imagem do flyer. Tente novamente.');
      }
    }

    // Upload para o storage do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Converter base64 para blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `flyer-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('encontros-fotos')
      .upload(`flyers/${fileName}`, binaryData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw new Error('Erro ao salvar flyer');
    }

    const { data: urlData } = supabase.storage
      .from('encontros-fotos')
      .getPublicUrl(`flyers/${fileName}`);

    console.log('Flyer informativo salvo:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        flyerUrl: urlData.publicUrl,
        message: 'Flyer informativo gerado com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
