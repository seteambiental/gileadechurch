import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

const versiculosBoasVindas = [
  { texto: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", referencia: "João 3:16" },
  { texto: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", referencia: "Mateus 11:28" },
  { texto: "Eis que estou à porta e bato; se alguém ouvir a minha voz e abrir a porta, entrarei em sua casa e cearei com ele, e ele comigo.", referencia: "Apocalipse 3:20" },
  { texto: "Portanto, se alguém está em Cristo, é nova criatura; as coisas velhas já passaram; eis que tudo se fez novo.", referencia: "2 Coríntios 5:17" },
  { texto: "O Senhor é o meu pastor; nada me faltará.", referencia: "Salmos 23:1" },
];

const versiculosReconciliacao = [
  { texto: "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar os pecados e nos purificar de toda injustiça.", referencia: "1 João 1:9" },
  { texto: "Vinde então, e argui-me, diz o Senhor: ainda que os vossos pecados sejam como a escarlata, eles se tornarão brancos como a neve.", referencia: "Isaías 1:18" },
  { texto: "O Senhor não retarda a sua promessa, ainda que alguns a tenham por tardia; mas é longânimo para convosco, não querendo que alguns se percam.", referencia: "2 Pedro 3:9" },
  { texto: "Porque eu sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar um futuro e uma esperança.", referencia: "Jeremias 29:11" },
  { texto: "Assim vos digo que há alegria diante dos anjos de Deus por um pecador que se arrepende.", referencia: "Lucas 15:10" },
];

async function enviarMensagemZAPI(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  
  console.log(`Enviando mensagem para: ${phoneFormatted}`);
  
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

function gerarMensagemBoasVindas(nome: string, tipoConversao: string) {
  const primeiroNome = nome.split(' ')[0];
  const versiculos = tipoConversao === 'reconciliacao' ? versiculosReconciliacao : versiculosBoasVindas;
  const versiculo = versiculos[Math.floor(Math.random() * versiculos.length)];
  
  if (tipoConversao === 'reconciliacao') {
    return `🙏 Olá, ${primeiroNome}! Que alegria ter você de volta!\n\nO Senhor te recebe de braços abertos. Sua decisão de voltar para casa foi a melhor escolha!\n\n📖 *"${versiculo.texto}"* - ${versiculo.referencia}\n\nEstamos aqui para caminhar juntos. Qualquer coisa, pode contar conosco! 💙\n\n_Igreja Gileade_`;
  }
  
  return `🎉 Olá, ${primeiroNome}! Que alegria imensa pela sua decisão!\n\nBem-vindo(a) à família de Deus! Sua vida nunca mais será a mesma!\n\n📖 *"${versiculo.texto}"* - ${versiculo.referencia}\n\nEstamos muito felizes em caminhar com você nessa nova jornada! 💙\n\n_Igreja Gileade_`;
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

function gerarMensagemConvite(nome: string, evento: any, numeroMensagem: number) {
  const primeiroNome = nome.split(' ')[0];
  const dataFormatada = new Date(evento.data_evento).toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
  
  const horaFormatada = evento.hora_inicio ? ` às ${evento.hora_inicio.substring(0, 5)}` : '';
  
  const saudacoes = [
    `Ei, ${primeiroNome}! 👋`,
    `Olá, ${primeiroNome}! 😊`,
    `Fala, ${primeiroNome}! ✨`,
    `Oi, ${primeiroNome}! 💙`,
  ];
  
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
  
  return `${saudacao}\n\nTemos um evento especial e queremos muito te ver lá!\n\n📅 *${evento.titulo}*\n🗓️ ${dataFormatada}${horaFormatada}\n📍 ${evento.local || 'Igreja Gileade'}\n\n${evento.descricao || 'Vai ser incrível! Não perca!'}\n\nVocê vem? 🙏\n\n_Igreja Gileade_`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, convertidoId, eventoId } = await req.json();
    console.log(`Action: ${action}, ConvertidoId: ${convertidoId}`);

    if (action === 'boas_vindas') {
      // Buscar dados do convertido
      const { data: convertido, error: convError } = await supabase
        .from('novos_convertidos')
        .select('*')
        .eq('id', convertidoId)
        .single();

      if (convError || !convertido) {
        throw new Error('Convertido não encontrado');
      }

      if (!convertido.whatsapp) {
        throw new Error('WhatsApp não cadastrado');
      }

      if (convertido.mensagem_boas_vindas_enviada) {
        throw new Error('Mensagem de boas-vindas já foi enviada');
      }

      const mensagem = gerarMensagemBoasVindas(convertido.full_name, convertido.tipo_conversao);
      
      await enviarMensagemZAPI(convertido.whatsapp, mensagem);

      // Registrar mensagem enviada
      await supabase.from('mensagens_whatsapp').insert({
        novo_convertido_id: convertidoId,
        tipo_mensagem: 'boas_vindas',
        conteudo: mensagem,
      });

      // Atualizar contagem de mensagens
      await supabase
        .from('novos_convertidos')
        .update({
          mensagens_enviadas: (convertido.mensagens_enviadas || 0) + 1,
          mensagem_boas_vindas_enviada: true,
          ultima_mensagem_enviada: new Date().toISOString(),
        })
        .eq('id', convertidoId);

      return new Response(JSON.stringify({ success: true, message: 'Mensagem de boas-vindas enviada!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'convite_evento') {
      const { data: convertido, error: convError } = await supabase
        .from('novos_convertidos')
        .select('*')
        .eq('id', convertidoId)
        .single();

      if (convError || !convertido) {
        throw new Error('Convertido não encontrado');
      }

      if (!convertido.whatsapp) {
        throw new Error('WhatsApp não cadastrado');
      }

      const { data: evento, error: eventoError } = await supabase
        .from('agenda_igreja')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (eventoError || !evento) {
        throw new Error('Evento não encontrado');
      }

      // Verificar se o evento é adequado para o gênero
      if (evento.genero_alvo !== 'todos' && evento.genero_alvo !== convertido.genero) {
        throw new Error('Evento não adequado para o gênero do convertido');
      }

      // Verificar idade se necessário
      if (convertido.data_nascimento && (evento.idade_minima || evento.idade_maxima)) {
        const idade = calcularIdade(convertido.data_nascimento);
        if (evento.idade_minima && idade < evento.idade_minima) {
          throw new Error('Idade mínima não atingida para o evento');
        }
        if (evento.idade_maxima && idade > evento.idade_maxima) {
          throw new Error('Idade máxima excedida para o evento');
        }
      }

      const mensagem = gerarMensagemConvite(convertido.full_name, evento, convertido.mensagens_enviadas || 0);
      
      await enviarMensagemZAPI(convertido.whatsapp, mensagem);

      await supabase.from('mensagens_whatsapp').insert({
        novo_convertido_id: convertidoId,
        tipo_mensagem: 'convite_evento',
        evento_id: eventoId,
        conteudo: mensagem,
      });

      await supabase
        .from('novos_convertidos')
        .update({
          mensagens_enviadas: (convertido.mensagens_enviadas || 0) + 1,
          ultima_mensagem_enviada: new Date().toISOString(),
        })
        .eq('id', convertidoId);

      return new Response(JSON.stringify({ success: true, message: 'Convite enviado!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'listar_eventos_disponiveis') {
      const { data: convertido } = await supabase
        .from('novos_convertidos')
        .select('genero, data_nascimento')
        .eq('id', convertidoId)
        .single();

      const hoje = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('agenda_igreja')
        .select('*')
        .eq('ativo', true)
        .gte('data_evento', hoje)
        .order('data_evento');

      const { data: eventos, error } = await query;

      if (error) throw error;

      // Filtrar eventos adequados
      const eventosFiltrados = eventos?.filter(evento => {
        if (evento.genero_alvo !== 'todos' && convertido?.genero && evento.genero_alvo !== convertido.genero) {
          return false;
        }
        if (convertido?.data_nascimento) {
          const idade = calcularIdade(convertido.data_nascimento);
          if (evento.idade_minima && idade < evento.idade_minima) return false;
          if (evento.idade_maxima && idade > evento.idade_maxima) return false;
        }
        return true;
      }) || [];

      return new Response(JSON.stringify({ eventos: eventosFiltrados }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Ação não reconhecida');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
