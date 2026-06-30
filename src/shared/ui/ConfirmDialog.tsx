import { Button } from "@/src/shared/ui/Button";
import { Modal, Pressable, Text, View } from "react-native";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Estilo destructivo para la acción de confirmar (rojo). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación propio. Reemplaza a `Alert.alert`, que en web
 * (react-native-web) no es fiable. Funciona igual en nativo y en la PWA.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Cerrar"
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        {/* Detenemos la propagación: tocar la tarjeta no cierra el diálogo. */}
        <Pressable
          onPress={() => {}}
          className="w-full max-w-sm rounded-3xl bg-surface p-6"
        >
          <Text
            accessibilityRole="header"
            className="text-xl font-bold text-ink mb-2"
          >
            {title}
          </Text>
          {message && (
            <Text className="text-base text-ink/70 leading-6 mb-6">
              {message}
            </Text>
          )}
          <View className="gap-3">
            <Button
              variant={destructive ? "secondary" : "primary"}
              onPress={onConfirm}
            >
              {confirmText}
            </Button>
            <Button variant="ghost" onPress={onCancel}>
              {cancelText}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
