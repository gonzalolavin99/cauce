import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CountdownRingProps {
  /** Segundos restantes (lo que se muestra al centro). */
  secondsLeft: number;
  /** Duración total de la fase/paso, para calcular el progreso del anillo. */
  total: number;
  /** Diámetro en px. */
  size?: number;
}

/**
 * Anillo de cuenta regresiva "tipo reloj": un arco que se vacía a medida que
 * pasan los segundos, con el número restante al centro. Se actualiza por
 * segundo junto al countdown, así que cuando el ejercicio se pausa, el anillo
 * también se congela (no anima por su cuenta).
 */
export function CountdownRing({
  secondsLeft,
  total,
  size = 72,
}: CountdownRingProps) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Progreso restante (1 = lleno, 0 = vacío). Defensivo ante total = 0.
  const progress = total > 0 ? Math.max(0, Math.min(1, secondsLeft / total)) : 0;
  const dashoffset = circumference * (1 - progress);

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityLabel={`${secondsLeft} segundos restantes`}
    >
      <Svg width={size} height={size}>
        {/* Pista de fondo */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#E7EFEF"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Arco de progreso, arrancando arriba (-90°) */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#2F6D6E"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={{ position: "absolute" }}>
        <Text className="text-xl font-bold text-river-700">{secondsLeft}</Text>
      </View>
    </View>
  );
}
