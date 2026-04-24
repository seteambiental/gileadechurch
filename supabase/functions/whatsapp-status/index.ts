import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const rawEvolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_URL = rawEvolutionUrl.startsWith("http")
  ? rawEvolutionUrl
  : `https://${rawEvolutionUrl}`;
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const provider = "Evolution API";
  const startedAt = Date.now();

  const missing: string[] = [];
  if (!EVOLUTION_API_URL) missing.push("EVOLUTION_API_URL");
  if (!EVOLUTION_API_KEY) missing.push("EVOLUTION_API_KEY");
  if (!EVOLUTION_INSTANCE_NAME) missing.push("EVOLUTION_INSTANCE_NAME");

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
      apikey: EVOLUTION_API_KEY!,
    };

    const stateUrl = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`;
    const stateRes = await fetchJson(stateUrl, { headers });
    const state =
      stateRes.body?.instance?.state ?? stateRes.body?.state ?? "unknown";
    const connected = state === "open";

    let ownerNumber: string | null = null;
    let ownerName: string | null = null;
    let profilePicUrl: string | null = null;

    if (connected) {
      const fetchInstUrl = `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${encodeURIComponent(
        EVOLUTION_INSTANCE_NAME!,
      )}`;
      const instRes = await fetchJson(fetchInstUrl, { headers });
      const arr = Array.isArray(instRes.body) ? instRes.body : [];
      const inst = arr[0]?.instance ?? arr[0] ?? instRes.body?.instance;
      ownerNumber =
        (inst?.owner ? String(inst.owner).replace("@s.whatsapp.net", "") : null) ||
        inst?.number ||
        inst?.wuid ||
        null;
      ownerName = inst?.profileName || inst?.name || null;
      profilePicUrl = inst?.profilePictureUrl || inst?.profilePicUrl || null;
    }

    return new Response(
      JSON.stringify({
        provider,
        configured: true,
        connected,
        state,
        instance_name: EVOLUTION_INSTANCE_NAME,
        api_host: publicHost(EVOLUTION_API_URL),
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