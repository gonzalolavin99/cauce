import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Botón para silenciar/activar la voz que guía el ejercicio, en vivo.
 * Accesible: se anuncia como switch con su estado.
 */
export function VoiceToggle({ enabled, onToggle }: VoiceToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={enabled ? "Silenciar voz" : "Activar voz"}
      hitSlop={8}
      className="flex-row items-center gap-2 self-center px-4 py-2 rounded-full bg-river-50 border border-river-100"
    >
      <Ionicons
        name={enabled ? "volume-high" : "volume-mute"}
        size={18}
        color="#2F6D6E"
      />
      <Text className="text-sm text-river-700 font-medium">
        {enabled ? "Voz activada" : "Voz silenciada"}
      </Text>
    </Pressable>
  );
}
