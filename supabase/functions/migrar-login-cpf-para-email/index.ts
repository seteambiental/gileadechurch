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
    // One-time migration - secured by verify_jwt=false, will be deleted after use

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find all members with CPF@gileade.app auth but real email available
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
      skipped_no_conflict: 0,
      skipped_conflict: 0,
      errors: [] as { name: string; email: string; error: string }[],
    };

    for (const member of members || []) {
      // Get auth user
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      if (!authUser?.user) continue;

      const currentAuthEmail = (authUser.user.email || "").toLowerCase();

      // Only process users with CPF@gileade.app login
      if (!currentAuthEmail.endsWith("@gileade.app")) continue;

      results.total_checked++;

      const realEmail = member.email.trim().toLowerCase();

      // Check if another auth user already has this email
      // We need to search through users
      let emailTaken = false;
      let page = 1;
      while (true) {
        const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 50,
        });
        if (!usersPage?.users?.length) break;
        const conflict = usersPage.users.find(
          (u: any) => u.email?.toLowerCase() === realEmail && u.id !== member.user_id
        );
        if (conflict) {
          emailTaken = true;
          break;
        }
        if (usersPage.users.length < 50) break;
        page++;
      }

      if (emailTaken) {
        results.skipped_conflict++;
        results.errors.push({
          name: member.full_name,
          email: realEmail,
          error: "Email já em uso por outro usuário auth",
        });
        continue;
      }

      // Update auth email
      const cpfDigits = (member.cpf || "").replace(/\D/g, "");
      const defaultPassword = cpfDigits.length >= 6 ? cpfDigits.slice(0, 6) : null;

      const updatePayload: any = {
        email: realEmail,
        email_confirm: true,
        user_metadata: {
          ...authUser.user.user_metadata,
          real_email: realEmail,
          is_cpf_login: false,
        },
      };

      // Also reset password to 6 digits CPF
      if (defaultPassword) {
        updatePayload.password = defaultPassword;
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        member.user_id,
        updatePayload
      );

      if (updateErr) {
        results.errors.push({
          name: member.full_name,
          email: realEmail,
          error: updateErr.message,
        });
      } else {
        results.migrated++;
        console.log(`Migrado: ${member.full_name} | ${currentAuthEmail} → ${realEmail}`);
      }
    }

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
