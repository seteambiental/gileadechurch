import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Remove caracteres não numéricos
  let numero = telefone.replace(/\D/g, '');
  
  // Adiciona código do país se não tiver
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

    // Buscar presenças do dia
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
      console.log('Nenhuma ausência registrada');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma ausência registrada', notificacoes: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontradas ${ausencias.length} ausências`);

    // Buscar responsáveis para cada criança ausente
    const criancasAusentes: CriancaAusente[] = [];

    for (const ausencia of ausencias) {
      // Buscar responsáveis
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

      if (!responsaveis || responsaveis.length === 0) {
        console.log(`Nenhum responsável cadastrado para criança ${ausencia.member_id || ausencia.novo_convertido_id}`);
        continue;
      }

      // Buscar nome da criança
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

    console.log(`${criancasAusentes.length} notificações a enviar`);

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

    // Enviar notificações via Z-API
    const zapiToken = Deno.env.get('ZAPI_TOKEN');
    const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const zapiClientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

    let enviadas = 0;
    let erros = 0;

    for (const item of criancasAusentes) {
      const dataFormatada = new Date(item.data_culto + 'T12:00:00').toLocaleDateString('pt-BR');
      
      const mensagem = `Olá ${item.responsavel_nome.split(' ')[0]}! 👋

Sentimos falta de *${item.crianca_nome}* no culto Kids de hoje (${dataFormatada}) na turma ${getTurmaNome(item.turma)}.

Esperamos vocês no próximo culto! 🙏

Com carinho,
Ministério Kids - Igreja Gileade`;

      // Registrar no log
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
        // Apenas registrar, não enviar
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'pendente',
        });
        enviadas++;
        continue;
      }

      // Enviar via Z-API
      if (!zapiToken || !zapiInstanceId) {
        console.log('Z-API não configurado, apenas registrando');
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: 'Z-API não configurado',
        });
        erros++;
        continue;
      }

      try {
        const telefoneFormatado = formatarTelefone(item.responsavel_whatsapp);
        
        const response = await fetch(
          `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': zapiClientToken || '',
            },
            body: JSON.stringify({
              phone: telefoneFormatado,
              message: mensagem,
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          await supabase.from('kids_notificacoes_log').insert({
            ...logData,
            status: 'enviada',
          });
          enviadas++;
          console.log(`Notificação enviada para ${item.responsavel_nome}`);
        } else {
          await supabase.from('kids_notificacoes_log').insert({
            ...logData,
            status: 'erro',
            erro_mensagem: result.message || 'Erro ao enviar',
          });
          erros++;
          console.error(`Erro ao enviar para ${item.responsavel_nome}:`, result);
        }
      } catch (error: any) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: error.message,
        });
        erros++;
        console.error(`Erro ao enviar notificação:`, error);
      }

      // Delay de 30 segundos entre envios para evitar spam
      await new Promise(resolve => setTimeout(resolve, 30000));
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
