import { describe, it, expect } from "vitest";
import { fazAniversarioHoje, criarIndicePessoas } from "../src/lib/aniversario";

const hoje = new Date(2026, 10, 11); // 11/11/2026

describe("aniversariantes de hoje", () => {
  it("ignora data falsa 11/11/11111", () => {
    expect(fazAniversarioHoje("11111-11-11", hoje)).toBe(false);
  });
  it("ignora ano antes de 1900", () => {
    expect(fazAniversarioHoje("1111-11-11", hoje)).toBe(false);
  });
  it("ignora quem nasceu no ano atual", () => {
    expect(fazAniversarioHoje("2026-11-11", hoje)).toBe(false);
  });
  it("aceita aniversário real", () => {
    expect(fazAniversarioHoje("1982-11-11", hoje)).toBe(true);
  });
  it("inscrito já cadastrado como membro é reconhecido pelo WhatsApp mesmo com formato diferente", () => {
    const membros = criarIndicePessoas();
    membros.adicionar("Giuliano Carneiro Zelindro Pinho", "41999143673", "06409221983");
    expect(membros.contem("Outro Nome", "(41) 99914-3673", null)).toBe(true);
    expect(membros.contem("giuliano carneiro  zelindro pinho", null, null)).toBe(true);
    expect(membros.contem("Fulano", "(41) 90000-0000", null)).toBe(false);
  });
});
