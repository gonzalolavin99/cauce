import { describe, expect, it } from "vitest";
import { detectCrisis } from "./crisis";

/**
 * Tests de `detectCrisis`. Regex sobre señales explícitas de ideación /
 * autolesión. El contrato es: preferimos falso-positivo a falso-negativo
 * (mejor mostrar recursos de apoyo de más a omitirlos cuando alguien los
 * necesita). Estos tests protegen el comportamiento clave.
 *
 * Si alguien modifica los patrones y rompe un positivo real, el test debe
 * gritar antes de que llegue a producción.
 */

describe("detectCrisis — inputs inválidos", () => {
  it("retorna no-crisis para string vacío", () => {
    expect(detectCrisis("").isCrisis).toBe(false);
  });

  it("retorna no-crisis para solo whitespace", () => {
    expect(detectCrisis("   ").isCrisis).toBe(false);
  });

  it("no explota con null (aunque el tipo lo prohíbe)", () => {
    expect(detectCrisis(null as unknown as string).isCrisis).toBe(false);
  });

  it("no explota con undefined", () => {
    expect(detectCrisis(undefined as unknown as string).isCrisis).toBe(false);
  });

  it("no explota con número (robustez defensiva)", () => {
    expect(detectCrisis(42 as unknown as string).isCrisis).toBe(false);
  });
});

describe("detectCrisis — positivos explícitos (deben disparar)", () => {
  const positives: [string, string][] = [
    ["suicidio", "estoy pensando en el suicidio"],
    ["suicidarme", "a veces pienso en suicidarme"],
    ["matarme", "quiero matarme"],
    ["me quiero morir", "me quiero morir y no sé qué hacer"],
    ["quiero morir", "quiero morir ya"],
    ["quiero morirme", "sólo quiero morirme"],
    ["quitarme la vida", "pensé en quitarme la vida"],
    ["acabar con mi vida", "quiero acabar con mi vida"],
    ["no quiero vivir", "no quiero vivir así"],
    ["no quiero seguir", "ya no quiero seguir"],
    ["no quiero estar aquí", "no quiero estar aqui ya"],
    ["mejor muerta", "estaría mejor muerta"],
    ["mejor no estar", "sería mejor no estar"],
    ["no vale la pena seguir", "la verdad no vale la pena seguir"],
    ["pastillas para terminar", "busqué pastillas para terminar"],
    ["nadie me extrañaría", "siento que nadie me extrañaría"],
    ["si no estuviera", "todo sería mejor si no estuviera"],
    ["terminar con esto", "quiero terminar con esto"],
    ["acabar con todo", "necesito acabar con todo"],
    ["cortarme", "pensé en cortarme de nuevo"],
    ["hacerme daño", "quiero hacerme daño"],
    ["autolesión", "recaí en autolesión"],
    ["lastimarme", "ganas de lastimarme"],
    ["quemarme", "pienso en quemarme"],
  ];

  for (const [label, phrase] of positives) {
    it(`detecta: ${label}`, () => {
      const r = detectCrisis(phrase);
      expect(r.isCrisis, `debió disparar para "${phrase}"`).toBe(true);
      expect(r.matches.length).toBeGreaterThan(0);
    });
  }

  it("es case-insensitive", () => {
    expect(detectCrisis("QUIERO MORIR").isCrisis).toBe(true);
    expect(detectCrisis("Suicidio").isCrisis).toBe(true);
  });

  it("matches son lowercase para auditoría consistente", () => {
    const r = detectCrisis("QUIERO MORIR");
    expect(r.matches[0]).toBe(r.matches[0]?.toLowerCase());
  });
});

describe("detectCrisis — negativos (NO deben disparar)", () => {
  const negatives: [string, string][] = [
    ["saludo", "hola, ¿cómo estás?"],
    ["mal día neutro", "hoy tuve un día horrible en el trabajo"],
    ["tristeza sin ideación", "me siento triste y cansada"],
    ["cansancio", "estoy agotado, no puedo más con el trabajo"],
    ["ansiedad", "tengo mucha ansiedad por la reunión"],
    ["ejercicio fisico", "me corté el dedo cocinando"], // "corté" sin "me cortarme"
    ["frase sin riesgo", "quiero salir a caminar"],
    ["pelicula / ficcion", "vi una película sobre un personaje que sufría"],
  ];

  for (const [label, phrase] of negatives) {
    it(`NO dispara: ${label}`, () => {
      expect(detectCrisis(phrase).isCrisis, phrase).toBe(false);
    });
  }
});

describe("detectCrisis — matches retornados", () => {
  it("retorna el fragmento exacto que disparó", () => {
    const r = detectCrisis("a veces quiero morir por todo esto");
    expect(r.matches).toContain("quiero morir");
  });

  it("retorna múltiples matches si hay varios", () => {
    const r = detectCrisis("quiero morir y también pensé en cortarme");
    expect(r.matches.length).toBeGreaterThanOrEqual(2);
  });
});
