import { describe, expect, test } from "bun:test";
import { isoDateToManual, manualDateToISO, maskManualDate } from "../src/lib/manual-date";

describe("datas digitadas DD/MM/AAAA", () => {
  test("aplica máscara e preserva o ano digitado", () => {
    expect(maskManualDate("15092016")).toBe("15/09/2016");
    expect(manualDateToISO("15/09/2016")).toBe("2016-09-15");
    expect(isoDateToManual("2016-09-15")).toBe("15/09/2016");
  });
  test("não aceita data incompleta ou inexistente", () => {
    expect(manualDateToISO("15/09/20")).toBe("");
    expect(manualDateToISO("31/02/2016")).toBe("");
    expect(manualDateToISO("29/02/2015")).toBe("");
    expect(manualDateToISO("29/02/2016")).toBe("2016-02-29");
  });
});