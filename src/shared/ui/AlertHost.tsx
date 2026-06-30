import {
  _setAlertListener,
  type AlertButton,
  type AlertRequest,
} from "@/src/shared/ui/alert";
import { Button } from "@/src/shared/ui/Button";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

/**
 * Renderiza los `showAlert(...)` como un diálogo modal web-safe. Se monta una
 * sola vez en el layout raíz. Reemplaza a `Alert.alert` (roto en web).
 */
export function AlertHost() {
  const [req, setReq] = useState<AlertRequest | null>(null);

  useEffect(() => {
    _setAlertListener(setReq);
    return () => _setAlertListener(null);
  }, []);

  if (!req) return null;

  const close = (button?: AlertButton) => {
    setReq(null);
    button?.onPress?.();
  };

  const cancelButton = req.buttons.find((b) => b.style === "cancel");

  const variantFor = (b: AlertButton) =>
    b.style === "destructive"
      ? "secondary"
      : b.style === "cancel"
        ? "ghost"
        : "primary";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => close(cancelButton)}
    >
      <Pressable
        onPress={() => close(cancelButton)}
        accessibilityLabel="Cerrar"
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        {/* Tocar la tarjeta no cierra el diálogo. */}
        <Pressable
          onPress={() => {}}
          className="w-full max-w-sm rounded-3xl bg-surface p-6"
        >
          <Text
            accessibilityRole="header"
            className="text-xl font-bold text-ink mb-2"
          >
            {req.title}
          </Text>
          {req.message && (
            <Text className="text-base text-ink/70 leading-6 mb-6">
              {req.message}
            </Text>
          )}
          <View className="gap-3">
            {req.buttons.map((b, i) => (
              <Button
                key={`${b.text}-${i}`}
                variant={variantFor(b)}
                onPress={() => close(b)}
              >
                {b.text}
              </Button>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
