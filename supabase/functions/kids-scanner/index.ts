import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

const kidsAgeForTurma = (birthDate?: string | null) => {
  if (!birthDate) return -1;
  const year = Number(String(birthDate).split("-")[0]);
  if (!year) return -1;
  return new Date().getFullYear() - year;
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function autenticarCpf(cpf: string) {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return { error: "Informe um CPF válido (11 dígitos)." };

  const { data: member } = await admin
    .from("members")
    .select("id, full_name, cpf, excluido")
    .eq("cpf", digits)
    .maybeSingle();

  if (!member || member.excluido) return { error: "CPF não encontrado no cadastro de membros." };

  const { data: lideres } = await admin
    .from("kids_lideres")
    .select("turma, funcao, ativo")
    .eq("member_id", member.id)
    .eq("ativo", true);

  if (!lideres || lideres.length === 0) {
    return { error: "Este CPF não pertence à equipe ativa do Ministério Kids." };
  }

  return { member, lideres };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action as string;

    const auth = await autenticarCpf(body.cpf ?? "");
    if ("error" in auth) return json({ error: auth.error }, 401);
    const { member, lideres } = auth;

    const { data: turmas } = await admin
      .from("kids_turmas_config")
      .select("*")
      .order("idade_minima");

    const todas = lideres!.some((l) => l.turma === "todas");
    const turmasPermitidas = (turmas ?? []).filter(
      (t) => todas || lideres!.some((l) => l.turma === t.turma),
    );

    if (action === "login") {
      return json({
        member: { id: member!.id, full_name: member!.full_name },
        turmas: turmasPermitidas,
        funcoes: lideres!.map((l) => l.funcao),
      });
    }

    if (action === "scan") {
      const turma = body.turma as string;
      const token = String(body.token ?? "").trim().split("/").filter(Boolean).pop();

      if (!turma || !turmasPermitidas.some((t) => t.turma === turma)) {
        return json({ error: "Turma inválida ou sem permissão." }, 403);
      }
      if (!token) return json({ error: "QR Code inválido." }, 400);

      const { data: checkin } = await admin
        .from("kids_checkins")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!checkin) return json({ error: "Etiqueta não encontrada." }, 404);
      if (checkin.turma !== turma) {
        return json({ error: `Esta etiqueta pertence a outra turma (${checkin.turma}).` }, 409);
      }
      if (checkin.check_out_at) {
        return json({ error: "Criança já teve check-out realizado." }, 409);
      }
      if (checkin.check_in_at) {
        return json({ ok: true, already: true, checkin });
      }

      const { data: updated, error } = await admin
        .from("kids_checkins")
        .update({ check_in_at: new Date().toISOString(), check_in_by: member!.id })
        .eq("id", checkin.id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);

      // Registra presença do culto
      await admin.from("kids_presencas").upsert(
        {
          member_id: updated.crianca_member_id,
          novo_convertido_id: updated.crianca_novo_convertido_id,
          turma: updated.turma,
          data_culto: updated.data_culto,
          tipo_culto: new Date().getDay() === 3 ? "quarta" : "domingo",
          presente: true,
        },
        { onConflict: "member_id,novo_convertido_id,turma,data_culto" },
      );

      return json({ ok: true, already: false, checkin: updated });
    }

    if (action === "list") {
      const turma = body.turma as string;
      if (!turma || !turmasPermitidas.some((t) => t.turma === turma)) {
        return json({ error: "Turma inválida ou sem permissão." }, 403);
      }
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await admin
        .from("kids_checkins")
        .select("*")
        .eq("turma", turma)
        .eq("data_culto", hoje)
        .order("created_at");
      return json({ checkins: data ?? [] });
    }

    if (action === "roster") {
      const turma = body.turma as string;
      if (!turma || !turmasPermitidas.some((t) => t.turma === turma)) {
        return json({ error: "Turma inválida ou sem permissão." }, 403);
      }
      const config = turmasPermitidas.find((t) => t.turma === turma)!;
      const hoje = new Date().toISOString().slice(0, 10);

      const [{ data: membros }, { data: ncs }, { data: presencas }] = await Promise.all([
        admin
          .from("members")
          .select("id, full_name, birth_date, genero, photo_url, kids_turma_override, excluido")
          .not("birth_date", "is", null),
        admin
          .from("novos_convertidos")
          .select("id, full_name, data_nascimento, genero, photo_url, kids_turma_override"),
        admin
          .from("kids_presencas")
          .select("member_id, novo_convertido_id, presente")
          .eq("turma", turma)
          .eq("data_culto", hoje),
      ]);

      const pertence = (nasc: string | null, override: string | null) =>
        override
          ? override === turma
          : (() => {
              const idade = kidsAgeForTurma(nasc);
              return idade >= config.idade_minima && idade <= config.idade_maxima;
            })();

      const criancas = [
        ...(membros ?? [])
          .filter((m) => !m.excluido && pertence(m.birth_date, m.kids_turma_override))
          .map((m) => ({
            id: m.id,
            tipo: "membro" as const,
            nome: m.full_name,
            genero: m.genero,
            foto: m.photo_url,
            nascimento: m.birth_date,
          })),
        ...(ncs ?? [])
          .filter((n) => pertence(n.data_nascimento, n.kids_turma_override))
          .map((n) => ({
            id: n.id,
            tipo: "novo_convertido" as const,
            nome: n.full_name,
            genero: n.genero,
            foto: n.photo_url,
            nascimento: n.data_nascimento,
          })),
      ]
        .map((c) => ({
          ...c,
          presente: (presencas ?? []).some(
            (p) =>
              p.presente &&
              ((c.tipo === "membro" && p.member_id === c.id) ||
                (c.tipo === "novo_convertido" && p.novo_convertido_id === c.id)),
          ),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      return json({ criancas });
    }

    if (action === "presenca") {
      const turma = body.turma as string;
      if (!turma || !turmasPermitidas.some((t) => t.turma === turma)) {
        return json({ error: "Turma inválida ou sem permissão." }, 403);
      }
      const id = String(body.id ?? "");
      const tipo = String(body.tipo ?? "membro");
      const presente = Boolean(body.presente);
      if (!id) return json({ error: "Criança inválida." }, 400);

      const hoje = new Date().toISOString().slice(0, 10);
      const { error } = await admin.from("kids_presencas").upsert(
        {
          member_id: tipo === "membro" ? id : null,
          novo_convertido_id: tipo === "membro" ? null : id,
          turma,
          data_culto: hoje,
          tipo_culto: new Date().getDay() === 3 ? "quarta" : "domingo",
          presente,
        },
        { onConflict: "member_id,novo_convertido_id,turma,data_culto" },
      );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
