// Aplica un archivo SQL a la base remota vía Supabase Management API.
// Uso: node scripts/apply-migration-api.mjs <ruta-token> <archivo.sql>
// Fallback cuando `supabase db push` no está disponible (requiere Docker).

import { readFileSync } from "node:fs";

const [tokenPath, sqlPath] = process.argv.slice(2);
const token = readFileSync(tokenPath, "utf8").trim();
const sql = readFileSync(sqlPath, "utf8");
const PROJECT_REF = "tyztybaiyxvfdxirlsrc"; // cauce-dev

const resp = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (!resp.ok) {
  console.error(`ERROR ${resp.status}: ${await resp.text()}`);
  process.exit(1);
}
console.log(`OK: ${sqlPath} aplicado.`);
