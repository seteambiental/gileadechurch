import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BackupSummary = {
  arquivo: string;
  criado_em: string | null;
  impacto_inscricoes: {
    total: number;
    previsao: number;
    recebido: number;
    por_tipo: Record<string, number>;
    referencias: string[];
  };
  inscricoes_eventos: {
    total: number;
    existe_no_backup: boolean;
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evento_id, limit = 30, arquivo, incluir_linhas = false } = await req.json();

    if (!evento_id) {
      return new Response(JSON.stringify({ error: "evento_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: files, error: listError } = await supabase.storage
      .from("db-backups")
      .list("", { limit: Number(limit), sortBy: { column: "created_at", order: "desc" } });

    if (listError) throw listError;

    const summaries: BackupSummary[] = [];

    for (const file of (files || []).filter((f) => !arquivo || f.name === arquivo)) {
      if (!file.name.endsWith(".json")) continue;

      const { data: blob, error: downloadError } = await supabase.storage
        .from("db-backups")
        .download(file.name);
      if (downloadError || !blob) continue;

      const backup = JSON.parse(await blob.text());
      const impactoRows = Array.isArray(backup.impacto_inscricoes)
        ? backup.impacto_inscricoes.filter((row: any) => row.evento_id === evento_id)
        : [];
      const inscricoesEventosRows = Array.isArray(backup.inscricoes_eventos)
        ? backup.inscricoes_eventos.filter((row: any) => row.evento_id === evento_id)
        : [];

      const porTipo: Record<string, number> = {};
      const referencias: string[] = [];
      let previsao = 0;
      let recebido = 0;

      for (const row of impactoRows) {
        const tipo = row.tipo_inscricao || "sem_tipo";
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        previsao += Number(row.valor_inscricao) || 0;
        recebido += Number(row.valor_pago) || 0;
        if (row.referencia) referencias.push(String(row.referencia));
      }

      summaries.push({
        arquivo: file.name,
        criado_em: file.created_at || null,
        impacto_inscricoes: {
          total: impactoRows.length,
          previsao,
          recebido,
          por_tipo: porTipo,
          referencias: referencias.sort(),
        },
        inscricoes_eventos: {
          total: inscricoesEventosRows.length,
          existe_no_backup: Array.isArray(backup.inscricoes_eventos),
        },
        ...(incluir_linhas ? { linhas: impactoRows } : {}),
      });
    }

    return new Response(JSON.stringify({ evento_id, summaries }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});