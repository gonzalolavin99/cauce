import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Si se pasa, reemplaza el back automático. Útil para modales. */
  onBack?: () => void;
  /** Oculta el botón de volver (por ejemplo en roots de stack). */
  hideBack?: boolean;
  /** Acción secundaria opcional a la derecha (ej: "Guardar"). */
  rightAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

/**
 * Encabezado consistente para pantallas no-tab (crisis-plan, mood-history,
 * privacy, etc). Tipografía confiada, back discreto, y espacio para una
 * acción secundaria a la derecha si hace falta.
 *
 * Respeta safe-area via el Screen padre — acá solo nos preocupamos del
 * bloque semántico.
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  hideBack,
  rightAction,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  return (
    <View className="px-6 pt-2 pb-6">
      <View className="flex-row items-center justify-between mb-4 min-h-[40px]">
        {!hideBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            className="w-10 h-10 rounded-full items-center justify-center bg-white border border-river-100 active:bg-river-50"
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color="#2E5F60" />
          </Pressable>
        ) : (
          <View className="w-10 h-10" />
        )}

        {rightAction && (
          <Pressable
            onPress={rightAction.onPress}
            disabled={rightAction.disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label}
            accessibilityState={{ disabled: rightAction.disabled }}
            className={
              rightAction.disabled
                ? "px-4 py-2 rounded-full bg-river-100 opacity-50"
                : "px-4 py-2 rounded-full bg-river-500 active:bg-river-700"
            }
          >
            <Text className="text-white text-sm font-semibold">
              {rightAction.label}
            </Text>
          </Pressable>
        )}
      </View>

      <Text
        accessibilityRole="header"
        className="text-3xl font-bold text-ink leading-tight"
      >
        {title}
      </Text>
      {subtitle && (
        <Text className="text-base text-ink/60 mt-2 leading-6">{subtitle}</Text>
      )}
    </View>
  );
}
