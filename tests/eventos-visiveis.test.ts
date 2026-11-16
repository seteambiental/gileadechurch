import { describe, it, expect } from "vitest";
import { eventoAindaVisivel } from "@/lib/eventos-visiveis";

describe("eventoAindaVisivel", () => {
  it("evento futuro aparece", () => {
    expect(eventoAindaVisivel({ data_inicio: "2026-12-13", data_fim: "2026-12-13" }, "2026-11-16")).toBe(true);
  });
  it("evento que terminou há 7 dias ainda aparece", () => {
    expect(eventoAindaVisivel({ data_inicio: "2026-11-08", data_fim: "2026-11-09" }, "2026-11-16")).toBe(true);
  });
  it("evento que terminou há 8 dias ou mais some", () => {
    expect(eventoAindaVisivel({ data_inicio: "2026-11-06", data_fim: "2026-11-08" }, "2026-11-16")).toBe(false);
    expect(eventoAindaVisivel({ data_evento: "2026-11-06", data_fim: "2026-11-07" }, "2026-11-16")).toBe(false);
  });
  it("conta pela data de término, não pela de início", () => {
    expect(eventoAindaVisivel({ data_inicio: "2026-11-01", data_fim: "2026-11-10" }, "2026-11-16")).toBe(true);
  });
});
