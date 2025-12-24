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
      corFundo
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

    // Criar prompt detalhado para o flyer informativo - TODO EM PORTUGUÊS
    const prompt = `GERE UMA IMAGEM: Crie um flyer informativo de evento de igreja.

IDIOMA: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS DO BRASIL. NÃO USE INGLÊS.

CONTEÚDO DO FLYER (deve estar visível e legível na imagem):

TÍTULO (topo, centralizado, maior destaque):
"${titulo}"

DATA E HORÁRIO (abaixo do título):
${dataHorarioInfo}
${cronogramaMultidatas}

INFORMAÇÕES DO EVENTO (organizadas em seções claras):
${descricao ? `Descrição: ${descricao}` : ''}
Público Alvo: ${publicoAlvo || 'Todos'}
${refeicaoInfo}
${custoInfo}
${localInfo}

LOGO DA IGREJA GILEADE:
- Posicionar a logo "GILEADE" no CANTO INFERIOR DIREITO do flyer
- A logo deve ser pequena mas visível
- Texto "Igreja Gileade" ou apenas "GILEADE" em branco

ESPECIFICAÇÕES DE DESIGN - MUITO IMPORTANTE:
- Formato: Retrato/Vertical (proporção 9:16, como tela de celular)
- FUNDO: Cor sólida ${backgroundColorName} (código hex: ${backgroundColorHex})
- SEM IMAGENS de fundo, SEM FIGURAS, SEM PADRÕES, SEM GRADIENTES
- APENAS fundo de cor sólida
- TIPOGRAFIA: Estilo Open Sans ou Montserrat
  - Título: NEGRITO, tamanho maior
  - Demais textos: peso normal/regular
- Design limpo, minimalista e profissional
- Alto contraste entre fundo ${backgroundColorName} e texto branco/claro
- Ícones brancos simples para cada seção (calendário, relógio, garfo/faca, cifrão, pin de localização)

LAYOUT DO FLYER (de cima para baixo):
1. TÍTULO do evento (grande, negrito, centralizado) - TOPO
2. DATA principal e HORÁRIO
3. CRONOGRAMA detalhado (se houver múltiplas datas)
4. PÚBLICO ALVO
5. REFEIÇÕES (se houver)
6. INVESTIMENTO/CUSTO
7. LOCAL com ícone de mapa
8. LOGO GILEADE - CANTO INFERIOR DIREITO

REGRAS CRÍTICAS:
- Fundo DEVE ser cor sólida ${backgroundColorName} (${backgroundColorHex})
- NENHUMA imagem de fundo
- NENHUMA figura decorativa ou ilustração
- NENHUM padrão ou textura
- Texto branco ou muito claro para máxima legibilidade
- Aparência profissional e elegante
- Logo GILEADE no canto inferior direito

SAÍDA: Gere o flyer como uma imagem.`;

    console.log("Prompt gerado:", prompt.substring(0, 500) + "...");

    // Tentar gerar a imagem com retry
    let imageData: string | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (!imageData && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentativa ${attempts} de gerar imagem...`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API:', response.status, errorText);
        throw new Error(`Erro ao gerar imagem: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta da API recebida, tentativa', attempts);

      // Tentar extrair a imagem de diferentes formatos possíveis
      imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageData) {
        console.log('Formato alternativo tentado...');
        // Tentar formato alternativo
        const images = data.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          imageData = images[0]?.url || images[0]?.image_url?.url;
        }
      }

      if (!imageData) {
        console.log('Resposta sem imagem na tentativa', attempts, ':', JSON.stringify(data).substring(0, 500));
        if (attempts < maxAttempts) {
          console.log('Tentando novamente...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!imageData) {
      throw new Error('Não foi possível gerar a imagem do flyer. Tente novamente.');
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
