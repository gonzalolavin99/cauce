import { cn } from "@/src/shared/lib/cn";
import { usePlaceholderColor } from "@/src/shared/theme/usePlaceholderColor";
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

// SEC-3 M3: límites defensivos para chips custom.
// Previene inputs abusivos (strings enormes o cientos de chips) que
// terminarían en la DB y en el prompt del LLM.
const MAX_CUSTOM_CHIP_LENGTH = 40;
const MAX_TOTAL_CHIPS = 20;

export function ChipSelector<T extends string>({
  options,
  selected,
  onChange,
  multi = true,
  allowCustom = false,
  addPlaceholder = "Otra cosa...",
}: ChipSelectorProps<T>) {
  const [customInput, setCustomInput] = useState("");
  const placeholderColor = usePlaceholderColor();

  const presetValues = options.map((o) => o.value) as string[];
  const customSelected = selected.filter(
    (v) => !presetValues.includes(v as string)
  );

  function togglePreset(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      if (multi && selected.length >= MAX_TOTAL_CHIPS) return;
      onChange(multi ? [...selected, value] : [value]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim().slice(0, MAX_CUSTOM_CHIP_LENGTH);
    if (!trimmed) return;
    if (selected.length >= MAX_TOTAL_CHIPS) {
      setCustomInput("");
      return;
    }
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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                opt.hint ? `${opt.label}. ${opt.hint}` : opt.label
              }
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
              {opt.hint && (
                <Text
                  className={cn(
                    "text-xs mt-0.5",
                    active ? "text-white/80" : "text-ink/70"
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
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${value}`}
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
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            blurOnSubmit={false}
            maxLength={MAX_CUSTOM_CHIP_LENGTH}
            className="flex-1 px-4 py-3 rounded-2xl border border-river-100 bg-surface text-ink"
          />
          <Pressable
            onPress={addCustom}
            disabled={!customInput.trim()}
            accessibilityRole="button"
            accessibilityLabel="Agregar"
            accessibilityState={{ disabled: !customInput.trim() }}
            className={cn(
              "px-4 py-3 rounded-2xl",
              customInput.trim() ? "bg-river-500" : "bg-river-100"
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                customInput.trim() ? "text-white" : "text-ink/70"
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
