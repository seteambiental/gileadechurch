import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("EXTERNAL_API_KEY");

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all teologia_alunos with optional member info
    const { data: alunos, error: alunosError } = await supabase
      .from("teologia_alunos")
      .select("*, members(full_name, cpf, email, whatsapp)")
      .order("created_at", { ascending: false });

    if (alunosError) {
      console.error("Error fetching alunos:", alunosError);
      return new Response(JSON.stringify({ error: "Failed to fetch students" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pagamentos, error: pagamentosError } = await supabase
      .from("teologia_pagamentos")
      .select("*")
      .order("data_pagamento", { ascending: false });

    if (pagamentosError) {
      console.error("Error fetching pagamentos:", pagamentosError);
      return new Response(JSON.stringify({ error: "Failed to fetch payments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pagamentosByAluno: Record<string, any[]> = {};
    for (const p of pagamentos || []) {
      if (!pagamentosByAluno[p.aluno_id]) pagamentosByAluno[p.aluno_id] = [];
      pagamentosByAluno[p.aluno_id].push({
        id: p.id,
        data_pagamento: p.data_pagamento,
        forma_pagamento: p.forma_pagamento,
        valor: p.valor,
        observacoes: p.observacoes,
      });
    }

    const result = (alunos || []).map((aluno: any) => {
      const pgtos = pagamentosByAluno[aluno.id] || [];
      const totalPago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      const saldo = Number(aluno.valor_total || 0) - totalPago;

      return {
        member_name: aluno.nome_aluno || aluno.members?.full_name || null,
        cpf: aluno.cpf_aluno || aluno.members?.cpf || null,
        email: aluno.email_aluno || aluno.members?.email || null,
        whatsapp: aluno.whatsapp_aluno || aluno.members?.whatsapp || null,
        turma: aluno.turma,
        valor_total: aluno.valor_total,
        total_pago: totalPago,
        saldo_devedor: saldo,
        status: saldo <= 0 ? "quitado" : totalPago > 0 ? "parcial" : "pendente",
        pagamentos: pgtos,
      };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
