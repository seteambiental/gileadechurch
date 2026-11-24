import { describe, expect, test } from "bun:test";
import { recorrenciaExpirou } from "../supabase/functions/_shared/recorrencia-envio";

describe("encerramento das mensagens recorrentes", () => {
  test("continua enviando no último dia informado", () => {
    expect(recorrenciaExpirou("2026-12-20", "2026-12-20")).toBe(false);
  });

  test("para no dia seguinte à data final", () => {
    expect(recorrenciaExpirou("2026-12-21", "2026-12-20")).toBe(true);
  });

  test("mantém as configurações antigas sem data final", () => {
    expect(recorrenciaExpirou("2026-12-21", null)).toBe(false);
  });
});
