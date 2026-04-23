import { describe, expect, it } from "vitest";
import { initialsFrom } from "./initials";

/**
 * Tests de `initialsFrom`. Se usa en el Avatar del perfil. Nunca debe tirar
 * excepción — un perfil sin nombre o con caracteres raros debe degradar
 * graciosamente al placeholder "?".
 */

describe("initialsFrom", () => {
  it("retorna '?' para null", () => {
    expect(initialsFrom(null)).toBe("?");
  });

  it("retorna '?' para undefined", () => {
    expect(initialsFrom(undefined)).toBe("?");
  });

  it("retorna '?' para string vacío", () => {
    expect(initialsFrom("")).toBe("?");
  });

  it("retorna '?' para string solo whitespace", () => {
    expect(initialsFrom("   ")).toBe("?");
  });

  it("un nombre de una palabra: primeras 2 letras", () => {
    expect(initialsFrom("Gonzalo")).toBe("Go");
    expect(initialsFrom("Ana")).toBe("An");
  });

  it("una sola letra: retorna esa letra sola", () => {
    expect(initialsFrom("A")).toBe("A");
  });

  it("dos palabras: primera letra de cada una", () => {
    expect(initialsFrom("Gonzalo Lavin")).toBe("GL");
    expect(initialsFrom("ana pérez")).toBe("ap");
  });

  it("tres+ palabras: solo usa las primeras dos", () => {
    expect(initialsFrom("María José Pérez")).toBe("MJ");
    expect(initialsFrom("Juan Pablo García Torres")).toBe("JP");
  });

  it("ignora whitespace extra entre palabras", () => {
    expect(initialsFrom("  Gonzalo   Lavin  ")).toBe("GL");
    expect(initialsFrom("Ana\tPérez")).toBe("AP");
  });

  it("funciona con emails como fallback (nombre antes del @)", () => {
    // El caller suele pasar email.split('@')[0] — probamos que no se caiga
    // con strings que parezcan usernames sin espacios.
    expect(initialsFrom("gonzalolavin99")).toBe("go");
  });

  it("maneja acentos y caracteres UTF-8", () => {
    expect(initialsFrom("Ñandú")).toBe("Ña");
    expect(initialsFrom("Ángel Óscar")).toBe("ÁÓ");
  });
});
