import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

interface SectionHeaderProps {
  /** Etiqueta corta, se muestra en mayúsculas. */
  label: string;
  /** Nombre de icono Ionicons opcional a la izquierda. */
  icon?: ComponentProps<typeof Ionicons>["name"];
  /** Color del icono. Default: river-700 (#2F6D6E). */
  iconColor?: string;
  /** Acción opcional alineada a la derecha (ej: "Ver todo →"). */
  right?: ReactNode;
  /** Margin bottom. Default: 12. */
  spacing?: number;
}

/**
 * Header de sección unificado. Reemplaza los Text eyebrow que están duplicados
 * en todas las pantallas (`text-xs uppercase text-ink/70 font-semibold
 * tracking-wider`). Usarlo siempre que haya un agrupamiento de contenido.
 */
export function SectionHeader({
  label,
  icon,
  iconColor = "#2F6D6E",
  right,
  spacing = 12,
}: SectionHeaderProps) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ marginBottom: spacing }}
    >
      <View className="flex-row items-center gap-2">
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={iconColor}
            // El icono es ornamental — la etiqueta ya describe la sección.
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
        <Text
          accessibilityRole="header"
          className="text-xs uppercase text-ink/70 font-semibold tracking-wider"
        >
          {label}
        </Text>
      </View>
      {right}
    </View>
  );
}
