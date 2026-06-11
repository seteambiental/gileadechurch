const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RAW_BASE = Deno.env.get("WASENDER_API_URL") || "https://www.wasenderapi.com";
const WASENDER_API_URL = RAW_BASE.startsWith("http")
  ? RAW_BASE.replace(/\/+$/, "")
  : `https://${RAW_BASE.replace(/\/+$/, "")}`;
const WASENDER_API_KEY = Deno.env.get("WASENDER_API_KEY");

function publicHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text?.slice(0, 500) };
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(to);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const provider = "WasenderAPI";
  const startedAt = Date.now();

  const missing: string[] = [];
  if (!WASENDER_API_KEY) missing.push("WASENDER_API_KEY");

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({
        provider,
        configured: false,
        connected: false,
        missing,
        message: `Faltam variáveis: ${missing.join(", ")}`,
        checked_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }

  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WASENDER_API_KEY}`,
    };

    const statusUrl = `${WASENDER_API_URL}/api/status`;
    const stateRes = await fetchJson(statusUrl, { headers });

    const body = stateRes.body || {};
    const data = body.data ?? body.session ?? body;
    const state =
      data?.status ?? data?.state ?? body?.status ?? "unknown";
    const connected =
      typeof state === "string" &&
      ["connected", "open", "online"].includes(state.toLowerCase());

    const ownerNumber =
      data?.phone_number || data?.phoneNumber || data?.number || null;
    const ownerName = data?.name || data?.profileName || null;
    const profilePicUrl =
      data?.profile_picture_url || data?.profilePictureUrl || null;

    return new Response(
      JSON.stringify({
        provider,
        configured: true,
        connected,
        state,
        api_host: publicHost(WASENDER_API_URL),
        owner_number: ownerNumber,
        owner_name: ownerName,
        profile_picture_url: profilePicUrl,
        latency_ms: Date.now() - startedAt,
        last_response_status: stateRes.status,
        last_response_body: stateRes.body,
        checked_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        provider,
        configured: true,
        connected: false,
        error: err?.message || String(err),
        checked_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
