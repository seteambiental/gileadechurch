import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: hasAccess } = await authClient.rpc('has_full_access');
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch all members with user_id and CPF
    let allMembers: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabaseAdmin
        .from("members")
        .select("id, full_name, cpf, user_id")
        .not("user_id", "is", null)
        .not("cpf", "is", null)
        .neq("cpf", "")
        .order("full_name")
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (!data || data.length === 0) break;
      allMembers = allMembers.concat(data.filter((m: any) => m.user_id));
      if (data.length < pageSize) break;
      page++;
    }

    console.log(`Total membros: ${allMembers.length}`);

    let updated = 0, skipped = 0, errors: any[] = [];

    for (const member of allMembers) {
      const cpfDigits = (member.cpf || "").replace(/\D/g, "");
      const nameParts = (member.full_name || "").trim().split(/\s+/);
      
      if (cpfDigits.length < 6 || nameParts.length < 2) {
        skipped++;
        continue;
      }

      const iniciais = nameParts[0][0].toUpperCase() + nameParts[nameParts.length - 1][0].toLowerCase();
      const newPassword = iniciais + cpfDigits.slice(0, 6);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
        password: newPassword,
      });

      if (updateError) {
        errors.push({ name: member.full_name, error: updateError.message });
      } else {
        updated++;
      }
    }

    return new Response(JSON.stringify({ total: allMembers.length, updated, skipped, errors_count: errors.length, errors: errors.slice(0, 20) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
