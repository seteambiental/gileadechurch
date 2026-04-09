import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rawEvolutionUrl = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_URL = rawEvolutionUrl.startsWith('http') ? rawEvolutionUrl : `https://${rawEvolutionUrl}`;
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

const versiculosAniversario = [
  { texto: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", referencia: "Jeremias 29:11" },
  { texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.", referencia: "Números 6:24-25" },
  { texto: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.", referencia: "Salmos 118:24" },
  { texto: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome.", referencia: "Salmos 103:1" },
  { texto: "O Senhor é a minha força e o meu escudo; nele o meu coração confia, e dele recebo ajuda.", referencia: "Salmos 28:7" },
  { texto: "Grandes coisas fez o Senhor por nós, e por isso estamos alegres.", referencia: "Salmos 126:3" },
  { texto: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", referencia: "Eclesiastes 3:1" },
];

async function enviarMensagemEvolution(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  
  console.log(`Enviando mensagem de aniversário para: ${phoneFormatted}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY || '',
    },
    body: JSON.stringify({
      number: `${phoneFormatted}@s.whatsapp.net`,
      text: mensagem,
    }),
  });
  
  const result = await response.json();
  console.log('Resposta Evolution:', JSON.stringify(result).substring(0, 300));
  
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Erro ao enviar mensagem');
  }
  
  return result;
}

function gerarMensagemAniversario(nome: string, mensagemTemplate: string | null) {
  const primeiroNome = nome.split(' ')[0];
  const versiculo = versiculosAniversario[Math.floor(Math.random() * versiculosAniversario.length)];
  
  if (mensagemTemplate) {
    return mensagemTemplate
      .replace(/{NOME}/g, primeiroNome)
      .replace(/{VERSICULO}/g, versiculo.texto)
      .replace(/{REFERENCIA}/g, versiculo.referencia);
  }
  
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

    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    
    console.log(`Verificando aniversariantes para: ${mesAtual}-${diaAtual}`);

    if (action === 'enviar_aniversarios' || !action) {
      const { data: homepageConfig } = await supabase
        .from('homepage_config')
        .select('mensagem_aniversario')
        .limit(1)
        .maybeSingle();
      
      const mensagemTemplate = homepageConfig?.mensagem_aniversario || null;

      const { data: membros, error: membrosError } = await supabase
        .from('members')
        .select('id, full_name, whatsapp, birth_date')
        .not('whatsapp', 'is', null)
        .not('birth_date', 'is', null);

      if (membrosError) {
        throw new Error(`Erro ao buscar membros: ${membrosError.message}`);
      }

      const aniversariantes = membros?.filter(m => {
        if (!m.birth_date) return false;
        const [ano, mes, dia] = m.birth_date.split('-');
        return mes === mesAtual && dia === diaAtual;
      }) || [];

      console.log(`Encontrados ${aniversariantes.length} aniversariantes hoje`);

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

      const dataHoje = hoje.toISOString().split('T')[0];
      const { data: jaEnviados } = await supabase
        .from('aniversarios_enviados')
        .select('member_id, novo_convertido_id')
        .eq('data_envio', dataHoje)
        .eq('sucesso', true);

      const membrosJaEnviados = new Set(jaEnviados?.filter(e => e.member_id).map(e => e.member_id) || []);
      const convertidosJaEnviados = new Set(jaEnviados?.filter(e => e.novo_convertido_id).map(e => e.novo_convertido_id) || []);

      let enviados = 0;
      let erros = 0;
      let ignorados = 0;
      const resultados: { nome: string; sucesso: boolean; erro?: string; ignorado?: boolean }[] = [];

      for (const membro of aniversariantes) {
        if (membrosJaEnviados.has(membro.id)) {
          ignorados++;
          resultados.push({ nome: membro.full_name, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(membro.full_name, mensagemTemplate);
          await enviarMensagemEvolution(membro.whatsapp, mensagem);
          
          await supabase.from('aniversarios_enviados').insert({
            member_id: membro.id,
            data_envio: dataHoje,
            sucesso: true,
          });
          
          enviados++;
          resultados.push({ nome: membro.full_name, sucesso: true });
          console.log(`✅ Mensagem enviada para ${membro.full_name}`);
          
          await new Promise(resolve => setTimeout(resolve, 30000));
        } catch (err) {
          erros++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          
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

      for (const convertido of aniversariantesConvertidos) {
        if (convertidosJaEnviados.has(convertido.id)) {
          ignorados++;
          resultados.push({ nome: convertido.full_name, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(convertido.full_name, mensagemTemplate);
          await enviarMensagemEvolution(convertido.whatsapp, mensagem);
          
          await supabase.from('aniversarios_enviados').insert({
            novo_convertido_id: convertido.id,
            data_envio: dataHoje,
            sucesso: true,
          });
          
          enviados++;
          resultados.push({ nome: convertido.full_name, sucesso: true });
          
          await new Promise(resolve => setTimeout(resolve, 30000));
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
