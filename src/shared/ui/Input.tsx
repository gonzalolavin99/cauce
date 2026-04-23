import { cn } from "@/src/shared/lib/cn";
import { Text, TextInput, type TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className,
  accessibilityLabel,
  ...props
}: InputProps) {
  // Si hay label visible y no se pasó un accessibilityLabel explícito, lo
  // usamos como label del input para TalkBack/VoiceOver (equivalente a
  // aria-labelledby en web). El placeholder ya sirve como hint adicional.
  const a11yLabel =
    accessibilityLabel ??
    (label
      ? error
        ? `${label}. Error: ${error}`
        : label
      : undefined);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-ink/80 mb-2">{label}</Text>
      )}
      <TextInput
        placeholderTextColor="#9ca3af"
        accessibilityLabel={a11yLabel}
        className={cn(
          "rounded-2xl px-4 py-4 bg-white border text-ink text-base",
          error ? "border-alert" : "border-river-100",
          className
        )}
        {...props}
      />
      {error && <Text className="text-xs text-alert mt-1">{error}</Text>}
    </View>
  );
}