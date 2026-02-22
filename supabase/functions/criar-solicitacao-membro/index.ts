import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Dependente = {
  nome_completo: string;
  cpf: string;
  data_nascimento?: string | null;
  genero?: string | null;
  tipo: "filho" | "conjuge";
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
  filhos?: Dependente[] | null;
  conjuge?: Dependente | null;
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

    // Helper to check CPF duplicates for dependentes
    const checkDependenteCpf = async (depCpf: string, depNome: string) => {
      const cleanCpf = depCpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) return null;

      // Check against existing members
      const { data: memberMatch } = await supabaseAdmin
        .from("members")
        .select("id, full_name")
        .eq("cpf", cleanCpf)
        .limit(1);

      if (memberMatch && memberMatch.length > 0) {
        return `"${depNome}" já está cadastrado como membro (${memberMatch[0].full_name}).`;
      }

      // Check against existing pending member requests
      const { data: requestMatch } = await supabaseAdmin
        .from("member_requests")
        .select("id, full_name")
        .eq("cpf", cleanCpf)
        .eq("status", "pendente")
        .limit(1);

      if (requestMatch && requestMatch.length > 0) {
        return `"${depNome}" já possui uma solicitação pendente (${requestMatch[0].full_name}).`;
      }

      return null;
    };

    // Validate conjuge CPF
    const conjuge = body.conjuge;
    if (conjuge && conjuge.cpf) {
      const err = await checkDependenteCpf(conjuge.cpf, conjuge.nome_completo);
      if (err) {
        return new Response(JSON.stringify({ error: err }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate filhos CPFs
    const filhos = body.filhos || [];
    for (const filho of filhos) {
      if (filho.cpf) {
        const err = await checkDependenteCpf(filho.cpf, filho.nome_completo);
        if (err) {
          return new Response(JSON.stringify({ error: err }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Create main member request
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
      parent_request_id: null,
      tipo_dependente: null,
    };

    const { data, error } = await supabaseAdmin
      .from("member_requests")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;

    const parentRequestId = data.id;

    // Create separate member_requests for each dependent
    // Cônjuge
    if (conjuge && conjuge.nome_completo) {
      const conjugePayload = {
        full_name: conjuge.nome_completo.trim(),
        cpf: (conjuge.cpf ?? "").replace(/\D/g, "") || null,
        birth_date: conjuge.data_nascimento ?? null,
        genero: conjuge.genero ?? null,
        // Inherit address from parent
        cep: body.cep ?? null,
        address: body.address ?? null,
        number: body.number ?? null,
        complement: body.complement ?? null,
        neighborhood: body.neighborhood ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        status: "pendente" as const,
        parent_request_id: parentRequestId,
        tipo_dependente: "conjuge",
      };

      const { error: conjError } = await supabaseAdmin
        .from("member_requests")
        .insert(conjugePayload);

      if (conjError) {
        console.error("Error creating conjuge request:", conjError);
      }
    }

    // Filhos
    for (const f of filhos) {
      const filhoPayload = {
        full_name: f.nome_completo.trim(),
        cpf: (f.cpf ?? "").replace(/\D/g, "") || null,
        birth_date: f.data_nascimento ?? null,
        genero: f.genero ?? null,
        // Inherit address from parent
        cep: body.cep ?? null,
        address: body.address ?? null,
        number: body.number ?? null,
        complement: body.complement ?? null,
        neighborhood: body.neighborhood ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        status: "pendente" as const,
        parent_request_id: parentRequestId,
        tipo_dependente: "filho",
      };

      const { error: filhoError } = await supabaseAdmin
        .from("member_requests")
        .insert(filhoPayload);

      if (filhoError) {
        console.error(`Error creating filho request for ${f.nome_completo}:`, filhoError);
      }
    }

    // Also save to member_request_filhos for backward compatibility
    const dependentes: Array<{
      member_request_id: string;
      nome_completo: string;
      cpf: string;
      data_nascimento: string | null;
      genero: string | null;
      tipo: string;
    }> = [];

    if (conjuge && conjuge.nome_completo) {
      dependentes.push({
        member_request_id: data.id,
        nome_completo: conjuge.nome_completo.trim(),
        cpf: (conjuge.cpf ?? "").replace(/\D/g, ""),
        data_nascimento: conjuge.data_nascimento ?? null,
        genero: conjuge.genero ?? null,
        tipo: "conjuge",
      });
    }

    for (const f of filhos) {
      dependentes.push({
        member_request_id: data.id,
        nome_completo: f.nome_completo.trim(),
        cpf: (f.cpf ?? "").replace(/\D/g, ""),
        data_nascimento: f.data_nascimento ?? null,
        genero: f.genero ?? null,
        tipo: "filho",
      });
    }

    if (dependentes.length > 0) {
      const { error: depError } = await supabaseAdmin
        .from("member_request_filhos")
        .insert(dependentes);

      if (depError) {
        console.error("Error saving dependentes:", depError);
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
