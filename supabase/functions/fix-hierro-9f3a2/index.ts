import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PESSOAS = [
  { member_id: "b974ce77-e12e-45aa-8f3b-9c7833aee622", nome: "Silvia Oliveira Hierro", email: "sillthii23@gmail.com", senha: "Sh023554" },
  { member_id: "c8d0c6fb-938e-4bec-8ab8-c3b76bbf8594", nome: "Juan Diego Hierro", email: "juandiegohierro3@gmail.com", senha: "Jh109773" },
  { member_id: "c73d8954-0125-48ab-a553-221d4d8d02b6", nome: "Enzo Gabriel Messias Hierro", email: "15230159936@gileade.app", senha: "Eh152301" },
  { member_id: "8f97a4ac-3cb8-4a38-8497-92ccd2fbcd43", nome: "Thiago Oliveira Rodrigues", email: "12385799901@gileade.app", senha: "Tr123857" },
  { member_id: "5b803088-2f11-42d7-95c7-5b7c5091266b", nome: "Davi Lucca Oliveira Hierro", email: "15585289977@gileade.app", senha: "Dh155852" },
];

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const resultado: any[] = [];

  for (const p of PESSOAS) {
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: p.email,
      password: p.senha,
      email_confirm: true,
      user_metadata: { member_id: p.member_id, real_email: p.email },
    });
    if (createErr) {
      let page = 1;
      let found: any = null;
      while (!found) {
        const { data: usersPage } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (!usersPage?.users?.length) break;
        found = usersPage.users.find((u: any) => u.email === p.email);
        if (usersPage.users.length < 200) break;
        page++;
      }
      if (found) {
        userId = found.id;
        await admin.auth.admin.updateUserById(found.id, { password: p.senha });
      } else {
        resultado.push({ nome: p.nome, status: "erro", erro: createErr.message });
        continue;
      }
    } else {
      userId = created.user.id;
    }

    await admin.from("members").update({ user_id: userId }).eq("id", p.member_id);
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "membro" },
      { onConflict: "user_id,role" },
    );
    resultado.push({ nome: p.nome, login: p.email, senha: p.senha, user_id: userId, status: "ok" });
  }

  return new Response(JSON.stringify({ success: true, resultado }), {
    headers: { "Content-Type": "application/json" },
  });
});
