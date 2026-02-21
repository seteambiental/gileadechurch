import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Filho = {
  nome_completo: string;
  cpf: string;
  data_nascimento?: string | null;
  genero?: string | null;
};

type Body = {
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  genero?: string | null;
  estado_civil?: string | null;
  birth_date?: string | null;
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cpf: string;
  photo_url?: string | null;
  ministerios_interesse?: string[] | null;
  nao_pretende_servir?: boolean | null;
  responsavel_id?: string | null;
  filhos?: Filho[] | null;
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

    // Verificar CPFs dos filhos contra membros existentes e solicitações pendentes
    const filhos = body.filhos || [];
    for (const filho of filhos) {
      const filhoCpf = (filho.cpf ?? "").replace(/\D/g, "");
      if (filhoCpf.length !== 11) continue;

      // Check against existing members
      const { data: memberMatch } = await supabaseAdmin
        .from("members")
        .select("id, full_name")
        .eq("cpf", filhoCpf)
        .limit(1);

      if (memberMatch && memberMatch.length > 0) {
        return new Response(JSON.stringify({ 
          error: `O filho(a) "${filho.nome_completo}" já está cadastrado como membro (${memberMatch[0].full_name}).` 
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check against existing pending member requests
      const { data: requestMatch } = await supabaseAdmin
        .from("member_requests")
        .select("id, full_name")
        .eq("cpf", filhoCpf)
        .eq("status", "pendente")
        .limit(1);

      if (requestMatch && requestMatch.length > 0) {
        return new Response(JSON.stringify({ 
          error: `O filho(a) "${filho.nome_completo}" já possui uma solicitação pendente (${requestMatch[0].full_name}).` 
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check against children already registered in other requests
      const { data: filhoMatch } = await supabaseAdmin
        .from("member_request_filhos")
        .select("id, nome_completo")
        .eq("cpf", filhoCpf)
        .limit(1);

      if (filhoMatch && filhoMatch.length > 0) {
        return new Response(JSON.stringify({ 
          error: `O filho(a) com CPF informado já foi cadastrado anteriormente por outro responsável (${filhoMatch[0].nome_completo}). Não é possível cadastrar o mesmo filho(a) duas vezes.` 
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = {
      full_name: fullName,
      email: body.email ?? null,
      whatsapp: body.whatsapp ?? null,
      genero: body.genero ?? null,
      estado_civil: body.estado_civil ?? null,
      birth_date: body.birth_date ?? null,
      cep: body.cep ?? null,
      address: body.address ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      cpf,
      photo_url: body.photo_url ?? null,
      ministerios_interesse: body.ministerios_interesse ?? [],
      nao_pretende_servir: body.nao_pretende_servir ?? false,
      responsavel_id: body.responsavel_id ?? null,
      status: "pendente" as const,
    };

    const { data, error } = await supabaseAdmin
      .from("member_requests")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;

    // Save children if any
    if (filhos.length > 0) {
      const filhosPayload = filhos.map((f) => ({
        member_request_id: data.id,
        nome_completo: f.nome_completo.trim(),
        cpf: (f.cpf ?? "").replace(/\D/g, ""),
        data_nascimento: f.data_nascimento ?? null,
        genero: f.genero ?? null,
      }));

      const { error: filhosError } = await supabaseAdmin
        .from("member_request_filhos")
        .insert(filhosPayload);

      if (filhosError) {
        console.error("Error saving filhos:", filhosError);
        // Don't fail the whole request, the parent is already saved
      }
    }

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
