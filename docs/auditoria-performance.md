# 📊 Auditoría de Performance - Componentes de Lista

**Fecha**: 2026-06-04  
**Tarea**: 1.1.1 - Auditar componentes de lista actuales

---

## Resumen Ejecutivo

Se identificaron **3 áreas críticas** que renderizan listas y pueden beneficiarse de optimización:

1. **Chat de IA** (`app/chat.tsx`) - Lista de mensajes con `.map()`
2. **Explorar Ejercicios** (`app/(tabs)/explore.tsx`) - Lista de ejercicios con `.map()`
3. **Historial de Mood** (`app/mood-history.tsx`) - Componente `EntriesByDay` (no visible en snippet)

---

## Componentes Identificados

### 1. Chat de IA (`app/chat.tsx`)

**Línea**: 381  
**Código**:
```tsx
{messages?.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
```

**Análisis**:
- ✅ Usa `key` apropiado (`msg.id`)
- ❌ No usa `React.memo()` en `MessageBubble`
- ❌ Re-renderiza todos los mensajes cuando se agrega uno nuevo
- 📊 **Impacto**: ALTO - conversaciones largas (20+ mensajes) pueden causar lag

**Recomendación**: 
- Implementar `React.memo()` en `MessageBubble`
- Considerar virtualización si conversaciones superan 50 mensajes

---

### 2. Explorar Ejercicios (`app/(tabs)/explore.tsx`)

**Línea**: 136-142  
**Código**:
```tsx
{filtered.map((exercise) => (
  <ExerciseCard
    key={exercise.id}
    exercise={exercise}
    onPress={() => handlePress(exercise.id)}
  />
))}
```

**Análisis**:
- ✅ Usa `key` apropiado (`exercise.id`)
- ❌ No usa `React.memo()` en `ExerciseCard`
- ❌ `onPress` crea nueva función en cada render (puede romper memoización)
- 📊 **Impacto**: MEDIO - típicamente 10-30 ejercicios

**Recomendación**:
- Implementar `React.memo()` en `ExerciseCard`
- Memoizar `handlePress` con `useCallback`
- Considerar FlatList si la lista crece >50 items

---

### 3. Otros Componentes con `.map()`

#### TabBar (`src/shared/ui/TabBar.tsx`)
- **Línea**: 60
- **Impacto**: BAJO - solo 4 tabs, no requiere optimización

#### ChipSelector (`src/shared/ui/ChipSelector.tsx`)
- **Líneas**: 72, 107
- **Impacto**: BAJO - típicamente <10 chips

#### FeelingSelector (`src/features/regulation/components/FeelingSelector.tsx`)
- **Línea**: 41
- **Impacto**: BAJO - lista fija de sentimientos

---

## Uso de ScrollView

Se encontraron **18 pantallas** usando `ScrollView`:

### Pantallas Principales:
1. `app/mood-history.tsx` - Historial de mood
2. `app/crisis-plan.tsx` - Plan de crisis (3 instancias)
3. `app/regulate.tsx` - Ejercicios de regulación
4. `app/chat.tsx` - Chat IA
5. `app/(tabs)/explore.tsx` - Explorar ejercicios
6. `app/(tabs)/profile.tsx` - Perfil
7. `app/(tabs)/support.tsx` - Recursos de apoyo
8. `app/(tabs)/index.tsx` - Home

**Análisis**:
- ✅ Uso apropiado de `ScrollView` para contenido estático
- ✅ No se detectaron listas largas dentro de ScrollView (anti-pattern)
- ℹ️ Ninguna requiere virtualización actualmente

---

## Componentes que Requieren Atención

### Prioridad ALTA 🔴

1. **MessageBubble** (usado en chat)
   - Archivo: Buscar en `app/chat.tsx` o `src/features/ai-advisor/`
   - Acción: Implementar `React.memo()`
   - Razón: Conversaciones largas causan re-renders innecesarios

2. **ExerciseCard** (`src/features/exercises/components/ExerciseCard.tsx`)
   - Acción: Implementar `React.memo()`
   - Razón: Lista filtrada se re-renderiza completamente en cada cambio

### Prioridad MEDIA 🟡

3. **EntriesByDay** (usado en mood-history)
   - Archivo: Buscar componente en `app/mood-history.tsx`
   - Acción: Revisar implementación y considerar memoización
   - Razón: Renderiza múltiples días con múltiples entries cada uno

---

## Métricas Recomendadas

Para medir el impacto de las optimizaciones:

1. **Tiempo de render inicial**
   - Usar React DevTools Profiler
   - Medir antes/después en:
     - Chat con 20 mensajes
     - Explorar con 30 ejercicios
     - Mood history con 30 días

2. **Re-renders por acción**
   - Contar re-renders al agregar mensaje en chat
   - Contar re-renders al cambiar filtro en explorar

3. **Memoria**
   - Monitorear uso de memoria en conversaciones largas

---

## Próximos Pasos

- [x] **Tarea 1.1.1**: Auditoría completada ✅
- [x] **Tarea 1.1.2**: React.memo en ExerciseCard + useCallback en handlePress ✅
- [x] **Tarea 1.1.3**: React.memo en MessageBubble y componentes de mood (EntryRow, DayBarChart, MoodDistribution) ✅
- [x] **Tarea 1.1.4**: Virtualización con FlashList en explore y mood-history ✅

---

## Notas Adicionales

- No se encontraron usos de `FlatList` en el proyecto actual
- Todas las listas usan `.map()` directamente
- El proyecto usa ScrollView apropiadamente (no hay nested scrolls problemáticos)
- La mayoría de listas son pequeñas (<20 items) y no requieren virtualización inmediata
