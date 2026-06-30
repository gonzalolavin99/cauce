import { showAlert } from "@/src/shared/ui/alert";
import { showToast } from "@/src/shared/ui/toast";
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
import { usePlaceholderColor } from "@/src/shared/theme/usePlaceholderColor";
import { Button } from "@/src/shared/ui/Button";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

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
          <Text className="text-xs uppercase text-ink/70 font-semibold mb-3 tracking-wider">
            Estado
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {MOOD_OPTIONS.map((opt) => {
              const active = mood === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelectMood(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Estado: ${opt.label}`}
                  className={cn(
                    "px-4 py-3 rounded-2xl border items-center",
                    active
                      ? "bg-river-500 border-river-500"
                      : "bg-surface border-river-100"
                  )}
                  style={{ minWidth: 96 }}
                >
                  <Text className="text-2xl mb-1" accessibilityElementsHidden>
                    {opt.emoji}
                  </Text>
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-white" : "text-ink"
                    )}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Energy */}
          <Text className="text-xs uppercase text-ink/70 font-semibold mb-3 tracking-wider">
            Energía
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {ENERGY_OPTIONS.map((opt) => {
              const active = energy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelectEnergy(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Energía: ${opt.label}`}
                  className={cn(
                    "px-4 py-3 rounded-2xl border",
                    active
                      ? "bg-river-500 border-river-500"
                      : "bg-surface border-river-100"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-white" : "text-ink"
                    )}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Note */}
          <Text className="text-xs uppercase text-ink/70 font-semibold mb-3 tracking-wider">
            Nota (opcional)
          </Text>
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
              <Text className="text-ink/70">Cargando...</Text>
            )}

            {!isLoading && (!logs || logs.length === 0) && (
              <Text className="text-ink/70">
                Todavía no registras tu estado.
              </Text>
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
