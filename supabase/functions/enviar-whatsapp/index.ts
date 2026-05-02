import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enfileirarComDedupe } from "../_shared/whatsapp-queue.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rawEvolutionUrl = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_URL = rawEvolutionUrl.startsWith('http') ? rawEvolutionUrl : `https://${rawEvolutionUrl}`;
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

// Logo oficial enviada como imagem nas mensagens importantes
// (boas-vindas, inscrição recebida, confirmação de inscrição, cadastro aprovado, aniversário).
// Mantida fora dos fluxos de massa (lembretes, vagas liberadas, escalas) para evitar spam.
const LOGO_GILEADE_URL =
  'https://jwjmseeyjemfwgyizumk.supabase.co/storage/v1/object/public/logos/whatsapp/gileade-logo.jpeg';

// Pausa aleatória entre 5 e 15 segundos para envios em massa relacionados a
// inscrições / cadastros / flyers / mensagens segmentadas, conforme política.
function randomBulkDelayMs() {
  return Math.floor(Math.random() * 10_000) + 5_000; // 5000..14999
}

async function delayBulk() {
  await new Promise((resolve) => setTimeout(resolve, randomBulkDelayMs()));
}

const MENSAGEM_INSCRICAO_RECEBIDA = (primeiroNome: string, tituloEvento?: string) =>
  `🙏 *Olá, ${primeiroNome}!*\n\nSomos da *Gileade Church*.\n\nRecebemos a sua inscrição${tituloEvento ? ` para *${tituloEvento}*` : ""}. Lembre-se que para garantir a sua vaga, é preciso efetuar o pagamento do valor da inscrição.\n\nDúvidas, por favor, chame nesse número! 💙\n\n_Igreja Gileade_`;

const MENSAGEM_CADASTRO_APROVADO = (primeiroNome: string) =>
  `🎉 *Olá, ${primeiroNome}!*\n\nSomos da *Gileade Church*.\n\nSeja bem-vindo(a) à família Gileade! Estamos felizes por receber o seu cadastro de membro.\n\nLembre-se: você é muito especial para nós. 💙\n\n_Igreja Gileade_`;

// Telefone(s) que recebem notificação interna de novas inscrições.
// Vanderlei Aparecido Pedro – administrador responsável.
const ADMIN_NOTIF_INSCRICAO_TELEFONES = ['41991735186'];

const MENSAGEM_ADMIN_NOVA_INSCRICAO = (
  nomeInscrito: string,
  tituloEvento?: string | null,
) =>
  `🆕 *Nova inscrição recebida*\n\n👤 ${nomeInscrito}${tituloEvento ? `\n📌 ${tituloEvento}` : ''}\n\n_Sistema Gileade_`;

// Busca um template personalizado configurado em Configurações Gerais.
// Retorna a string da mensagem ou null se não existir/erro.
async function getCustomTemplate(
  supabaseClient: any,
  eventoId: string | null | undefined,
  eventoTipo: 'agenda' | 'impacto' | null | undefined,
  tipoMensagem: 'confirmacao_inscricao' | 'inscricao_recebida' | 'lembrete_pagamento' | 'vaga_liberada',
): Promise<string | null> {
  if (!eventoId) return null;
  try {
    const query = supabaseClient
      .from('mensagens_evento_templates')
      .select('mensagem, evento_tipo')
      .eq('evento_id', eventoId)
      .eq('tipo_mensagem', tipoMensagem);
    const { data, error } = eventoTipo
      ? await query.eq('evento_tipo', eventoTipo).maybeSingle()
      : await query.limit(1).maybeSingle();
    if (error) {
      console.warn('Erro ao buscar template personalizado:', error.message);
      return null;
    }
    return data?.mensagem || null;
  } catch (e) {
    console.warn('Falha ao buscar template personalizado:', e);
    return null;
  }
}

async function getLinkGrupoWhatsapp(
  supabaseClient: any,
  eventoId: string | null | undefined,
  eventoTipo: 'agenda' | 'impacto' | null | undefined,
): Promise<string | null> {
  if (!eventoId) return null;

  const sources = eventoTipo === 'impacto'
    ? ['impacto_eventos', 'agenda_igreja']
    : eventoTipo === 'agenda'
      ? ['agenda_igreja', 'impacto_eventos']
      : ['agenda_igreja', 'impacto_eventos'];

  for (const table of sources) {
    try {
      const { data, error } = await supabaseClient
        .from(table)
        .select('link_grupo_whatsapp')
        .eq('id', eventoId)
        .maybeSingle();

      if (!error && data?.link_grupo_whatsapp) {
        return data.link_grupo_whatsapp;
      }
    } catch (e) {
      console.warn(`Falha ao buscar link do grupo em ${table}:`, e);
    }
  }

  return null;
}

function primeiroNomeDe(nome?: string | null) {
  return (nome || '').trim().split(/\s+/)[0] || '';
}

function formatarDataPt(data?: string | null) {
  if (!data) return '';
  try {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return data;
  }
}

function preencherTemplate(
  template: string,
  vars: {
    nomeCompleto?: string | null;
    nome?: string | null;
    evento?: string | null;
    data?: string | null;
    hora?: string | null;
    local?: string | null;
    formaPagamento?: string | null;
    preferencia?: string | null;
    responsavel?: string | null;
  },
) {
  const nomeCompleto = (vars.nomeCompleto || vars.nome || '').trim();
  const primeiroNome = primeiroNomeDe(nomeCompleto);
  const valores: Record<string, string> = {
    NOME_COMPLETO: nomeCompleto,
    NOME: primeiroNome || nomeCompleto,
    EVENTO: vars.evento || 'o evento',
    DATA: vars.data || '',
    HORA: vars.hora || '',
    LOCAL: vars.local || 'A confirmar',
    FORMA_PAGAMENTO: vars.formaPagamento || '',
    PAGAMENTO: vars.formaPagamento || '',
    PREFERENCIA: vars.preferencia || '',
    RESPONSAVEL: vars.responsavel || '',
  };

  return Object.entries(valores).reduce((texto, [chave, valor]) => {
    return texto.replace(new RegExp(`\\{\\s*${chave}\\s*\\}`, 'gi'), valor);
  }, template);
}

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

async function enviarMensagemEvolution(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  
  console.log(`Enviando mensagem Evolution para: ${phoneFormatted}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY || '',
    },
    body: JSON.stringify({
      number: phoneFormatted,
      text: mensagem,
    }),
  });
  
  const result = await response.json();
  console.log('Resposta Evolution:', JSON.stringify(result).substring(0, 300));
  
  if (!response.ok) {
    const detail = typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result.message || result.error || `Erro ao enviar mensagem: ${detail}`);
  }
  
  return result;
}

async function enviarImagemEvolution(telefone: string, imageUrl: string, caption?: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`;
  
  console.log(`Enviando imagem Evolution para: ${phoneFormatted}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY || '',
    },
    body: JSON.stringify({
      number: phoneFormatted,
      mediatype: 'image',
      media: imageUrl,
      caption: caption || '',
    }),
  });
  
  const result = await response.json();
  console.log('Resposta Evolution imagem:', JSON.stringify(result).substring(0, 300));
  
  if (!response.ok) {
    const detail = typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result.message || result.error || `Erro ao enviar imagem: ${detail}`);
  }
  
  return result;
}

async function enviarImagemComFallbackTexto(telefone: string, imageUrl: string, caption: string) {
  try {
    return await enviarImagemEvolution(telefone, imageUrl, caption);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Falha ao enviar imagem; tentando texto. Motivo: ${msg}`);
    return await enviarMensagemEvolution(telefone, caption);
  }
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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: _claims, error: _authErr } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (_authErr || !_claims?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, convertidoId, eventoId, flyerUrl, grupo, evento } = body;
    console.log(`Action: ${action}, ConvertidoId: ${convertidoId}`);

    if (action === 'boas_vindas') {
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
      
      await enviarImagemComFallbackTexto(convertido.whatsapp, LOGO_GILEADE_URL, mensagem);

      await supabase.from('mensagens_whatsapp').insert({
        novo_convertido_id: convertidoId,
        tipo_mensagem: 'boas_vindas',
        conteudo: mensagem,
      });

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

      if (evento.genero_alvo !== 'todos' && evento.genero_alvo !== convertido.genero) {
        throw new Error('Evento não adequado para o gênero do convertido');
      }

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
      
      await enviarMensagemEvolution(convertido.whatsapp, mensagem);

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

    if (action === 'enviar_flyer') {
      if (!flyerUrl) {
        throw new Error('URL do flyer é obrigatória');
      }

      console.log(`Enviando flyer para grupo: ${grupo}`);
      
      let generoFiltro: string | null = null;
      let idadeMinima: number | null = null;
      let idadeMaxima: number | null = null;
      
      switch (grupo) {
        case 'homens':
          generoFiltro = 'masculino';
          idadeMinima = 18;
          break;
        case 'mulheres':
          generoFiltro = 'feminino';
          idadeMinima = 18;
          break;
        case 'jovens':
          idadeMinima = 18;
          idadeMaxima = 35;
          break;
        case 'adolescentes':
          idadeMinima = 12;
          idadeMaxima = 17;
          break;
        case 'criancas':
          idadeMaxima = 11;
          break;
      }

      let query = supabase
        .from('members')
        .select('id, full_name, whatsapp, genero, birth_date')
        .not('whatsapp', 'is', null);

      if (generoFiltro) {
        query = query.eq('genero', generoFiltro);
      }

      const { data: membros, error: membrosError } = await query;

      if (membrosError) {
        throw new Error('Erro ao buscar membros');
      }

      const membrosFiltrados = membros?.filter(membro => {
        if (!idadeMinima && !idadeMaxima) return true;
        if (!membro.birth_date) return grupo === 'todos';
        
        const idade = calcularIdade(membro.birth_date);
        if (idadeMinima && idade < idadeMinima) return false;
        if (idadeMaxima && idade > idadeMaxima) return false;
        return true;
      }) || [];

      console.log(`Encontrados ${membrosFiltrados.length} membros para envio`);

      const caption = evento?.titulo 
        ? `📢 *${evento.titulo}*\n\n${evento.descricao || 'Não perca esse evento especial!'}\n\n📅 ${evento.data_evento ? new Date(evento.data_evento).toLocaleDateString('pt-BR') : ''} ${evento.hora_inicio ? `às ${evento.hora_inicio}` : ''}\n📍 ${evento.local || 'Igreja Gileade'}\n\n_Igreja Gileade_ 💙`
        : '📢 Confira esse evento especial!\n\n_Igreja Gileade_ 💙';

      let enviados = 0;
      let erros = 0;
      
      for (const membro of membrosFiltrados) {
        if (!membro.whatsapp) continue;
        
        try {
          await enviarImagemEvolution(membro.whatsapp, flyerUrl, caption);
          enviados++;
          console.log(`Flyer enviado para ${membro.full_name}`);
          
          // Intervalo aleatório entre 15-30s para evitar SPAM
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
        } catch (err) {
          console.error(`Erro ao enviar para ${membro.full_name}:`, err);
          erros++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Flyer enviado para ${enviados} pessoas. ${erros > 0 ? `${erros} falhas.` : ''}`,
        enviados,
        erros,
        total: membrosFiltrados.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirmacao_inscricao') {
      const { inscricaoId, evento } = body;
      
      const { data: inscricao, error: inscError } = await supabase
        .from('inscricoes_eventos')
        .select('*')
        .eq('id', inscricaoId)
        .single();

      if (inscError || !inscricao) {
        throw new Error('Inscrição não encontrada');
      }

      if (!inscricao.telefone_contato) {
        throw new Error('Telefone não cadastrado na inscrição');
      }

      // Buscar link do grupo de WhatsApp configurado no evento (caso não tenha sido enviado no body)
      const linkGrupoWhatsapp = evento?.link_grupo_whatsapp || await getLinkGrupoWhatsapp(supabase, inscricao.evento_id, 'agenda');

      const primeiroNome = primeiroNomeDe(inscricao.nome_participante);
      const dataFormatada = formatarDataPt(evento?.data_evento);
      
      const horaFormatada = evento?.hora_inicio ? ` às ${evento.hora_inicio.substring(0, 5)}` : '';
      
      const formaPagamentoMap: Record<string, string> = {
        pix: 'PIX',
        cartao_credito: 'Cartão de Crédito',
        cartao_debito: 'Cartão de Débito'
      };
      const formaPagamentoLabel = formaPagamentoMap[inscricao.forma_pagamento] || inscricao.forma_pagamento;

      const belicheMap: Record<string, string> = {
        cima: 'Beliche de cima',
        baixo: 'Beliche de baixo',
        indiferente: 'Sem preferência de beliche'
      };
      const belicheLabel = belicheMap[inscricao.preferencia_beliche || 'indiferente'] || 'Sem preferência';

      let observacoesEspeciais = '';
      if (inscricao.tem_alergia_alimentar && inscricao.descricao_alergia) {
        observacoesEspeciais += `\n⚠️ Alergia: ${inscricao.descricao_alergia}`;
      }
      if (inscricao.toma_medicamento && inscricao.descricao_medicamento) {
        observacoesEspeciais += `\n💊 Medicamento: ${inscricao.descricao_medicamento}`;
      }

      const grupoWhatsappBlock = linkGrupoWhatsapp
        ? `\n\n💬 *Entre no nosso grupo do WhatsApp para receber todas as informações:*\n${linkGrupoWhatsapp}`
        : '';

      const customTemplate = await getCustomTemplate(
        supabase,
        inscricao.evento_id,
        'agenda',
        'confirmacao_inscricao',
      );
      const mensagem = customTemplate
        ? `${preencherTemplate(customTemplate, {
            nomeCompleto: inscricao.nome_participante,
            evento: evento?.titulo,
            data: dataFormatada,
            hora: horaFormatada.trim(),
            local: evento?.local,
            formaPagamento: formaPagamentoLabel,
            preferencia: belicheLabel,
            responsavel: inscricao.nome_responsavel,
          })}${grupoWhatsappBlock}`
        : `✅ *INSCRIÇÃO CONFIRMADA!*\n\nOlá, ${primeiroNome}! 👋\n\nSua inscrição para *${evento?.titulo || 'o evento'}* foi recebida com sucesso!\n\n📅 *Data:* ${dataFormatada}${horaFormatada}\n📍 *Local:* ${evento?.local || 'A confirmar'}\n\n💳 *Forma de pagamento:* ${formaPagamentoLabel}\n🛏️ *Preferência:* ${belicheLabel}${observacoesEspeciais}\n\n${inscricao.is_menor ? `👨‍👩‍👧 *Responsável:* ${inscricao.nome_responsavel}\n` : ''}Em breve entraremos em contato com mais detalhes.${grupoWhatsappBlock}\n\nDeus abençoe! 🙏\n\n_Igreja Gileade_ 💙`;
      
      await enviarImagemComFallbackTexto(inscricao.telefone_contato, LOGO_GILEADE_URL, mensagem);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Confirmação enviada por WhatsApp!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'notificar_vaga_liberada') {
      const { inscricaoId, evento } = body;
      
      const { data: inscricao, error: inscError } = await supabase
        .from('inscricoes_eventos')
        .select('*')
        .eq('id', inscricaoId)
        .single();

      if (inscError || !inscricao) {
        throw new Error('Inscrição não encontrada');
      }

      if (!inscricao.telefone_contato) {
        throw new Error('Telefone não cadastrado');
      }

      const primeiroNome = primeiroNomeDe(inscricao.nome_participante);
      const dataFormatada = formatarDataPt(evento?.data_evento);

      const customTemplate = await getCustomTemplate(
        supabase,
        inscricao.evento_id,
        'agenda',
        'vaga_liberada',
      );
      const mensagem = customTemplate
        ? preencherTemplate(customTemplate, {
            nomeCompleto: inscricao.nome_participante,
            evento: evento?.titulo,
            data: dataFormatada,
            local: evento?.local,
          })
        : `🎉 *VAGA LIBERADA!*\n\nOlá, ${primeiroNome}! 👋\n\nÓtima notícia! Uma vaga foi liberada para *${evento?.titulo || 'o evento'}* e você estava na lista de espera!\n\n📅 *Data:* ${dataFormatada}\n📍 *Local:* ${evento?.local || 'A confirmar'}\n\n✅ Sua inscrição foi automaticamente confirmada!\n\nDeus abençoe! 🙏\n\n_Igreja Gileade_ 💙`;
      
      await enviarMensagemEvolution(inscricao.telefone_contato, mensagem);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notificação de vaga liberada enviada!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'lembrete_pagamento') {
      const { inscricaoId, evento } = body;
      
      const { data: inscricao, error: inscError } = await supabase
        .from('inscricoes_eventos')
        .select('*')
        .eq('id', inscricaoId)
        .single();

      if (inscError || !inscricao) {
        throw new Error('Inscrição não encontrada');
      }

      if (!inscricao.telefone_contato) {
        throw new Error('Telefone não cadastrado');
      }

      const primeiroNome = primeiroNomeDe(inscricao.nome_participante);
      const dataFormatada = formatarDataPt(evento?.data_evento);

      const customTemplate = await getCustomTemplate(
        supabase,
        inscricao.evento_id,
        'agenda',
        'lembrete_pagamento',
      );
      const mensagem = customTemplate
        ? preencherTemplate(customTemplate, {
            nomeCompleto: inscricao.nome_participante,
            evento: evento?.titulo,
            data: dataFormatada,
            local: evento?.local,
          })
        : `⏰ *LEMBRETE DE PAGAMENTO*\n\nOlá, ${primeiroNome}! 👋\n\nNotamos que sua inscrição para *${evento?.titulo || 'o evento'}* ainda está com pagamento pendente.\n\n📅 *Data:* ${dataFormatada}\n📍 *Local:* ${evento?.local || 'A confirmar'}\n\nPor favor, regularize seu pagamento para garantir sua vaga! 🙏\n\nQualquer dúvida, estamos à disposição.\n\n_Igreja Gileade_ 💙`;
      
      await enviarMensagemEvolution(inscricao.telefone_contato, mensagem);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Lembrete de pagamento enviado!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'notificar_escala_compartilhada') {
      const { escalaId, ministeriosDestino, ministerioOrigem } = body;
      
      console.log(`Notificando escala ${escalaId} para ministérios:`, ministeriosDestino);

      const { data: escala, error: escalaError } = await supabase
        .from('ministerio_escalas')
        .select('id, data_culto, tipo_culto, ministry_id')
        .eq('id', escalaId)
        .single();

      if (escalaError || !escala) {
        throw new Error('Escala não encontrada');
      }

      const { data: musicas, error: musicasError } = await supabase
        .from('ministerio_repertorio')
        .select('titulo, artista, tom')
        .eq('escala_id', escalaId)
        .order('ordem');

      if (musicasError) {
        throw new Error('Erro ao buscar músicas');
      }

      const dataFormatada = new Date(escala.data_culto).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      const tipoCultoMap: Record<string, string> = {
        domingo: 'Domingo',
        quarta: 'Quarta-feira',
        especial: 'Especial',
        evento: 'Evento'
      };

      let listaMusicas = '';
      musicas?.forEach((m, i) => {
        listaMusicas += `${i + 1}. *${m.titulo}*`;
        if (m.artista) listaMusicas += ` - ${m.artista}`;
        if (m.tom) listaMusicas += ` (Tom: ${m.tom})`;
        listaMusicas += '\n';
      });

      const { data: integrantesLouvor, error: integrantesError } = await supabase
        .from('ministerio_integrantes')
        .select(`
          id,
          member_id,
          members:member_id (full_name, whatsapp)
        `)
        .eq('ministry_id', escala.ministry_id)
        .eq('ativo', true);

      if (integrantesError) {
        console.error('Erro ao buscar integrantes do louvor:', integrantesError);
      }

      const { data: lideresMiniDest } = await supabase
        .from('member_functions')
        .select(`
          id,
          member_id,
          ministry_id,
          members:member_id (full_name, whatsapp)
        `)
        .in('ministry_id', ministeriosDestino)
        .eq('function_type', 'lider_ministerio');

      const { data: integrantesDestino } = await supabase
        .from('ministerio_integrantes')
        .select(`
          id,
          member_id,
          members:member_id (full_name, whatsapp)
        `)
        .in('ministry_id', ministeriosDestino)
        .eq('ativo', true);

      const mensagemLouvor = `🎵 *REPERTÓRIO DO CULTO*\n\n📅 *${dataFormatada}*\nCulto: ${tipoCultoMap[escala.tipo_culto] || escala.tipo_culto}\n\n🎶 *Músicas:*\n${listaMusicas}\nBons ensaios! 🙏\n\n_${ministerioOrigem || 'Ministério de Louvor'}_ 💙`;

      const mensagemOutros = `📢 *REPERTÓRIO COMPARTILHADO*\n\nO Ministério de Louvor compartilhou o repertório para:\n\n📅 *${dataFormatada}*\nCulto: ${tipoCultoMap[escala.tipo_culto] || escala.tipo_culto}\n\n🎶 *Músicas:*\n${listaMusicas}\nPreparem-se! 🙏\n\n_Igreja Gileade_ 💙`;

      let enviados = 0;
      let erros = 0;
      const telefonesEnviados = new Set<string>();

      if (integrantesLouvor) {
        for (const integrante of integrantesLouvor) {
          const membro = integrante.members as any;
          if (membro?.whatsapp && !telefonesEnviados.has(membro.whatsapp)) {
            try {
              await enviarMensagemEvolution(membro.whatsapp, mensagemLouvor);
              telefonesEnviados.add(membro.whatsapp);
              enviados++;
              console.log(`Enviado para ${membro.full_name} (Louvor)`);
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
            } catch (err) {
              console.error(`Erro ao enviar para ${membro.full_name}:`, err);
              erros++;
            }
          }
        }
      }

      if (lideresMiniDest) {
        for (const lider of lideresMiniDest) {
          const membro = lider.members as any;
          if (membro?.whatsapp && !telefonesEnviados.has(membro.whatsapp)) {
            try {
              await enviarMensagemEvolution(membro.whatsapp, mensagemOutros);
              telefonesEnviados.add(membro.whatsapp);
              enviados++;
              console.log(`Enviado para ${membro.full_name} (Líder)`);
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
            } catch (err) {
              console.error(`Erro ao enviar para ${membro.full_name}:`, err);
              erros++;
            }
          }
        }
      }

      if (integrantesDestino) {
        for (const integrante of integrantesDestino) {
          const membro = integrante.members as any;
          if (membro?.whatsapp && !telefonesEnviados.has(membro.whatsapp)) {
            try {
              await enviarMensagemEvolution(membro.whatsapp, mensagemOutros);
              telefonesEnviados.add(membro.whatsapp);
              enviados++;
              console.log(`Enviado para ${membro.full_name} (Integrante)`);
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
            } catch (err) {
              console.error(`Erro ao enviar para ${membro.full_name}:`, err);
              erros++;
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Notificações enviadas para ${enviados} pessoas. ${erros > 0 ? `${erros} falhas.` : ''}`,
        enviados,
        erros
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'notificar_escala_danca') {
      const { escalaId, dataCulto, tipoCulto, equipeNome, subTime, membrosIds } = body;
      
      console.log(`Notificando escala de dança para membros:`, membrosIds);

      const { data: membrosEscalados, error: membrosError } = await supabase
        .from('ministerio_integrantes')
        .select(`
          id,
          member:members(id, full_name, whatsapp)
        `)
        .in('id', membrosIds);

      if (membrosError) {
        console.error('Erro ao buscar membros:', membrosError);
        throw new Error('Erro ao buscar membros');
      }

      const dataFormatada = new Date(dataCulto).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      const tipoCultoMap: Record<string, string> = {
        domingo: 'Domingo',
        quarta: 'Quarta-feira',
        sabado: 'Sábado',
        especial: 'Evento Especial'
      };

      const nomeEquipeCompleto = subTime && subTime !== 'todos' 
        ? `${equipeNome} - ${subTime}` 
        : equipeNome;

      const mensagem = `💃 *ESCALA DE DANÇA*\n\n📅 *${dataFormatada}*\nCulto: ${tipoCultoMap[tipoCulto] || tipoCulto}\n\n👯 *Equipe:* ${nomeEquipeCompleto}\n\nVocê foi escalado(a) para dançar nesse dia! Prepare-se! 🙏\n\n_Ministério de Dança - Igreja Gileade_ 💙`;

      let enviados = 0;
      let erros = 0;

      for (const integrante of membrosEscalados || []) {
        const membro = integrante.member as any;
        if (membro?.whatsapp) {
          try {
            await enviarMensagemEvolution(membro.whatsapp, mensagem);
            enviados++;
            console.log(`Notificação enviada para ${membro.full_name}`);
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
          } catch (err) {
            console.error(`Erro ao enviar para ${membro.full_name}:`, err);
            erros++;
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Notificações enviadas para ${enviados} pessoas. ${erros > 0 ? `${erros} falhas.` : ''}`,
        enviados,
        erros
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'agradecimento_missoes') {
      const { contribuinteId, valorMensal, cotacaoMZN } = body;
      
      console.log(`Enviando agradecimento de missões para contribuinte: ${contribuinteId}`);
      
      const { data: contribuinte, error: contError } = await supabase
        .from('missoes_mocambique_contribuintes')
        .select(`
          *,
          member:members(full_name, whatsapp)
        `)
        .eq('id', contribuinteId)
        .single();

      if (contError || !contribuinte) {
        throw new Error('Contribuinte não encontrado');
      }

      const nome = contribuinte.member?.full_name || contribuinte.nome_manual;
      const whatsapp = contribuinte.member?.whatsapp;

      if (!whatsapp) {
        throw new Error('WhatsApp não cadastrado para este contribuinte');
      }

      if (!nome) {
        throw new Error('Nome do contribuinte não encontrado');
      }

      const primeiroNome = nome.split(' ')[0];
      const valor = valorMensal || contribuinte.valor_mensal;
      
      const cotacao = cotacaoMZN || 10.5;
      const valorMZN = valor * cotacao;

      const salarioMinimo = 6500;
      const refeicoesBasicas = Math.floor(valorMZN / 50);
      const kilosArroz = Math.floor(valorMZN / 80);
      const litrosLeite = Math.floor(valorMZN / 100);
      const percentualSalario = ((valorMZN / salarioMinimo) * 100).toFixed(1);

      let comparacaoPoder = '';
      if (valorMZN >= salarioMinimo) {
        const salarios = (valorMZN / salarioMinimo).toFixed(1);
        comparacaoPoder = `💼 Equivale a *${salarios} salário(s) mínimo(s)* de um trabalhador moçambicano!`;
      } else if (valorMZN >= salarioMinimo * 0.5) {
        comparacaoPoder = `💼 Representa *${percentualSalario}%* do salário mínimo de um trabalhador!`;
      } else {
        comparacaoPoder = `💼 Representa *${percentualSalario}%* do salário mínimo local!`;
      }

      const mensagem = `🙏 *Olá, ${primeiroNome}!*\n\nQueremos agradecer imensamente pelo seu carinho e fidelidade no apoio às *Missões Moçambique*! 🌍\n\nSua oferta de *R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* se transforma em *${valorMZN.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Meticais* em Moçambique!\n\n📊 *O que isso representa lá:*\n${comparacaoPoder}\n🍚 Pode comprar *${kilosArroz} kg de arroz*\n🥛 Ou *${litrosLeite} litros de leite*\n🍽️ Ou *${refeicoesBasicas} refeições básicas*\n\nCada centavo faz diferença na vida de famílias que precisam! Você está ajudando a transformar vidas e levar esperança. 💙\n\n_"Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria."_ - 2 Coríntios 9:7\n\nQue Deus multiplique essa semente! 🌱\n\n_Igreja Gileade - Missões Moçambique_ 🇲🇿`;
      
      await enviarMensagemEvolution(whatsapp, mensagem);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Mensagem de agradecimento enviada!',
        valorMZN,
        cotacaoUsada: cotacao
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'lembrete_missoes') {
      console.log('Executando lembrete automático de missões...');
      
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const diaAmanha = amanha.getDate();
      const mesAtual = hoje.toISOString().slice(0, 7);

      const { data: contribuintes, error: contError } = await supabase
        .from('missoes_mocambique_contribuintes')
        .select(`
          *,
          member:members(full_name, whatsapp)
        `)
        .eq('ativo', true)
        .eq('dia_vencimento', diaAmanha)
        .or(`lembrete_enviado_mes.is.null,lembrete_enviado_mes.neq.${mesAtual}`);

      if (contError) {
        throw new Error('Erro ao buscar contribuintes');
      }

      console.log(`Encontrados ${contribuintes?.length || 0} contribuintes para lembrete`);

      let enviados = 0;
      let erros = 0;

      for (const contribuinte of contribuintes || []) {
        const nome = contribuinte.member?.full_name || contribuinte.nome_manual;
        const whatsapp = contribuinte.member?.whatsapp;

        if (!whatsapp || !nome) {
          console.log(`Contribuinte ${contribuinte.id} sem WhatsApp ou nome`);
          continue;
        }

        try {
          const primeiroNome = nome.split(' ')[0];
          const valor = contribuinte.valor_mensal;
          const diaVencimento = contribuinte.dia_vencimento || 10;

          const mensagem = `🙏 Olá, ${primeiroNome}!\n\nEste é um lembrete carinhoso sobre sua contribuição para as *Missões Moçambique*! 🌍\n\nAmanhã, dia *${diaVencimento}*, é o dia do seu compromisso mensal de *R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*.\n\nSua fidelidade transforma vidas! Cada centavo faz diferença para as famílias em Moçambique. 💙\n\n_"Lembrai-vos das palavras do Senhor Jesus, que disse: Mais bem-aventurada coisa é dar do que receber."_ - Atos 20:35\n\nDeus abençoe você! 🙌\n\n_Igreja Gileade - Missões Moçambique_ 🇲🇿`;

          await enviarMensagemEvolution(whatsapp, mensagem);

          await supabase
            .from('missoes_mocambique_contribuintes')
            .update({ lembrete_enviado_mes: mesAtual })
            .eq('id', contribuinte.id);

          enviados++;
          console.log(`Lembrete enviado para ${nome}`);

          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
        } catch (err) {
          console.error(`Erro ao enviar lembrete para ${nome}:`, err);
          erros++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Lembretes enviados: ${enviados}. Erros: ${erros}`,
        enviados,
        erros
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'teste_conexao') {
      // Testar conexão com Evolution API
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Variáveis da Evolution API não configuradas',
          config: {
            url: !!EVOLUTION_API_URL,
            key: !!EVOLUTION_API_KEY,
            instance: !!EVOLUTION_INSTANCE_NAME,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const statusUrl = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`;
      const statusResp = await fetch(statusUrl, {
        headers: { 'apikey': EVOLUTION_API_KEY },
      });
      const statusData = await statusResp.json();

      return new Response(JSON.stringify({ 
        success: statusResp.ok, 
        instance: EVOLUTION_INSTANCE_NAME,
        status: statusData,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'mensagem_direta') {
      const { telefone, mensagem } = body;
      if (!telefone || !mensagem) {
        throw new Error('Telefone e mensagem são obrigatórios');
      }

      await enviarMensagemEvolution(telefone, mensagem);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== INSCRIÇÃO RECEBIDA (qualquer evento/módulo) =====
    if (action === 'inscricao_recebida') {
      const { telefone, nome, tituloEvento, eventoId, eventoTipo } = body;
      if (!telefone || !nome) {
        throw new Error('Telefone e nome são obrigatórios');
      }
      const primeiroNome = primeiroNomeDe(String(nome));
      const resolvedEventoTipo = eventoTipo === 'impacto' ? 'impacto' : eventoTipo === 'agenda' ? 'agenda' : null;
      const customTemplate = await getCustomTemplate(
        supabase,
        eventoId,
        resolvedEventoTipo,
        'inscricao_recebida',
      );
      const linkGrupoWhatsapp = await getLinkGrupoWhatsapp(supabase, eventoId, resolvedEventoTipo);
      const grupoWhatsappBlock = linkGrupoWhatsapp
        ? `\n\n💬 *Entre no nosso grupo do WhatsApp para receber todas as informações:*\n${linkGrupoWhatsapp}`
        : '';
      const mensagem = customTemplate
        ? `${preencherTemplate(customTemplate, {
            nomeCompleto: String(nome),
            evento: tituloEvento,
          })}${grupoWhatsappBlock}`
        : `${MENSAGEM_INSCRICAO_RECEBIDA(primeiroNome, tituloEvento)}${grupoWhatsappBlock}`;
      const r = await enfileirarComDedupe(supabase, {
        tipo: 'inscricao_recebida',
        destinatario_telefone: telefone,
        destinatario_nome: nome,
        conteudo: mensagem,
        midia_url: LOGO_GILEADE_URL,
        evento_id: eventoId || null,
      });

      // Notifica administrador(es) sobre a nova inscrição (texto curto, sem mídia).
      const msgAdmin = MENSAGEM_ADMIN_NOVA_INSCRICAO(String(nome), tituloEvento);
      for (const adminTel of ADMIN_NOTIF_INSCRICAO_TELEFONES) {
        try {
          await enfileirarComDedupe(
            supabase,
            {
              tipo: 'admin_nova_inscricao',
              destinatario_telefone: adminTel,
              destinatario_nome: 'Admin',
              conteudo: msgAdmin,
              evento_id: eventoId || null,
            },
            1, // janela curta de dedupe (1h) — evita duplicar mas permite novas inscrições
          );
        } catch (e) {
          console.warn('Falha ao enfileirar notificação admin:', e);
        }
      }

      return new Response(JSON.stringify({ success: true, ...r }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== CADASTRO APROVADO =====
    if (action === 'cadastro_aprovado') {
      const { telefone, nome, memberId } = body;
      if (!telefone || !nome) {
        throw new Error('Telefone e nome são obrigatórios');
      }
      const primeiroNome = String(nome).split(' ')[0];
      const mensagem = MENSAGEM_CADASTRO_APROVADO(primeiroNome);
      const r = await enfileirarComDedupe(supabase, {
        tipo: 'cadastro_aprovado',
        destinatario_telefone: telefone,
        destinatario_nome: nome,
        destinatario_member_id: memberId || null,
        conteudo: mensagem,
        midia_url: LOGO_GILEADE_URL,
      });
      return new Response(JSON.stringify({ success: true, ...r }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== ENVIO DE FLYER DA HOMEPAGE PARA TODOS OS MEMBROS =====
    if (action === 'enviar_flyer_homepage') {
      const { flyerUrl, caption, eventoId } = body;
      if (!flyerUrl) {
        throw new Error('URL do flyer é obrigatória');
      }

      const { data: membros, error: membrosError } = await supabase
        .from('members')
        .select('id, full_name, whatsapp')
        .not('whatsapp', 'is', null)
        .or('excluido.is.null,excluido.eq.false');

      if (membrosError) throw new Error('Erro ao buscar membros');

      const captionFinal = caption || '📢 Confira este aviso da Igreja Gileade! 💙\n\n_Igreja Gileade_';

      let enfileirados = 0;
      let duplicados = 0;
      for (const membro of membros || []) {
        if (!membro.whatsapp) continue;
        const captionPersonalizada = captionFinal.replace(
          /\{nome\}/g,
          (membro.full_name || '').split(' ')[0],
        );
        const r = await enfileirarComDedupe(supabase, {
          tipo: 'flyer_homepage',
          destinatario_telefone: membro.whatsapp,
          destinatario_nome: membro.full_name,
          destinatario_member_id: membro.id,
          conteudo: captionPersonalizada,
          midia_url: flyerUrl,
          evento_id: eventoId || null,
        });
        if (r.enfileirado) enfileirados++;
        else duplicados++;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${enfileirados} envio(s) na fila. ${duplicados} duplicado(s) ignorado(s). O processamento ocorre automaticamente com pausa de 5 a 15 segundos entre mensagens.`,
        enfileirados,
        duplicados,
        total: (membros || []).length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== ENVIO SEGMENTADO PARA GRUPOS DE LIDERANÇA / MEMBROS =====
    // body: { mensagem, segmentos: string[], ministerioId?: string }
    // segmentos suportados:
    //  - 'todos_membros'
    //  - 'lideres_ministerio'
    //  - 'lideres_casa_refugio'
    //  - 'supervisores_casa_refugio'
    //  - 'sindicos_condominio'
    //  - 'pastores'
    //  - 'integrantes_ministerio' (requer ministerioId)
    if (action === 'enviar_segmentado') {
      const { mensagem, segmentos, ministerioId } = body as {
        mensagem: string;
        segmentos: string[];
        ministerioId?: string;
      };
      if (!mensagem || !Array.isArray(segmentos) || segmentos.length === 0) {
        throw new Error('Mensagem e ao menos um segmento são obrigatórios');
      }

      const memberIdsSet = new Set<string>();

      // Helper para coletar member_ids por function_type
      async function coletarPorFuncao(funcoes: string[], filtroMinisterio?: string) {
        let q = supabase
          .from('member_functions')
          .select('member_id, ministry_id')
          .in('function_type', funcoes);
        if (filtroMinisterio) q = q.eq('ministry_id', filtroMinisterio);
        const { data, error } = await q;
        if (error) throw new Error(`Erro coletando ${funcoes.join(',')}: ${error.message}`);
        for (const r of data || []) {
          if (r.member_id) memberIdsSet.add(r.member_id as string);
        }
      }

      if (segmentos.includes('todos_membros')) {
        const { data: todos, error } = await supabase
          .from('members')
          .select('id')
          .not('whatsapp', 'is', null)
          .or('excluido.is.null,excluido.eq.false');
        if (error) throw new Error('Erro buscando membros');
        for (const r of todos || []) memberIdsSet.add(r.id);
      }
      if (segmentos.includes('lideres_ministerio')) {
        await coletarPorFuncao(['lider_ministerio']);
      }
      if (segmentos.includes('lideres_casa_refugio')) {
        await coletarPorFuncao(['lider_casa_refugio', 'secretario_casa_refugio']);
      }
      if (segmentos.includes('supervisores_casa_refugio')) {
        await coletarPorFuncao(['supervisor_casa_refugio']);
      }
      if (segmentos.includes('sindicos_condominio')) {
        await coletarPorFuncao(['sindico_condominio']);
      }
      if (segmentos.includes('pastores')) {
        // Pastores são identificados via user_roles
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['pastor_geral', 'pastor_auxiliar']);
        if (error) throw new Error('Erro buscando pastores');
        const userIds = (roles || []).map((r) => r.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: membersPastores } = await supabase
            .from('members')
            .select('id')
            .in('user_id', userIds);
          for (const m of membersPastores || []) memberIdsSet.add(m.id);
        }
      }
      if (segmentos.includes('integrantes_ministerio')) {
        if (!ministerioId) {
          throw new Error('Ministério é obrigatório para enviar a integrantes');
        }
        const { data: integrantes, error } = await supabase
          .from('ministerio_integrantes')
          .select('member_id')
          .eq('ministry_id', ministerioId)
          .eq('ativo', true);
        if (error) throw new Error('Erro buscando integrantes');
        for (const r of integrantes || []) {
          if (r.member_id) memberIdsSet.add(r.member_id as string);
        }
      }

      if (memberIdsSet.size === 0) {
        return new Response(JSON.stringify({
          success: true,
          enviados: 0,
          erros: 0,
          message: 'Nenhum destinatário encontrado para os segmentos escolhidos',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const ids = Array.from(memberIdsSet);
      const { data: destinatarios, error: destError } = await supabase
        .from('members')
        .select('id, full_name, whatsapp')
        .in('id', ids)
        .not('whatsapp', 'is', null);
      if (destError) throw new Error('Erro carregando destinatários');

      let enfileirados = 0;
      let duplicados = 0;
      const segLabel = segmentos.join('+');

      for (const dest of destinatarios || []) {
        if (!dest.whatsapp) continue;
        const primeiroNome = (dest.full_name || '').split(' ')[0];
        const msgPersonalizada = String(mensagem).replace(/\{nome\}/g, primeiroNome);
        const r = await enfileirarComDedupe(supabase, {
          tipo: 'segmentado_membros',
          segmento: segLabel,
          destinatario_telefone: dest.whatsapp,
          destinatario_nome: dest.full_name,
          destinatario_member_id: dest.id,
          conteudo: msgPersonalizada,
        });
        if (r.enfileirado) enfileirados++;
        else duplicados++;
      }

      return new Response(JSON.stringify({
        success: true,
        enfileirados,
        duplicados,
        total: destinatarios?.length || 0,
        message: `${enfileirados} mensagem(ns) na fila. ${duplicados} duplicado(s) ignorado(s). O envio é gradual (5–15s entre mensagens).`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
