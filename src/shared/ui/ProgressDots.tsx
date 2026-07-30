import { View } from "react-native";

interface ProgressDotsProps {
  /** Número total de pasos. */
  total: number;
  /** Paso actual (0-indexado). */
  current: number;
}

/**
 * Indicador de progreso minimalista tipo "pills". Cada paso es una cápsula
 * — la actual más ancha y en river-500, las anteriores en river-300, las
 * futuras en river-100. Sin números, sin porcentaje: solo orientación
 * sensorial suave de dónde estás en el flujo.
 */
export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const state =
          i < current ? "past" : i === current ? "current" : "future";
        // Clases de la paleta (theme-aware): los hex fijos anteriores no se
        // adaptaban al modo oscuro.
        const bgClass =
          state === "current"
            ? "bg-river-500"
            : state === "past"
            ? "bg-river-300"
            : "bg-river-100";
        return (
          <View
            key={i}
            className={bgClass}
            style={{
              width: state === "current" ? 20 : 6,
              height: 6,
              borderRadius: 3,
            }}
          />
        );
      })}
    </View>
  );
}
