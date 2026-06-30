# Cauce — Notas para Claude Code

App de bienestar (Expo / React Native + Expo Router). Se despliega como **PWA en
Vercel** además de las apps nativas.

## Comandos clave

| Comando | Qué hace |
|---|---|
| `npm run start` | Expo dev server |
| `npm run web` | Dev en navegador |
| `npm run build:web` | Build de la PWA → carpeta `dist/` (expo export + patch HTML) |
| `npm run deploy:web` | Build + deploy a producción en Vercel (ver abajo) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run lint` / `format` | Biome |

> En esta máquina, `npm`/`npx` viven en
> `C:\Users\GLavin\AppData\Local\Programs\nodejs\` (no en nvm). `bun` también está.

## Deploy de la PWA a Vercel

> **Migrado de Netlify a Vercel el 2026-06-11** (Netlify pausó los deploys de
> prod por créditos agotados). El sitio viejo
> https://cauce-bienestar-pwa.netlify.app sigue sirviendo la última versión
> publicada ahí, pero ya no se deploya.

El build se hace **local** y subimos el `dist/` ya compilado vía Build Output
API (`vercel deploy --prebuilt`). Vercel solo hostea archivos estáticos —
**no compila**.

- Sitio: **cauce-bienestar-pwa** · https://cauce-bienestar-pwa.vercel.app
- Cuenta Vercel: `gonzalolavin99` (sesión ya iniciada en esta máquina;
  alternativa no interactiva: `$env:VERCEL_TOKEN` de
  https://vercel.com/account/settings/tokens)
- Headers (seguridad + cache) y rewrite SPA: `scripts/vercel-output-config.json`
  (reemplaza al viejo `netlify.toml`, que queda solo como referencia histórica)

**Flujo (usa el script):**

```powershell
npm run deploy:web
```

El script (`scripts/deploy-web.ps1`) hace `build:web` (con `--clear`) → arma
`.vercel/output/` (copia `dist/` a `static/` + `config.json`) →
`vercel deploy --prebuilt --prod` → verifica HTTP 200. Si el proyecto no está
enlazado (`.vercel/project.json` ausente), lo enlaza solo.

> ⚠️ **Clave:** como el build es local, las variables `EXPO_PUBLIC_*` se hornean
> en el bundle **en tu máquina**. Definirlas en el panel de Vercel NO sirve;
> tienen que estar en `.env.local` antes de correr el build.
>
> Los warnings `npm warn tar/cleanup EPERM/EBUSY` al correr `npx` son ruido
> inofensivo de Windows (limpieza de caché temporal); el deploy igual sale con
> exit 0.
>
> ⚠️ Al cambiar el dominio de la PWA hay que agregar la URL nueva en Supabase →
> Authentication → URL Configuration (Site URL / redirect URLs de los mails).

## Sentry (reporte de errores)

- SDK: `@sentry/react-native` (soporta web y nativo con el mismo `init`).
- Init: `src/shared/lib/errorReporting.ts` → `initErrorReporting()`, llamado una
  vez desde el layout raíz.
- **Dormido por defecto:** sin `EXPO_PUBLIC_SENTRY_DSN`, `init` es no-op y el
  logger cae a consola. La app funciona igual.
- Privacidad (Ley 19.628): `sendDefaultPii: false`, no se envía contenido de
  mensajes ni datos de salud — solo el error, su `source` y `extra` no sensible.

**Para activarlo:** poné el DSN en `.env.local` y reconstruí/redeployá:
```
EXPO_PUBLIC_SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx
```
El DSN es una clave **pública** de cliente, segura de exponer en el bundle.

> ⚠️ **Caché de Metro:** al cambiar cualquier `EXPO_PUBLIC_*` en `.env.local`,
> hay que buildear con `expo export -p web --clear`. Sin `--clear`, Metro reusa
> el módulo cacheado (`src/shared/env.ts`) y el nuevo valor NO se inyecta en el
> bundle (el hash del JS ni cambia). `npm run deploy:web` ya usa `--clear`.
> Para verificar que entró:
> `grep -c "ingest" dist/_expo/static/js/web/*.js` debe dar ≥ 1.
