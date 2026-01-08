import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  firstName?: string;
  birthDate?: string; // YYYY-MM-DD
  cpf?: string; // only digits
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { firstName, birthDate, cpf } = (await req.json()) as Body;

    const normalizedFirstName = (firstName ?? "").trim();
    const normalizedBirthDate = (birthDate ?? "").trim();
    const normalizedCpf = (cpf ?? "").replace(/\D/g, "");

    if (!normalizedFirstName || !normalizedBirthDate) {
      return new Response(
        JSON.stringify({ error: "firstName e birthDate são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Checagem por Primeiro Nome + Data de Nascimento (membros)
    const { data: membersByBirth, error: membersErr } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("birth_date", normalizedBirthDate)
      .ilike("full_name", `${normalizedFirstName}%`)
      .limit(1);

    if (membersErr) throw membersErr;

    if (membersByBirth && membersByBirth.length > 0) {
      return new Response(
        JSON.stringify({ exists: true, reason: "name_birth" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Checagem por Primeiro Nome + Data de Nascimento (solicitações)
    const { data: reqsByBirth, error: reqsErr } = await supabaseAdmin
      .from("member_requests")
      .select("id")
      .eq("birth_date", normalizedBirthDate)
      .ilike("full_name", `${normalizedFirstName}%`)
      .limit(1);

    if (reqsErr) throw reqsErr;

    if (reqsByBirth && reqsByBirth.length > 0) {
      return new Response(
        JSON.stringify({ exists: true, reason: "name_birth_request" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) (Opcional) Checagem por CPF (membros e solicitações)
    if (normalizedCpf.length === 11) {
      const { data: membersCpf, error: mCpfErr } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("cpf", normalizedCpf)
        .limit(1);
      if (mCpfErr) throw mCpfErr;
      if (membersCpf && membersCpf.length > 0) {
        return new Response(
          JSON.stringify({ exists: true, reason: "cpf" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: reqCpf, error: rCpfErr } = await supabaseAdmin
        .from("member_requests")
        .select("id")
        .eq("cpf", normalizedCpf)
        .limit(1);
      if (rCpfErr) throw rCpfErr;
      if (reqCpf && reqCpf.length > 0) {
        return new Response(
          JSON.stringify({ exists: true, reason: "cpf_request" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ exists: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("verificar-membro-existente error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
