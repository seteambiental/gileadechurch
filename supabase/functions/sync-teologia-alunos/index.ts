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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all members for optional matching
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name, cpf, email, whatsapp")
      .or("excluido.is.null,excluido.eq.false");

    const { data: existingAlunos } = await supabase
      .from("teologia_alunos")
      .select("id, member_id, valor_total, turma, observacoes, status, nome_aluno");

    // Normalize helpers
    const normalizeCpf = (cpf: string | null) => cpf?.replace(/\D/g, "") || "";
    const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizeNome = (nome: string | null) => removeAccents(nome?.toLowerCase().trim().replace(/\s+/g, " ") || "");

    // Build lookup maps
    const memberByCpf = new Map<string, typeof members extends (infer T)[] ? T : never>();
    const memberByNome = new Map<string, typeof members extends (infer T)[] ? T : never>();
    const existingByMemberId = new Map(
      (existingAlunos || []).filter(a => a.member_id).map((item) => [item.member_id, item])
    );
    const existingByNomeTurma = new Map(
      (existingAlunos || []).filter(a => a.nome_aluno && !a.member_id).map((item) => [
        normalizeNome(item.nome_aluno) + "|" + (item.turma || ""), item
      ])
    );

    for (const m of (members || [])) {
      const cpf = normalizeCpf(m.cpf);
      if (cpf.length >= 11) memberByCpf.set(cpf, m);
      memberByNome.set(normalizeNome(m.full_name), m);
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

    // Member IDs to exclude from sync
    const excludedMemberIds = new Set([
      "7eea844a-9ca7-4797-a86e-7c181ee0c34d",
      "e50a614b-ad60-4a63-a7ab-7690ed6e3bf7",
    ]);

    let synced = 0;
    let skipped = 0;
    let unlinked = 0;

    for (const aluno of alunos) {
      const nomeAluno = aluno.nome_completo || aluno.nome || "";
      const cpfAluno = aluno.cpf || null;
      const emailAluno = aluno.email || null;
      const whatsappAluno = aluno.whatsapp || aluno.telefone || null;

      // Try match by CPF first, then by name
      const cpf = normalizeCpf(cpfAluno);
      let member = cpf ? memberByCpf.get(cpf) : undefined;
      if (!member && nomeAluno) {
        member = memberByNome.get(normalizeNome(nomeAluno));
      }

      const memberId = member?.id || null;

      // Skip excluded members
      if (memberId && excludedMemberIds.has(memberId)) {
        skipped++;
        continue;
      }

      const valorTotal = parseFloat(String(aluno.financeiro?.total_devido ?? aluno.total_devido)) || 0;

      // Extract turma from matriculas array
      const matricula = Array.isArray(aluno.matriculas) && aluno.matriculas.length > 0 ? aluno.matriculas[0] : null;
      const turma = matricula?.turma_nome || aluno.turma || null;
      const cursoNome = matricula?.curso_nome || aluno.curso || null;
      const statusMatricula = matricula?.status || aluno.status_matricula || null;
      
      const existingAluno = memberId ? existingByMemberId.get(memberId) : 
        existingByNomeTurma.get(normalizeNome(nomeAluno) + "|" + (turma || ""));
      const manualOverride = memberId ? manualOverrides.get(memberId) : undefined;

      const payload: Record<string, any> = {
        nome_aluno: nomeAluno || null,
        email_aluno: emailAluno || member?.email || null,
        cpf_aluno: cpfAluno || member?.cpf || null,
        whatsapp_aluno: whatsappAluno || member?.whatsapp || null,
        member_id: memberId,
        valor_total: manualOverride?.valor_total ?? valorTotal ?? existingAluno?.valor_total ?? 0,
        status: statusMatricula || existingAluno?.status || "ativo",
        turma: manualOverride?.turma ?? turma ?? existingAluno?.turma ?? null,
        observacoes: manualOverride?.observacoes ?? cursoNome ?? existingAluno?.observacoes ?? null,
      };

      let upsertError;

      if (memberId) {
        // Upsert by member_id
        const { error } = await supabase
          .from("teologia_alunos")
          .upsert(payload, { onConflict: "member_id" });
        upsertError = error;
      } else if (existingAluno) {
        // Update existing unlinked record
        const { error } = await supabase
          .from("teologia_alunos")
          .update(payload)
          .eq("id", existingAluno.id);
        upsertError = error;
      } else {
        // Insert new unlinked record
        const { error } = await supabase
          .from("teologia_alunos")
          .insert(payload);
        upsertError = error;
        if (!error) unlinked++;
      }

      if (upsertError) {
        console.error("Upsert error for", nomeAluno, upsertError);
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped, unlinked, total: alunos.length }),
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
