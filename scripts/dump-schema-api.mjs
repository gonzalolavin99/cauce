// Dump del esquema remoto vía Supabase Management API (sin Docker).
// Uso: node scripts/dump-schema-api.mjs <ruta-token> <salida.json>
// El token es el access token de la CLI (sbp_...). Solo lectura de catálogos.

import { readFileSync, writeFileSync } from "node:fs";

const [tokenPath, outPath] = process.argv.slice(2);
const token = readFileSync(tokenPath, "utf8").trim();
const PROJECT_REF = "tyztybaiyxvfdxirlsrc"; // cauce-dev

async function sql(query) {
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!resp.ok) {
    throw new Error(`API ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

const queries = {
  tables: `
    select c.relname as table_name, c.relrowsecurity as rls_enabled,
           obj_description(c.oid) as comment
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname`,

  columns: `
    select table_name, column_name, data_type, is_nullable, column_default,
           character_maximum_length
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position`,

  constraints: `
    select conrelid::regclass::text as table_name, conname,
           pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by conrelid::regclass::text, conname`,

  policies: `
    select tablename, policyname, permissive, roles::text, cmd,
           qual, with_check
    from pg_policies where schemaname = 'public'
    order by tablename, policyname`,

  grants: `
    select table_name, grantee, string_agg(privilege_type, ',') as privs
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon','authenticated','public')
    group by table_name, grantee
    order by table_name, grantee`,

  functions: `
    select p.proname, p.prosecdef as security_definer,
           pg_get_function_identity_arguments(p.oid) as args,
           l.lanname as language
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
    order by p.proname`,

  triggers: `
    select event_object_table as table_name, trigger_name, action_timing,
           event_manipulation, action_statement
    from information_schema.triggers
    where trigger_schema = 'public'
    order by event_object_table, trigger_name`,

  indexes: `
    select tablename, indexname, indexdef
    from pg_indexes where schemaname = 'public'
    order by tablename, indexname`,

  enums: `
    select t.typname, array_agg(e.enumlabel order by e.enumsortorder)::text as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname`,
};

const result = {};
for (const [name, q] of Object.entries(queries)) {
  process.stdout.write(`  ${name}... `);
  result[name] = await sql(q);
  console.log(`${result[name].length} filas`);
}

writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Escrito: ${outPath}`);
