import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

interface BreathingCircleProps {
  /** Fase actual del ciclo (ej. "Inhala", "Mantén", "Exhala") */
  label: string;
  /** Duración en segundos de la fase actual */
  seconds: number;
  /** Escala objetivo para esta fase — 1 = pequeño, 1.6 = expandido */
  targetScale: number;
  /** Si true, anima suavemente hacia targetScale. Si false, mantiene instantáneamente. */
  animate: boolean;
}

/**
 * Círculo animado reutilizable para ejercicios de respiración.
 * Es "tonto": sólo recibe su estado objetivo y lo anima. La lógica de
 * qué fase viene después vive en el componente padre.
 */
export function BreathingCircle({
  seconds,
  targetScale,
  animate,
}: BreathingCircleProps) {
  const scale = useRef(new Animated.Value(targetScale)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(scale, {
        toValue: targetScale,
        duration: seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(targetScale);
    }
  }, [targetScale, seconds, animate, scale]);

  return (
    <View
      className="items-center justify-center"
      style={{ height: 280 }}
    >
      <Animated.View
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: "#4E8B8C",
          transform: [{ scale }],
          opacity: 0.85,
        }}
      />
    </View>
  );
}
