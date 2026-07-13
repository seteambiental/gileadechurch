import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const bodySchema = z.object({
  member_id: z.string().uuid("member_id inválido"),
  telefone: z.string().min(8, "Telefone inválido"),
});

serve(async (req) => {
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
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { member_id, telefone } = parsed.data;
    const tel = telefone.replace(/\D/g, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Requeue apenas mensagens paradas recentes (últimos 30 dias) para não reenviar itens antigos/irrelevantes.
    const limite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const agora = new Date().toISOString();

    const { data: requeued, error } = await supabase
      .from("comunicacao_fila")
      .update({
        destinatario_telefone: tel,
        status: "pendente",
        tentativas: 0,
        proxima_tentativa_em: agora,
        ultimo_erro: null,
        updated_at: agora,
      })
      .eq("destinatario_member_id", member_id)
      .in("status", ["erro", "descartado"])
      .gte("created_at", limite)
      .select("id");

    if (error) {
      console.error("Erro ao reenfileirar mensagens:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = requeued?.length ?? 0;
    console.log(`Reenfileiradas ${total} mensagens para member_id=${member_id} (novo telefone).`);

    // Dispara o processamento imediato da fila (best-effort).
    if (total > 0) {
      try {
        await supabase.functions.invoke("processar-fila-whatsapp", { body: {} });
      } catch (e) {
        console.warn("Falha ao acionar processar-fila-whatsapp:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, reenfileiradas: total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
