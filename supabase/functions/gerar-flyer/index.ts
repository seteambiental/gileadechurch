import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, descricao, tipoEvento, dataEvento, horaInicio, local, promptPersonalizado } = await req.json();

    if (!titulo) {
      throw new Error('Título do evento é obrigatório');
    }

    console.log(`Gerando flyer para: ${titulo}`);
    if (promptPersonalizado) {
      console.log(`Prompt personalizado: ${promptPersonalizado}`);
    }

    // Criar prompt detalhado para o flyer - sendo MUITO explícito sobre gerar imagem
    const prompt = `GENERATE AN IMAGE: Create a beautiful church event flyer image.

Event Details:
- Title: ${titulo}
- Type: ${tipoEvento || 'Church Event'}
${descricao ? `- Description: ${descricao}` : ''}
${dataEvento ? `- Date: ${dataEvento}` : ''}
${horaInicio ? `- Time: ${horaInicio}` : ''}
${local ? `- Location: ${local}` : ''}

${promptPersonalizado ? `User's custom design instructions (PRIORITIZE THESE): ${promptPersonalizado}` : ''}

Design specifications:
- Create a portrait flyer image (9:16 ratio)
- Modern and elegant church event design
- Professional typography with the event title prominent
- Warm, spiritual color palette (gold, burgundy, deep blue)
- Leave empty space in bottom-left corner for logo
- Suitable for social media sharing

OUTPUT: Generate the flyer as an image.`;

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
      throw new Error('Não foi possível gerar a imagem do flyer. Tente novamente com uma descrição diferente.');
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

    console.log('Flyer salvo:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        flyerUrl: urlData.publicUrl,
        message: 'Flyer gerado com sucesso!' 
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
