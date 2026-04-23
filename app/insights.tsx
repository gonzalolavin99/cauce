// ============================================================
// app/insights.tsx — Tus patrones
// ============================================================
//
// Simetría con la Fase 7: la IA ya leía tu contexto (mood 14d,
// diagnósticos, plan de crisis). Ahora tú también ves tu data.
//
// Principios de diseño:
// - Sin streaks ni gamification. Nada de "llevas 7 días seguidos".
// - Observaciones honestas, sin juicio.
// - Data es del usuario, no un juicio sobre el usuario.
// - Si la persona está mal varios días, mostramos un mensaje cálido
//   sin alarmismo redirigiendo a Apoyo/Plan.
// - Pantalla opt-in desde Perfil — quien prefiere no mirar no se topa.

import { HARD_MOODS, useInsights } from "@/src/features/insights/hooks/useInsights";
import { MOOD_EMOJI, MOOD_LABELS } from "@/src/features/mood/data/options";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { ScrollView, Text, View } from "react-native";

export default function InsightsScreen() {
  const { data, isLoading, error } = useInsights();

  return (
    <Screen>
      <PageHeader
        title="Tus patrones"
        subtitle="Un resumen honesto de los últimos 30 días. Sin rachas, sin puntajes. Solo información para ti."
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>

        {isLoading && (
          <View className="gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        )}

        {error && !isLoading && (
          <ErrorState message="No pudimos cargar tus patrones ahora. Intenta más tarde." />
        )}

        {data && !isLoading && !data.hasData && (
          <EmptyState
            variant="warm"
            icon="sparkles-outline"
            title="Todavía no hay suficiente para mostrar"
            description="Cuando registres algunos check-ins o hagas ejercicios, aquí vas a ver cómo te has sentido. No hay tareas ni metas — solo lo que tú quieras anotar."
          />
        )}

        {data && !isLoading && data.hasData && (
          <View className="gap-5">
            <CheckinSummary
              count={data.checkinCount}
              hoursSinceLast={data.hoursSinceLastCheckin}
            />

            {data.moodDistribution.length > 0 && (
              <MoodDistribution
                items={data.moodDistribution}
                dominantMood={data.dominantMood}
              />
            )}

            {data.avgEnergy != null && (
              <EnergyAverage value={data.avgEnergy} />
            )}

            {data.completedSessions > 0 && (
              <ExerciseSummary
                completed={data.completedSessions}
                helpful={data.helpfulSessions}
                top={data.topExercises}
              />
            )}

            <HardMoodsCallout distribution={data.moodDistribution} />
          </View>
        )}

        <Text className="text-xs text-ink/40 text-center mt-8 leading-5">
          Esta pantalla es solo para ti. No la ve nadie más, ni se usa para
          evaluarte. Son los datos que tú mismo/a registraste.
        </Text>
      </ScrollView>
    </Screen>
  );
}

// ====================================================================
// Secciones
// ====================================================================

function ErrorState({ message }: { message: string }) {
  return (
    <View className="p-5 rounded-2xl bg-sand border border-river-100">
      <Text className="text-sm text-ink/70 leading-5">{message}</Text>
    </View>
  );
}

function CheckinSummary({
  count,
  hoursSinceLast,
}: {
  count: number;
  hoursSinceLast: number | null;
}) {
  return (
    <Card label="Check-ins">
      <Text className="text-2xl font-bold text-ink mb-1">
        {count} {count === 1 ? "registro" : "registros"}
      </Text>
      <Text className="text-sm text-ink/70 leading-5">
        en los últimos 30 días
        {hoursSinceLast != null && (
          <>
            {" · último "}
            <Text className="text-ink">{humanAgo(hoursSinceLast)}</Text>
          </>
        )}
      </Text>
      {hoursSinceLast != null && hoursSinceLast >= 72 && (
        <Text className="text-xs text-ink/60 leading-5 mt-3">
          Han pasado varios días sin registrar. Si no quieres ahora, también
          está bien.
        </Text>
      )}
    </Card>
  );
}

function MoodDistribution({
  items,
  dominantMood,
}: {
  items: { mood: string; count: number; percent: number }[];
  dominantMood: string | null;
}) {
  return (
    <Card label="Cómo te has sentido">
      {dominantMood && (
        <Text className="text-sm text-ink/70 leading-5 mb-4">
          Predominantemente{" "}
          <Text className="text-ink font-semibold">
            {moodLabel(dominantMood)}
          </Text>
          .
        </Text>
      )}
      <View className="gap-3">
        {items.map((it) => (
          <MoodBar key={it.mood} item={it} />
        ))}
      </View>
    </Card>
  );
}

function MoodBar({
  item,
}: {
  item: { mood: string; count: number; percent: number };
}) {
  // Ancho 0..100 como clase; para simplicidad usamos style inline.
  const widthPct = Math.max(2, item.percent);
  return (
    <View>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm text-ink">
          {MOOD_EMOJI[item.mood as keyof typeof MOOD_EMOJI] ?? ""}{" "}
          {moodLabel(item.mood)}
        </Text>
        <Text className="text-xs text-ink/60">
          {item.count} · {item.percent}%
        </Text>
      </View>
      <View className="h-2 rounded-full bg-river-50 overflow-hidden">
        <View
          className="h-2 rounded-full bg-river-500"
          style={{ width: `${widthPct}%` }}
        />
      </View>
    </View>
  );
}

function EnergyAverage({ value }: { value: number }) {
  // value es 1..5; mostramos barra proporcional.
  const pct = Math.round(((value - 1) / 4) * 100);
  const widthPct = Math.max(2, Math.min(100, pct));
  return (
    <Card label="Energía promedio">
      <Text className="text-2xl font-bold text-ink mb-2">
        {value.toFixed(1)}{" "}
        <Text className="text-sm font-normal text-ink/60">/ 5</Text>
      </Text>
      <View className="h-2 rounded-full bg-river-50 overflow-hidden">
        <View
          className="h-2 rounded-full bg-river-500"
          style={{ width: `${widthPct}%` }}
        />
      </View>
      <Text className="text-xs text-ink/60 mt-3 leading-5">
        Basado en lo que anotaste en cada check-in (1 = muy baja, 5 = muy
        alta).
      </Text>
    </Card>
  );
}

function ExerciseSummary({
  completed,
  helpful,
  top,
}: {
  completed: number;
  helpful: number;
  top: { id: string; name: string; count: number }[];
}) {
  return (
    <Card label="Ejercicios">
      <Text className="text-sm text-ink/80 leading-5 mb-4">
        Completaste{" "}
        <Text className="text-ink font-semibold">{completed}</Text>{" "}
        {completed === 1 ? "sesión" : "sesiones"} en 30 días.
        {helpful > 0 && (
          <>
            {" "}
            Te ayudaron{" "}
            <Text className="text-ink font-semibold">{helpful}</Text>.
          </>
        )}
      </Text>
      {top.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs uppercase text-ink/60 font-semibold tracking-wider mb-1">
            Los que más usaste
          </Text>
          {top.map((ex) => (
            <View
              key={ex.id}
              className="flex-row justify-between items-center p-3 rounded-2xl bg-river-50"
            >
              <Text className="text-sm text-ink flex-1 pr-3" numberOfLines={1}>
                {ex.name}
              </Text>
              <Text className="text-xs text-ink/60">
                {ex.count}{" "}
                {ex.count === 1 ? "vez" : "veces"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/**
 * Si hay predominio de moods difíciles (bajo/ansioso/sobrecargado/agitado)
 * mostramos un mensaje cálido, sin alarmismo. No es un diagnóstico, es un
 * recordatorio gentil de que hay apoyo.
 */
function HardMoodsCallout({
  distribution,
}: {
  distribution: { mood: string; count: number; percent: number }[];
}) {
  const hardPercent = distribution
    .filter((d) => HARD_MOODS.has(d.mood))
    .reduce((acc, d) => acc + d.percent, 0);

  if (hardPercent < 60) return null;

  return (
    <View className="p-5 rounded-3xl bg-sand border border-river-100">
      <Text className="text-sm text-ink leading-6">
        Ha sido un tramo cuesta arriba. Si hay alguien de confianza con quien
        hablar, o si ya tienes equipo de salud, puede ser un buen momento.
        También tienes tu plan de crisis y los números de Apoyo a un toque.
      </Text>
    </View>
  );
}

// ====================================================================
// Helpers
// ====================================================================

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="p-5 rounded-3xl bg-white border border-river-100">
      <Text className="text-xs uppercase text-ink/60 font-semibold tracking-wider mb-3">
        {label}
      </Text>
      {children}
    </View>
  );
}

function moodLabel(m: string): string {
  return MOOD_LABELS[m as keyof typeof MOOD_LABELS] ?? m;
}

function humanAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return "hace menos de 1h";
  if (hoursAgo < 24) return `hace ${hoursAgo}h`;
  const days = Math.floor(hoursAgo / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}
