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
    // Validate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalApiKey = Deno.env.get("EXTERNAL_API_KEY");

    if (!externalApiKey) {
      return new Response(JSON.stringify({ error: "EXTERNAL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    // Normalize CPF for matching
    const normalizeCpf = (cpf: string | null) => cpf?.replace(/\D/g, "") || "";
    const normalizeNome = (nome: string | null) => nome?.toLowerCase().trim() || "";

    // Build lookup maps
    const memberByCpf = new Map<string, string>();
    const memberByNome = new Map<string, string>();
    for (const m of members) {
      const cpf = normalizeCpf(m.cpf);
      if (cpf.length >= 11) memberByCpf.set(cpf, m.id);
      memberByNome.set(normalizeNome(m.full_name), m.id);
    }

    let synced = 0;
    let skipped = 0;

    for (const aluno of alunos) {
      // Try match by CPF first, then by name
      const cpf = normalizeCpf(aluno.cpf);
      let memberId = cpf ? memberByCpf.get(cpf) : undefined;
      if (!memberId && (aluno.nome_completo || aluno.nome)) {
        memberId = memberByNome.get(normalizeNome(aluno.nome_completo || aluno.nome));
      }

      if (!memberId) {
        skipped++;
        continue;
      }

      const valorTotal = parseFloat(String(aluno.financeiro?.total_devido ?? aluno.total_devido)) || 0;

      // Upsert: update valor_total if changed
      const { error: upsertError } = await supabase
        .from("teologia_alunos")
        .upsert(
          {
            member_id: memberId,
            valor_total: valorTotal,
            status: aluno.status_matricula || "ativo",
            observacoes: [aluno.curso, aluno.turma].filter(Boolean).join(" - ") || null,
          },
          { onConflict: "member_id" }
        );

      if (upsertError) {
        console.error("Upsert error for member", memberId, upsertError);
      } else {
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped, total: alunos.length }),
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
