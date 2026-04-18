import { cn } from "@/src/shared/lib/cn";
import type { Feeling } from "@/src/types/database.types";
import { Pressable, Text, View } from "react-native";

interface FeelingOption {
  value: Feeling;
  label: string;
  description: string;
}

const FEELINGS: FeelingOption[] = [
  {
    value: "ansioso",
    label: "Ansioso",
    description: "Mi mente no para, pienso mucho",
  },
  {
    value: "sobrecargado",
    label: "Sobrecargado",
    description: "Demasiado estímulo, no puedo más",
  },
  {
    value: "agitado",
    label: "Agitado",
    description: "Con energía atrapada, irritable",
  },
  {
    value: "bloqueado",
    label: "Bloqueado",
    description: "No puedo arrancar, paralizado",
  },
];

interface FeelingSelectorProps {
  onSelect: (feeling: Feeling) => void;
}

export function FeelingSelector({ onSelect }: FeelingSelectorProps) {
  return (
    <View className="gap-3">
      {FEELINGS.map((f) => (
        <Pressable
          key={f.value}
          onPress={() => onSelect(f.value)}
          className={cn(
            "p-5 rounded-2xl border bg-white",
            "border-river-100 active:bg-river-50 active:border-river-300"
          )}
        >
          <Text className="text-xl font-semibold text-ink">{f.label}</Text>
          <Text className="text-sm text-ink/60 mt-1">{f.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}
