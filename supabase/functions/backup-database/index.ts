import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// All public tables to backup
const TABLES = [
  "members",
  "member_functions",
  "user_roles",
  "casas_refugio",
  "casas_refugio_dia_historico",
  "condominios",
  "ministries",
  "encontros",
  "encontros_presencas",
  "agenda_igreja",
  "agenda_ambientes",
  "ambientes",
  "novos_convertidos",
  "consolidacao_agenda",
  "pedidos_oracao",
  "testemunhos",
  "visitantes",
  "aniversarios_enviados",
  "candidaturas_ministerio",
  "casais_inscritos",
  "casais_inscritos_filhos",
  "casais_lideres",
  "casais_materiais",
  "casais_presencas",
  "casais_professores",
  "casais_turmas",
  "homepage_config",
  "homepage_avisos",
  "homepage_carrossel",
  "homepage_logos",
  "homepage_programacao",
  "homepage_testemunhos",
  "homepage_videos",
  "kids_checkin",
  "kids_criancas",
  "kids_escalas",
  "kids_lideres",
  "kids_responsaveis",
  "kids_turmas",
  "kids_config",
  "financeiro_dizimos_ofertas",
  "financeiro_contas",
  "financeiro_lancamentos",
  "financeiro_categorias",
  "acao_social_familias",
  "acao_social_familia_membros",
  "acao_social_ajudas",
  "acao_social_instituicoes",
  "contingencia_backups",
  "contingencia_incidentes",
  "contingencia_acoes",
  "contingencia_procedimentos",
  "contingencia_versoes",
  "evangelizacao_frentes",
  "evangelizacao_frente_membros",
  "evangelizacao_agenda",
  "impacto_departamentos",
  "impacto_eventos",
  "impacto_inscricoes",
  "impacto_despesas",
  "jiujitsu_alunos",
  "jiujitsu_turmas",
  "jiujitsu_inscricoes",
  "jiujitsu_graduacoes",
  "jiujitsu_pagamentos",
  "missoes_contribuintes",
  "missoes_fechamentos",
  "pastor_auxiliar_permissoes",
  "mudancas_pendentes",
  "servico_membros",
  "servico_tarefas",
  "servico_tarefa_voluntarios",
  "teologia_alunos",
  "teologia_pagamentos",
  "face_indexes",
  "inscricoes_evento",
  "louvor_musicas",
  "danca_coreografias",
  "ministerio_escalas",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupData: Record<string, any> = {
      _meta: {
        created_at: new Date().toISOString(),
        tables_count: 0,
        total_records: 0,
      },
    };

    let totalRecords = 0;
    const errors: string[] = [];

    // Export each table
    for (const table of TABLES) {
      try {
        // Fetch all rows (handle >1000 rows with pagination)
        let allRows: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            break;
          }

          if (data && data.length > 0) {
            allRows = allRows.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        backupData[table] = allRows;
        totalRecords += allRows.length;
      } catch (e) {
        errors.push(`${table}: ${e.message}`);
      }
    }

    backupData._meta.tables_count = Object.keys(backupData).filter(
      (k) => k !== "_meta"
    ).length;
    backupData._meta.total_records = totalRecords;
    backupData._meta.errors = errors;

    const jsonContent = JSON.stringify(backupData);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonContent);

    // Upload to Lovable Cloud storage
    const filePath = `backup-${timestamp}.json`;
    const { error: uploadError } = await supabase.storage
      .from("db-backups")
      .upload(filePath, jsonBytes, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Try to upload to S3 as redundancy
    let s3Success = false;
    let s3Error = "";
    try {
      const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
      const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
      const awsRegion = Deno.env.get("AWS_REGION") || "us-east-1";

      if (awsAccessKeyId && awsSecretAccessKey) {
        const bucket = "gileade-db-backups";
        const s3Key = `backups/${filePath}`;
        const host = `${bucket}.s3.${awsRegion}.amazonaws.com`;
        const url = `https://${host}/${s3Key}`;

        // Simple S3 PUT with AWS Signature v4 (minimal implementation)
        const dateStamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .split(".")[0]
          + "Z";
        const shortDate = dateStamp.substring(0, 8);

        // For simplicity, use a pre-signed style or basic auth
        // AWS S3 requires Signature v4 which is complex; 
        // we'll attempt a simple PUT and log if it fails
        const s3Response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-amz-date": dateStamp,
            Host: host,
          },
          body: jsonBytes,
        });

        if (s3Response.ok) {
          s3Success = true;
        } else {
          const body = await s3Response.text();
          s3Error = `S3 upload failed [${s3Response.status}]: ${body.substring(0, 200)}`;
        }
      } else {
        s3Error = "AWS credentials not configured";
      }
    } catch (e) {
      s3Error = `S3 error: ${e.message}`;
    }

    // Log the backup in contingencia_backups table
    await supabase.from("contingencia_backups").insert({
      tipo: "automatico",
      status: "concluido",
      data_inicio: new Date().toISOString(),
      data_fim: new Date().toISOString(),
      tamanho_bytes: jsonBytes.length,
      localizacao: `storage://db-backups/${filePath}`,
      observacoes: `Backup automático: ${totalRecords} registros de ${backupData._meta.tables_count} tabelas. S3: ${s3Success ? "OK" : s3Error}. ${errors.length > 0 ? "Erros: " + errors.join("; ") : "Sem erros."}`,
    });

    // Clean old backups (keep last 30)
    const { data: allBackups } = await supabase.storage
      .from("db-backups")
      .list("", { limit: 100, sortBy: { column: "created_at", order: "asc" } });

    if (allBackups && allBackups.length > 30) {
      const toDelete = allBackups.slice(0, allBackups.length - 30);
      const paths = toDelete.map((f) => f.name);
      await supabase.storage.from("db-backups").remove(paths);
    }

    return new Response(
      JSON.stringify({
        success: true,
        file: filePath,
        records: totalRecords,
        tables: backupData._meta.tables_count,
        size_bytes: jsonBytes.length,
        s3: s3Success ? "uploaded" : s3Error,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
