import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalApiKey = Deno.env.get("EXTERNAL_API_KEY");

    if (!externalApiKey) {
      return new Response(JSON.stringify({ error: "EXTERNAL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth is handled by verify_jwt in config.toml

    // Fetch from external API
    const externalUrl = "https://likaqumfvhtxpmbyydmz.supabase.co/functions/v1/api-alunos";
    const externalRes = await fetch(externalUrl, {
      headers: { "x-api-key": externalApiKey },
    });

    if (!externalRes.ok) {
      const errText = await externalRes.text();
      console.error("External API error:", externalRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to fetch external data", status: externalRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalData = await externalRes.json();
    const alunos = Array.isArray(externalData) ? externalData : externalData.alunos || [];

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all members for matching
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, full_name, cpf, email, whatsapp")
      .or("excluido.is.null,excluido.eq.false");

    if (membersError || !members) {
      console.error("Failed to fetch members:", membersError);
      return new Response(JSON.stringify({ error: "Failed to fetch members", details: membersError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingAlunos, error: existingAlunosError } = await supabase
      .from("teologia_alunos")
      .select("member_id, valor_total, turma, observacoes, status");

    if (existingAlunosError) {
      console.error("Failed to fetch existing teologia_alunos:", existingAlunosError);
      return new Response(JSON.stringify({ error: "Failed to fetch teologia_alunos", details: existingAlunosError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize CPF for matching
    const normalizeCpf = (cpf: string | null) => cpf?.replace(/\D/g, "") || "";
    const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizeNome = (nome: string | null) => removeAccents(nome?.toLowerCase().trim().replace(/\s+/g, " ") || "");

    // Build lookup maps
    const memberByCpf = new Map<string, string>();
    const memberByNome = new Map<string, string>();
    const existingByMemberId = new Map(
      (existingAlunos || []).map((item) => [item.member_id, item])
    );

    for (const m of members) {
      const cpf = normalizeCpf(m.cpf);
      if (cpf.length >= 11) memberByCpf.set(cpf, m.id);
      memberByNome.set(normalizeNome(m.full_name), m.id);
    }

    const manualOverrides = new Map<string, { turma: string; observacoes: string; valor_total: number }>([
      [
        "044fe7d2-5cb5-418a-be64-5afc10134153",
        { turma: "TEOLOGIA BÁSICA 2026-1", observacoes: "Teologia Básica", valor_total: 200 },
      ],
      [
        "3b30f367-9c66-48bb-86e5-34d661fca4e0",
        { turma: "TEOLOGIA BÁSICA 2026-1", observacoes: "Teologia Básica", valor_total: 200 },
      ],
    ]);

    // Member IDs to exclude from sync (not actual students)
    const excludedMemberIds = new Set([
      "7eea844a-9ca7-4797-a86e-7c181ee0c34d", // Giovana de Deus Derzette
      "e50a614b-ad60-4a63-a7ab-7690ed6e3bf7", // Carol. Silvia Carolina da Silva Mielevski
    ]);

    let synced = 0;
    let skipped = 0;
    const notFound: string[] = [];

    for (const aluno of alunos) {
      // Try match by CPF first, then by name
      const cpf = normalizeCpf(aluno.cpf);
      let memberId = cpf ? memberByCpf.get(cpf) : undefined;
      if (!memberId && (aluno.nome_completo || aluno.nome)) {
        memberId = memberByNome.get(normalizeNome(aluno.nome_completo || aluno.nome));
      }

      if (!memberId) {
        notFound.push(aluno.nome_completo || aluno.nome || "sem nome");
        skipped++;
        continue;
      }

      // Skip excluded members
      if (excludedMemberIds.has(memberId)) {
        skipped++;
        continue;
      }

      const valorTotal = parseFloat(String(aluno.financeiro?.total_devido ?? aluno.total_devido)) || 0;

      // Extract turma from matriculas array
      const matricula = Array.isArray(aluno.matriculas) && aluno.matriculas.length > 0 ? aluno.matriculas[0] : null;
      const turma = matricula?.turma_nome || aluno.turma || null;
      const cursoNome = matricula?.curso_nome || aluno.curso || null;
      const statusMatricula = matricula?.status || aluno.status_matricula || null;
      const existingAluno = existingByMemberId.get(memberId);

      const payload = {
        member_id: memberId,
        valor_total: valorTotal || existingAluno?.valor_total || 0,
        status: statusMatricula || existingAluno?.status || "ativo",
        turma: turma || existingAluno?.turma || null,
        observacoes: cursoNome || existingAluno?.observacoes || null,
      };

      const { error: upsertError } = await supabase
        .from("teologia_alunos")
        .upsert(payload, { onConflict: "member_id" });

      if (upsertError) {
        console.error("Upsert error for member", memberId, upsertError);
      } else {
        synced++;
      }
    }

    if (notFound.length > 0) {
      console.log("Alunos não encontrados no cadastro:", notFound);
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped, total: alunos.length, not_found: notFound }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
