import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { streakMilestone } from "@/src/features/mood/engine/streak";
import { useStreak } from "@/src/features/mood/hooks/useStreak";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { useAccentColor } from "@/src/shared/theme/useAccentColor";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

/**
 * Muestra la racha de check-ins de forma cálida y sin presión (9.1.3):
 * - Aparece solo a partir de 2 días (1 no es "racha").
 * - No penaliza ni regaña; celebra hitos con suavidad.
 * - Si la racha actual es 0, no muestra nada (lo cubre el nudge de mood).
 *
 * Celebración de hitos (3.4): la primera vez que se alcanza un hito
 * (3/7/14/30…), la tarjeta hace un pulso suave de 3 ciclos — glow calmo,
 * no confetti. Se recuerda por usuario en AsyncStorage para celebrar una
 * sola vez, y se omite con reduced-motion (el copy ya celebra).
 */
export function StreakCard() {
  const { streak } = useStreak();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const accent = useAccentColor();
  const [celebrating, setCelebrating] = useState(false);

  const milestone = streak.current >= 2 ? streakMilestone(streak.current) : null;

  useEffect(() => {
    if (!milestone || !user?.id) return;
    let alive = true;
    const key = `cauce-streak-celebrated-${user.id}`;
    AsyncStorage.getItem(key).then((stored) => {
      if (!alive) return;
      const last = stored ? parseInt(stored, 10) : 0;
      if (milestone > last) {
        AsyncStorage.setItem(key, String(milestone)).catch(() => {});
        if (!reduceMotion) setCelebrating(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [milestone, user?.id, reduceMotion]);

  if (streak.current < 2) return null;

  const isRecord = streak.current >= streak.longest && streak.current > 2;

  let subtitle: string;
  if (milestone) {
    subtitle = `¡${milestone} días! Un lindo hito. Sin presión por mantenerlo.`;
  } else if (isRecord) {
    subtitle = "Tu mejor racha hasta ahora. Vas a tu ritmo.";
  } else {
    subtitle = "Cada check-in te ayuda a notar tus patrones.";
  }

  return (
    <CelebrationPulse active={celebrating} onDone={() => setCelebrating(false)}>
      <View className="flex-row items-center p-4 mt-3 rounded-3xl bg-sand/80 border border-river-100">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="w-12 h-12 rounded-2xl bg-surface/70 items-center justify-center mr-3"
        >
          <Ionicons name="leaf" size={22} color={accent} />
        </View>
        <View
          className="flex-1"
          accessible
          accessibilityLabel={`Racha de ${streak.current} días registrando tu estado. ${subtitle}`}
        >
          <Text className="text-base font-semibold text-ink">
            {streak.current} días seguidos cuidándote
          </Text>
          <Text className="text-sm text-ink/70 mt-0.5">{subtitle}</Text>
        </View>
      </View>
    </CelebrationPulse>
  );
}

/**
 * Pulso de celebración: escala 1→1.03 con un glow cálido (shadow sand), 3
 * ciclos lentos tipo respiración y termina solo. Animated.View externo con
 * estilos inline (className no funciona sobre animados en web).
 */
function CelebrationPulse({
  active,
  onDone,
  children,
}: {
  active: boolean;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    const cycle = { duration: 900, easing: Easing.inOut(Easing.sin) };
    scale.value = withRepeat(
      withSequence(withTiming(1.03, cycle), withTiming(1, cycle)),
      3
    );
    glow.value = withRepeat(
      withSequence(withTiming(0.55, cycle), withTiming(0, cycle)),
      3
    );
    const t = setTimeout(onDone, 900 * 2 * 3 + 100);
    return () => clearTimeout(t);
  }, [active, scale, glow, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: "#C9A875",
    shadowOpacity: glow.value,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: glow.value > 0 ? 4 : 0,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
