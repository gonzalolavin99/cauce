import { useAccentColor } from "@/src/shared/theme/useAccentColor";
import { Card } from "@/src/shared/ui/Card";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  /** Acción opcional (ej: un Button). */
  action?: ReactNode;
  variant?: "muted" | "warm" | "default";
}

/**
 * Estado vacío/sin-datos unificado. Icono circular + título + descripción.
 * Reemplaza los bloques ad-hoc de "Todavía no hay..." que están sueltos en
 * mood-history, insights, explore, chat.
 */
export function EmptyState({
  icon = "leaf-outline",
  title,
  description,
  action,
  variant = "muted",
}: EmptyStateProps) {
  const accent = useAccentColor();
  return (
    <Card variant={variant}>
      <View className="items-center py-4">
        <View className="h-14 w-14 rounded-2xl bg-surface items-center justify-center mb-4 border border-river-100">
          <Ionicons name={icon} size={26} color={accent} />
        </View>
        <Text className="text-base font-semibold text-ink mb-1 text-center">
          {title}
        </Text>
        {description && (
          <Text className="text-sm text-ink/70 text-center leading-5 px-2">
            {description}
          </Text>
        )}
        {action && <View className="mt-4 w-full">{action}</View>}
      </View>
    </Card>
  );
}
