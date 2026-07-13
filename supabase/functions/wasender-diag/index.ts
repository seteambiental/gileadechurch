const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const RAW_BASE = Deno.env.get("WASENDER_API_URL") || "https://www.wasenderapi.com";
const BASE = RAW_BASE.startsWith("http") ? RAW_BASE.replace(/\/+$/,"") : `https://${RAW_BASE.replace(/\/+$/,"")}`;
const KEY = Deno.env.get("WASENDER_API_KEY") || "";
async function hit(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type":"application/json", "Authorization": `Bearer ${KEY}` } });
    const t = await res.text();
    return { path, status: res.status, body: t.slice(0,300) };
  } catch (e) { return { path, error: String(e) }; }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  const out = {
    keyLen: KEY.length, keyPrefix: KEY.slice(0,4),
    status: await hit("/api/status"),
    user: await hit("/api/user"),
    sessions: await hit("/api/whatsapp-sessions"),
  };
  return new Response(JSON.stringify(out,null,2),{headers:{...corsHeaders,"Content-Type":"application/json"}});
});
