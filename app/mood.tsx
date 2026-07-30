import {
    ENERGY_OPTIONS,
    MOOD_EMOJI,
    MOOD_LABELS,
    MOOD_OPTIONS,
    type MoodValue,
} from "@/src/features/mood/data/options";
import {
    useCreateMoodLog,
    useMoodLogs,
} from "@/src/features/mood/hooks/useMoodLogs";
import { cn } from "@/src/shared/lib/cn";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { usePlaceholderColor } from "@/src/shared/theme/usePlaceholderColor";
import { showAlert } from "@/src/shared/ui/alert";
import { Button } from "@/src/shared/ui/Button";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { showToast } from "@/src/shared/ui/toast";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

/**
 * Tile seleccionable con micro-feedback: un "pop" de resorte muy suave al
 * quedar activo (damping alto = sin rebote exagerado, acorde al tono calmo
 * de la app). Se desactiva con reduce-motion.
 */
function SelectableTile({
  active,
  onPress,
  label,
  emoji,
  accessibilityLabel,
  style,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  emoji?: string;
  accessibilityLabel: string;
  style?: object;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(active ? 1.06 : 1, {
      damping: 14,
      stiffness: 260,
    });
  }, [active, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={accessibilityLabel}
        className={cn(
          "px-4 py-3 rounded-2xl border items-center",
          active
            ? "bg-river-500 border-river-500"
            : "bg-surface border-river-100"
        )}
        style={style}
      >
        {emoji && (
          <Text className="text-2xl mb-1" accessibilityElementsHidden>
            {emoji}
          </Text>
        )}
        <Text
          className={cn(
            "text-sm font-medium",
            active ? "text-white" : "text-ink"
          )}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function MoodScreen() {
  const router = useRouter();
  const placeholderColor = usePlaceholderColor();
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [energy, setEnergy] = useState<number>(3);
  const [note, setNote] = useState("");

  const createLog = useCreateMoodLog();
  const { data: logs, isLoading } = useMoodLogs(14);

  function handleSelectMood(value: MoodValue) {
    Haptics.selectionAsync().catch(() => {});
    setMood(value);
  }

  function handleSelectEnergy(value: number) {
    Haptics.selectionAsync().catch(() => {});
    setEnergy(value);
  }

  function handleSave() {
    if (!mood) return;
    createLog.mutate(
      { mood, energy, note: note.trim() || null },
      {
        onSuccess: () => {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
          setMood(null);
          setEnergy(3);
          setNote("");
          showToast("Tu estado quedó anotado");
        },
        onError: (err: Error) => showAlert("Error", err.message),
      }
    );
  }

  return (
    <Screen>
      <PageHeader
        title="¿Cómo estás?"
        subtitle="Anotar cómo te sientes ayuda a notar patrones."
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Mood grid */}
          <SectionHeader label="Estado" icon="happy-outline" />
          <View className="flex-row flex-wrap gap-2 mb-2">
            {MOOD_OPTIONS.map((opt) => (
              <SelectableTile
                key={opt.value}
                active={mood === opt.value}
                onPress={() => handleSelectMood(opt.value)}
                label={opt.label}
                emoji={opt.emoji}
                accessibilityLabel={`Estado: ${opt.label}`}
                style={{ minWidth: 96 }}
              />
            ))}
          </View>
          {/* Confirmación suave de la selección — refuerzo sin presión */}
          <Text className="text-sm text-river-700 mb-8 h-5">
            {mood ? `Hoy estás ${MOOD_LABELS[mood].toLowerCase()}` : ""}
          </Text>

          {/* Energy */}
          <SectionHeader label="Energía" icon="battery-half-outline" />
          <View className="flex-row flex-wrap gap-2 mb-8">
            {ENERGY_OPTIONS.map((opt) => (
              <SelectableTile
                key={opt.value}
                active={energy === opt.value}
                onPress={() => handleSelectEnergy(opt.value)}
                label={opt.label}
                accessibilityLabel={`Energía: ${opt.label}`}
              />
            ))}
          </View>

          {/* Note */}
          <SectionHeader label="Nota (opcional)" icon="pencil-outline" />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Algo que quieras recordar"
            placeholderTextColor={placeholderColor}
            multiline
            numberOfLines={3}
            maxLength={500}
            className="px-4 py-3 rounded-2xl border border-river-100 bg-surface text-ink mb-8"
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          <Button
            onPress={handleSave}
            disabled={!mood}
            loading={createLog.isPending}
          >
            Guardar
          </Button>

          {/* Historial */}
          <View className="mt-12">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-ink">
                Últimas entradas
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push("/mood-history");
                }}
                className="py-1 px-2 active:opacity-60"
              >
                <Text className="text-sm text-river-700 font-medium">
                  Ver todo →
                </Text>
              </Pressable>
            </View>

            {isLoading && (
              <View className="gap-3">
                <CardSkeleton />
                <CardSkeleton />
              </View>
            )}

            {!isLoading && (!logs || logs.length === 0) && (
              <EmptyState
                icon="calendar-outline"
                title="Todavía no registras tu estado"
                description="Cuando anotes cómo estás, va a aparecer acá."
              />
            )}

            {logs?.map((log) => {
              const moodKey = (log.mood ?? "neutral") as MoodValue;
              const emoji = MOOD_EMOJI[moodKey] ?? "·";
              const label = MOOD_LABELS[moodKey] ?? log.mood ?? "—";
              const date = log.created_at
                ? new Date(log.created_at).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              return (
                <View
                  key={log.id}
                  className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <Text className="text-2xl">{emoji}</Text>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-river-900">
                          {label}
                        </Text>
                        <Text className="text-xs text-ink/70 mt-0.5">
                          Energía: {log.energy ?? "—"}/5
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-ink/70 shrink-0">
                      {date}
                    </Text>
                  </View>
                  {log.note && (
                    <Text className="text-sm text-ink/70 mt-2">
                      {log.note}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export default withErrorBoundary(MoodScreen, { source: "mood" });
