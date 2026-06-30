# Deploy de la PWA de Cauce a Vercel (producción)
#
# Build local + subida del `dist` ya compilado vía Build Output API
# (--prebuilt). Vercel NO compila nada: solo hostea los archivos estáticos.
# Las variables EXPO_PUBLIC_* se hornean en el bundle EN ESTE BUILD LOCAL,
# por eso definirlas en el panel de Vercel NO sirve; tienen que estar en
# .env.local antes de correr esto.
#
# Uso:
#   npx vercel login        # una sola vez en esta máquina (o $env:VERCEL_TOKEN)
#   npm run deploy:web
#
# Headers (seguridad + cache) y rewrite SPA: scripts/vercel-output-config.json
# (equivalente al viejo netlify.toml). El proyecto enlazado vive en
# .vercel/project.json (gitignoreado); si falta, este script lo enlaza solo.

$ErrorActionPreference = "Stop"

$projectName = "cauce-bienestar-pwa"
$tokenArgs = @()
if ($env:VERCEL_TOKEN) { $tokenArgs = @("--token", $env:VERCEL_TOKEN) }

Write-Output "==> Build web (expo export --clear + patch HTML)..."
# --clear limpia la cache de Metro. IMPRESCINDIBLE: sin esto, si cambiaste una
# variable EXPO_PUBLIC_* en .env.local, Metro reusa el modulo cacheado y el
# nuevo valor NO se hornea en el bundle.
npx expo export -p web --clear
if (-not $?) { Write-Error "Build fallo"; exit 1 }
node scripts/patch-web-html.mjs
if (-not $?) { Write-Error "Patch HTML fallo"; exit 1 }

Write-Output "==> Enlazando proyecto Vercel ($projectName)..."
if (-not (Test-Path ".vercel/project.json")) {
  npx --yes vercel link --yes --project $projectName @tokenArgs
  if (-not $?) { Write-Error "vercel link fallo (¿hiciste 'npx vercel login'?)"; exit 1 }
}

Write-Output "==> Armando Build Output API (.vercel/output)..."
if (Test-Path ".vercel/output") { Remove-Item -Recurse -Force ".vercel/output" }
New-Item -ItemType Directory -Force ".vercel/output" | Out-Null
Copy-Item -Recurse "dist" ".vercel/output/static"
Copy-Item "scripts/vercel-output-config.json" ".vercel/output/config.json"

Write-Output "==> Deploy a produccion..."
npx --yes vercel deploy --prebuilt --prod --yes @tokenArgs
if (-not $?) { Write-Error "Deploy fallo"; exit 1 }

Write-Output "==> Listo. Verificando sitio..."
$code = (Invoke-WebRequest -Uri "https://$projectName.vercel.app" -UseBasicParsing).StatusCode
Write-Output "HTTP $code -> https://$projectName.vercel.app"
