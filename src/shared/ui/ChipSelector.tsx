import { cn } from "@/src/shared/lib/cn";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

interface ChipOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface ChipSelectorProps<T extends string> {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  multi?: boolean;
  allowCustom?: boolean;
  addPlaceholder?: string;
}

export function ChipSelector<T extends string>({
  options,
  selected,
  onChange,
  multi = true,
  allowCustom = false,
  addPlaceholder = "Otra cosa...",
}: ChipSelectorProps<T>) {
  const [customInput, setCustomInput] = useState("");

  const presetValues = options.map((o) => o.value) as string[];
  const customSelected = selected.filter(
    (v) => !presetValues.includes(v as string)
  );

  function togglePreset(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange(multi ? [...selected, value] : [value]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if ((selected as string[]).includes(trimmed)) {
      setCustomInput("");
      return;
    }
    onChange([...selected, trimmed as T]);
    setCustomInput("");
  }

  function removeCustom(value: T) {
    onChange(selected.filter((v) => v !== value));
  }

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => togglePreset(opt.value)}
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
              {opt.hint && (
                <Text
                  className={cn(
                    "text-xs mt-0.5",
                    active ? "text-white/80" : "text-ink/60"
                  )}
                >
                  {opt.hint}
                </Text>
              )}
            </Pressable>
          );
        })}

        {customSelected.map((value) => (
          <Pressable
            key={`custom-${value}`}
            onPress={() => removeCustom(value)}
            className="px-4 py-3 rounded-2xl bg-river-500 border border-river-500 flex-row items-center gap-2"
          >
            <Text className="text-sm font-medium text-white">{value}</Text>
            <Text className="text-white text-base leading-4">×</Text>
          </Pressable>
        ))}
      </View>

      {allowCustom && (
        <View className="flex-row items-center gap-2 mt-3">
          <TextInput
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={addCustom}
            placeholder={addPlaceholder}
            placeholderTextColor="rgba(0,0,0,0.4)"
            returnKeyType="done"
            blurOnSubmit={false}
            className="flex-1 px-4 py-3 rounded-2xl border border-river-100 bg-white text-ink"
          />
          <Pressable
            onPress={addCustom}
            disabled={!customInput.trim()}
            className={cn(
              "px-4 py-3 rounded-2xl",
              customInput.trim() ? "bg-river-500" : "bg-river-100"
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                customInput.trim() ? "text-white" : "text-ink/50"
              )}
            >
              Agregar
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
