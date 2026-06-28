import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Endpoint para câmeras/PC local enviarem eventos de contagem (entrada/saída).
// Uso (POST): { token: "<token-da-sessao>", tipo: "entrada" | "saida", delta?: number }
// Também aceita GET ?token=...&tipo=entrada para câmeras simples.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let token: string | null = null;
    let tipo: string | null = null;
    let delta = 1;

    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
      tipo = url.searchParams.get("tipo");
      delta = Number(url.searchParams.get("delta") ?? "1") || 1;
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token ?? null;
      tipo = body.tipo ?? null;
      delta = Number(body.delta ?? 1) || 1;
    }

    if (!token || (tipo !== "entrada" && tipo !== "saida")) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos. Informe token e tipo (entrada|saida)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: sessao, error: findErr } = await supabase
      .from("contagem_cultos")
      .select("id, entradas, saidas, ativo")
      .eq("token", token)
      .maybeSingle();

    if (findErr || !sessao) {
      return new Response(JSON.stringify({ error: "Sessão não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessao.ativo) {
      return new Response(JSON.stringify({ error: "Sessão encerrada." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update =
      tipo === "entrada"
        ? { entradas: Math.max(0, sessao.entradas + delta) }
        : { saidas: Math.max(0, sessao.saidas + delta) };

    const { data: updated, error: updErr } = await supabase
      .from("contagem_cultos")
      .update(update)
      .eq("id", sessao.id)
      .select("entradas, saidas")
      .single();

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pessoas = (updated.entradas ?? 0) - (updated.saidas ?? 0);
    return new Response(JSON.stringify({ ok: true, pessoas, ...updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});