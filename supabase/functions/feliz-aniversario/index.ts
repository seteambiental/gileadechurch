import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enviarImagemComFallbackTexto } from "../_shared/whatsapp-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Logo oficial enviada como imagem em mensagens importantes
const LOGO_GILEADE_URL =
  'https://jwjmseeyjemfwgyizumk.supabase.co/storage/v1/object/public/logos/whatsapp/gileade-logo.jpeg';

const versiculosAniversario = [
  { texto: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", referencia: "Jeremias 29:11" },
  { texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.", referencia: "Números 6:24-25" },
  { texto: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.", referencia: "Salmos 118:24" },
  { texto: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome.", referencia: "Salmos 103:1" },
  { texto: "O Senhor é a minha força e o meu escudo; nele o meu coração confia, e dele recebo ajuda.", referencia: "Salmos 28:7" },
  { texto: "Grandes coisas fez o Senhor por nós, e por isso estamos alegres.", referencia: "Salmos 126:3" },
  { texto: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", referencia: "Eclesiastes 3:1" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Intervalo aleatório anti-SPAM entre destinatários (15-30s).
const intervaloAntiSpam = () => Math.floor(Math.random() * 15000) + 15000;

// Erros do provedor que valem nova tentativa após uma espera.
function erroTemporario(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("5 seconds") ||
    m.includes("account protection") ||
    m.includes("rate") ||
    m.includes("too many") ||
    m.includes("not connected") ||
    m.includes("session") ||
    m.includes("internal server error") ||
    m.includes("status 5")
  );
}

async function enviarMensagemEvolution(telefone: string, mensagem: string) {
  // Envia a logo da Igreja Gileade como imagem com a mensagem na legenda.
  // Faz até 3 tentativas, aguardando entre elas, para contornar a proteção
  // do provedor (limite de 1 mensagem a cada 5s) e quedas momentâneas de sessão.
  const maxTentativas = 3;
  let ultimoErro: unknown = null;
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      return await enviarImagemComFallbackTexto(telefone, LOGO_GILEADE_URL, mensagem);
    } catch (err) {
      ultimoErro = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (tentativa < maxTentativas && erroTemporario(msg)) {
        console.warn(`Tentativa ${tentativa} falhou (${msg}). Nova tentativa em 8s...`);
        await sleep(8000);
        continue;
      }
      throw err;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}

// Extrai o código da mensagem (msgId) da resposta do provedor, quando existir.
function extrairMessageId(resposta: any): string | null {
  if (!resposta || typeof resposta !== "object") return null;
  const d = resposta.data ?? resposta;
  const id =
    d?.msgId ?? d?.messageId ?? d?.id ?? d?.key?.id ?? resposta?.msgId ?? null;
  return id != null ? String(id) : null;
}

// Resumo curto e seguro da resposta do provedor para guardar como "comprovante".
function resumoResposta(resposta: any): string {
  try {
    return JSON.stringify(resposta).slice(0, 800);
  } catch {
    return String(resposta).slice(0, 800);
  }
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

      // Inscritos em eventos do Impacto que NÃO são membros
      const { data: inscritosEventos, error: inscError } = await supabase
        .from('impacto_inscricoes')
        .select('id, nome, telefone, data_nascimento, member_id')
        .is('member_id', null)
        .not('telefone', 'is', null)
        .not('data_nascimento', 'is', null);

      if (inscError) {
        console.error('Erro ao buscar inscritos de eventos:', inscError);
      }

      // Evitar duplicatas por nome com membros e convertidos
      const nomesJa = new Set<string>([
        ...aniversariantes.map(m => (m.full_name || '').trim().toLowerCase()),
        ...aniversariantesConvertidos.map(c => (c.full_name || '').trim().toLowerCase()),
      ]);

      const aniversariantesEventos = (inscritosEventos || []).filter(i => {
        if (!i.data_nascimento || !i.nome) return false;
        const [, mes, dia] = i.data_nascimento.split('-');
        if (mes !== mesAtual || dia !== diaAtual) return false;
        const nomeKey = i.nome.trim().toLowerCase();
        if (nomesJa.has(nomeKey)) return false;
        nomesJa.add(nomeKey);
        return true;
      });

      const dataHoje = hoje.toISOString().split('T')[0];
      const { data: jaEnviados } = await supabase
        .from('aniversarios_enviados')
        .select('member_id, novo_convertido_id, inscricao_evento_id')
        .eq('data_envio', dataHoje)
        .eq('sucesso', true);

      const membrosJaEnviados = new Set(jaEnviados?.filter(e => e.member_id).map(e => e.member_id) || []);
      const convertidosJaEnviados = new Set(jaEnviados?.filter(e => e.novo_convertido_id).map(e => e.novo_convertido_id) || []);
      const inscritosJaEnviados = new Set(jaEnviados?.filter((e: any) => e.inscricao_evento_id).map((e: any) => e.inscricao_evento_id) || []);

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
          const resp = await enviarMensagemEvolution(membro.whatsapp, mensagem);

          await supabase.from('aniversarios_enviados').insert({
            member_id: membro.id,
            data_envio: dataHoje,
            sucesso: true,
            message_id: extrairMessageId(resp),
            resposta_provedor: resumoResposta(resp),
          });
          
          enviados++;
          resultados.push({ nome: membro.full_name, sucesso: true });
          console.log(`✅ Mensagem enviada para ${membro.full_name}`);
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
        // Intervalo anti-SPAM entre destinatários (após sucesso OU falha).
        await sleep(intervaloAntiSpam());
      }

      for (const convertido of aniversariantesConvertidos) {
        if (convertidosJaEnviados.has(convertido.id)) {
          ignorados++;
          resultados.push({ nome: convertido.full_name, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(convertido.full_name, mensagemTemplate);
          const resp = await enviarMensagemEvolution(convertido.whatsapp, mensagem);

          await supabase.from('aniversarios_enviados').insert({
            novo_convertido_id: convertido.id,
            data_envio: dataHoje,
            sucesso: true,
            message_id: extrairMessageId(resp),
            resposta_provedor: resumoResposta(resp),
          });
          
          enviados++;
          resultados.push({ nome: convertido.full_name, sucesso: true });
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
        await sleep(intervaloAntiSpam());
      }

      // Envio para inscritos de eventos (não membros)
      for (const inscrito of aniversariantesEventos) {
        if (inscritosJaEnviados.has(inscrito.id)) {
          ignorados++;
          resultados.push({ nome: inscrito.nome, sucesso: true, ignorado: true });
          continue;
        }

        try {
          const mensagem = gerarMensagemAniversario(inscrito.nome, mensagemTemplate);
          const resp = await enviarMensagemEvolution(inscrito.telefone!, mensagem);

          await supabase.from('aniversarios_enviados').insert({
            inscricao_evento_id: inscrito.id,
            data_envio: dataHoje,
            sucesso: true,
            message_id: extrairMessageId(resp),
            resposta_provedor: resumoResposta(resp),
          });

          enviados++;
          resultados.push({ nome: `${inscrito.nome} (não-membro)`, sucesso: true });
          console.log(`✅ Mensagem (não-membro) enviada para ${inscrito.nome}`);
        } catch (err) {
          erros++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';

          try {
            await supabase.from('aniversarios_enviados').insert({
              inscricao_evento_id: inscrito.id,
              data_envio: dataHoje,
              sucesso: false,
              erro_mensagem: errorMsg,
            });
          } catch {}

          resultados.push({ nome: `${inscrito.nome} (não-membro)`, sucesso: false, erro: errorMsg });
        }
        await sleep(intervaloAntiSpam());
      }

      // ===== Aviso ao administrador (contato principal da igreja) =====
      let adminNotificado = false;
      let adminErro: string | null = null;
      try {
        const todosNomes = [
          ...aniversariantes.map((m) => m.full_name),
          ...aniversariantesConvertidos.map((c) => c.full_name),
          ...aniversariantesEventos.map((i) => i.nome),
        ].filter(Boolean) as string[];

        if (todosNomes.length > 0) {
          const { data: igreja } = await supabase
            .from('igreja_config')
            .select('celular, telefone, nome_fantasia')
            .limit(1)
            .maybeSingle();

          const telAdmin = (igreja?.celular || igreja?.telefone || '').replace(/\D/g, '');

          if (telAdmin && telAdmin.length >= 10) {
            const lista = todosNomes.map((n) => `• ${n}`).join('\n');
            const dataBR = `${diaAtual}/${mesAtual}/${hoje.getFullYear()}`;
            const msgAdmin = [
              `🎂 *Aniversariantes de hoje (${dataBR})*`,
              ``,
              lista,
              ``,
              `Total: ${todosNomes.length} aniversariante(s).`,
              `As mensagens de felicitações foram disparadas automaticamente.`,
              ``,
              `_${igreja?.nome_fantasia || 'Gileade Church'}_`,
            ].join('\n');

            try {
              await enviarMensagemEvolution(telAdmin, msgAdmin);
              adminNotificado = true;
              console.log(`✅ Resumo enviado ao administrador (${telAdmin})`);
            } catch (err) {
              adminErro = err instanceof Error ? err.message : String(err);
              console.error('❌ Falha ao avisar administrador:', adminErro);
            }
          } else {
            adminErro = 'Telefone principal da igreja não configurado';
            console.warn(adminErro);
          }
        }
      } catch (err) {
        adminErro = err instanceof Error ? err.message : String(err);
        console.error('Erro no aviso ao administrador:', adminErro);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Mensagens de aniversário: ${enviados} enviadas, ${ignorados} já enviadas antes, ${erros} falhas`,
        data: dataHoje,
        enviados,
        ignorados,
        erros,
        total: aniversariantes.length + aniversariantesConvertidos.length + aniversariantesEventos.length,
        resultados,
        adminNotificado,
        adminErro,
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
