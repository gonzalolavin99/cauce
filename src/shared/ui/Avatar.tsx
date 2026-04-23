import { cn } from "@/src/shared/lib/cn";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "river" | "sand" | "white" | "ink";

interface AvatarProps {
  /** Inicial/letra a mostrar. Ignorado si hay `icon` o `emoji`. */
  initials?: string;
  /** Icono Ionicons a mostrar. Prioridad sobre initials. */
  icon?: ComponentProps<typeof Ionicons>["name"];
  /** Emoji a mostrar. Prioridad sobre icon e initials. */
  emoji?: string;
  /** Contenido custom (ReactNode). Reemplaza todo lo anterior. */
  children?: ReactNode;
  size?: Size;
  tone?: Tone;
  /** Color del contenido (texto/icono). Auto según tone si no se pasa. */
  contentColor?: string;
}

const SIZE_MAP: Record<Size, { box: number; radius: number; text: number; icon: number; emoji: number }> = {
  sm: { box: 32, radius: 12, text: 12, icon: 16, emoji: 16 },
  md: { box: 40, radius: 16, text: 14, icon: 18, emoji: 20 },
  lg: { box: 48, radius: 18, text: 16, icon: 22, emoji: 24 },
  xl: { box: 64, radius: 22, text: 20, icon: 28, emoji: 32 },
};

const TONE_BG: Record<Tone, string> = {
  river: "bg-river-100",
  sand: "bg-sand",
  white: "bg-white border border-river-100",
  ink: "bg-ink",
};

const TONE_CONTENT: Record<Tone, string> = {
  river: "#2F6D6E",
  sand: "#2F6D6E",
  white: "#2F6D6E",
  ink: "#FFFFFF",
};

/**
 * Avatar/bubble unificado. Usado para iniciales de usuario, iconos de
 * categoría, burbujas de ejercicios, etc. Reemplaza los
 * `h-10 w-10 rounded-2xl bg-X items-center justify-center` sueltos.
 */
export function Avatar({
  initials,
  icon,
  emoji,
  children,
  size = "md",
  tone = "river",
  contentColor,
}: AvatarProps) {
  const dims = SIZE_MAP[size];
  const color = contentColor ?? TONE_CONTENT[tone];

  return (
    <View
      className={cn("items-center justify-center", TONE_BG[tone])}
      style={{
        width: dims.box,
        height: dims.box,
        borderRadius: dims.radius,
      }}
    >
      {children ? (
        children
      ) : emoji ? (
        <Text style={{ fontSize: dims.emoji }}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={dims.icon} color={color} />
      ) : initials ? (
        <Text
          style={{ fontSize: dims.text, color }}
          className="font-semibold"
        >
          {initials.slice(0, 2).toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

// Pura: extraída a `@/src/shared/lib/initials` para poder testearla
// sin cargar React Native. Se re-exporta acá por compatibilidad.
export { initialsFrom } from "@/src/shared/lib/initials";
