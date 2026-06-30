import {
    applyScreenPrivacy,
    authenticate,
    isAppLockEnabled,
    isBiometricAvailable,
    RELOCK_AFTER_MS,
} from "@/src/features/privacy/lib/appLock";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";

// Pantalla opaca que cubre TODA la app mientras está bloqueada (mejora 1.7).
// Se monta al final del layout raíz para quedar sobre stack y modales.
// Solo nativo: en web nunca se bloquea.

export function AppLockGate() {
  // null = todavía no sabemos (evita flash de contenido antes de decidir)
  const [locked, setLocked] = useState<boolean | null>(
    Platform.OS === "web" ? false : null
  );
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    (async () => {
      // FLAG_SECURE se re-aplica en cada arranque (no persiste solo).
      applyScreenPrivacy();
      const shouldLock =
        (await isAppLockEnabled()) && (await isBiometricAvailable());
      setLocked(shouldLock);
      if (shouldLock) tryUnlock();
    })();

    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state === "active" && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away >= RELOCK_AFTER_MS && (await isAppLockEnabled())) {
          setLocked(true);
          tryUnlock();
        }
      }
    });
    return () => sub.remove();
  }, [tryUnlock]);

  if (!locked) return null;

  return (
    <View
      className="absolute inset-0 bg-bg items-center justify-center px-8"
      // Bloquea toques hacia la app de abajo mientras está bloqueada
      pointerEvents="auto"
    >
      <View className="w-16 h-16 rounded-3xl bg-river-500 items-center justify-center mb-6">
        <Text className="text-3xl">🫧</Text>
      </View>
      <Text className="text-xl font-bold text-ink mb-2">Cauce está bloqueada</Text>
      <Text className="text-sm text-ink/70 text-center mb-8 leading-5">
        Tus datos están protegidos. Usa tu huella, rostro o PIN para entrar.
      </Text>
      <Pressable
        onPress={tryUnlock}
        className="flex-row items-center bg-river-500 active:bg-river-700 px-6 py-3.5 rounded-2xl"
        accessibilityRole="button"
        accessibilityLabel="Desbloquear con biometría"
      >
        <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
        <Text className="text-white font-semibold text-base ml-2">
          Desbloquear
        </Text>
      </Pressable>
    </View>
  );
}
