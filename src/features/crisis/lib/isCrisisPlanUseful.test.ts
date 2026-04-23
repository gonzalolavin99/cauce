import { describe, expect, it } from "vitest";
import type { CrisisPlan } from "@/src/types/database.types";
import { isCrisisPlanUseful } from "./isCrisisPlanUseful";

/**
 * Tests de `isCrisisPlanUseful`. Esta función decide si mostramos el plan o
 * el estado vacío "crea tu plan". Si falla silenciosa, una persona con plan
 * guardado podría ver "crea tu plan" cuando ya lo tiene — confuso en mal
 * momento. Por eso cubrimos los casos borde.
 */

function makePlan(overrides: Partial<CrisisPlan> = {}): CrisisPlan {
  // Base con todos los campos de texto vacíos/null.
  return {
    user_id: "u1",
    warning_signs: null,
    what_helps: null,
    anchor_phrase: null,
    safe_place: null,
    trusted_contact_name: null,
    trusted_contact_phone: null,
    trusted_contact_relation: null,
    reasons_to_stay: null,
    avoid_list: null,
    notes: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  } as CrisisPlan;
}

describe("isCrisisPlanUseful", () => {
  it("retorna false para null", () => {
    expect(isCrisisPlanUseful(null)).toBe(false);
  });

  it("retorna false para undefined", () => {
    expect(isCrisisPlanUseful(undefined)).toBe(false);
  });

  it("retorna false si todos los campos son null", () => {
    expect(isCrisisPlanUseful(makePlan())).toBe(false);
  });

  it("retorna false si todos los campos son strings vacíos", () => {
    expect(
      isCrisisPlanUseful(
        makePlan({
          warning_signs: "",
          what_helps: "",
          anchor_phrase: "",
          safe_place: "",
          notes: "",
        })
      )
    ).toBe(false);
  });

  it("retorna false si todos los campos son whitespace", () => {
    expect(
      isCrisisPlanUseful(
        makePlan({
          warning_signs: "   ",
          what_helps: "\n\n",
          anchor_phrase: "\t",
        })
      )
    ).toBe(false);
  });

  it("retorna true si al menos anchor_phrase tiene contenido", () => {
    expect(
      isCrisisPlanUseful(
        makePlan({ anchor_phrase: "esto también pasa" })
      )
    ).toBe(true);
  });

  it("retorna true si sólo warning_signs tiene contenido", () => {
    expect(
      isCrisisPlanUseful(makePlan({ warning_signs: "no duermo bien" }))
    ).toBe(true);
  });

  it("retorna true si sólo el teléfono del contacto está lleno", () => {
    expect(
      isCrisisPlanUseful(makePlan({ trusted_contact_phone: "+56912345678" }))
    ).toBe(true);
  });

  it("retorna true con contenido rodeado de whitespace", () => {
    expect(
      isCrisisPlanUseful(makePlan({ notes: "   algo útil  \n" }))
    ).toBe(true);
  });

  it("no considera trusted_contact_relation como campo útil (solo etiqueta)", () => {
    // Diseño: relation sin nombre ni teléfono no es útil.
    // La función actual no incluye relation en la lista — protegemos ese contrato.
    expect(
      isCrisisPlanUseful(
        makePlan({ trusted_contact_relation: "hermana" } as Partial<CrisisPlan>)
      )
    ).toBe(false);
  });
});
