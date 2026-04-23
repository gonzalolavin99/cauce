import {
  MOOD_EMOJI,
  MOOD_LABELS,
  type MoodValue,
} from "@/src/features/mood/data/options";
import {
  averageScore,
  bucketByDay,
  computeStreak,
  humanDate,
  MOOD_COLOR,
  MOOD_ORDER,
  moodFrequency,
  toLocalDateKey,
  weekdayShort,
  type DayBucket,
} from "@/src/features/mood/engine/insights";
import { useMoodLogs } from "@/src/features/mood/hooks/useMoodLogs";
import { cn } from "@/src/shared/lib/cn";
import { Button } from "@/src/shared/ui/Button";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { CardSkeleton, Skeleton } from "@/src/shared/ui/Skeleton";
import type { MoodLog } from "@/src/types/database.types";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type TimeRange = 7 | 30;

const CHART_HEIGHT = 120;

export default function MoodHistoryScreen() {
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>(7);
  const { data: logs, isLoading } = useMoodLogs(200);

  const buckets = useMemo<DayBucket[]>(
    () => bucketByDay(logs ?? [], range),
    [logs, range]
  );

  const allInRange = useMemo<MoodLog[]>(
    () => buckets.flatMap((b) => b.entries),
    [buckets]
  );

  const streak = useMemo(() => computeStreak(logs ?? []), [logs]);
  const avg = useMemo(() => averageScore(allInRange), [allInRange]);
  const freq = useMemo(() => moodFrequency(allInRange), [allInRange]);

  function handleSetRange(r: TimeRange) {
    Haptics.selectionAsync().catch(() => {});
    setRange(r);
  }

  function handleNewEntry() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/mood");
  }

  if (isLoading) {
    return (
      <Screen>
        <PageHeader
          title="Mi historial"
          subtitle="Patrones sin puntajes ni rachas agresivas. Solo lo que anotaste."
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          <View className="flex-row gap-3 mb-6">
            <Skeleton width="48%" height={40} radius={12} />
            <Skeleton width="48%" height={40} radius={12} />
          </View>
          <View className="gap-3 mb-6">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const totalEntries = allInRange.length;
  const hasData = totalEntries > 0;

  return (
    <Screen>
      <PageHeader
        title="Mi historial"
        subtitle="Patrones sin puntajes ni rachas agresivas. Solo lo que anotaste."
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {/* Range selector */}
        <View className="flex-row gap-2 mb-6">
          <RangeChip
            label="Últimos 7 días"
            active={range === 7}
            onPress={() => handleSetRange(7)}
          />
          <RangeChip
            label="Últimos 30 días"
            active={range === 30}
            onPress={() => handleSetRange(30)}
          />
        </View>

        {/* Estado vacío */}
        {!hasData && (
          <View className="mb-6">
            <EmptyState
              variant="warm"
              icon="document-text-outline"
              title="No hay registros en este periodo"
              description="Cuando anotes cómo te sientes, verás acá los patrones."
              action={<Button onPress={handleNewEntry}>Registrar ahora</Button>}
            />
          </View>
        )}

        {/* Stats cards */}
        {hasData && (
          <View className="flex-row flex-wrap gap-3 mb-6">
            <StatCard
              label="Check-ins"
              value={String(totalEntries)}
              hint={range === 7 ? "esta semana" : "este mes"}
            />
            <StatCard
              label="Racha"
              value={streak > 0 ? `${streak} día${streak === 1 ? "" : "s"}` : "—"}
              hint={streak > 0 ? "seguidos" : "aún no"}
            />
            <StatCard
              label="Promedio"
              value={avg ? `${avg.toFixed(1)}/5` : "—"}
              hint="de bienestar"
            />
          </View>
        )}

        {/* Bar chart */}
        {hasData && (
          <View className="mb-8 p-4 rounded-3xl bg-white border border-river-100">
            <Text className="text-xs uppercase text-ink/60 font-semibold mb-4 tracking-wider">
              {range === 7 ? "Últimos 7 días" : "Últimos 30 días"}
            </Text>

            <DayBarChart buckets={buckets} range={range} />

            <Text className="text-xs text-ink/40 mt-4 leading-4">
              Altura = estado promedio del día · color = estado más frecuente.
              Días sin registro aparecen en gris.
            </Text>
          </View>
        )}

        {/* Distribución */}
        {hasData && (
          <View className="mb-8 p-4 rounded-3xl bg-white border border-river-100">
            <Text className="text-xs uppercase text-ink/60 font-semibold mb-4 tracking-wider">
              Distribución
            </Text>
            <MoodDistribution freq={freq} total={totalEntries} />
          </View>
        )}

        {/* CTA nuevo registro */}
        {hasData && (
          <Pressable
            onPress={handleNewEntry}
            className="mb-8 p-4 rounded-2xl bg-river-500 active:bg-river-700"
          >
            <Text className="text-white text-base font-semibold text-center">
              Nuevo check-in
            </Text>
          </Pressable>
        )}

        {/* Entries por día */}
        {hasData && <EntriesByDay buckets={buckets} />}

        <Text className="text-xs text-ink/40 text-center mt-6 leading-4">
          Tus registros son privados. Solo tú los ves.
        </Text>
      </ScrollView>
    </Screen>
  );
}

// ====================================================================
// Subcomponentes
// ====================================================================

function RangeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "px-4 py-2 rounded-xl border",
        active
          ? "bg-river-500 border-river-500"
          : "bg-white border-river-100"
      )}
    >
      <Text
        className={cn(
          "text-sm font-medium",
          active ? "text-white" : "text-ink"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View
      className="p-4 rounded-2xl bg-sand border border-river-100"
      style={{ minWidth: 100, flexGrow: 1, flexBasis: 100 }}
    >
      <Text className="text-xs uppercase text-ink/50 font-semibold tracking-wider">
        {label}
      </Text>
      <Text className="text-xl font-bold text-ink mt-1">{value}</Text>
      <Text className="text-xs text-ink/50 mt-0.5">{hint}</Text>
    </View>
  );
}

function DayBarChart({
  buckets,
  range,
}: {
  buckets: DayBucket[];
  range: TimeRange;
}) {
  // Show weekday letter on 7d. On 30d show date every 7th column.
  const showEveryLabel = range === 7;

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: CHART_HEIGHT,
          gap: range === 7 ? 6 : 2,
        }}
      >
        {buckets.map((b) => {
          const fillRatio = b.avgScore ? b.avgScore / 5 : 0;
          const fillHeight = Math.max(
            fillRatio * CHART_HEIGHT,
            b.avgScore ? 6 : 3
          );
          const color = b.dominantMood
            ? MOOD_COLOR[b.dominantMood]
            : "#E5E7EB";
          const isToday = b.dateKey === todayKey();

          return (
            <View
              key={b.dateKey}
              style={{
                flex: 1,
                height: CHART_HEIGHT,
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  height: fillHeight,
                  backgroundColor: b.avgScore ? color : "#E5E7EB",
                  opacity: b.avgScore ? 1 : 0.4,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: "#1F3B3B",
                  borderBottomWidth: 0,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Labels */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 6,
          gap: range === 7 ? 6 : 2,
        }}
      >
        {buckets.map((b, i) => {
          const show =
            showEveryLabel ||
            i === buckets.length - 1 ||
            i === 0 ||
            i % 7 === 0;
          return (
            <View
              key={b.dateKey}
              style={{ flex: 1, alignItems: "center" }}
            >
              {show ? (
                <Text className="text-[10px] text-ink/50">
                  {showEveryLabel ? weekdayShort(b.dateKey) : shortDate(b.dateKey)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString());
}

function MoodDistribution({
  freq,
  total,
}: {
  freq: Record<MoodValue, number>;
  total: number;
}) {
  return (
    <View className="gap-3">
      {MOOD_ORDER.map((mood) => {
        const count = freq[mood] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <View key={mood} className="flex-row items-center">
            <View className="w-8 items-center">
              <Text>{MOOD_EMOJI[mood]}</Text>
            </View>
            <View className="flex-1 mx-2">
              <View className="h-2 rounded-full bg-river-50 overflow-hidden">
                <View
                  style={{
                    height: 8,
                    width: `${pct}%`,
                    backgroundColor: MOOD_COLOR[mood],
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>
            <View className="w-24 flex-row justify-end">
              <Text className="text-xs text-ink/60">
                {MOOD_LABELS[mood]} · {count}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EntriesByDay({ buckets }: { buckets: DayBucket[] }) {
  // Mostrar los días más recientes primero, saltando los vacíos
  const nonEmpty = [...buckets].reverse().filter((b) => b.entries.length > 0);

  if (nonEmpty.length === 0) return null;

  return (
    <View>
      <Text className="text-lg font-semibold text-ink mb-4">Entradas</Text>

      {nonEmpty.map((bucket) => (
        <View key={bucket.dateKey} className="mb-5">
          <Text className="text-xs uppercase text-ink/50 font-semibold mb-2 tracking-wider">
            {humanDate(bucket.dateKey)}
          </Text>

          {[...bucket.entries].reverse().map((log) => (
            <EntryRow key={log.id} log={log} />
          ))}
        </View>
      ))}
    </View>
  );
}

function EntryRow({ log }: { log: MoodLog }) {
  const moodKey = (log.mood ?? "neutral") as MoodValue;
  const emoji = MOOD_EMOJI[moodKey] ?? "·";
  const label = MOOD_LABELS[moodKey] ?? log.mood ?? "—";
  const time = log.created_at
    ? new Date(log.created_at).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <View className="mb-2 p-3 rounded-2xl bg-white border border-river-100">
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <Text className="text-2xl">{emoji}</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">{label}</Text>
            <Text className="text-xs text-ink/50 mt-0.5">
              Energía: {log.energy ?? "—"}/5
            </Text>
          </View>
        </View>
        <Text className="text-xs text-ink/50 shrink-0">{time}</Text>
      </View>
      {log.note && (
        <Text className="text-sm text-ink/70 mt-2 leading-5">{log.note}</Text>
      )}
    </View>
  );
}
