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
  },
});
