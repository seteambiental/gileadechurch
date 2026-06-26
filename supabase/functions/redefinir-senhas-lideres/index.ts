import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildPassword(fullName: string, cpf: string): string | null {
  const clean = stripAccents(fullName || "").replace(/[.,]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const digits = (cpf || "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const initialFirst = first.charAt(0).toUpperCase();
  const initialLast = last.charAt(0).toLowerCase();
  return `${initialFirst}${initialLast}${digits.slice(0, 6)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);
    const user = claimsData?.claims ? { id: claimsData.claims.sub as string } : null;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasAccess, error: accessError } = await authClient.rpc("has_full_access");
    if (accessError || !hasAccess) {
      return new Response(JSON.stringify({ error: "Proibido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: casas, error: casasErr } = await admin
      .from("casas_refugio")
      .select("name, condominio, lider_id, lider_esposa_id");
    if (casasErr) throw casasErr;

    const memberIds = new Set<string>();
    for (const c of casas ?? []) {
      if (c.lider_id) memberIds.add(c.lider_id);
      if (c.lider_esposa_id) memberIds.add(c.lider_esposa_id);
    }

    if (memberIds.size === 0) {
      return new Response(JSON.stringify({ success: true, total: 0, resultados: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: members, error: mErr } = await admin
      .from("members")
      .select("id, user_id, full_name, cpf, excluido")
      .in("id", Array.from(memberIds));
    if (mErr) throw mErr;

    const ativos = (members ?? []).filter((m: any) => !m.excluido);

    const resultados: any[] = [];
    let atualizados = 0;
    let falhas = 0;

    for (const m of ativos) {
      const senha = buildPassword(m.full_name, m.cpf);
      const base = { nome: m.full_name, senha };

      if (!m.user_id) {
        resultados.push({ ...base, status: "sem_acesso" });
        continue;
      }
      if (!senha) {
        resultados.push({ ...base, status: "sem_cpf_valido" });
        falhas++;
        continue;
      }
      if (dryRun) {
        resultados.push({ ...base, status: "preview" });
        continue;
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(m.user_id, { password: senha });
      if (updErr) {
        resultados.push({ ...base, status: "erro", erro: updErr.message });
        falhas++;
      } else {
        resultados.push({ ...base, status: "atualizado" });
        atualizados++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        total: ativos.length,
        atualizados,
        falhas,
        resultados,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro redefinir-senhas-lideres:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
