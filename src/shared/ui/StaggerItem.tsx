import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import type { ReactNode } from "react";
import type { ViewProps } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface StaggerItemProps extends ViewProps {
  children: ReactNode;
  /** Posición en el stack — se usa para calcular el delay. */
  index: number;
  /** Ms de retraso por posición. Default: 60ms. */
  stepDelay?: number;
  /** Retraso inicial antes del primer item. Default: 40ms. */
  baseDelay?: number;
}

/**
 * Envuelve a un hijo en una entrada escalonada (FadeInDown con delay
 * proporcional al índice). Se desactiva si el usuario tiene reduce-motion
 * activado — en ese caso, el item aparece instantáneamente.
 *
 * Úsalo en listas cortas (home, mood-history, etc.). Evita en listas largas:
 * el usuario ya hizo scroll, no necesita que le animemos cada card.
 */
export function StaggerItem({
  children,
  index,
  stepDelay = 60,
  baseDelay = 40,
  style,
  ...rest
}: StaggerItemProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <Animated.View style={style} {...rest}>
        {children}
      </Animated.View>
    );
  }

  const entering = FadeInDown.delay(baseDelay + index * stepDelay)
    .duration(280)
    .springify()
    .damping(18);

  return (
    <Animated.View entering={entering} style={style} {...rest}>
      {children}
    </Animated.View>
  );
}
