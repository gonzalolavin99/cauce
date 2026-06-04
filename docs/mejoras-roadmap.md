# 🚀 Roadmap de Mejoras - Cauce

Este documento detalla las oportunidades de mejora identificadas para la aplicación Cauce, organizadas por categorías y divididas en tareas pequeñas con checkpoints claros.

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

- [ ] **Tarea 2.1.1**: Crear índice para mood_logs
  ```sql
  CREATE INDEX mood_logs_user_recent 
  ON mood_logs(user_id, created_at DESC);
  ```
  - Crear migración SQL
  - Ejecutar en Supabase
  - Verificar mejora en query performance

- [ ] **Tarea 2.1.2**: Crear índice para ai_messages
  ```sql
  CREATE INDEX ai_messages_conversation 
  ON ai_messages(conversation_id, created_at ASC);
  ```
  - Crear migración SQL
  - Ejecutar en Supabase
  - Medir impacto en carga de historial

- [ ] **Tarea 2.1.3**: Crear índice para consents lookup
  ```sql
  CREATE INDEX consents_latest 
  ON consents(user_id, consent_type, created_at DESC);
  ```
  - Crear migración SQL
  - Ejecutar en Supabase
  - Verificar mejora en verificación de consentimientos

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

- [ ] **Tarea 3.2.1**: Implementar optimistic update en mood logs
  - Agregar `onMutate` a `useCreateMoodLog`
  - Actualizar cache optimísticamente
  - Manejar rollback en caso de error

- [ ] **Tarea 3.2.2**: Implementar optimistic update en crisis plan
  - Agregar optimistic update a `useUpsertCrisisPlan`
  - Actualizar cache local inmediatamente
  - Sincronizar con servidor en background

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

- [ ] **Tarea 5.1.1**: Crear ErrorBoundary component
  - Implementar clase ErrorBoundary
  - Agregar UI de fallback amigable
  - Integrar con Sentry

- [ ] **Tarea 5.1.2**: Envolver features con boundaries
  - Agregar boundary a cada feature principal
  - Implementar recovery strategies
  - Agregar logging apropiado

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

- [ ] **Tarea 6.1.1**: Crear función de análisis temporal
  - Implementar detección de patrones por día de semana
  - Identificar horas del día problemáticas
  - Crear algoritmo de detección de tendencias

- [ ] **Tarea 6.1.2**: Integrar en UI de insights
  - Agregar sección "Patrones detectados"
  - Visualizar con gráficos simples
  - Agregar explicaciones en lenguaje natural

- [ ] **Tarea 6.1.3**: Generar sugerencias proactivas
  - Crear sistema de notificaciones basado en patrones
  - Sugerir ejercicios antes de momentos difíciles
  - Implementar opt-in para sugerencias

### 6.2 Correlación Ejercicios-Mood

- [ ] **Tarea 6.2.1**: Crear tabla de correlaciones
  - Diseñar schema para tracking de efectividad
  - Implementar migración SQL
  - Agregar RLS policies

- [ ] **Tarea 6.2.2**: Implementar tracking post-ejercicio
  - Agregar prompt "¿Cómo te sientes ahora?" después de ejercicio
  - Guardar correlación en BD
  - Calcular efectividad por tipo de ejercicio

- [ ] **Tarea 6.2.3**: Usar correlaciones en recomendaciones
  - Modificar `scoreExercise()` para incluir efectividad personal
  - Priorizar ejercicios que han funcionado antes
  - Mostrar "Este ejercicio te ha ayudado X veces"

---

## 7. Mejoras en Chat IA

### 7.1 Streaming de Respuestas

- [ ] **Tarea 7.1.1**: Implementar streaming en edge function
  - Modificar provider para soportar streaming
  - Usar Server-Sent Events (SSE)
  - Manejar errores de conexión

- [ ] **Tarea 7.1.2**: Actualizar UI para streaming
  - Mostrar respuesta token por token
  - Agregar indicador de "escribiendo..."
  - Implementar cancelación de streaming

### 7.2 Sugerencias de Seguimiento

- [ ] **Tarea 7.2.1**: Generar sugerencias contextuales
  - Agregar lógica para generar 2-3 preguntas de seguimiento
  - Basar en contenido de la conversación
  - Mostrar como chips clickeables

- [ ] **Tarea 7.2.2**: Implementar quick replies
  - Crear UI de respuestas rápidas
  - Agregar opciones comunes ("Cuéntame más", "¿Qué puedo hacer?")
  - Personalizar según contexto

### 7.3 RAG (Retrieval Augmented Generation)

- [ ] **Tarea 7.3.1**: Crear base de conocimiento psicoeducativa
  - Recopilar contenido sobre técnicas de regulación
  - Estructurar en formato embeddings-friendly
  - Validar con profesionales de salud mental

- [ ] **Tarea 7.3.2**: Implementar vector search
  - Configurar pgvector en Supabase
  - Generar embeddings de contenido
  - Crear función de búsqueda semántica

- [ ] **Tarea 7.3.3**: Integrar RAG en prompts
  - Buscar contenido relevante antes de generar respuesta
  - Incluir en system prompt como contexto
  - Citar fuentes cuando sea apropiado

---

## 8. Plan de Crisis

### 8.1 Exportación como PDF

- [ ] **Tarea 8.1.1**: Instalar librería de PDF
  - Evaluar react-native-pdf vs expo-print
  - Instalar dependencia elegida
  - Configurar permisos necesarios

- [ ] **Tarea 8.1.2**: Crear template de PDF
  - Diseñar layout del plan de crisis
  - Implementar generación de PDF
  - Agregar logo y branding

- [ ] **Tarea 8.1.3**: Implementar funcionalidad de compartir
  - Agregar botón "Exportar PDF" en UI
  - Implementar share sheet nativo
  - Permitir guardar en archivos del dispositivo

### 8.2 Compartir con Contacto de Confianza

- [ ] **Tarea 8.2.1**: Crear versión simplificada del plan
  - Diseñar formato "tarjeta de bolsillo"
  - Incluir solo información esencial
  - Optimizar para impresión

- [ ] **Tarea 8.2.2**: Implementar envío por SMS
  - Integrar con API de SMS nativa
  - Formatear mensaje apropiadamente
  - Agregar confirmación antes de enviar

- [ ] **Tarea 8.2.3**: Implementar envío por email
  - Usar expo-mail-composer
  - Adjuntar PDF del plan
  - Pre-llenar asunto y cuerpo del mensaje

---

## 9. Gamificación

### 9.1 Sistema de Streaks

- [ ] **Tarea 9.1.1**: Crear tabla de streaks
  - Diseñar schema para tracking de streaks
  - Implementar migración SQL
  - Agregar RLS policies

- [ ] **Tarea 9.1.2**: Calcular streaks de check-ins
  - Implementar lógica de cálculo de racha
  - Manejar días perdidos con gracia
  - Mostrar en pantalla principal

- [ ] **Tarea 9.1.3**: Celebrar hitos sin presión
  - Mostrar mensaje sutil al alcanzar hito
  - No penalizar por perder racha
  - Enfocarse en progreso, no perfección

### 9.2 Visualización de Progreso

- [ ] **Tarea 9.2.1**: Crear gráfico de mood mensual
  - Implementar calendar heatmap
  - Usar colores sutiles
  - Agregar tooltips informativos

- [ ] **Tarea 9.2.2**: Mostrar estadísticas de ejercicios
  - Contar ejercicios completados por categoría
  - Mostrar tiempo total dedicado
  - Visualizar con gráficos simples

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

- [ ] **Tarea 11.1.2**: Agregar labels apropiados
  - Agregar `accessibilityLabel` a todos los botones
  - Agregar `accessibilityHint` donde sea útil
  - Marcar elementos decorativos como `accessibilityElementsHidden`

- [ ] **Tarea 11.1.3**: Implementar navegación por teclado
  - Asegurar orden de tabulación lógico
  - Agregar focus visible
  - Implementar shortcuts de teclado (web)

### 11.2 Contraste y Tamaños

- [ ] **Tarea 11.2.1**: Auditar contraste de colores
  - Usar herramienta de análisis de contraste
  - Asegurar ratio mínimo 4.5:1 para texto
  - Ajustar colores problemáticos

- [ ] **Tarea 11.2.2**: Soportar tamaños de fuente del sistema
  - Usar unidades escalables (sp en Android, Dynamic Type en iOS)
  - Probar con tamaños grandes
  - Ajustar layouts para no romper

- [ ] **Tarea 11.2.3**: Implementar modo alto contraste
  - Crear tema de alto contraste
  - Detectar preferencia del sistema
  - Permitir toggle manual

---

## 12. Testing

### 12.1 Tests Unitarios

- [ ] **Tarea 12.1.1**: Configurar coverage reporting
  - Configurar vitest para generar coverage
  - Establecer threshold mínimo (ej: 70%)
  - Integrar en CI/CD

- [ ] **Tarea 12.1.2**: Tests para motor de recomendación
  - Testear `scoreExercise()` con diferentes contextos
  - Testear `recommendExercises()` con edge cases
  - Alcanzar 90%+ coverage en `recommend.ts`

- [ ] **Tarea 12.1.3**: Tests para detección de crisis
  - Testear `detectCrisis()` con casos positivos
  - Testear con falsos positivos comunes
  - Documentar casos límite

- [ ] **Tarea 12.1.4**: Tests para utilidades
  - Testear `isCrisisPlanUseful()`
  - Testear `initials()`
  - Testear helpers de formato

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

**Última actualización**: 2026-06-04 — Completadas tareas 1.1.2–1.1.4 y 1.2.1–1.2.3 (Optimización de Rendimiento). Agregada sección 16 (App Web / PWA).