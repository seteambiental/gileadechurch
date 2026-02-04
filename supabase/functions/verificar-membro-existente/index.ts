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

    // Função auxiliar para extrair primeiro nome (simples ou composto) do full_name
    // Considera nomes compostos como "João Paulo", "Maria Izabel", etc.
    const extractFirstName = (fullName: string): string => {
      const words = fullName.trim().split(/\s+/);
      if (words.length <= 1) return fullName.trim().toLowerCase();
      
      // Se tem 2 palavras, retorna as duas como primeiro nome composto
      if (words.length === 2) return words.join(" ").toLowerCase();
      
      // Se tem mais de 2 palavras, verifica se as duas primeiras formam um nome composto comum
      const firstTwo = words.slice(0, 2).join(" ").toLowerCase();
      return firstTwo;
    };

    const inputFirstNameLower = normalizedFirstName.toLowerCase();
    const inputWords = inputFirstNameLower.split(/\s+/);
    const inputWordCount = inputWords.length;

    // 1) Checagem por Primeiro Nome + Data de Nascimento (membros não excluídos)
    const { data: membersByBirth, error: membersErr } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, excluido")
      .eq("birth_date", normalizedBirthDate)
      .or("excluido.is.null,excluido.eq.false");

    if (membersErr) throw membersErr;

    // Verificar se algum membro tem o mesmo primeiro nome (simples ou composto)
    const memberMatch = (membersByBirth ?? []).find((m) => {
      const memberFirstName = extractFirstName(m.full_name);
      // Se o input tem 1 palavra, verifica se o primeiro nome do membro começa com ela
      if (inputWordCount === 1) {
        const memberFirstWord = memberFirstName.split(/\s+/)[0];
        return memberFirstWord === inputFirstNameLower;
      }
      // Se o input tem 2+ palavras (nome composto), compara exatamente
      return memberFirstName === inputFirstNameLower;
    });

    if (memberMatch) {
      return new Response(
        JSON.stringify({ 
          exists: true, 
          reason: "name_birth",
          email: memberMatch.email || null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Checagem por Primeiro Nome + Data de Nascimento (solicitações)
    const { data: reqsByBirth, error: reqsErr } = await supabaseAdmin
      .from("member_requests")
      .select("id, full_name, status")
      .eq("birth_date", normalizedBirthDate);

    if (reqsErr) throw reqsErr;

    // Verificar se alguma solicitação tem o mesmo primeiro nome (simples ou composto)
    const reqMatch = (reqsByBirth ?? []).find((r) => {
      const reqFirstName = extractFirstName(r.full_name);
      if (inputWordCount === 1) {
        const reqFirstWord = reqFirstName.split(/\s+/)[0];
        return reqFirstWord === inputFirstNameLower;
      }
      return reqFirstName === inputFirstNameLower;
    });

    if (reqMatch) {
      return new Response(
        JSON.stringify({ 
          exists: true, 
          reason: "name_birth_request",
          status: reqMatch.status
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) (Opcional) Checagem por CPF (membros e solicitações)
    if (normalizedCpf.length === 11) {
      const { data: membersCpf, error: mCpfErr } = await supabaseAdmin
        .from("members")
        .select("id, email")
        .eq("cpf", normalizedCpf)
        .or("excluido.is.null,excluido.eq.false")
        .limit(1);
      if (mCpfErr) throw mCpfErr;
      if (membersCpf && membersCpf.length > 0) {
        return new Response(
          JSON.stringify({ 
            exists: true, 
            reason: "cpf",
            email: membersCpf[0].email || null
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: reqCpf, error: rCpfErr } = await supabaseAdmin
        .from("member_requests")
        .select("id, status")
        .eq("cpf", normalizedCpf)
        .limit(1);
      if (rCpfErr) throw rCpfErr;
      if (reqCpf && reqCpf.length > 0) {
        return new Response(
          JSON.stringify({ 
            exists: true, 
            reason: "cpf_request",
            status: reqCpf[0].status
          }),
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
