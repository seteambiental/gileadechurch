import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { mes, ano, enviar_agora = false } = await req.json();

    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();
    
    // Último dia do mês anterior se não especificado
    const mesFiltro = mes ? mesAtual : (mesAtual === 1 ? 12 : mesAtual - 1);
    const anoFiltro = mes ? anoAtual : (mesAtual === 1 ? anoAtual - 1 : anoAtual);

    console.log(`Gerando relatório mensal Kids para ${mesFiltro}/${anoFiltro}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todas as crianças com responsáveis
    const { data: responsaveis, error: respError } = await supabase
      .from('kids_responsaveis')
      .select(`
        *,
        responsavel:members!kids_responsaveis_responsavel_member_id_fkey(id, full_name, whatsapp),
        crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name, birth_date),
        crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name, data_nascimento)
      `)
      .eq('notificar_ausencia', true);

    if (respError) {
      throw new Error(`Erro ao buscar responsáveis: ${respError.message}`);
    }

    if (!responsaveis || responsaveis.length === 0) {
      console.log('Nenhum responsável cadastrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum responsável cadastrado', enviados: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar presenças do mês
    const startDate = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-01`;
    const lastDay = new Date(anoFiltro, mesFiltro, 0).getDate();
    const endDate = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-${lastDay}`;

    const { data: presencas, error: presError } = await supabase
      .from('kids_presencas')
      .select('*')
      .gte('data_culto', startDate)
      .lte('data_culto', endDate);

    if (presError) {
      throw new Error(`Erro ao buscar presenças: ${presError.message}`);
    }

    console.log(`${presencas?.length || 0} registros de presença encontrados`);

    // Agrupar presenças por criança
    const presencasPorCrianca: Record<string, { presentes: number; ausentes: number; turma: string }> = {};
    
    presencas?.forEach((p) => {
      const id = p.member_id || p.novo_convertido_id;
      if (!presencasPorCrianca[id]) {
        presencasPorCrianca[id] = { presentes: 0, ausentes: 0, turma: p.turma };
      }
      if (p.presente) {
        presencasPorCrianca[id].presentes++;
      } else {
        presencasPorCrianca[id].ausentes++;
      }
    });

    // Preparar mensagens
    const zapiToken = Deno.env.get('ZAPI_TOKEN');
    const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const zapiClientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = meses[mesFiltro - 1];

    let enviadas = 0;
    let erros = 0;

    for (const resp of responsaveis) {
      if (!resp.responsavel?.whatsapp) continue;

      const crianca = resp.crianca_member || resp.crianca_nc;
      if (!crianca) continue;

      const criancaId = crianca.id;
      const stats = presencasPorCrianca[criancaId] || { presentes: 0, ausentes: 0, turma: 'desconhecida' };
      const totalCultos = stats.presentes + stats.ausentes;
      const percentual = totalCultos > 0 ? Math.round((stats.presentes / totalCultos) * 100) : 0;

      let emoji = '🌟';
      let mensagemFrequencia = '';
      if (percentual >= 80) {
        emoji = '🏆';
        mensagemFrequencia = 'Parabéns pela excelente frequência!';
      } else if (percentual >= 50) {
        emoji = '👍';
        mensagemFrequencia = 'Continue assim, estamos felizes com sua participação!';
      } else if (totalCultos > 0) {
        emoji = '💙';
        mensagemFrequencia = 'Sentimos sua falta! Esperamos você mais vezes.';
      }

      const mensagem = `Olá ${resp.responsavel.full_name.split(' ')[0]}! ${emoji}

*Relatório Mensal Kids - ${mesNome}/${anoFiltro}*

Criança: *${crianca.full_name}*
Turma: ${getTurmaNome(stats.turma)}

📊 *Frequência do mês:*
✅ Presenças: ${stats.presentes}
❌ Ausências: ${stats.ausentes}
📈 Aproveitamento: ${percentual}%

${mensagemFrequencia}

Com carinho,
Ministério Kids - Igreja Gileade`;

      if (!enviar_agora) {
        // Apenas registrar
        await supabase.from('kids_notificacoes_log').insert({
          crianca_member_id: resp.crianca_member_id,
          crianca_novo_convertido_id: resp.crianca_novo_convertido_id,
          responsavel_member_id: resp.responsavel.id,
          tipo_notificacao: 'relatorio_mensal',
          turma: stats.turma,
          mensagem: mensagem,
          whatsapp_destino: resp.responsavel.whatsapp,
          status: 'pendente',
        });
        enviadas++;
        continue;
      }

      if (!zapiToken || !zapiInstanceId) {
        await supabase.from('kids_notificacoes_log').insert({
          crianca_member_id: resp.crianca_member_id,
          crianca_novo_convertido_id: resp.crianca_novo_convertido_id,
          responsavel_member_id: resp.responsavel.id,
          tipo_notificacao: 'relatorio_mensal',
          turma: stats.turma,
          mensagem: mensagem,
          whatsapp_destino: resp.responsavel.whatsapp,
          status: 'erro',
          erro_mensagem: 'Z-API não configurado',
        });
        erros++;
        continue;
      }

      try {
        const telefoneFormatado = formatarTelefone(resp.responsavel.whatsapp);
        
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
            crianca_member_id: resp.crianca_member_id,
            crianca_novo_convertido_id: resp.crianca_novo_convertido_id,
            responsavel_member_id: resp.responsavel.id,
            tipo_notificacao: 'relatorio_mensal',
            turma: stats.turma,
            mensagem: mensagem,
            whatsapp_destino: resp.responsavel.whatsapp,
            status: 'enviada',
          });
          enviadas++;
          console.log(`Relatório enviado para ${resp.responsavel.full_name}`);
        } else {
          await supabase.from('kids_notificacoes_log').insert({
            crianca_member_id: resp.crianca_member_id,
            crianca_novo_convertido_id: resp.crianca_novo_convertido_id,
            responsavel_member_id: resp.responsavel.id,
            tipo_notificacao: 'relatorio_mensal',
            turma: stats.turma,
            mensagem: mensagem,
            whatsapp_destino: resp.responsavel.whatsapp,
            status: 'erro',
            erro_mensagem: result.message || 'Erro ao enviar',
          });
          erros++;
        }
      } catch (error: any) {
        await supabase.from('kids_notificacoes_log').insert({
          crianca_member_id: resp.crianca_member_id,
          crianca_novo_convertido_id: resp.crianca_novo_convertido_id,
          responsavel_member_id: resp.responsavel.id,
          tipo_notificacao: 'relatorio_mensal',
          turma: stats.turma,
          mensagem: mensagem,
          whatsapp_destino: resp.responsavel.whatsapp,
          status: 'erro',
          erro_mensagem: error.message,
        });
        erros++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Relatório ${mesNome}/${anoFiltro}: ${enviadas} ${enviar_agora ? 'enviados' : 'registrados'}, ${erros} erros`,
        enviados: enviadas,
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
