import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  className?: string;
}

/**
 * Placeholder animado para estados de carga. Pulsa opacidad 0.5 ↔ 1 con
 * ciclo lento (1.6s) — no distrae. Se desactiva si el usuario tiene
 * reduce-motion activado.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  className,
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 0.6 : 1);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity);
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [reduced, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={className}
      style={[
        { width, height, borderRadius: radius, backgroundColor: "#E7EFEF" },
        animStyle,
      ]}
    />
  );
}

/** Skeleton con el shape de una Card típica (icon + 2 líneas de texto). */
export function CardSkeleton() {
  return (
    <View className="p-5 rounded-3xl bg-white border border-river-100 flex-row items-start gap-3">
      <Skeleton width={40} height={40} radius={14} />
      <View className="flex-1 gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}
