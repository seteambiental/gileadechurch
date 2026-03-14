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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: hasAccess } = await authClient.rpc('has_full_access');
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { offset = 0, batch_size = 50 } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: members, count } = await supabaseAdmin
      .from("members")
      .select("id, full_name, cpf, user_id", { count: "exact" })
      .not("user_id", "is", null)
      .not("cpf", "is", null)
      .neq("cpf", "")
      .order("full_name")
      .range(offset, offset + batch_size - 1);

    let updated = 0, skipped = 0, errors: any[] = [];

    for (const member of (members || [])) {
      const cpfDigits = ((member as any).cpf || "").replace(/\D/g, "");
      const nameParts = ((member as any).full_name || "").trim().split(/\s+/);
      
      if (cpfDigits.length < 6 || nameParts.length < 2 || !(member as any).user_id) {
        skipped++;
        continue;
      }

      const iniciais = nameParts[0][0].toUpperCase() + nameParts[nameParts.length - 1][0].toLowerCase();
      const newPassword = iniciais + cpfDigits.slice(0, 6);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById((member as any).user_id, {
        password: newPassword,
      });

      if (updateError) {
        errors.push({ name: (member as any).full_name, error: updateError.message });
      } else {
        updated++;
      }
    }

    const hasMore = (offset + batch_size) < (count || 0);

    return new Response(JSON.stringify({ 
      total: count, 
      offset,
      batch_size,
      updated, 
      skipped, 
      errors_count: errors.length, 
      errors,
      has_more: hasMore,
      next_offset: hasMore ? offset + batch_size : null
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
