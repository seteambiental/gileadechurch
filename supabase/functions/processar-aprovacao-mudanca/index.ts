import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AprovacaoRequest {
  mudanca_id: string;
  aprovar: boolean;
  motivo_rejeicao?: string;
  aprovador_member_id: string;
}

interface MudancaRecord {
  id: string;
  tipo_mudanca: string;
  acao: string;
  membro_id: string | null;
  membro_atual_id: string | null;
  ministry_id: string | null;
  casa_refugio_id: string | null;
  condominio_id: string | null;
  funcao_id: string | null;
}

const functionTypeMap: Record<string, string> = {
  lider_ministerio: "lider_ministerio",
  lider_esposa_ministerio: "lider_ministerio",
  integrante_ministerio: "integrante_ministerio",
  lider_casa_refugio: "lider_casa_refugio",
  lider_esposa_casa_refugio: "lider_casa_refugio",
  supervisor_casa_refugio: "supervisor_casa_refugio",
  supervisor_esposa_casa_refugio: "supervisor_casa_refugio",
  anfitriao_casa_refugio: "anfitriao_casa_refugio",
  anfitriao_esposa_casa_refugio: "anfitriao_casa_refugio",
  sindico_condominio: "lider_condominio",
  sindico_esposa_condominio: "lider_condominio",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // deno-lint-ignore no-explicit-any
    const supabase: any = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { mudanca_id, aprovar, motivo_rejeicao, aprovador_member_id }: AprovacaoRequest = await req.json();

    if (!mudanca_id || !aprovador_member_id) {
      throw new Error("mudanca_id e aprovador_member_id são obrigatórios");
    }

    // Buscar dados da mudança pendente
    const { data: mudanca, error: mudancaError } = await supabase
      .from("mudancas_pendentes")
      .select("*")
      .eq("id", mudanca_id)
      .eq("status", "pendente")
      .single();

    if (mudancaError || !mudanca) {
      console.error("Erro ao buscar mudança:", mudancaError);
      throw new Error("Mudança não encontrada ou já processada");
    }

    const mudancaData = mudanca as MudancaRecord;

    if (!aprovar) {
      // Rejeitar a mudança
      const { error: rejectError } = await supabase
        .from("mudancas_pendentes")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo_rejeicao || null,
          aprovado_em: new Date().toISOString(),
          aprovado_por: aprovador_member_id,
        })
        .eq("id", mudanca_id);

      if (rejectError) throw rejectError;

      return new Response(
        JSON.stringify({ success: true, status: "rejeitado" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // APROVAR A MUDANÇA - Executar as alterações necessárias
    console.log("Processando aprovação:", mudancaData);

    // 1. Atualizar a tabela da entidade (ministério, casa refúgio ou condomínio)
    if (mudancaData.ministry_id) {
      await processarMudancaMinisterio(supabase, mudancaData);
    } else if (mudancaData.casa_refugio_id) {
      await processarMudancaCasaRefugio(supabase, mudancaData);
    } else if (mudancaData.condominio_id) {
      await processarMudancaCondominio(supabase, mudancaData);
    }

    // 2. Atualizar member_functions
    await atualizarMemberFunctions(supabase, mudancaData);

    // 3. Atualizar status da mudança para aprovado
    const { error: approveError } = await supabase
      .from("mudancas_pendentes")
      .update({
        status: "aprovado",
        aprovado_em: new Date().toISOString(),
        aprovado_por: aprovador_member_id,
      })
      .eq("id", mudanca_id);

    if (approveError) throw approveError;

    return new Response(
      JSON.stringify({ success: true, status: "aprovado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na função processar-aprovacao-mudanca:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// deno-lint-ignore no-explicit-any
async function processarMudancaMinisterio(supabase: any, mudanca: MudancaRecord) {
  const ministryId = mudanca.ministry_id;
  const membroId = mudanca.membro_id;
  const tipoMudanca = mudanca.tipo_mudanca;
  const acao = mudanca.acao;

  if (!ministryId || !membroId) return;

  // Para líderes de ministério
  if (tipoMudanca === "lider_ministerio") {
    if (acao === "adicionar" || acao === "alterar") {
      await supabase
        .from("ministries")
        .update({ lider_id: membroId })
        .eq("id", ministryId);
    } else if (acao === "remover") {
      await supabase
        .from("ministries")
        .update({ lider_id: null })
        .eq("id", ministryId);
    }
  } else if (tipoMudanca === "lider_esposa_ministerio") {
    if (acao === "adicionar" || acao === "alterar") {
      await supabase
        .from("ministries")
        .update({ lider_esposa_id: membroId })
        .eq("id", ministryId);
    } else if (acao === "remover") {
      await supabase
        .from("ministries")
        .update({ lider_esposa_id: null })
        .eq("id", ministryId);
    }
  } else if (tipoMudanca === "integrante_ministerio") {
    // Para integrantes, gerenciamos via ministerio_integrantes
    if (acao === "adicionar") {
      const funcaoId = mudanca.funcao_id;
      await supabase
        .from("ministerio_integrantes")
        .insert({
          ministry_id: ministryId,
          member_id: membroId,
          funcao_id: funcaoId,
          ativo: true,
        });
    } else if (acao === "remover") {
      await supabase
        .from("ministerio_integrantes")
        .update({ ativo: false })
        .eq("ministry_id", ministryId)
        .eq("member_id", membroId);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processarMudancaCasaRefugio(supabase: any, mudanca: MudancaRecord) {
  const casaRefugioId = mudanca.casa_refugio_id;
  const membroId = mudanca.membro_id;
  const tipoMudanca = mudanca.tipo_mudanca;
  const acao = mudanca.acao;

  if (!casaRefugioId || !membroId) return;

  const fieldMap: Record<string, string> = {
    lider_casa_refugio: "lider_id",
    lider_esposa_casa_refugio: "lider_esposa_id",
    supervisor_casa_refugio: "supervisor_id",
    supervisor_esposa_casa_refugio: "supervisor_esposa_id",
    anfitriao_casa_refugio: "anfitriao_id",
    anfitriao_esposa_casa_refugio: "anfitriao_esposa_id",
  };

  const field = fieldMap[tipoMudanca];
  if (!field) return;

  if (acao === "adicionar" || acao === "alterar") {
    await supabase
      .from("casas_refugio")
      .update({ [field]: membroId })
      .eq("id", casaRefugioId);
  } else if (acao === "remover") {
    await supabase
      .from("casas_refugio")
      .update({ [field]: null })
      .eq("id", casaRefugioId);
  }
}

// deno-lint-ignore no-explicit-any
async function processarMudancaCondominio(supabase: any, mudanca: MudancaRecord) {
  const condominioId = mudanca.condominio_id;
  const membroId = mudanca.membro_id;
  const tipoMudanca = mudanca.tipo_mudanca;
  const acao = mudanca.acao;

  if (!condominioId || !membroId) return;

  const fieldMap: Record<string, string> = {
    sindico_condominio: "sindico_id",
    sindico_esposa_condominio: "sindico_esposa_id",
  };

  const field = fieldMap[tipoMudanca];
  if (!field) return;

  if (acao === "adicionar" || acao === "alterar") {
    await supabase
      .from("condominios")
      .update({ [field]: membroId })
      .eq("id", condominioId);
  } else if (acao === "remover") {
    await supabase
      .from("condominios")
      .update({ [field]: null })
      .eq("id", condominioId);
  }
}

// deno-lint-ignore no-explicit-any
async function atualizarMemberFunctions(supabase: any, mudanca: MudancaRecord) {
  const membroId = mudanca.membro_id;
  const membroAtualId = mudanca.membro_atual_id;
  const tipoMudanca = mudanca.tipo_mudanca;
  const acao = mudanca.acao;
  const ministryId = mudanca.ministry_id;
  const casaRefugioId = mudanca.casa_refugio_id;
  const condominioId = mudanca.condominio_id;

  if (!membroId) return;

  const functionType = functionTypeMap[tipoMudanca];
  if (!functionType) return;

  // Se estiver alterando (substituindo), remover a função do membro atual
  if (acao === "alterar" && membroAtualId) {
    let deleteQuery = supabase
      .from("member_functions")
      .delete()
      .eq("member_id", membroAtualId)
      .eq("function_type", functionType);

    if (ministryId) {
      deleteQuery = deleteQuery.eq("ministry_id", ministryId);
    } else if (casaRefugioId) {
      deleteQuery = deleteQuery.eq("casa_refugio_id", casaRefugioId);
    } else if (condominioId) {
      deleteQuery = deleteQuery.eq("condominio_id", condominioId);
    }

    await deleteQuery;
  }

  if (acao === "adicionar" || acao === "alterar") {
    // Verificar se já existe essa função para o membro
    let checkQuery = supabase
      .from("member_functions")
      .select("id")
      .eq("member_id", membroId)
      .eq("function_type", functionType);

    if (ministryId) {
      checkQuery = checkQuery.eq("ministry_id", ministryId);
    } else if (casaRefugioId) {
      checkQuery = checkQuery.eq("casa_refugio_id", casaRefugioId);
    } else if (condominioId) {
      checkQuery = checkQuery.eq("condominio_id", condominioId);
    }

    const { data: existing } = await checkQuery;

    if (!existing || existing.length === 0) {
      // Inserir nova função
      await supabase
        .from("member_functions")
        .insert({
          member_id: membroId,
          function_type: functionType,
          ministry_id: ministryId,
          casa_refugio_id: casaRefugioId,
          condominio_id: condominioId,
        });
    }
  } else if (acao === "remover") {
    // Remover função do membro
    let deleteQuery = supabase
      .from("member_functions")
      .delete()
      .eq("member_id", membroId)
      .eq("function_type", functionType);

    if (ministryId) {
      deleteQuery = deleteQuery.eq("ministry_id", ministryId);
    } else if (casaRefugioId) {
      deleteQuery = deleteQuery.eq("casa_refugio_id", casaRefugioId);
    } else if (condominioId) {
      deleteQuery = deleteQuery.eq("condominio_id", condominioId);
    }

    await deleteQuery;
  }
}

serve(handler);
