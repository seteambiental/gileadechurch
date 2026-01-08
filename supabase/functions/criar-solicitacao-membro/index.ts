import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  genero?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cpf: string; // only digits
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as Partial<Body>;

    const fullName = (body.full_name ?? "").trim();
    const cpf = (body.cpf ?? "").replace(/\D/g, "");

    if (!fullName) {
      return new Response(JSON.stringify({ error: "Nome completo é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cpf.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Proteção extra: não permitir duplicar solicitações pendentes para o mesmo CPF
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("member_requests")
      .select("id")
      .eq("cpf", cpf)
      .eq("status", "pendente")
      .limit(1);

    if (existingErr) throw existingErr;
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Já existe uma solicitação pendente para este CPF." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      full_name: fullName,
      email: body.email ?? null,
      whatsapp: body.whatsapp ?? null,
      genero: body.genero ?? null,
      birth_date: body.birth_date ?? null,
      cep: body.cep ?? null,
      address: body.address ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      cpf,
      status: "pendente" as const,
    };

    const { data, error } = await supabaseAdmin
      .from("member_requests")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("criar-solicitacao-membro error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
