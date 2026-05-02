import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { preencherTemplate, validarPlaceholdersResolvidos, primeiroNomeDe } from "./index.ts";

Deno.test("preencherTemplate substitui {NOME} pelo primeiro nome", () => {
  const r = preencherTemplate("Olá {NOME}!", { nome: "Maria Silva Souza" });
  assertEquals(r, "Olá Maria!");
});

Deno.test("preencherTemplate substitui {NOME_COMPLETO}", () => {
  const r = preencherTemplate("Para {NOME_COMPLETO}", { nome: "Maria Silva Souza" });
  assertEquals(r, "Para Maria Silva Souza");
});

Deno.test("preencherTemplate substitui {EVENTO}", () => {
  const r = preencherTemplate("Inscrição em {EVENTO}", { nome: "X", evento: "Impacto Jovem" });
  assertEquals(r, "Inscrição em Impacto Jovem");
});

Deno.test("preencherTemplate é case-insensitive e tolera espaços", () => {
  const r = preencherTemplate("{ nome }, { evento }, {NOME_completo}", {
    nome: "Ana Beatriz Lima",
    evento: "Retiro",
  });
  assertEquals(r, "Ana, Retiro, Ana Beatriz Lima");
});

Deno.test("preencherTemplate substitui múltiplas ocorrências", () => {
  const r = preencherTemplate("{NOME} {NOME} {NOME}", { nome: "João Pedro" });
  assertEquals(r, "João João João");
});

Deno.test("preencherTemplate fallback quando faltam dados", () => {
  const r = preencherTemplate("Oi {NOME}, evento {EVENTO}", { nome: "" });
  assertEquals(r, "Oi , evento o evento");
});

Deno.test("primeiroNomeDe lida com espaços e nulos", () => {
  assertEquals(primeiroNomeDe("  José  Silva "), "José");
  assertEquals(primeiroNomeDe(null), "");
  assertEquals(primeiroNomeDe(""), "");
});

Deno.test("validarPlaceholdersResolvidos lança quando há placeholder crítico", () => {
  assertThrows(
    () => validarPlaceholdersResolvidos("Olá {NOME}, vai ao {EVENTO}"),
    Error,
    "Placeholders não substituídos",
  );
});

Deno.test("validarPlaceholdersResolvidos passa quando tudo foi substituído", () => {
  validarPlaceholdersResolvidos("Olá Maria, vai ao Retiro?");
});

Deno.test("validarPlaceholdersResolvidos ignora outros tags não-críticos", () => {
  validarPlaceholdersResolvidos("Olá Ana — {DATA} {HORA}");
});
