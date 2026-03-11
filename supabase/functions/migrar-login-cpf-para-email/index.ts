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
    // One-time migration - will be deleted after use

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Build a map of ALL auth emails to check for conflicts
    const allAuthEmails = new Set<string>();
    let page = 1;
    while (true) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (!usersPage?.users?.length) break;
      for (const u of usersPage.users) {
        if (u.email) allAuthEmails.add(u.email.toLowerCase());
      }
      if (usersPage.users.length < 1000) break;
      page++;
    }

    console.log(`Total auth users indexed: ${allAuthEmails.size}`);

    // Find members with CPF@gileade.app auth and real email
    const { data: members, error: fetchErr } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, cpf, user_id")
      .not("user_id", "is", null)
      .not("email", "is", null)
      .neq("email", "");

    if (fetchErr) throw fetchErr;

    const results = {
      total_checked: 0,
      migrated: 0,
      skipped_not_cpf: 0,
      skipped_conflict: 0,
      errors: [] as { name: string; error: string }[],
    };

    for (const member of members || []) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      if (!authUser?.user) continue;

      const currentAuthEmail = (authUser.user.email || "").toLowerCase();
      if (!currentAuthEmail.endsWith("@gileade.app")) {
        results.skipped_not_cpf++;
        continue;
      }

      results.total_checked++;
      const realEmail = member.email.trim().toLowerCase();

      // Check conflict: is realEmail already used by ANOTHER auth user?
      if (allAuthEmails.has(realEmail) && realEmail !== currentAuthEmail) {
        results.skipped_conflict++;
        results.errors.push({ name: member.full_name, error: `Email ${realEmail} já em uso` });
        continue;
      }

      const cpfDigits = (member.cpf || "").replace(/\D/g, "");
      const defaultPassword = cpfDigits.length >= 6 ? cpfDigits.slice(0, 6) : undefined;

      const updatePayload: Record<string, unknown> = {
        email: realEmail,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user.user_metadata || {}),
          real_email: realEmail,
          is_cpf_login: false,
        },
      };

      if (defaultPassword) {
        updatePayload.password = defaultPassword;
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        member.user_id,
        updatePayload
      );

      if (updateErr) {
        results.errors.push({ name: member.full_name, error: updateErr.message });
      } else {
        results.migrated++;
        // Update set so subsequent checks see the new email
        allAuthEmails.delete(currentAuthEmail);
        allAuthEmails.add(realEmail);
        console.log(`OK: ${member.full_name} | ${currentAuthEmail} → ${realEmail}`);
      }
    }

    console.log(`Done: ${results.migrated} migrated, ${results.skipped_conflict} conflicts, ${results.errors.length} errors`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
