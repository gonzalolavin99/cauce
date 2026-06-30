import { describe, expect, it } from "vitest";
import { buildHeatmap, dominantMoodByDay, localDayKey } from "./heatmap";

function at(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

describe("dominantMoodByDay", () => {
  it("elige la moda del día", () => {
    const r = dominantMoodByDay([
      { mood: "ansioso", created_at: at(2026, 6, 10, 9) },
      { mood: "ansioso", created_at: at(2026, 6, 10, 18) },
      { mood: "bien", created_at: at(2026, 6, 10, 21) },
    ]);
    expect(r["2026-06-10"]!.mood).toBe("ansioso");
    expect(r["2026-06-10"]!.count).toBe(3);
  });

  it("empate → el último registrado del día", () => {
    const r = dominantMoodByDay([
      { mood: "bien", created_at: at(2026, 6, 10, 9) },
      { mood: "bajo", created_at: at(2026, 6, 10, 20) },
    ]);
    expect(r["2026-06-10"]!.mood).toBe("bajo");
  });

  it("ignora moods inválidos pero cuenta el día", () => {
    const r = dominantMoodByDay([
      { mood: "xyz", created_at: at(2026, 6, 10) },
    ]);
    expect(r["2026-06-10"]!.mood).toBeNull();
    expect(r["2026-06-10"]!.count).toBe(1);
  });
});

describe("buildHeatmap", () => {
  const now = new Date(2026, 5, 11, 10); // jueves 2026-06-11

  it("genera weeks columnas de 7 días", () => {
    const grid = buildHeatmap([], now, 13);
    expect(grid).toHaveLength(13);
    for (const col of grid) expect(col).toHaveLength(7);
  });

  it("la última columna contiene hoy", () => {
    const grid = buildHeatmap([], now, 4);
    const lastCol = grid[grid.length - 1]!;
    expect(lastCol.some((c) => c.key === localDayKey(now))).toBe(true);
  });

  it("marca como futuro los días posteriores a hoy", () => {
    const grid = buildHeatmap([], now, 4);
    const all = grid.flat();
    const future = all.filter((c) => c.future);
    // jueves es día 3 (lun=0); quedan vie, sáb, dom = 3 futuros
    expect(future).toHaveLength(3);
  });

  it("pinta el mood del día con check-in", () => {
    const grid = buildHeatmap(
      [{ mood: "bien", created_at: at(2026, 6, 11, 9) }],
      now,
      4
    );
    const today = grid.flat().find((c) => c.key === "2026-06-11");
    expect(today?.mood).toBe("bien");
  });
});
