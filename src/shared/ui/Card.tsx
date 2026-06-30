import { cn } from "@/src/shared/lib/cn";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import type { ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type Variant = "default" | "muted" | "warm" | "outline";

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: Variant;
  onPress?: () => void;
  /** Quita el padding interno por defecto (p-5). Útil si la card tiene su
   *  propia maquetación interna. */
  unpadded?: boolean;
}

/**
 * Superficie unificada para la app. Mantiene radio, border y shadow
 * consistentes en todas las pantallas. Un solo lugar para ajustar la
 * identidad visual de los contenedores.
 *
 * Variantes:
 *  - default: fondo blanco con borde river-100 muy sutil
 *  - muted:   fondo river-50 (para secciones agrupadas con menos énfasis)
 *  - warm:    fondo sand, tono más cálido (hero suaves, estados afectivos)
 *  - outline: sin fondo, solo borde (para agrupar sin peso visual)
 */
export function Card({
  children,
  variant = "default",
  onPress,
  unpadded,
  className,
  style,
  ...rest
}: CardProps) {
  const base = cn(
    "rounded-3xl border",
    !unpadded && "p-5",
    variant === "default" && "bg-surface border-river-100",
    variant === "muted" && "bg-river-50 border-river-100",
    variant === "warm" && "bg-sand/80 border-river-100",
    variant === "outline" && "bg-transparent border-river-100",
    className
  );

  // Shadow muy sutil — RN no respeta box-shadow vía nativewind en iOS,
  // así que lo declaramos inline. Valores conservadores para no sobrecargar
  // visualmente.
  const shadowStyle = {
    shadowColor: "#193838",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: variant === "default" ? 0.06 : 0,
    shadowRadius: 8,
    // Android: elevation tiene un look distinto, lo dejamos bajo.
    elevation: variant === "default" ? 1 : 0,
  };

  if (onPress) {
    return (
      <PressableCard
        onPress={onPress}
        className={cn(base, "active:opacity-80")}
        style={[shadowStyle, style as object]}
        {...rest}
      >
        {children}
      </PressableCard>
    );
  }

  return (
    <View className={base} style={[shadowStyle, style as object]} {...rest}>
      {children}
    </View>
  );
}

/**
 * Card presionable con feedback de escala (3.3), mismo patrón que Button:
 * el Animated.View externo anima; el Pressable interno lleva el className
 * (NativeWind no aplica className sobre componentes animados en web).
 */
function PressableCard({
  children,
  onPress,
  className,
  style,
  ...rest
}: ViewProps & { children: ReactNode; onPress: () => void; className?: string }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) scale.value = withTiming(0.97, { duration: 90 });
        }}
        onPressOut={() => {
          if (!reduceMotion) scale.value = withTiming(1, { duration: 160 });
        }}
        accessibilityRole="button"
        className={className}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
