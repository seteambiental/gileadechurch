import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, updates, filters } = vi.hoisted(() => ({
  from: vi.fn(),
  updates: [] as Array<{ table: string; payload: Record<string, string> }>,
  filters: [] as Array<[string, string, string]>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

import { atualizarTelefoneInscricao } from "../src/lib/inscricao-telefone";

const inscricao = {
  id: "inscricao-finalizada",
  eventoId: "evento-finalizado",
  memberId: "membro",
  nome: "Ivanir Aparecida",
  value: "(41) 99873-6122",
};

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  filters.length = 0;
  from.mockImplementation((table: string) => {
    const query = {
      update: (payload: Record<string, string>) => { updates.push({ table, payload }); return query; },
      eq: (column: string, value: string) => { filters.push([table, column, value]); return query; },
      select: () => query,
      single: async () => ({ data: { id: inscricao.id }, error: null }),
      then: (resolve: (result: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    return query;
  });
});

describe("Correção de telefone em inscrição finalizada", () => {
  it("atualiza somente o telefone no Impacto e na Agenda sem reabrir o evento ou mudar pagamentos", async () => {
    await atualizarTelefoneInscricao(inscricao);
    expect(updates).toEqual([
      { table: "impacto_inscricoes", payload: { telefone: "41998736122" } },
      { table: "inscricoes_eventos", payload: { telefone_contato: "41998736122" } },
    ]);
    expect(filters).toEqual([
      ["impacto_inscricoes", "id", "inscricao-finalizada"],
      ["inscricoes_eventos", "evento_id", "evento-finalizado"],
      ["inscricoes_eventos", "member_id", "membro"],
    ]);
  });

  it("localiza pelo nome dentro do evento quando a participante não tem cadastro vinculado", async () => {
    await atualizarTelefoneInscricao({ ...inscricao, memberId: null, value: "(41) 9873-6122" });
    expect(updates[0].payload).toEqual({ telefone: "4198736122" });
    expect(filters).toContainEqual(["inscricoes_eventos", "nome_participante", "Ivanir Aparecida"]);
    expect(filters).toContainEqual(["inscricoes_eventos", "evento_id", "evento-finalizado"]);
  });

  it.each(["", "9873-6122", "419987361222"])("recusa o telefone incompleto ou longo: %s", async (value) => {
    await expect(atualizarTelefoneInscricao({ ...inscricao, value })).rejects.toThrow("DDD");
    expect(from).not.toHaveBeenCalled();
  });

  it("informa a falha quando não consegue gravar a inscrição", async () => {
    const query = { update: () => query, eq: () => query, select: () => query,
      single: async () => ({ error: new Error("Sem acesso") }) };
    from.mockReturnValue(query);
    await expect(atualizarTelefoneInscricao(inscricao)).rejects.toThrow("Sem acesso");
    expect(from).toHaveBeenCalledTimes(1);
  });
});