# 🚀 Roadmap de Mejoras - Cauce

Este documento detalla las oportunidades de mejora identificadas para la aplicación Cauce, organizadas por categorías y divididas en tareas pequeñas con checkpoints claros.

---

## 🛑 Estado de despliegue (actualizado 2026-06-11)

> ✅ **RESUELTO (2026-06-11, más tarde el mismo día): migramos a Vercel.**
> Producción ahora vive en **https://cauce-bienestar-pwa.vercel.app** (sin
> límite de créditos del estilo Netlify; plan Hobby). El deploy del 2026-06-11
> publicó todo el backlog pendiente (6.1, 9.2.2, 6.1.3, 11.2.2). Flujo nuevo:
> `npm run deploy:web` (ver CLAUDE.md). El sitio de Netlify queda como legacy.
> Pendiente del owner: agregar la URL de Vercel en Supabase → Authentication →
> URL Configuration (redirects de los mails de auth).
> Ver también el doc nuevo de brechas: `docs/mejoras-pendientes-v2.md`.

### Qué pasó con Netlify (histórico)

El **2026-06-11**, el equipo **agotó los créditos del ciclo de facturación** de
Netlify. Como consecuencia, Netlify **pausó los deploys de producción**:

- `npx netlify deploy --prod` ahora devuelve `JSONHTTPError: Forbidden`.
- **El sitio en vivo sigue funcionando** (sirve la última versión publicada).
- Los **deploys de preview/branch siguen activos**; solo producción está pausada.
- Netlify agregó **30 créditos de gracia** para mantener el sitio en línea. Si
  también se agotan, el sitio se suspende hasta restaurar créditos.
- **El ciclo se resetea el 2026-07-03.** Para reanudar antes: upgrade del plan.

Mientras tanto seguimos desarrollando local: `npm run typecheck`, `npm run test`
y `npm run build:web` (`expo export`) funcionan sin problema. Lo que NO se puede
es publicar a producción.

### Qué está alojado / desplegado en Netlify

- **Sitio**: `cauce-bienestar-pwa` · https://cauce-bienestar-pwa.netlify.app
  (`siteId 92673748-f79b-40d1-829e-05de4b99dad8`).
- Es **hosting estático**: Netlify solo sirve la carpeta `dist/` ya compilada
  (build local con `expo export`). No compila nada en Netlify.
- **Versión en vivo actual**: incluye todo hasta **9.2.1 (heatmap)** —
  rendimiento, índices DB, optimistic updates, error boundaries + Sentry, chat
  IA completo (streaming + sugerencias + RAG), PDF y compartir plan de crisis,
  efectividad de ejercicios, streaks, heatmap, accesibilidad (labels +
  contraste AA), y el barrido `Alert.alert` → web-safe.
- El backend del chat NO está en Netlify: son **edge functions de Supabase**
  (proyecto `cauce-dev`), que sí se desplegaron (`ai-chat`, `embed-exercises`).

### Backlog: hecho y verificado, PERO sin desplegar a producción

Estas tareas están **completas, con typecheck + tests + build OK**, esperando
que se reactive producción para subirlas todas de una (`npm run deploy:web`):

- **6.1** — Patrones temporales en insights ("Patrones que notamos")
- **9.2.2** — Estadísticas de ejercicios (minutos totales + por categoría)
- **6.1.3** — Sugerencia proactiva in-app (`ProactiveNudge` en Inicio)
- **11.2.2** — Escalado de fuente del sistema (cap global 1.5x)

### Qué queda por hacer (no empezado)

- **4** — Bundle size / lazy loading (el JS pesa ~3.3 MB)
- **6.2.x** — (ya hecho) · **10** — Modo offline robusto (queue de sync +
  resolución de conflictos)
- **11.2.3** — Modo alto contraste (**diferido**: necesita verificación visual,
  se hará cuando vuelvan los deploys)
- **13** — Integraciones wearables (HealthKit / Google Fit — solo nativo)
- **14** — Internacionalización (i18n) — grande
- **15** — Analytics y telemetría — requiere elegir servicio (Mixpanel/Amplitude)
- Pendientes operativos del owner: **rotar** el service role key y el token de
  Netlify (quedaron expuestos en chat), **activar confirmación de email** en
  Supabase, y **limpiar** usuarios de prueba `*@example.com`. (El RAG ya quedó
  activado: migración aplicada + 21 embeddings generados.)

---

## 📊 Índice

1. [Optimización de Rendimiento](#1-optimización-de-rendimiento)
2. [Optimización de Base de Datos](#2-optimización-de-base-de-datos)
3. [Gestión de Estado](#3-gestión-de-estado)
4. [Bundle Size y Carga](#4-bundle-size-y-carga)
5. [Manejo de Errores](#5-manejo-de-errores)
6. [Sistema de Insights](#6-sistema-de-insights)
7. [Mejoras en Chat IA](#7-mejoras-en-chat-ia)
8. [Plan de Crisis](#8-plan-de-crisis)
9. [Gamificación](#9-gamificación)
10. [Modo Offline](#10-modo-offline)
11. [Accesibilidad](#11-accesibilidad)
12. [Testing](#12-testing)
13. [Integraciones](#13-integraciones)
14. [Internacionalización](#14-internacionalización)
15. [Analytics y Telemetría](#15-analytics-y-telemetría)
16. [App Web / PWA](#16-app-web--pwa)

---

## 1. Optimización de Rendimiento

### 1.1 Reducir Re-renders en Listas

**Objetivo**: Mejorar performance en pantallas con listas largas (mood history, ejercicios)

- [x] **Tarea 1.1.1**: Auditar componentes de lista actuales ✅
  - ✅ Identificar componentes que renderizan listas
  - ✅ Medir renders con React DevTools Profiler
  - ✅ Documentar componentes problemáticos
  - **Resultado**: Ver `docs/auditoria-performance.md` - Identificados 3 componentes críticos: MessageBubble (chat), ExerciseCard (explorar), EntriesByDay (mood history)

- [x] **Tarea 1.1.2**: Implementar React.memo en ExerciseCard ✅
  - ✅ `ExerciseCard` envuelto con `memo()`
  - ✅ `onPress` ahora recibe `exerciseId`; `handlePress` memoizado con `useCallback` en `explore.tsx` para mantener referencia estable
  - ✅ `useCallback` interno en la tarjeta para el press

- [x] **Tarea 1.1.3**: Implementar React.memo en componentes de mood ✅
  - ✅ `MessageBubble` (chat) envuelto con `memo()`
  - ✅ `EntryRow`, `EntriesByDay`→reemplazado, `DayBarChart`, `MoodDistribution` envueltos con `memo()` en `mood-history.tsx`

- [x] **Tarea 1.1.4**: Implementar virtualización con FlashList ✅
  - ✅ Instalado `@shopify/flash-list@2.0.2` (compatible SDK 54)
  - ✅ `explore.tsx`: `ScrollView`+`.map()` → `FlashList` con `ListHeaderComponent` (filtros) y `ListEmptyComponent`
  - ✅ `mood-history.tsx`: lista anidada aplanada en filas heterogéneas (`day`/`entry`) con `getItemType` para reciclado; `ListHeaderComponent` (stats/gráficos) y `ListFooterComponent`
  - Nota: FlashList v2 ya no requiere `estimatedItemSize` (medición automática)

### 1.2 Optimizar Cálculos Costosos

- [x] **Tarea 1.2.1**: Identificar cálculos costosos ✅
  - ✅ Auditado `recommend.ts`: los `Set` `preferredByDiagnosis` y `preferredByCalming` se reconstruían **por cada ejercicio** dentro de `scoreExercise()` (O(n·d) innecesario)
  - ✅ `useInsights.summarize()` corre dentro del `queryFn` de React Query (ya cacheado por `queryKey`)

- [x] **Tarea 1.2.2**: Implementar useMemo en motor de recomendación ✅
  - ✅ `useRecommendedExercises` ya envolvía `recommendExercises()` en `useMemo` con deps correctas (`exercises`, `prefs`, `diagnoses`, `feeling`)
  - ✅ `recommend.ts`: agregada `precomputeHints(ctx)` que construye los Sets **una sola vez** por recomendación; `scoreExercise()` los recibe como parámetro opcional (API pública estable)

- [x] **Tarea 1.2.3**: Optimizar cálculo de insights ✅
  - ✅ No existe edge function: los insights se calculan client-side en `summarize()` dentro del `queryFn`
  - ✅ React Query ya cachea por `queryKey ["insights", user.id]` e invalida según staleTime; no requiere memoización manual adicional

---

## 2. Optimización de Base de Datos

### 2.1 Índices Compuestos

**Estado**: Migración creada en `supabase/migrations/20260605000000_performance_indexes.sql` (idempotente, `IF NOT EXISTS`). Aplicar vía Supabase SQL Editor.

- [x] **Tarea 2.1.1**: Crear índice para mood_logs ✅
  ```sql
  CREATE INDEX IF NOT EXISTS mood_logs_user_recent
  ON mood_logs(user_id, created_at DESC);
  ```
  - ✅ Incluido en la migración

- [x] **Tarea 2.1.2**: Crear índice para ai_messages ✅
  ```sql
  CREATE INDEX IF NOT EXISTS ai_messages_conversation
  ON ai_messages(conversation_id, created_at ASC);
  ```
  - ✅ Incluido en la migración

- [x] **Tarea 2.1.3**: Crear índice para consents lookup ✅
  ```sql
  CREATE INDEX IF NOT EXISTS consents_latest
  ON consents(user_id, consent_type, created_at DESC);
  ```
  - ✅ Incluido en la migración

- [x] **Extra**: Índices para `regulation_sessions(user_id, created_at DESC)` (insights + nudge de inactividad) y `ai_conversations(user_id, created_at DESC)` (listado de conversaciones) ✅

### 2.2 Optimizar Queries

- [ ] **Tarea 2.2.1**: Implementar paginación en mood history
  - Agregar parámetro `page` a `useMoodLogs`
  - Implementar infinite scroll en UI
  - Agregar loading states apropiados

- [ ] **Tarea 2.2.2**: Usar select específico en lugar de `*`
  - Auditar todos los `.select('*')` en el código
  - Reemplazar con campos específicos necesarios
  - Documentar campos requeridos por query

- [ ] **Tarea 2.2.3**: Implementar query batching
  - Identificar queries que se ejecutan juntas
  - Combinar en single request donde sea posible
  - Medir reducción en latencia

---

## 3. Gestión de Estado

### 3.1 Consolidar Stores

- [ ] **Tarea 3.1.1**: Auditar uso actual de estado
  - Documentar qué usa Zustand vs React Query vs local state
  - Identificar duplicación de estado
  - Proponer arquitectura unificada

- [ ] **Tarea 3.1.2**: Migrar estado de onboarding a React Query
  - Evaluar si onboarding necesita Zustand
  - Migrar a React Query si es apropiado
  - Actualizar tests

- [ ] **Tarea 3.1.3**: Crear store global para preferencias UI
  - Crear Zustand store para tema, idioma, etc.
  - Migrar preferencias dispersas
  - Persistir con AsyncStorage

### 3.2 Optimistic Updates

- [x] **Tarea 3.2.1**: Implementar optimistic update en mood logs ✅
  - ✅ `useCreateMoodLog`: `onMutate` inserta una entrada optimista (id temporal `optimistic-…`) al frente de todas las queries `["mood-logs", …]` (pantalla de hoy + historial)
  - ✅ Snapshot + rollback en `onError`; `onSettled` invalida para traer el id/created_at real del server
  - ✅ La entrada aparece al instante; no hay que esperar al round-trip

- [x] **Tarea 3.2.2**: Implementar optimistic update en crisis plan ✅
  - ✅ `useUpsertCrisisPlan`: `onMutate` mergea el input normalizado sobre el plan actual dentro de `CrisisPlanQueryResult` (`{plan, fromCache, lastSyncedAt}`)
  - ✅ Normalización extraída a `normalizeCrisisInput` (reusada por mutationFn y onMutate); rollback con snapshot en `onError`; `onSettled` refetch reescribe el cache local desde el server

---

## 4. Bundle Size y Carga

### 4.1 Lazy Loading

- [ ] **Tarea 4.1.1**: Implementar lazy loading en modales
  - Usar `React.lazy()` para pantallas modales
  - Agregar Suspense boundaries apropiados
  - Medir reducción en bundle inicial

- [ ] **Tarea 4.1.2**: Code splitting por feature
  - Separar features en chunks independientes
  - Implementar dynamic imports
  - Configurar metro.config.js apropiadamente

- [ ] **Tarea 4.1.3**: Analizar y reducir dependencias
  - Ejecutar `npx expo-doctor`
  - Identificar dependencias grandes no usadas
  - Buscar alternativas más ligeras

---

## 5. Manejo de Errores

### 5.1 Error Boundaries

- [x] **Tarea 5.1.1**: Crear ErrorBoundary component ✅
  - ✅ Clase `ErrorBoundary` en `src/shared/ui/ErrorBoundary.tsx` (captura errores de render/lifecycle)
  - ✅ UI de fallback amigable con `EmptyState` + botón "Reintentar" (resetea el boundary); detalle del error solo en `__DEV__`
  - ✅ Logger pluggable en `src/shared/lib/logger.ts` (`reportError` / `setErrorReporter`). Hoy escribe a consola; listo para conectar Sentry con `setErrorReporter` (dep `@sentry/react-native` ya instalada, falta DSN/init)

- [x] **Tarea 5.1.2**: Envolver features con boundaries ✅
  - ✅ Boundary global en el layout raíz (`app/_layout.tsx`, `source="root"`) — evita pantalla en blanco ante cualquier crash de render
  - ✅ HOC `withErrorBoundary()` en `src/shared/ui/withErrorBoundary.tsx` para envolver pantallas/features con su propio boundary aislado
  - ✅ Boundaries por-feature aplicados a las pantallas: `chat`, `crisis-plan`, `regulate`, `mood`, `mood-history`, `insights`, y las tabs `home`/`explore`/`profile`/`support`. Un crash de render en una feature ya no tumba el resto de la app
  - ✅ Integración real con Sentry vía `setErrorReporter`: `src/shared/lib/errorReporting.ts` (`initErrorReporting()`) se llama una vez en el layout raíz. Se activa con `EXPO_PUBLIC_SENTRY_DSN` (añadido al schema en `src/shared/env.ts`); sin DSN es no-op y cae a consola. `sendDefaultPii: false` por privacidad (Ley 19.628)

### 5.2 Retry Logic

- [ ] **Tarea 5.2.1**: Implementar retry con backoff exponencial
  - Crear utility function para retry
  - Aplicar a queries críticas (auth, crisis plan)
  - Configurar max retries apropiados

- [ ] **Tarea 5.2.2**: Mejorar manejo de errores de red
  - Detectar errores de conectividad
  - Mostrar mensajes específicos al usuario
  - Implementar queue de retry automático

---

## 6. Sistema de Insights

### 6.1 Detección de Patrones Temporales

- [x] **Tarea 6.1.1**: Función de análisis temporal ✅
  - ✅ `detectTemporalPatterns` (lógica pura, 6 tests): agrupa por día de semana y franja horaria (madrugada/mañana/tarde/noche), compara contra el promedio general usando `MOOD_SCORE`
  - ✅ Conservadora: requiere ≥8 registros totales, ≥3 por grupo y desviación ≥0.5 pts para afirmar un patrón (evita falsos positivos)

- [x] **Tarea 6.1.2**: Integrar en UI de insights ✅
  - ✅ Sección "Patrones que notamos" en `/insights` con frases en lenguaje natural ("Los lunes suelen costarte un poco más", "Las mañanas tiendes a estar mejor")
  - ✅ `temporalPatterns` añadido a `InsightsData`; disclaimer suave ("es una tendencia, no una regla")

- [x] **Tarea 6.1.3**: Sugerencias proactivas (in-app) ✅
  - ✅ `activeNudge` (lógica pura, 5 tests): si el día/franja actual coincide con un patrón "difícil" de la persona, devuelve ese patrón. Nunca nudgea momentos donde suele estar bien
  - ✅ `ProactiveNudge` en Inicio: tarjeta suave "{franja} suelen costarte un poco. ¿Te tomas un momento?" → atajo a regulación. Se oculta sola el resto del tiempo
  - Nota: implementado como sugerencia **in-app** (no notificaciones push). Las notificaciones proactivas quedan como mejora futura (requiere scheduling + opt-in)

### 6.2 Correlación Ejercicios-Mood

- [x] **Tarea 6.2.1**: Tracking de efectividad (sin tabla nueva) ✅
  - ✅ Decisión: reutilizar `regulation_sessions.was_helpful` (ya existente) en vez de una tabla de correlaciones nueva — menos esquema, misma señal
  - ✅ `useExerciseEffectiveness` agrega por `exercise_id`: `{ helped, total }` (helped = was_helpful yes|somewhat)

- [x] **Tarea 6.2.2**: Tracking post-ejercicio ✅ (ya existía)
  - ✅ La pantalla "¿Cómo te sientes ahora?" tras cada ejercicio ya guardaba `was_helpful` en `regulation_sessions` (`useLogSession.completeSession`)
  - ✅ Ahora `completeSession` invalida `["exercise-effectiveness"]` para refrescar el cálculo

- [x] **Tarea 6.2.3**: Usar correlaciones en recomendaciones ✅
  - ✅ `RecommendationContext.effectiveness` + boost en `scoreExercise`: +2 si ayudó 1 vez, +3 si ayudó 2+ veces (pesa fuerte: señal directa de "esto me sirve a mí")
  - ✅ Cableado en `useRecommendedExercises`; razón "Te ha ayudado X veces" se muestra en la intro del ejercicio
  - ✅ 3 tests nuevos en `recommend.test.ts` (89 tests en total)

---

## 7. Mejoras en Chat IA

### 7.1 Streaming de Respuestas

- [x] **Tarea 7.1.1**: Implementar streaming en edge function ✅
  - ✅ `providers.ts`: `OpenAIProvider.completeStream()` consume el SSE de OpenAI (`stream: true`) y produce los `delta.content`
  - ✅ `index.ts`: rama SSE backward-compatible (flag `stream: true` en el body). Eventos `meta` (conversation_id) → `delta` (fragmentos) → `done` (flagged_for_crisis) | `error`. La ruta JSON sigue intacta para nativo
  - ✅ Persistencia y re-chequeo de crisis compartidos entre ambas rutas (`persistReply`); si el stream se corta, persiste el texto parcial
  - ✅ Desplegada: `supabase functions deploy ai-chat`

- [x] **Tarea 7.1.2**: Actualizar UI para streaming ✅
  - ✅ `useStreamMessage.ts`: cliente SSE vía `fetch` + `ReadableStream`. Solo web (`isStreamingSupported`); nativo cae a `useSendMessage`. Salvaguarda: si el stream termina sin evento terminal, reporta error para no colgar la UI
  - ✅ `chat.tsx`: burbuja del asistente que se llena token a token; "Pensando…" hasta el primer token
  - ⚠️ Pendiente fino: botón de cancelación en UI (el cliente ya acepta `AbortSignal`, falta cablear el botón)

### 7.2 Sugerencias de Seguimiento

- [ ] **Tarea 7.2.1**: Generar sugerencias contextuales
  - Agregar lógica para generar 2-3 preguntas de seguimiento
  - Basar en contenido de la conversación
  - Mostrar como chips clickeables

- [x] **Tarea 7.2.2**: Implementar quick replies ✅
  - ✅ Chips horizontales arriba del input en `chat.tsx`
  - ✅ Starters cuando no hay conversación ("Me siento ansioso/a", "No puedo dormir", …) y seguimientos tras una respuesta del asistente ("Cuéntame más", "¿Qué puedo hacer?", "Dame un ejercicio", "Gracias")
  - ✅ Solo en estado idle (no mientras se envía/escribe); al tocar, envía vía `sendText()` (reusa la ruta streaming/nativa)
  - Nota: 7.2.1 (seguimientos generados por el LLM según contexto) queda pendiente; estos son contextuales pero estáticos

### 7.3 RAG (Retrieval Augmented Generation)

> **Decisión de corpus**: el RAG se construye sobre el contenido YA validado de
> la app (tabla `exercises`), NO sobre contenido clínico nuevo inventado. Así se
> evita riesgo ético/legal: el asistente recomienda/cita ejercicios reales.

- [x] **Tarea 7.3.1**: Base de conocimiento = ejercicios existentes ✅
  - ✅ Corpus = `exercises` (name_es, short_description_es, category, steps). Sin contenido clínico fabricado
  - ✅ Función `embed-exercises` arma el texto canónico por ejercicio y lo embebe

- [x] **Tarea 7.3.2**: Implementar vector search ✅
  - ✅ Migración `20260610210543_rag_exercise_embeddings.sql`: `pgvector`, tabla `exercise_embeddings` (vector 1536), índice HNSW coseno, RLS (lectura autenticada), función `match_exercises(query_embedding, match_count, similarity_threshold)`
  - ✅ Edge function `embed-exercises` (protegida con service role key) genera embeddings con `text-embedding-3-small`; idempotente (upsert por exercise_id)

- [x] **Tarea 7.3.3**: Integrar RAG en prompts ✅
  - ✅ `ai-chat/index.ts`: `retrieveRelevantExercises()` embebe el mensaje, llama `match_exercises` (top 3) e inyecta el contexto vía `buildSystemPrompt({ relevantContent })`
  - ✅ Best-effort: si no hay API key / embeddings / función, devuelve [] y el chat funciona igual
  - ✅ `prompt.ts`: bloque "Ejercicios de la app que podrían venir al caso" con instrucción de no inventar fuera de la lista
  - ⚠️ **Activación pendiente** (manual, requiere secretos del owner): (1) aplicar la migración en el SQL Editor; (2) invocar `embed-exercises` con el service role key para poblar los embeddings. Hasta entonces, RAG degrada a no-op

---

## 8. Plan de Crisis

### 8.1 Exportación como PDF

- [x] **Tarea 8.1.1**: Instalar librería de PDF ✅
  - ✅ `expo-print` (~15.0.8) + `expo-sharing` (~14.0.8) vía `expo install`. Soportan web y nativo

- [x] **Tarea 8.1.2**: Crear template de PDF ✅
  - ✅ `src/features/crisis/lib/exportPlanPdf.ts`: HTML imprimible con frase ancla destacada, todas las secciones (mismas etiquetas que la pantalla), contacto de confianza y números de emergencia de Chile (SAMU 131, Salud Responde 600 360 7777, Línea Libre 1515)
  - ✅ Branding Cauce (color `#2F6D6E`), fecha de generación, escape de HTML del contenido del usuario

- [x] **Tarea 8.1.3**: Implementar funcionalidad de compartir ✅
  - ✅ Botón "Exportar como PDF" en la vista del plan (`crisis-plan.tsx`), con estado "Generando PDF…"
  - ✅ Nativo: `printToFileAsync` + `Sharing.shareAsync` (share sheet); Web: `printAsync` (diálogo → "Guardar como PDF")
  - ✅ Disponible también offline (los datos del plan son locales)

### 8.2 Compartir con Contacto de Confianza

- [x] **Tarea 8.2.1**: Versión simplificada del plan ✅
  - ✅ `sharePlan.ts` → `buildPlanText()`: resumen en texto plano (frase ancla, señales, lo que ayuda, lugar seguro, contacto) + números de emergencia de Chile

- [x] **Tarea 8.2.2 / 8.2.3**: Compartir por SMS / email ✅
  - ✅ Botón "Compartir con un contacto" en la vista del plan
  - ✅ Usa el **share sheet del sistema** (`Share.share`) → cubre SMS, email, WhatsApp, etc. en un solo flujo (nativo y web móvil vía `navigator.share`)
  - ✅ Fallback en escritorio web: abre el cliente de email con `mailto:` prellenado
  - Nota: se comparte el resumen en texto (no el PDF adjunto), que es lo más universal y útil para un contacto en un momento de crisis

---

## 9. Gamificación

### 9.1 Sistema de Streaks

- [x] **Tarea 9.1.1**: Streaks sin tabla nueva ✅
  - ✅ Decisión: derivar la racha de `mood_logs` existentes (no se crea tabla). `useStreak` trae hasta 400 fechas y delega en `computeStreak`

- [x] **Tarea 9.1.2**: Calcular streaks de check-ins ✅
  - ✅ `computeStreak` (lógica pura, 10 tests): racha actual + récord (longest), por día local, deduplicando múltiples check-ins del mismo día
  - ✅ Días perdidos con gracia: la racha no se rompe si hoy aún no registraste (cuenta hoy O ayer)
  - ✅ `StreakCard` en la pantalla principal; se invalida `["mood-streak"]` al crear un mood log

- [x] **Tarea 9.1.3**: Celebrar hitos sin presión ✅
  - ✅ Hitos suaves (3/7/14/30/60/100) con mensaje cálido; nota especial al batir el récord
  - ✅ No penaliza: si la racha actual es 0, la tarjeta no aparece (sin regaños); copy enfocado en "vas a tu ritmo"

### 9.2 Visualización de Progreso

- [x] **Tarea 9.2.1**: Gráfico de mood mensual (heatmap) ✅
  - ✅ `MoodHeatmap`: calendar heatmap estilo GitHub (~3 meses, semanas × días), coloreado por el mood dominante de cada día con la paleta `MOOD_COLOR`
  - ✅ Lógica pura `buildHeatmap` / `dominantMoodByDay` (7 tests); auto-contenido (ventana propia, independiente del selector de rango)
  - ✅ "Tooltip": tocar un día muestra fecha + estado arriba; cada celda con `accessibilityLabel`. Insertado en la pantalla de historial; se invalida con cada check-in

- [x] **Tarea 9.2.2**: Mostrar estadísticas de ejercicios ✅
  - ✅ `computeExerciseStats` (lógica pura, 5 tests): completadas, minutos totales (por duración del ejercicio) y conteo por categoría
  - ✅ En `/insights` → tarjeta "Ejercicios" ahora muestra "N min en total" y chips por categoría (respiración, anclaje, etc.)
  - ⏳ Pendiente de salir a producción (deploys de Netlify pausados por créditos)

---

## 10. Modo Offline

### 10.1 Queue de Sincronización

- [ ] **Tarea 10.1.1**: Crear sistema de queue
  - Implementar queue con AsyncStorage
  - Definir estructura de acciones pendientes
  - Agregar timestamps y prioridades

- [ ] **Tarea 10.1.2**: Implementar sincronización automática
  - Detectar cuando vuelve conectividad
  - Procesar queue en orden
  - Manejar conflictos de sincronización

- [ ] **Tarea 10.1.3**: Agregar indicadores visuales
  - Mostrar badge de "X acciones pendientes"
  - Indicar estado de sincronización
  - Permitir sincronización manual

### 10.2 Resolución de Conflictos

- [ ] **Tarea 10.2.1**: Implementar estrategia de resolución
  - Definir reglas (last-write-wins, merge, etc.)
  - Implementar lógica de detección de conflictos
  - Documentar comportamiento

- [ ] **Tarea 10.2.2**: Notificar conflictos al usuario
  - Mostrar diálogo cuando hay conflicto
  - Permitir elegir versión a mantener
  - Guardar log de conflictos resueltos

---

## 11. Accesibilidad

### 11.1 Screen Readers

- [ ] **Tarea 11.1.1**: Auditar accesibilidad actual
  - Probar con TalkBack (Android) y VoiceOver (iOS)
  - Documentar problemas encontrados
  - Priorizar por severidad

- [x] **Tarea 11.1.2**: Agregar labels apropiados ✅ (componentes de alto tráfico)
  - ✅ Roles + labels + `accessibilityState` (selected/disabled) en componentes compartidos: `ChipSelector`, `FeelingSelector`, `ExerciseCard`, `Card` (rol button cuando es pulsable), `ResourceCard` (crítico: "Llamar a X, número")
  - ✅ Selectores de mood y energía (`mood.tsx`) con estado selected y label; emojis decorativos ocultos
  - ✅ Hero CTA e historial en `index.tsx`; iconos decorativos marcados `accessibilityElementsHidden`
  - ✅ `TabBar` ya tenía rol `tab` + hint + selected (verificado)
  - Pendiente: barrido en pantallas menos frecuentes (my-data, onboarding) y `accessibilityHint` donde aporte

- [ ] **Tarea 11.1.3**: Implementar navegación por teclado
  - Asegurar orden de tabulación lógico
  - Agregar focus visible
  - Implementar shortcuts de teclado (web)

### 11.2 Contraste y Tamaños

- [x] **Tarea 11.2.1**: Auditar contraste de colores ✅
  - ✅ Texto secundario `text-ink/50` y `text-ink/60` (≈4.36:1, fallaba AA) → `text-ink/70` (≈6.1:1) en toda la app
  - ✅ Placeholders `rgba(0,0,0,0.4)` (≈2.7:1) → `rgba(0,0,0,0.55)` (≈4.5:1)
  - ✅ Color inactivo del `TabBar` `#9AAAAB` (≈2.4:1) → `#5F7878` (≈4.7:1)
  - Se mantiene la jerarquía (texto principal `ink` pleno vs secundario `/70`); `ink = #1A1F2B`

- [x] **Tarea 11.2.2**: Soportar tamaños de fuente del sistema ✅
  - ✅ Auditado: nada usa `allowFontScaling={false}` → el texto ya escala con la preferencia del sistema
  - ✅ `configureFontScaling()` (llamado en el layout raíz): fija `maxFontSizeMultiplier: 1.5` global en `Text`/`TextInput` — respeta fuentes grandes sin que tamaños extremos rompan layouts

- [ ] **Tarea 11.2.3**: Implementar modo alto contraste
  - DIFERIDO: el tema de alto contraste toca colores en toda la app y necesita
    verificación visual. Se hará cuando vuelvan los deploys de producción (para
    no shippear un cambio global de tema sin poder verlo). La base ya está en AA
    (4.5:1) tras 11.2.1; alto contraste apuntaría a AAA (7:1)
  - Detectar preferencia del sistema · permitir toggle manual

---

## 12. Testing

### 12.1 Tests Unitarios

- [x] **Tarea 12.1.1**: Configurar coverage reporting ✅
  - ✅ `vitest.config.ts`: provider `v8`, reporters `text` + `html`, `include` acotado a la lógica pura testeada
  - ✅ Threshold 70% (lines/functions/branches/statements). Actual: **98.6% stmts / 92.4% branches / 100% funcs**
  - ✅ Script `npm run test:coverage`; `coverage/` añadido a `.gitignore`
  - Pendiente: integrar en CI/CD (no hay pipeline en el repo todavía)

- [x] **Tarea 12.1.2**: Tests para motor de recomendación ✅
  - ✅ `recommend.test.ts` (16 tests): filtro de movilidad, cada regla de score (+5/+2/+1/+2/+1/-2), acumulación, `targets` inválido
  - ✅ `recommendExercises()`: orden por score, filtrado de excluidos, lista vacía, consistencia con/sin hints
  - ✅ Coverage `recommend.ts`: 97.8% stmts / 100% funcs

- [x] **Tarea 12.1.3**: Tests para detección de crisis ✅
  - ✅ `crisis.test.ts` (41 tests) cubre `crisis.ts` al 100% (positivos, falsos positivos, casos límite)

- [x] **Tarea 12.1.4**: Tests para utilidades ✅
  - ✅ `isCrisisPlanUseful.test.ts` (10 tests, 100%) y `initials.test.ts` (11 tests, 100%)

### 12.2 Tests de Integración

- [ ] **Tarea 12.2.1**: Tests para flujo de onboarding
  - Simular completar onboarding completo
  - Verificar que datos se persisten correctamente
  - Testear navegación entre pasos

- [ ] **Tarea 12.2.2**: Tests para flujo de crisis
  - Simular detección de crisis en chat
  - Verificar que se muestran recursos
  - Testear acceso offline a plan de crisis

- [ ] **Tarea 12.2.3**: Tests para autenticación
  - Testear sign up completo
  - Testear sign in
  - Testear manejo de sesión expirada

### 12.3 Tests E2E

- [ ] **Tarea 12.3.1**: Configurar Maestro o Detox
  - Instalar framework elegido
  - Configurar para iOS y Android
  - Crear primer test básico

- [ ] **Tarea 12.3.2**: Tests de flujos críticos
  - Test: Registro → Onboarding → Primer mood log
  - Test: Crear plan de crisis → Acceder offline
  - Test: Chat IA → Detección de crisis → Ver recursos

---

## 13. Integraciones

### 13.1 Wearables

- [ ] **Tarea 13.1.1**: Investigar APIs disponibles
  - Evaluar Apple HealthKit
  - Evaluar Google Fit
  - Documentar capacidades y limitaciones

- [ ] **Tarea 13.1.2**: Implementar lectura de datos de sueño
  - Solicitar permisos apropiados
  - Leer datos de sueño de últimos 30 días
  - Mostrar en perfil de usuario

- [ ] **Tarea 13.1.3**: Correlacionar sueño con mood
  - Agregar sueño a cálculo de insights
  - Detectar patrones (ej: "poco sueño → mood bajo")
  - Mostrar correlaciones en UI

- [ ] **Tarea 13.1.4**: Implementar lectura de actividad física
  - Leer pasos/minutos activos
  - Correlacionar con mood
  - Sugerir movimiento cuando sea apropiado

---

## 14. Internacionalización

### 14.1 Preparar i18n

- [ ] **Tarea 14.1.1**: Instalar y configurar i18n
  - Instalar `react-i18next` o `expo-localization`
  - Configurar estructura de archivos de traducción
  - Crear namespace por feature

- [ ] **Tarea 14.1.2**: Extraer strings hardcodeados
  - Auditar código para strings en español
  - Mover a archivos de traducción
  - Reemplazar con llamadas a t()

- [ ] **Tarea 14.1.3**: Adaptar recursos de crisis por país
  - Crear estructura para recursos por país
  - Agregar recursos de Argentina, México, Colombia
  - Detectar país automáticamente

### 14.2 Variantes Dialectales

- [ ] **Tarea 14.2.1**: Crear variantes de español
  - Definir es-CL, es-AR, es-MX, etc.
  - Adaptar vocabulario específico
  - Probar con hablantes nativos

---

## 15. Analytics y Telemetría

### 15.1 Eventos de Uso

- [ ] **Tarea 15.1.1**: Definir eventos a trackear
  - Documentar eventos importantes (mood_logged, exercise_completed, etc.)
  - Definir propiedades de cada evento
  - Asegurar cumplimiento de privacidad

- [ ] **Tarea 15.1.2**: Implementar tracking
  - Integrar con servicio de analytics (ej: Mixpanel, Amplitude)
  - Agregar eventos en puntos clave
  - Implementar opt-out respetando consentimientos

- [ ] **Tarea 15.1.3**: Crear dashboard de métricas
  - Definir KPIs importantes (DAU, retention, engagement)
  - Crear visualizaciones en herramienta de analytics
  - Configurar alertas para anomalías

### 15.2 A/B Testing

- [ ] **Tarea 15.2.1**: Configurar framework de A/B testing
  - Evaluar herramientas (LaunchDarkly, Optimizely, etc.)
  - Implementar feature flags
  - Crear primer experimento simple

- [ ] **Tarea 15.2.2**: Experimentar con recomendaciones
  - Crear variantes del algoritmo de scoring
  - Medir efectividad (completions, satisfacción)
  - Implementar variante ganadora

---

## 16. App Web / PWA

**Objetivo**: Hacer Cauce instalable y usable desde el navegador (Progressive Web App), reutilizando el código Expo/React Native Web existente.

**Estado actual**: PWA funcional generada con `npm run build:web`. `web.output` se cambió a `"single"` (SPA) porque el render estático fallaba al prerenderizar en Node (`window is not defined` por la init de Supabase auth). Manifest, service worker, prompt de instalación y config de hosting implementados.

### 16.1 Base Web Funcional

- [x] **Tarea 16.1.1**: Verificar build web actual ✅
  - ✅ `web.output` cambiado de `"static"` a `"single"` (el prerender SSR rompía con `window is not defined` en `secureStorage`/Supabase)
  - ✅ `expo export -p web` genera `dist/` correctamente; validado localmente con `npx serve dist`
  - ✅ Script `npm run build:web` = `expo export -p web` + patch de HTML

- [x] **Tarea 16.1.2**: Degradar módulos solo-nativos en web ✅
  - ✅ `secureStorage` ya hace fallback a AsyncStorage en web (`Platform.OS === "web"`)
  - ✅ `notifications/service` ya es stub no-op (sin módulo nativo)
  - ✅ Todas las llamadas a `expo-haptics` están protegidas con `.catch(() => {})` (no-op seguro en web)
  - ✅ `expo-speech` y `Linking` funcionan en web nativamente

- [x] **Tarea 16.1.3**: Ajustar layout responsivo ✅
  - ✅ `Screen` centra el contenido y limita a `maxWidth: 480` solo en web (`Platform.OS === "web"`), halos a pantalla completa
  - Pendiente fino: centrar también el `TabBar` en escritorio (opcional)

### 16.2 Capacidades PWA

- [x] **Tarea 16.2.1**: Crear Web App Manifest ✅
  - ✅ `public/manifest.json` (name, short_name, theme_color `#2F6D6E`, background `#ffffff`, display `standalone`, lang `es`)
  - ✅ Iconos `icon-192`, `icon-512` y `icon-maskable-512` en `public/`
  - ✅ Link al manifest inyectado en `index.html` vía `scripts/patch-web-html.mjs`

- [x] **Tarea 16.2.2**: Implementar Service Worker ✅
  - ✅ `public/sw.js` (SW manual, sin dependencia de Workbox)
  - ✅ Precache del app shell + cache-first para assets estáticos (`/_expo/`, fuentes, imágenes)
  - ✅ Navegaciones network-first con fallback a `index.html` (offline); peticiones cross-origin (Supabase) pasan directo a la red
  - ✅ Registro del SW inyectado en `index.html`

- [ ] **Tarea 16.2.3**: Soporte offline básico en web
  - El SW ya sirve el app shell offline; falta UI de "sin conexión" y alinear con la queue de sincronización (sección 10)
  - Asegurar que el plan de crisis sea accesible offline en web

- [x] **Tarea 16.2.4**: Prompt de instalación (Add to Home Screen) ✅
  - ✅ `src/features/pwa/InstallPrompt.web.tsx` captura `beforeinstallprompt`
  - ✅ Banner sutil montado en `app/_layout.tsx`; stub no-op en native (`InstallPrompt.tsx`)
  - ✅ Respeta dismissal (localStorage) y se oculta si ya está en modo standalone

### 16.3 Deploy y Calidad

- [x] **Tarea 16.3.1**: Configurar hosting estático ✅
  - ✅ `netlify.toml` con `command = "npm run build:web"`, `publish = "dist"`
  - ✅ Rewrite SPA `/* → /index.html 200` (`netlify.toml` + `public/_redirects`)
  - ✅ Headers: `no-cache` para `sw.js`/`manifest.json`, `immutable` para `/_expo/*`
  - Pendiente: elegir y conectar el proveedor real (deploy)

- [ ] **Tarea 16.3.2**: Auditar con Lighthouse
  - Requiere deploy con HTTPS
  - Correr Lighthouse PWA + Performance + Accessibility (objetivo: installable, ≥90 Performance)
  - Nota: el bundle JS pesa ~3.3 MB → evaluar code splitting / lazy de pantallas pesadas

- [ ] **Tarea 16.3.3**: HTTPS, headers y SEO básico
  - ✅ Meta tags (description, theme-color, viewport, apple-*) ya inyectados
  - ✅ Headers de cache definidos en `netlify.toml`
  - Pendiente: HTTPS (lo provee el host al desplegar)

---

## 🎯 Priorización Sugerida

### Alta Prioridad (Impacto inmediato)
1. Optimización de rendimiento (1.1, 1.2)
2. Índices de base de datos (2.1)
3. Error boundaries (5.1)
4. Tests unitarios básicos (12.1)
5. Accesibilidad crítica (11.1)

### Media Prioridad (Mejora experiencia)
6. Optimistic updates (3.2)
7. Streaming en chat (7.1)
8. Exportar plan de crisis (8.1)
9. Sistema de insights (6.1, 6.2)
10. Modo offline robusto (10.1)
11. App Web / PWA (16.1, 16.2, 16.3)

### Baja Prioridad (Nice to have)
11. Gamificación (9.1, 9.2)
12. Integraciones wearables (13.1)
13. Internacionalización (14.1, 14.2)
14. A/B testing (15.2)

---

## 📝 Notas

- Cada tarea está diseñada para completarse en 1-4 horas
- Marcar con `[x]` cuando se complete
- Agregar notas de implementación bajo cada tarea si es necesario
- Revisar y actualizar prioridades mensualmente

---

**Última actualización**: 2026-06-11 — Ver "🛑 Estado de despliegue" arriba.
Esta sesión: chat IA completo (streaming 7.1, sugerencias 7.2, RAG 7.3),
optimistic updates (3.2), PDF + compartir plan de crisis (8.1/8.2), efectividad
de ejercicios (6.2), streaks + heatmap (9.1/9.2.1), accesibilidad (11.1.2 labels,
11.2.1 contraste AA, 11.2.2 escalado de fuente), patrones temporales + sugerencia
proactiva (6.1), estadísticas de ejercicios (9.2.2), y robustez transversal: fix
del onboarding "pegado", fix del botón Detener, y erradicación de `Alert.alert`
(roto en web) reemplazado por `showAlert`/`ConfirmDialog` web-safe. **122 tests
pasando, typecheck limpio.** Backlog 6.1/9.2.2/6.1.3/11.2.2 hecho pero sin
desplegar (Netlify pausado). Previo (2026-06-10): Error Boundaries (5.1), tests
unitarios (12.1), PWA (16), índices DB (2.1), Sentry.