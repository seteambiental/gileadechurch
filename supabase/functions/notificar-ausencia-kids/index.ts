import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  enviarTextoWhatsApp,
  whatsappConfigurado,
} from "../_shared/whatsapp-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CriancaAusente {
  crianca_id: string;
  crianca_nome: string;
  crianca_tipo: 'membro' | 'novo_convertido';
  turma: string;
  data_culto: string;
  responsavel_id: string;
  responsavel_nome: string;
  responsavel_whatsapp: string;
}

const formatarTelefone = (telefone: string): string => {
  let numero = telefone.replace(/\D/g, '');
  if (!numero.startsWith('55')) {
    numero = '55' + numero;
  }
  return numero;
};

const getTurmaNome = (turma: string): string => {
  const nomes: Record<string, string> = {
    laranja: 'Laranja (4-5 anos)',
    amarelo: 'Amarelo (6-7 anos)',
    verde: 'Verde (8-9 anos)',
    azul: 'Azul (10-11 anos)',
  };
  return nomes[turma] || turma;
};

async function enviarMensagemEvolution(telefone: string, mensagem: string) {
  return await enviarTextoWhatsApp(telefone, mensagem);
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

    const { data_culto, turma, enviar_agora = false } = await req.json();

    if (!data_culto) {
      throw new Error('Data do culto é obrigatória');
    }

    console.log(`Processando notificações de ausência para ${data_culto}, turma: ${turma || 'todas'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let presencasQuery = supabase
      .from('kids_presencas')
      .select('*')
      .eq('data_culto', data_culto)
      .eq('presente', false);

    if (turma) {
      presencasQuery = presencasQuery.eq('turma', turma);
    }

    const { data: ausencias, error: ausenciasError } = await presencasQuery;

    if (ausenciasError) {
      throw new Error(`Erro ao buscar ausências: ${ausenciasError.message}`);
    }

    if (!ausencias || ausencias.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma ausência registrada', notificacoes: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontradas ${ausencias.length} ausências`);

    const criancasAusentes: CriancaAusente[] = [];

    for (const ausencia of ausencias) {
      let responsaveisQuery = supabase
        .from('kids_responsaveis')
        .select(`
          *,
          responsavel:members!kids_responsaveis_responsavel_member_id_fkey(id, full_name, whatsapp)
        `)
        .eq('notificar_ausencia', true);

      if (ausencia.member_id) {
        responsaveisQuery = responsaveisQuery.eq('crianca_member_id', ausencia.member_id);
      } else if (ausencia.novo_convertido_id) {
        responsaveisQuery = responsaveisQuery.eq('crianca_novo_convertido_id', ausencia.novo_convertido_id);
      }

      const { data: responsaveis, error: respError } = await responsaveisQuery;

      if (respError) {
        console.error(`Erro ao buscar responsáveis: ${respError.message}`);
        continue;
      }

      if (!responsaveis || responsaveis.length === 0) continue;

      let criancaNome = '';
      if (ausencia.member_id) {
        const { data: member } = await supabase
          .from('members')
          .select('full_name')
          .eq('id', ausencia.member_id)
          .single();
        criancaNome = member?.full_name || 'Criança';
      } else if (ausencia.novo_convertido_id) {
        const { data: nc } = await supabase
          .from('novos_convertidos')
          .select('full_name')
          .eq('id', ausencia.novo_convertido_id)
          .single();
        criancaNome = nc?.full_name || 'Criança';
      }

      for (const resp of responsaveis) {
        if (resp.responsavel?.whatsapp) {
          criancasAusentes.push({
            crianca_id: ausencia.member_id || ausencia.novo_convertido_id,
            crianca_nome: criancaNome,
            crianca_tipo: ausencia.member_id ? 'membro' : 'novo_convertido',
            turma: ausencia.turma,
            data_culto: data_culto,
            responsavel_id: resp.responsavel.id,
            responsavel_nome: resp.responsavel.full_name,
            responsavel_whatsapp: resp.responsavel.whatsapp,
          });
        }
      }
    }

    if (criancasAusentes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum responsável com WhatsApp cadastrado para as crianças ausentes', 
          notificacoes: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let enviadas = 0;
    let erros = 0;

    for (const item of criancasAusentes) {
      const dataFormatada = new Date(item.data_culto + 'T12:00:00').toLocaleDateString('pt-BR');
      
      const mensagem = `Olá ${item.responsavel_nome.split(' ')[0]}! 👋

Sentimos falta de *${item.crianca_nome}* no culto Kids de hoje (${dataFormatada}) na turma ${getTurmaNome(item.turma)}.

Esperamos vocês no próximo culto! 🙏

Com carinho,
Ministério Kids - Igreja Gileade`;

      const logData = {
        crianca_member_id: item.crianca_tipo === 'membro' ? item.crianca_id : null,
        crianca_novo_convertido_id: item.crianca_tipo === 'novo_convertido' ? item.crianca_id : null,
        responsavel_member_id: item.responsavel_id,
        tipo_notificacao: 'ausencia',
        data_culto: item.data_culto,
        turma: item.turma,
        mensagem: mensagem,
        whatsapp_destino: item.responsavel_whatsapp,
        status: 'pendente',
      };

      if (!enviar_agora) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'pendente',
        });
        enviadas++;
        continue;
      }

      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: 'Evolution API não configurada',
        });
        erros++;
        continue;
      }

      try {
        await enviarMensagemEvolution(item.responsavel_whatsapp, mensagem);
        
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'enviada',
        });
        enviadas++;
        console.log(`Notificação enviada para ${item.responsavel_nome}`);
      } catch (error: any) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: error.message,
        });
        erros++;
        console.error(`Erro ao enviar notificação:`, error);
      }

      // Intervalo aleatório entre 15-30s para evitar SPAM
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processamento concluído: ${enviadas} notificações ${enviar_agora ? 'enviadas' : 'registradas'}, ${erros} erros`,
        notificacoes: enviadas,
        erros: erros,
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
