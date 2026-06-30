import { nudgeSentence } from "@/src/features/mood/engine/patterns";
import { useProactiveNudge } from "@/src/features/mood/hooks/useProactiveNudge";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

/**
 * Sugerencia proactiva suave (6.1.3): aparece solo si el momento actual suele
 * costarle a la persona (según sus propios registros). Ofrece una pausa, sin
 * alarmismo. Se oculta sola el resto del tiempo.
 */
export function ProactiveNudge() {
  const router = useRouter();
  const { nudge } = useProactiveNudge();

  if (!nudge) return null;

  function handlePress() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/regulate");
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${nudgeSentence(nudge)} Tocar para un ejercicio de regulación.`}
      className="mt-3 flex-row items-center p-4 rounded-3xl bg-river-50 border border-river-100 active:bg-river-100"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="w-11 h-11 rounded-2xl bg-surface items-center justify-center mr-3 border border-river-100"
      >
        <Ionicons name="water-outline" size={20} color="#2F6D6E" />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-ink leading-5">{nudgeSentence(nudge)}</Text>
        <Text className="text-xs text-river-700 font-medium mt-1">
          Hacer una pausa →
        </Text>
      </View>
    </Pressable>
  );
}
