import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import {
    _setToastListener,
    type ToastRequest,
} from "@/src/shared/ui/toast";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

const TOAST_DURATION_MS = 2800;

interface ActiveToast extends ToastRequest {
  id: number;
}

/**
 * Renderiza los `showToast(...)`: píldora flotante sobre el TabBar con
 * auto-dismiss. Se monta una sola vez en el layout raíz (mejora 3.5).
 * `accessibilityLiveRegion`/aria-live anuncia el mensaje sin robar el foco.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);
  const reduceMotion = useReducedMotion();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    _setToastListener((req) => {
      const id = nextId.current++;
      // Máximo 2 visibles: si llega un tercero, descartamos el más viejo.
      setToasts((prev) => [...prev.slice(-1), { ...req, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    });
    return () => _setToastListener(null);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 bottom-24 items-center px-6 gap-2"
    >
      {toasts.map((t) => (
        <Animated.View
          key={t.id}
          entering={reduceMotion ? undefined : FadeInDown.duration(200)}
          exiting={reduceMotion ? undefined : FadeOutDown.duration(150)}
          accessibilityLiveRegion="polite"
          // bg-ink/text-bg: píldora oscura en tema claro, clara en oscuro
          className="flex-row items-center bg-ink rounded-full pl-3 pr-5 py-2.5 max-w-sm"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons
            name={t.tone === "success" ? "checkmark-circle" : "information-circle"}
            size={18}
            color={colorScheme === "dark" ? "#2E5F60" : "#8FBDBE"}
          />
          <Text className="text-bg text-sm font-medium ml-2" numberOfLines={2}>
            {t.message}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
