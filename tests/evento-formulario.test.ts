import { describe, expect, test } from "bun:test";
import { campoDoFormularioHabilitado } from "../supabase/functions/_shared/evento-formulario";

describe("preferência de Beliche na confirmação", () => {
  test("não aparece na Conferência, cujo formulário não pede Beliche", () => {
    const camposConferencia = ["nome", "data_nascimento", "telefone_emergencia", "igreja", "telefone", "genero", "estado_civil", "cpf", "menor_idade", "medicamento", "forma_pagamento", "ministerio"];
    expect(campoDoFormularioHabilitado(camposConferencia, "preferencia_beliche")).toBe(false);
  });

  test("aparece quando o evento pede preferência de Beliche", () => {
    expect(campoDoFormularioHabilitado(["nome", "preferencia_beliche"], "preferencia_beliche")).toBe(true);
  });

  test("mantém eventos antigos sem configuração de campos", () => {
    expect(campoDoFormularioHabilitado(null, "preferencia_beliche")).toBe(true);
  });
});
