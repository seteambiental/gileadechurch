import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

const versiculosAniversario = [
  { texto: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", referencia: "Jeremias 29:11" },
  { texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.", referencia: "Números 6:24-25" },
  { texto: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.", referencia: "Salmos 118:24" },
  { texto: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome.", referencia: "Salmos 103:1" },
  { texto: "O Senhor é a minha força e o meu escudo; nele o meu coração confia, e dele recebo ajuda.", referencia: "Salmos 28:7" },
  { texto: "Grandes coisas fez o Senhor por nós, e por isso estamos alegres.", referencia: "Salmos 126:3" },
  { texto: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", referencia: "Eclesiastes 3:1" },
];

async function enviarMensagemZAPI(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  
  console.log(`Enviando mensagem de aniversário para: ${phoneFormatted}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN || '',
    },
    body: JSON.stringify({
      phone: phoneFormatted,
      message: mensagem,
    }),
  });
  
  const result = await response.json();
  console.log('Resposta Z-API:', result);
  
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao enviar mensagem');
  }
  
  return result;
}

function gerarMensagemAniversario(nome: string) {
  const primeiroNome = nome.split(' ')[0];
  const versiculo = versiculosAniversario[Math.floor(Math.random() * versiculosAniversario.length)];
  
  return `🎂🎉 *FELIZ ANIVERSÁRIO, ${primeiroNome.toUpperCase()}!* 🎉🎂

Que o Senhor continue abençoando sua vida abundantemente neste novo ciclo que se inicia!

📖 *"${versiculo.texto}"*
— ${versiculo.referencia}

Que este dia seja repleto de alegria, paz e amor. Você é muito especial para nossa família!

Com carinho,
_Igreja Gileade_ 💙🙏`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Obter data atual no formato MM-DD para comparar com birth_date
    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    
    console.log(`Verificando aniversariantes para: ${mesAtual}-${diaAtual}`);

    if (action === 'enviar_aniversarios' || !action) {
      // Buscar membros que fazem aniversário hoje
      // birth_date está no formato YYYY-MM-DD
      const { data: membros, error: membrosError } = await supabase
        .from('members')
        .select('id, full_name, whatsapp, birth_date')
        .not('whatsapp', 'is', null)
        .not('birth_date', 'is', null);

      if (membrosError) {
        throw new Error(`Erro ao buscar membros: ${membrosError.message}`);
      }

      // Filtrar aniversariantes do dia
      const aniversariantes = membros?.filter(m => {
        if (!m.birth_date) return false;
        const [ano, mes, dia] = m.birth_date.split('-');
        return mes === mesAtual && dia === diaAtual;
      }) || [];

      console.log(`Encontrados ${aniversariantes.length} aniversariantes hoje`);

      // Buscar também novos convertidos que fazem aniversário hoje
      const { data: convertidos, error: convertidosError } = await supabase
        .from('novos_convertidos')
        .select('id, full_name, whatsapp, data_nascimento')
        .not('whatsapp', 'is', null)
        .not('data_nascimento', 'is', null);

      if (convertidosError) {
        console.error('Erro ao buscar novos convertidos:', convertidosError);
      }

      const aniversariantesConvertidos = convertidos?.filter(c => {
        if (!c.data_nascimento) return false;
        const [ano, mes, dia] = c.data_nascimento.split('-');
        return mes === mesAtual && dia === diaAtual;
      }) || [];

      console.log(`Encontrados ${aniversariantesConvertidos.length} novos convertidos aniversariantes`);

      // Verificar quais já receberam mensagem hoje
      const dataHoje = hoje.toISOString().split('T')[0];
      const { data: jaEnviados } = await supabase
        .from('aniversarios_enviados')
        .select('member_id, novo_convertido_id')
        .eq('data_envio', dataHoje)
        .eq('sucesso', true);

      const membrosJaEnviados = new Set(jaEnviados?.filter(e => e.member_id).map(e => e.member_id) || []);
      const convertidosJaEnviados = new Set(jaEnviados?.filter(e => e.novo_convertido_id).map(e => e.novo_convertido_id) || []);

      console.log(`Já enviados hoje: ${membrosJaEnviados.size} membros, ${convertidosJaEnviados.size} convertidos`);

      let enviados = 0;
      let erros = 0;
      let ignorados = 0;
      const resultados: { nome: string; sucesso: boolean; erro?: string; ignorado?: boolean }[] = [];

      // Enviar para membros (que ainda não receberam hoje)
      for (const membro of aniversariantes) {
        // Verificar se já enviou hoje
        if (membrosJaEnviados.has(membro.id)) {
          console.log(`⏭️ ${membro.full_name} já recebeu mensagem hoje, ignorando`);
          ignorados++;
          resultados.push({ nome: membro.full_name, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(membro.full_name);
          await enviarMensagemZAPI(membro.whatsapp, mensagem);
          
          // Registrar log de envio
          await supabase.from('aniversarios_enviados').insert({
            member_id: membro.id,
            data_envio: dataHoje,
            sucesso: true,
          });
          
          enviados++;
          resultados.push({ nome: membro.full_name, sucesso: true });
          console.log(`✅ Mensagem enviada para ${membro.full_name}`);
          
          // Delay de 2 segundos entre envios
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          erros++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          
          // Registrar erro
          try {
            await supabase.from('aniversarios_enviados').insert({
              member_id: membro.id,
              data_envio: dataHoje,
              sucesso: false,
              erro_mensagem: errorMsg,
            });
          } catch {}
          
          resultados.push({ nome: membro.full_name, sucesso: false, erro: errorMsg });
          console.error(`❌ Erro ao enviar para ${membro.full_name}:`, err);
        }
      }

      // Enviar para novos convertidos (que ainda não receberam hoje)
      for (const convertido of aniversariantesConvertidos) {
        // Verificar se já enviou hoje
        if (convertidosJaEnviados.has(convertido.id)) {
          console.log(`⏭️ ${convertido.full_name} já recebeu mensagem hoje, ignorando`);
          ignorados++;
          resultados.push({ nome: convertido.full_name, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(convertido.full_name);
          await enviarMensagemZAPI(convertido.whatsapp, mensagem);
          
          await supabase.from('aniversarios_enviados').insert({
            novo_convertido_id: convertido.id,
            data_envio: dataHoje,
            sucesso: true,
          });
          
          enviados++;
          resultados.push({ nome: convertido.full_name, sucesso: true });
          console.log(`✅ Mensagem enviada para ${convertido.full_name} (novo convertido)`);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          erros++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          
          try {
            await supabase.from('aniversarios_enviados').insert({
              novo_convertido_id: convertido.id,
              data_envio: dataHoje,
              sucesso: false,
              erro_mensagem: errorMsg,
            });
          } catch {}
          
          resultados.push({ nome: convertido.full_name, sucesso: false, erro: errorMsg });
          console.error(`❌ Erro ao enviar para ${convertido.full_name}:`, err);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Mensagens de aniversário: ${enviados} enviadas, ${ignorados} já enviadas antes, ${erros} falhas`,
        data: dataHoje,
        enviados,
        ignorados,
        erros,
        total: aniversariantes.length + aniversariantesConvertidos.length,
        resultados,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verificar_aniversariantes') {
      // Apenas listar aniversariantes do dia sem enviar
      const { data: membros, error: membrosError } = await supabase
        .from('members')
        .select('id, full_name, whatsapp, birth_date')
        .not('birth_date', 'is', null);

      if (membrosError) throw membrosError;

      const aniversariantes = membros?.filter(m => {
        if (!m.birth_date) return false;
        const [ano, mes, dia] = m.birth_date.split('-');
        return mes === mesAtual && dia === diaAtual;
      }).map(m => ({
        id: m.id,
        nome: m.full_name,
        temWhatsapp: !!m.whatsapp,
      })) || [];

      return new Response(JSON.stringify({
        success: true,
        data: hoje.toISOString().split('T')[0],
        aniversariantes,
        total: aniversariantes.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Ação inválida',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
