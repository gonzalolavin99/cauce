# 🔭 Mejoras Pendientes v2 — Cauce

> Documento complementario a `mejoras-roadmap.md`. **Nada de lo listado aquí
> está en el roadmap original** — son brechas detectadas en una revisión
> completa del código el 2026-06-11 (seguridad OWASP, rendimiento, visual/UX y
> operación). Cuando una tarea se empiece, conviene moverla al roadmap o
> marcarla acá con checkboxes.

---

## 🔐 1. Seguridad (OWASP Top 10 + hardening)

### 1.1 CORS abierto en las edge functions — `A05 Security Misconfiguration` ✅ HECHO (2026-06-11)

`supabase/functions/ai-chat/index.ts` respondía con
`Access-Control-Allow-Origin: *`. Cualquier sitio web podía invocar la función
desde el navegador de un usuario logueado.

- [x] `ai-chat`: allowlist de origins (`corsHeadersFor`) — Vercel prod, Netlify
  legacy y `localhost:8081`. Refleja el Origin solo si está en la lista; sin
  match no manda `ACAO` → el navegador bloquea la lectura cross-origin. Nativo
  no manda Origin, no le afecta.
- [x] `embed-exercises`: se le quitó el CORS por completo (es administrativa,
  solo service role vía curl/CI; nunca se llama desde un navegador).

### 1.2 Rate limit manipulable por el propio usuario — `A01 Broken Access Control` ✅ HECHO (2026-06-11)

El contador `ai_chat_rate_limits` se escribía **con el JWT del usuario**, que
podía llamar a PostgREST y resetear su propia ventana, anulando el límite de
20 msg/15min (= costo OpenAI ilimitado).

- [x] Función `check_and_increment_ai_rate_limit()` `SECURITY DEFINER` que usa
  `auth.uid()` (no acepta user_id por parámetro → no se puede suplantar) y hace
  el upsert atómico (sin carrera TOCTOU). Migración
  `20260611120000_harden_rate_limit.sql`, aplicada y verificada en prod.
- [x] Revocado `ALL` sobre `ai_chat_rate_limits` a anon/authenticated → el
  chequeo de privilegios ocurre antes que RLS, así que PostgREST queda cerrado
  aunque hubiera una policy permisiva. La edge function ahora llama al RPC
  (fail-open ante error de DB).
- [ ] Pendiente fino: test de penetración E2E (`PATCH /rest/v1/...` con JWT
  real). Verificado a nivel de grants (authenticated ya no tiene privilegios
  sobre la tabla).

### 1.3 Headers de seguridad HTTP en la PWA — `A05`

El hosting solo configuraba headers de **cache**, ninguno de seguridad.

- [x] Base aplicada en la migración a Vercel (2026-06-11):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (anti-clickjacking),
  `Referrer-Policy`, `Permissions-Policy`, `HSTS`.
- [ ] **Content-Security-Policy**: requiere afinado (Expo web usa scripts/styles
  inline). Empezar con `CSP-Report-Only`, recopilar violaciones, luego aplicar.
  Objetivo: `default-src 'self'; connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io`.

### 1.4 Esquema y RLS fuera de control de versiones — `A01` / auditabilidad ✅ AUDITADO (2026-06-11)

Solo existían 2 migraciones en `supabase/migrations/`. El esquema completo vivía
solo en el proyecto Supabase.

- [x] **Auditoría RLS completa** → `docs/auditoria-rls.md`. Esquema extraído de
  prod vía Management API (`scripts/dump-schema-api.mjs`, sin Docker). Resultado:
  las 13 tablas tienen RLS habilitado y políticas de aislamiento correctas
  (`auth.uid()`). El problema real eran **grants demasiado amplios** (TRUNCATE
  sobre embeddings, escritura sobre el catálogo, etc.) — corregidos en la
  migración de validación.
- [x] `exercises` y `exercise_embeddings`: ahora solo lectura para clientes.
- [ ] Pendiente: codificar el **DDL baseline** de las 13 tablas como migración
  (requiere Docker/`pg_dump`; la Management API no exporta DDL completo). El
  historial remoto `supabase_migrations.schema_migrations` aún no existe (nunca
  se usó `db push`); se creará en el primer push con Docker.
- [ ] Pendiente fino: test de penetración cruzado A↔B vía PostgREST.

### 1.5 Validación server-side de escrituras — `A04 Insecure Design` ✅ HECHO (2026-06-11)

La validación de inputs vivía solo en el cliente (zod). Migración
`20260611121000_server_side_validation.sql`, aplicada y verificada en prod.

- [x] CHECK constraints nuevos (`NOT VALID` para no romper filas viejas): enum
  de `mood`; longitudes de `mood_logs.note`, `ai_messages.content` (16k),
  `ai_conversations.title`, todos los campos de `crisis_plans`,
  `profiles.display_name`, `regulation_sessions.notes`. (Ya existían buenos
  CHECKs de enum/rango en `energy`, `role`, `consent_type`, etc. — ver
  `docs/auditoria-rls.md`.)
- [x] Trigger `enforce_mood_log_daily_cap`: máx 50 mood logs/día por usuario.
- [ ] Pendiente fino: `VALIDATE CONSTRAINT` de los CHECK `NOT VALID` una vez
  confirmado que no hay filas fuera de rango.

### 1.6 Anti-abuso en signup — `A07 Identification & Auth Failures`

Sin CAPTCHA, un bot puede crear cuentas masivamente (cada cuenta = acceso al
chat LLM con costo por token).

- [ ] Activar **Cloudflare Turnstile o hCaptcha** en Supabase Auth (soporte
  nativo: Auth → Settings → Bot and Abuse Protection) y pasar el token en
  `signUp`/`signInWithPassword`. **Bloqueado esperando**: crear el sitio en
  Cloudflare (gratis) y pasar site key + secret (decisión 2026-06-11).
- [ ] ~~Activar **Leaked Password Protection** (HaveIBeenPwned)~~ **Bloqueado
  por plan**: requiere Supabase Pro (verificado vía API 2026-06-11; el
  proyecto está en Free). Activar si se sube de plan.
- [ ] Alternativa gratuita disponible: subir `password_min_length` de 6 → 8
  vía Management API (1 llamada, reversible). **Decidido dejar en 6 por ahora**
  (2026-06-11).
- [ ] Evaluar MFA opcional (TOTP) para usuarios que lo quieran (Supabase lo trae).

### 1.7 Protección de datos en el dispositivo ✅ HECHO (2026-06-11, solo nativo)

Datos de salud mental visibles con acceso físico al teléfono:

- [x] **Bloqueo biométrico de la app** opt-in desde Perfil → Privacidad
  (`src/features/privacy/lib/appLock.ts` + `AppLockGate` en el layout raíz):
  pide Face ID/huella/PIN al abrir y tras 2 min en background. El toggle
  requiere autenticarse para activar Y desactivar. Solo aparece si hay
  biometría enrolada; en web no existe.
- [x] **Privacidad de pantalla** opt-in: `FLAG_SECURE` en Android (bloquea
  screenshots + miniatura en recientes) vía `expo-screen-capture`; en iOS es
  best-effort (grabación/mirroring). Se re-aplica en cada arranque.
- [x] Fallback de `SecureStore` → AsyncStorage ahora se reporta a Sentry (una
  vez por arranque, sin key ni valor) para medir cuántos usuarios nativos
  quedan sin hardening.

> ⚠️ Pendiente de **probar en dispositivo real** (requiere dev build o Expo Go;
> los testers actuales usan la PWA, donde nada de esto aplica).

### 1.8 Hardening del chat IA — OWASP LLM Top 10

- [ ] **Prompt injection (LLM01)**: el mensaje del usuario y el contenido RAG se
  inyectan al prompt sin delimitar. Envolver contexto en delimitadores claros
  (`<contexto>…</contexto>`) + instrucción explícita de ignorar instrucciones
  dentro del contexto/mensaje que pidan revelar el system prompt o cambiar de rol.
- [ ] **Exfiltración del system prompt**: el prompt incluye diagnósticos, frase
  ancla y mood del usuario (datos propios, riesgo bajo), pero conviene
  test manual: "repite tus instrucciones" / "ignora todo lo anterior".
- [ ] **Validación de salida**: `generateSuggestions` parsea JSON del modelo con
  regex — ya filtra tipo/longitud ✅; aplicar el mismo criterio si se agregan
  más salidas estructuradas.
- [ ] **Cap de costo**: alarma de presupuesto en OpenAI + límite mensual por
  usuario (tabla de uso agregado), no solo ventana de 15 min.

### 1.9 Supply chain y secretos — `A06 Vulnerable Components` / `A08 Integrity` 🔶 PARCIAL (2026-06-11)

- [x] **Doble lockfile resuelto**: borrado `bun.lock` (los scripts usan npm);
  queda solo `package-lock.json`.
- [x] **Dependabot** configurado (`.github/dependabot.yml`): PRs semanales
  agrupados para npm + github-actions, ignorando el bloque expo/react-native
  (se sube en conjunto al cambiar de SDK).
- [x] **`npm audit --audit-level=high` en CI** (workflow `ci.yml`).
- [ ] `npm audit` actual: 2 high + 1 critical, **todas transitivas del toolchain
  de build de Expo** (`shell-quote`, `fast-uri`, `xmldom` vía `@expo/cli`,
  `xcode`, etc.) — son dev-deps que no entran al bundle de runtime. El fix real
  es `npx expo install --fix` al subir de SDK; `npm audit fix --force` querría
  instalar `expo@56` (breaking). Documentado, no aplicado por riesgo.
- [ ] **Secret scanning** (gitleaks) en CI — pendiente.
- [ ] Edge functions: migrar `esm.sh/@supabase/supabase-js` a `npm:` specifier
  con lockfile de Deno — pendiente.

### 1.10 Sesión y ciclo de vida de la cuenta

- [ ] Re-autenticación antes de acciones sensibles: exportar datos, borrar
  cuenta (pedir contraseña o biometría de nuevo).
- [ ] Timeout de sesión configurable para web (la PWA en un computador
  compartido mantiene sesión indefinida).
- [ ] Verificar **borrado en cascada** completo al eliminar cuenta: que no
  queden huérfanos en `ai_messages`, `exercise_embeddings` de prueba, storage,
  ni en los logs del proveedor LLM (revisar retención de OpenAI / DPA).
- [ ] Auditoría de eventos de seguridad: login fallido repetido, rate-limit
  alcanzado, export de datos → log estructurado + alerta Sentry.

---

## ⚡ 2. Rendimiento y optimización

*(El bundle/lazy-loading y la paginación ya están en el roadmap §4 y §2.2 — no se repiten.)*

### 2.1 Migrar `expo-av` → `expo-audio` / `expo-video` ✅ HECHO (2026-06-11)

`expo-av` estaba **deprecado desde SDK 54**. Resultó ser una dependencia
muerta: ningún archivo la importaba (la guía de voz usa `expo-speech`).
Desinstalada sin migración necesaria.

### 2.2 Persistir el cache de React Query ✅ HECHO (2026-06-11)

Cada arranque partía con cache frío (espera red para mostrar moods/insights).

- [x] `PersistQueryClientProvider` + AsyncStorage
  (`src/shared/lib/queryPersist.ts`): la app abre con los últimos datos y
  revalida en background. `maxAge` 24 h, `buster` versionado, `gcTime`
  alineado al `maxAge`.
- [x] Exclusiones: el chat IA (`ai-*`, lo más íntimo — en web AsyncStorage es
  localStorage plano) y la sesión de auth (`staleTime: Infinity`, restaurarla
  podría mostrar sesión viva expirada).
- [x] El signOut purga el cache persistido (PWA en computadores compartidos).

### 2.3 Latencia del chat: sugerencias bloquean el `done` ✅ HECHO (2026-06-11)

En `ai-chat/index.ts`, tras cada respuesta se hacía una **segunda llamada LLM**
(`generateSuggestions`) antes de emitir `done` → 1-3 s de latencia extra.

- [x] Streaming: `done` se emite apenas la respuesta está persistida; las
  sugerencias llegan después en su propio evento `suggestions`. El cliente
  (`useStreamMessage.ts` + `chat.tsx`) las recibe vía `onSuggestions`. La
  burbuja del asistente se "cierra" sin esperar la segunda llamada.
- [x] Ruta JSON (nativo): persist + sugerencias en `Promise.all` (no se suman
  las latencias).
- [ ] Pendiente fino: modelo más barato para las sugerencias o generarlas cada
  N mensajes.

### 2.4 Métricas reales de rendimiento

Sin datos, las optimizaciones son a ciegas:

- [ ] Activar **Sentry Performance** (browser tracing en web: LCP, INP, TTFB;
  app start / slow frames en nativo). El SDK ya está instalado.
- [ ] Marcar transacciones clave: arranque → primer render con datos, envío de
  mensaje → primer token.

### 2.5 Service worker: cobertura offline real

El SW precachea el shell pero **no el bundle JS hasheado** → tras limpiar cache
o en la primera visita offline, la app no carga.

- [ ] Generar la lista de assets de `dist/_expo/static/` en el build (el patch
  script puede inyectarla en `sw.js`) y precachearlos.
- [ ] `stale-while-revalidate` para assets en vez de cache-first puro +
  **navigation preload** para acelerar la primera navegación.

### 2.6 Trabajo pesado fuera del render

`buildHeatmap`, `detectTemporalPatterns` y `summarize` crecen con el historial
(400+ logs). Hoy corren en el hilo JS durante render/queryFn.

- [ ] Medir con usuarios de 6+ meses de datos simulados; si pasa de ~16 ms,
  mover a `startTransition` / `InteractionManager.runAfterInteractions`.
- [ ] Cachear resultados derivados por día (el heatmap de ayer no cambia).

### 2.7 Fuentes e íconos

- [ ] `@expo/vector-icons` carga familias completas de íconos; en web se puede
  hacer subset (solo Ionicons se usa) o tree-shaking con
  `@expo/vector-icons/Ionicons` import directo — revisar qué entra al bundle.
- [ ] `font-display: swap` + preload de la fuente principal en el HTML patch.

---

## 🎨 3. Mejoras visuales y de experiencia

### 3.1 Modo oscuro

`userInterfaceStyle: "automatic"` está declarado pero la paleta es clara fija
(`bg-white`, `ink #1A1F2B` hardcodeados). Para una app que se usa de noche en
momentos de ansiedad/insomnio (hay quick reply "No puedo dormir"), el modo
oscuro es casi de salud, no estética.

- [x] **Hecho con CSS variables** (2026-06-12): la paleta de
  `tailwind.config.js` apunta a triplets RGB en `global.css` (`:root` /
  `.dark:root`), así TODOS los `text-ink`/`river-*` existentes cambian de tema
  sin tocar cada className. `bg-white` migrado a token `bg-surface` (27 usos).
  `darkMode: "class"` + `colorScheme.set()` de nativewind.
- [x] Toggle Sistema/Claro/Oscuro en Perfil → Apariencia, persistido por
  dispositivo (`src/shared/theme/themeMode.ts`); "Sistema" sigue al SO. La
  navegación usa el mismo scheme.
- [x] Props nativas que no pueden usar variables: hooks
  `usePlaceholderColor()` / `useAccentColor()` (inputs, PageHeader,
  EmptyState, chat, TabBar, halos de Screen, ToastHost).
- [x] Pasada fina (2026-07-30): todos los íconos/colores decorativos con hex
  teal fijo migrados a `useAccentColor()` / `useRiverColor()` (nuevo hook
  theme-aware para shades river en props nativas — `src/shared/theme/useRiverColor.ts`).
  Cubre: onboarding, regulate (iconos + ondas done), support, ExerciseCard,
  ProactiveNudge, StreakCard, VoiceToggle, CountdownRing, BreathingCircle,
  MoodHeatmap, Avatar, TypingDots del chat, Switches de profile/my-data,
  ProgressDots, Skeleton, chevrons del home. Quedan fijos a propósito:
  `MOOD_COLOR` (data-viz semántica), `exportPlanPdf` (documento impreso),
  InstallPrompt web (botón sólido con texto blanco, legible en ambos temas).

### 3.2 Skeleton loaders ✅ HECHO (2026-06-11)

Ya existían (`Skeleton`/`CardSkeleton`) en inicio, historial e insights; el
único spinner que quedaba era el de la lista de ejercicios (explorar) —
reemplazado por 3 `CardSkeleton`.

### 3.3 Microinteracciones y transiciones ✅ HECHO (2026-06-11)

- [x] Animación de presión en `Card` (scale 0.97, mismo patrón que `Button`,
  que ya la tenía).
- [x] Transiciones del Stack: `slide_from_right` en push (nativo; web no
  anima), modales desde abajo (ya venía por `presentation: "modal"`).
- [x] Entrada animada de las burbujas del chat (`FadeInDown` 200 ms).
- [x] Typing indicator de tres puntos con pulso escalonado en vez de
  "Pensando…" (el `accessibilityLabel` sigue anunciando el estado).
- [x] Todo detrás de `useReducedMotion`.

### 3.4 Celebración de hitos sin presión ✅ HECHO (2026-06-11)

- [x] Al alcanzar un hito de racha (3/7/14/30…), la `StreakCard` hace un pulso
  suave de 3 ciclos (scale 1.03 + glow sand, ritmo de respiración — no
  confetti). Se celebra **una sola vez por hito** (AsyncStorage por usuario) y
  se omite con reduced-motion.

### 3.5 Sistema de toasts/snackbars ✅ HECHO (2026-06-11)

- [x] `showToast()` (`src/shared/ui/toast.ts`) + `<ToastHost/>` en el layout
  raíz: píldora flotante con auto-dismiss (2.8 s), `accessibilityLiveRegion`,
  animación detrás de `useReducedMotion`, máx. 2 visibles. Mismo patrón
  listener que `alert.ts` (web-safe).
- [x] Migradas las confirmaciones de éxito: mood registrado, plan de crisis
  guardado/borrado, nombre/diagnósticos/preferencias del perfil. Los errores
  y confirmaciones destructivas siguen siendo diálogos.

### 3.6 Pull-to-refresh ✅ HECHO (2026-06-11)

- [x] `useRefresh()` (`src/shared/hooks/useRefresh.ts`): refetch de las
  queries activas. `RefreshControl` cableado en inicio, explorar, insights y
  historial de mood (tint river-500). En web es no-op (sin gesto); el valor
  es para nativo.

### 3.7 Ilustraciones y identidad visual

- [ ] Empty states con ilustraciones propias (estilo calmo, paleta river) en
  vez de solo ícono + texto.
- [ ] Onboarding con ilustración por paso + indicador de progreso (dots).
  (Los dots ya existen — `ProgressDots`; falta la ilustración por paso.)
- [ ] Icono adaptativo **monocromo** para Android 13+ (themed icons).
  Requiere asset monocromo nuevo (el adaptive-icon actual es a color; reusarlo
  se vería mal). Bloqueado por diseño de asset.
- [x] Transición splash → app con fade (`SplashScreen.setOptions({ fade: true })`)
  — hecho 2026-07-30.

### 3.8 Teclado y formularios

- [ ] `react-native-keyboard-controller` para animación sincronizada del
  teclado (el `KeyboardAvoidingView` clásico saltea en Android).
- [ ] En el chat: que el input quede pegado al teclado sin saltos y la lista
  haga scroll automático al último mensaje al abrirlo.

### 3.9 Tablet / escritorio

`supportsTablet: true` pero el layout es una columna de 480px. Para web
escritorio: vista de dos paneles donde aporte (lista de conversaciones + chat;
historial + detalle), y el TabBar centrado/acotado.

### 3.10 Audio opcional en regulación

Guía de voz para respiración (`expo-speech` ya instalado) y/o tonos suaves de
inhala/exhala, con toggle. Útil para hacer el ejercicio con los ojos cerrados —
hoy exige mirar la pantalla.

---

## 🛠 4. Operación, calidad y DevOps

### 4.1 CI/CD con GitHub Actions (la brecha más grande)

No hay pipeline: typecheck/tests corren solo en la máquina local.

- [ ] Workflow en cada PR/push: `typecheck` + `lint` + `test` (+ coverage
  threshold ya configurado) + `npm audit` + `build:web`.
- [ ] Deploy automático: preview de Vercel por PR, prod al mergear a `main`
  (con `VERCEL_TOKEN` como secret, o conectando el repo Git a Vercel).
- [ ] gitleaks + Dependabot (ver §1.9).

### 4.2 Sourcemaps a Sentry

Los errores de prod llegan minificados (`t is not a function`). Subir sourcemaps
del build web a Sentry (`sentry-cli` en `deploy-web.ps1`) + `release` tag para
asociar errores a versión desplegada.

### 4.3 Staging

Todo se prueba contra el proyecto Supabase de prod. Crear proyecto
`cauce-staging` (free tier) + `.env.staging`; smoke test ahí antes de deploy
prod. Requiere primero el baseline de migraciones (§1.4).

### 4.4 Backups y continuidad

- [ ] Verificar política de backups del proyecto Supabase (free = 0 días);
  los datos de salud de usuarios no pueden depender de "no se borró nada".
  Mínimo: export semanal programado (pg_dump vía cron en CI).
- [ ] Documentar runbook de restauración.

### 4.5 Higiene del repo

- [ ] Borrar la carpeta basura `src/typesmkdir/` (artefacto de un mkdir fallido).
- [ ] Resolver el doble lockfile (§1.9).
- [ ] Añadir `CONTRIBUTING.md` corto con los comandos y el flujo de deploy.

### 4.6 Nativo: EAS + OTA

Cuando se retome la app nativa: EAS Build para binarios, `expo-updates` para
OTA de fixes JS sin pasar por las stores, y canales staging/prod.

---

## 🎯 Priorización sugerida

| Prioridad | Items | Razón |
|---|---|---|
| 🔴 Ya | 1.2 (rate limit), 1.4 (RLS audit), 1.5 (validación server), 4.1 (CI) | Riesgo activo de abuso/costo y de regresión sin red de seguridad |
| 🟠 Pronto | 1.1 (CORS), 1.6 (captcha+HIBP), 1.9 (lockfile/audit), 2.3 (latencia chat), 2.1 (expo-av) | Barato, alto retorno |
| 🟡 Siguiente | 1.7 (biometría/FLAG_SECURE), 2.2 (persist cache), 3.1 (dark mode), 3.2–3.6 (UX), 4.2 (sourcemaps) | Experiencia y confianza |
| 🟢 Después | 1.8, 1.10, 2.5–2.7, 3.7–3.10, 4.3–4.6 | Madurez |

---

**Creado**: 2026-06-11 · Revisión completa del código (app + edge functions +
hosting). Complementa, no reemplaza, `mejoras-roadmap.md`.
