import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Lê cache atual
  const { data: cacheRows } = await supabase
    .from("missoes_mocambique_cotacao_cache")
    .select("*")
    .order("consultado_em", { ascending: false })
    .limit(1);
  const cache = cacheRows?.[0];

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  // Se cache fresco (< 6h) e não forçou, retorna
  if (!force && cache) {
    const ageMs = Date.now() - new Date(cache.consultado_em).getTime();
    if (ageMs < 6 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({
          cotacao: Number(cache.cotacao),
          fonte: cache.fonte,
          consultado_em: cache.consultado_em,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Tenta fontes externas em ordem
  const sources: Array<{ name: string; fetcher: () => Promise<number> }> = [
    {
      name: "frankfurter.app",
      fetcher: async () => {
        const r = await fetch("https://api.frankfurter.app/latest?from=BRL&to=MZN");
        const j = await r.json();
        const v = j?.rates?.MZN;
        if (!v || typeof v !== "number") throw new Error("no rate");
        return v;
      },
    },
    {
      name: "open.er-api.com",
      fetcher: async () => {
        const r = await fetch("https://open.er-api.com/v6/latest/BRL");
        const j = await r.json();
        const v = j?.rates?.MZN;
        if (!v || typeof v !== "number") throw new Error("no rate");
        return v;
      },
    },
    {
      name: "exchangerate.host",
      fetcher: async () => {
        const r = await fetch("https://api.exchangerate.host/latest?base=BRL&symbols=MZN");
        const j = await r.json();
        const v = j?.rates?.MZN;
        if (!v || typeof v !== "number") throw new Error("no rate");
        return v;
      },
    },
  ];

  for (const s of sources) {
    try {
      const cotacao = await s.fetcher();
      const consultado_em = new Date().toISOString();
      await supabase
        .from("missoes_mocambique_cotacao_cache")
        .insert({ cotacao, fonte: s.name, consultado_em });
      return new Response(
        JSON.stringify({ cotacao, fonte: s.name, consultado_em, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (_) {
      continue;
    }
  }

  // Falhou: devolve último cache se houver
  if (cache) {
    return new Response(
      JSON.stringify({
        cotacao: Number(cache.cotacao),
        fonte: cache.fonte,
        consultado_em: cache.consultado_em,
        cached: true,
        error: "Falha ao atualizar; usando cache anterior",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ error: "Não foi possível obter a cotação" }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});