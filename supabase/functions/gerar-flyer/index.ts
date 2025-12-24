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

    // Criar prompt detalhado para o flyer
    const prompt = `Create a beautiful church event flyer with the following details:

EVENT: ${titulo}
TYPE: ${tipoEvento || 'Evento da Igreja'}
${descricao ? `DESCRIPTION: ${descricao}` : ''}
${dataEvento ? `DATE: ${dataEvento}` : ''}
${horaInicio ? `TIME: ${horaInicio}` : ''}
${local ? `LOCATION: ${local}` : ''}

${promptPersonalizado ? `CUSTOM DESIGN INSTRUCTIONS FROM USER: ${promptPersonalizado}` : ''}

Design requirements:
- Modern, elegant church event flyer design
- Portrait orientation (9:16 aspect ratio)
- Use warm, inviting colors with spiritual themes
- Include decorative elements like subtle crosses, doves, or light rays
- Professional typography with clear hierarchy
- The event title should be prominent and eye-catching
- Add date and time in a clear, readable format
- Include a small empty space in the bottom left corner for a logo to be added later
- Make it visually striking and suitable for social media sharing
- Use a color scheme that includes gold, burgundy, or deep blue tones
- Inspirational and welcoming mood
${promptPersonalizado ? '- PRIORITIZE the custom design instructions provided by the user above' : ''}

Generate a high-quality event flyer image.`;

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
      console.error('Erro na API:', errorText);
      throw new Error(`Erro ao gerar imagem: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da API recebida');

    // Extrair a imagem base64
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error('Resposta sem imagem:', JSON.stringify(data));
      throw new Error('Nenhuma imagem foi gerada');
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
