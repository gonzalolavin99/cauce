import { cn } from "@/src/shared/lib/cn";
import { Avatar } from "@/src/shared/ui/Avatar";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

type Tone = "default" | "destructive";

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  /** Variante visual. `destructive` es para acciones tipo "eliminar cuenta". */
  tone?: Tone;
  /** Renderiza chevron a la derecha. Default: true si hay onPress. */
  showChevron?: boolean;
  /** Muestra un badge/contador a la derecha (antes del chevron). */
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Fila de lista unificada — perfil, ajustes, mis datos, política.
 * Reemplaza los `Pressable p-4 rounded-2xl bg-river-50 border ...` que están
 * duplicados en profile.tsx y my-data.tsx.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  tone = "default",
  showChevron,
  right,
  onPress,
  disabled,
}: ListRowProps) {
  const chevron = showChevron ?? !!onPress;
  const isDestructive = tone === "destructive";

  const content = (
    <View className="flex-row items-center gap-3">
      {icon && (
        <Avatar
          icon={icon}
          tone={isDestructive ? "sand" : "river"}
          contentColor={isDestructive ? "#C0392B" : undefined}
          size="md"
        />
      )}
      <View className="flex-1">
        <Text
          className={cn(
            "text-base font-medium",
            isDestructive ? "text-alert" : "text-ink"
          )}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className={cn(
              "text-xs mt-0.5 leading-4",
              isDestructive ? "text-alert/70" : "text-ink/60"
            )}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {chevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDestructive ? "#C0392B" : "#6B7280"}
        />
      )}
    </View>
  );

  const containerClass = cn(
    "p-4 rounded-2xl border",
    isDestructive
      ? "bg-alert/5 border-alert/20"
      : "bg-white border-river-100",
    !isDestructive && onPress && "active:bg-river-50",
    isDestructive && onPress && "active:bg-alert/10",
    disabled && "opacity-40"
  );

  if (onPress && !disabled) {
    // El subtitle lo anunciamos como hint (segundo read-out en TalkBack/
    // VoiceOver), y el destructivo lleva un accessibilityHint más explícito
    // para que el usuario sepa la consecuencia antes de tocar.
    const hint = isDestructive
      ? subtitle
        ? `${subtitle}. Acción destructiva.`
        : "Acción destructiva."
      : subtitle;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={hint}
        className={containerClass}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityState={disabled ? { disabled: true } : undefined}
      className={containerClass}
    >
      {content}
    </View>
  );
}
