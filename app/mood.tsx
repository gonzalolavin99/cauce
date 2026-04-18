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
import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function MoodScreen() {
  const router = useRouter();
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
          Alert.alert("Registrado", "Tu estado quedó anotado.");
        },
        onError: (err: Error) => Alert.alert("Error", err.message),
      }
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-3xl font-bold text-ink">¿Cómo estás?</Text>
            <Pressable
              onPress={() => router.back()}
              className="px-3 py-2 rounded-xl bg-river-50"
            >
              <Text className="text-river-900 font-medium">Cerrar</Text>
            </Pressable>
          </View>

          <Text className="text-ink/70 mb-6">
            Anotar cómo te sientes ayuda a notar patrones.
          </Text>

          {/* Mood grid */}
          <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
            Estado
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {MOOD_OPTIONS.map((opt) => {
              const active = mood === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelectMood(opt.value)}
                  className={cn(
                    "px-4 py-3 rounded-2xl border items-center",
                    active
                      ? "bg-river-500 border-river-500"
                      : "bg-white border-river-100"
                  )}
                  style={{ minWidth: 96 }}
                >
                  <Text className="text-2xl mb-1">{opt.emoji}</Text>
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
          <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
            Energía
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {ENERGY_OPTIONS.map((opt) => {
              const active = energy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelectEnergy(opt.value)}
                  className={cn(
                    "px-4 py-3 rounded-2xl border",
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
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Note */}
          <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
            Nota (opcional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Algo que quieras recordar"
            placeholderTextColor="rgba(0,0,0,0.4)"
            multiline
            numberOfLines={3}
            className="px-4 py-3 rounded-2xl border border-river-100 bg-white text-ink mb-8"
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
            <Text className="text-lg font-semibold text-ink mb-4">
              Últimas entradas
            </Text>

            {isLoading && (
              <Text className="text-ink/60">Cargando...</Text>
            )}

            {!isLoading && (!logs || logs.length === 0) && (
              <Text className="text-ink/60">
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
                        <Text className="text-xs text-ink/50 mt-0.5">
                          Energía: {log.energy ?? "—"}/5
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-ink/50 shrink-0">
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
