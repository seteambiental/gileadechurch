import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log('Evolution webhook recebido:', JSON.stringify(body).substring(0, 500));

    const evento = body.event;
    const instance = body.instance;
    const data = body.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Log do evento recebido
    console.log(`Evento: ${evento} | Instância: ${instance}`);

    switch (evento) {
      case 'connection.update':
        console.log(`Status conexão: ${data?.state}`);
        break;

      case 'messages.upsert':
        // Mensagem recebida
        if (data?.key?.fromMe === false) {
          const remetente = data.key?.remoteJid?.replace('@s.whatsapp.net', '');
          const mensagem = data.message?.conversation || 
                          data.message?.extendedTextMessage?.text || 
                          '[mídia]';
          console.log(`Mensagem de ${remetente}: ${mensagem}`);
        }
        break;

      case 'messages.update':
        // Status de entrega/leitura
        const status = data?.update?.status;
        console.log(`Status mensagem atualizado: ${status}`);
        break;

      case 'qrcode.updated':
        console.log('QR Code atualizado');
        break;

      default:
        console.log(`Evento não tratado: ${evento}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro webhook:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
