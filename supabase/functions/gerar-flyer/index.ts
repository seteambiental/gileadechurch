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
      horariosPorDia
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

    // Criar prompt detalhado para o flyer informativo
    const prompt = `GENERATE AN IMAGE: Create an informational church event flyer.

FLYER CONTENT (must be visible and readable on the image):

HEADER:
- Include the Gileade church logo in the top corner
- Main title in large, prominent text: "${titulo}"

DATE SECTION (below title):
${dataHorarioInfo}
${cronogramaMultidatas}

EVENT INFO:
- Event type: ${tipoEvento || 'Evento'}
${descricao ? `- Description: ${descricao}` : ''}
- Target audience: ${publicoAlvo || 'Todos'}
${refeicaoInfo}
${custoInfo}
${localInfo}

DESIGN SPECIFICATIONS:
- Create a portrait flyer (9:16 aspect ratio, like a phone screen)
- Modern, elegant church event design
- Professional typography with clear hierarchy
- The title "${titulo}" must be the largest and most prominent text
- Use warm, spiritual color palette (gold, burgundy, deep blue, or purple tones)
- All text must be in Portuguese (Brazil)
- Include a small map/location icon near the address
- Leave space in top-left or top-right corner for the church logo
- Make sure all information is readable and well organized
- Use icons for each section (calendar for date, clock for time, utensils for food, dollar for cost, pin for location)

IMPORTANT:
- This is an INFORMATIONAL flyer, all details must be clearly visible
- Text hierarchy: Title > Date > Schedule > Other info
- Ensure high contrast for readability
- Professional and inviting design suitable for social media sharing

OUTPUT: Generate the flyer as an image.`;

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
