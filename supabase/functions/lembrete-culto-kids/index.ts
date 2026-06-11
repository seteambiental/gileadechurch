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

    const { tipo_culto = 'domingo', enviar_agora = false } = await req.json();

    const diaSemana = new Date().getDay();
    // 0 = domingo, 3 = quarta
    // Lembrete deve ser enviado no sábado (6) para domingo e terça (2) para quarta
    
    console.log(`Enviando lembretes para culto de ${tipo_culto}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os responsáveis com notificação ativa
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

    // Buscar configuração das turmas para determinar a turma da criança
    const { data: turmasConfig } = await supabase
      .from('kids_turmas_config')
      .select('*');

    const calcularIdade = (dataNascimento: string): number => {
      const hoje = new Date();
      const nascimento = new Date(dataNascimento);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const m = hoje.getMonth() - nascimento.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
      return idade;
    };

    const getTurmaPorIdade = (idade: number): string | null => {
      if (!turmasConfig) return null;
      const turma = turmasConfig.find(t => idade >= t.idade_minima && idade <= t.idade_maxima);
      return turma?.turma || null;
    };

    const whatsappApiKey = Deno.env.get('WASENDER_API_KEY');

    const diaCulto = tipo_culto === 'domingo' ? 'amanhã no domingo' : 'amanhã na quarta-feira';
    const horario = tipo_culto === 'domingo' ? '09h' : '19h30';

    let enviadas = 0;
    let erros = 0;

    // Agrupar por responsável para não enviar múltiplas mensagens
    const mensagensPorResponsavel: Map<string, { responsavel: any; criancas: string[]; turmas: string[] }> = new Map();

    for (const resp of responsaveis) {
      if (!resp.responsavel?.whatsapp) continue;

      const crianca = resp.crianca_member || resp.crianca_nc;
      if (!crianca) continue;

      const dataNasc = resp.crianca_member?.birth_date || resp.crianca_nc?.data_nascimento;
      if (!dataNasc) continue;

      const idade = calcularIdade(dataNasc);
      const turma = getTurmaPorIdade(idade);
      if (!turma) continue; // Criança não está na faixa etária do Kids

      const key = resp.responsavel.id;
      if (!mensagensPorResponsavel.has(key)) {
        mensagensPorResponsavel.set(key, {
          responsavel: resp.responsavel,
          criancas: [],
          turmas: [],
        });
      }
      
      const entry = mensagensPorResponsavel.get(key)!;
      entry.criancas.push(crianca.full_name);
      if (!entry.turmas.includes(turma)) {
        entry.turmas.push(turma);
      }
    }

    for (const [_, data] of mensagensPorResponsavel) {
      const criancasTexto = data.criancas.length === 1 
        ? data.criancas[0] 
        : data.criancas.slice(0, -1).join(', ') + ' e ' + data.criancas[data.criancas.length - 1];

      const turmasTexto = data.turmas.map(t => getTurmaNome(t)).join(' e ');

      const mensagem = `Olá ${data.responsavel.full_name.split(' ')[0]}! 👋

🎉 Lembrete: o culto Kids acontece ${diaCulto} às ${horario}!

Estaremos esperando ${data.criancas.length > 1 ? '' : 'o(a) '}*${criancasTexto}* na turma ${turmasTexto}.

Não esqueça de trazer a criança com roupa confortável e disposição para louvar! 🙌

Com carinho,
Ministério Kids - Igreja Gileade`;

      const logData = {
        responsavel_member_id: data.responsavel.id,
        tipo_notificacao: 'lembrete_culto',
        turma: data.turmas[0],
        mensagem: mensagem,
        whatsapp_destino: data.responsavel.whatsapp,
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

      if (!whatsappApiKey) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: 'WhatsApp (WasenderAPI) não configurado',
        });
        erros++;
        continue;
      }

      try {
        await enviarTextoWhatsApp(data.responsavel.whatsapp, mensagem);
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'enviada',
        });
        enviadas++;
        console.log(`Lembrete enviado para ${data.responsavel.full_name}`);
      } catch (error: any) {
        await supabase.from('kids_notificacoes_log').insert({
          ...logData,
          status: 'erro',
          erro_mensagem: error.message,
        });
        erros++;
      }

      // Intervalo aleatório entre 15-30s para evitar SPAM
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15000) + 15000));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Lembretes: ${enviadas} ${enviar_agora ? 'enviados' : 'registrados'}, ${erros} erros`,
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
