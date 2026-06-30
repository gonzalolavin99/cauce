import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Config mínima. Sólo testeamos funciones puras en Node — nada de RN aquí.
 * Si en el futuro queremos testear componentes, añadiremos jest-expo o
 * vitest-native. Por ahora, pure-logic coverage sobre paths críticos.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Sólo medimos la lógica pura que efectivamente testeamos. Incluir
      // toda la app (componentes RN, hooks con red) inflaría el denominador
      // con código que vitest-node no ejecuta.
      include: [
        "src/features/exercises/engine/recommend.ts",
        "src/features/ai-advisor/engine/crisis.ts",
        "src/features/crisis/lib/isCrisisPlanUseful.ts",
        "src/features/notifications/lib/resolvePrefs.ts",
        "src/shared/lib/initials.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
