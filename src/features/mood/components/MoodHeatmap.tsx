import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { MOOD_LABELS, type MoodValue } from "@/src/features/mood/data/options";
import {
    buildHeatmap,
    type HeatmapCell,
    type HeatmapLog,
} from "@/src/features/mood/engine/heatmap";
import { MOOD_COLOR } from "@/src/features/mood/engine/insights";
import { supabase } from "@/src/shared/lib/supabase";
import { useAccentColor } from "@/src/shared/theme/useAccentColor";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

const WEEKS = 13;
const CELL = 14;
const GAP = 3;
const EMPTY = "#EEF2F2"; // día sin registro
const ROW_LABELS = ["L", "", "M", "", "V", "", "D"];

function cellColor(cell: HeatmapCell): string {
  if (cell.future) return "transparent";
  if (!cell.mood) return EMPTY;
  return MOOD_COLOR[cell.mood as MoodValue] ?? EMPTY;
}

function formatKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * 9.2.1 — Heatmap de calendario (estilo GitHub) de los últimos ~3 meses.
 * Cada celda es un día, coloreada por el mood dominante. Auto-contenido:
 * trae sus propios datos (independiente del selector de rango del historial).
 * Tocar un día muestra su fecha y estado arriba.
 */
export function MoodHeatmap() {
  const { user } = useAuth();
  const accent = useAccentColor();
  const [selected, setSelected] = useState<HeatmapCell | null>(null);

  const { data: logs } = useQuery<HeatmapLog[]>({
    queryKey: ["mood-heatmap", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("mood, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as HeatmapLog[];
    },
  });

  const grid = useMemo(
    () => buildHeatmap(logs ?? [], new Date(), WEEKS),
    [logs]
  );

  const selectedLabel = selected
    ? selected.mood
      ? `${formatKey(selected.key)} · ${MOOD_LABELS[selected.mood as MoodValue]}`
      : `${formatKey(selected.key)} · sin registro`
    : "Toca un día para ver el detalle";

  return (
    <View className="mb-8 p-4 rounded-3xl bg-surface border border-river-100">
      <Text className="text-xs uppercase text-ink/70 font-semibold mb-3 tracking-wider">
        Últimos 3 meses
      </Text>

      <Text className="text-sm text-ink/70 mb-3" accessibilityLiveRegion="polite">
        {selectedLabel}
      </Text>

      <View className="flex-row">
        {/* Etiquetas de día de la semana */}
        <View style={{ marginRight: 4 }}>
          {ROW_LABELS.map((l, i) => (
            <View
              key={i}
              style={{ height: CELL, marginBottom: GAP }}
              className="justify-center"
            >
              <Text className="text-[9px] text-ink/40">{l}</Text>
            </View>
          ))}
        </View>

        {/* Columnas de semanas */}
        <View className="flex-row flex-1 justify-between">
          {grid.map((col, ci) => (
            <View key={ci}>
              {col.map((cell) => (
                <Pressable
                  key={cell.key}
                  onPress={() => !cell.future && setSelected(cell)}
                  disabled={cell.future}
                  accessibilityRole="button"
                  accessibilityLabel={
                    cell.future
                      ? undefined
                      : cell.mood
                        ? `${formatKey(cell.key)}, ${MOOD_LABELS[cell.mood as MoodValue]}`
                        : `${formatKey(cell.key)}, sin registro`
                  }
                  style={{
                    width: CELL,
                    height: CELL,
                    marginBottom: GAP,
                    borderRadius: 3,
                    backgroundColor: cellColor(cell),
                    borderWidth:
                      selected?.key === cell.key && !cell.future ? 1.5 : 0,
                    borderColor: accent,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <Text className="text-xs text-ink/40 mt-4 leading-4">
        Cada cuadro es un día · color = estado más frecuente · gris = sin
        registro.
      </Text>
    </View>
  );
}
