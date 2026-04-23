import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Mapeo nombre-de-ruta → iconos. Se usan dos formas: outline (inactivo) y
 * filled (activo) para dar feedback visual suave al cambio de tab.
 */
const TAB_ICONS: Record<
  string,
  { outline: IoniconName; filled: IoniconName; label: string }
> = {
  index: { outline: "home-outline", filled: "home", label: "Inicio" },
  explore: {
    outline: "compass-outline",
    filled: "compass",
    label: "Explorar",
  },
  support: {
    outline: "heart-outline",
    filled: "heart",
    label: "Apoyo",
  },
  profile: {
    outline: "person-outline",
    filled: "person",
    label: "Perfil",
  },
};

/**
 * Tab bar custom para Expo Router. Respeta safe area, trae haptic feedback
 * selección al cambio de tab, y muestra un punto indicador bajo el icono
 * activo. Colores alineados a la paleta river/ink — no usa tintColor default.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: "#FFFFFF",
        borderTopColor: "#E7EFEF",
        borderTopWidth: 1,
        // Sombra muy sutil para darle peso de "superficie elevada".
        shadowColor: "#193838",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View className="flex-row items-stretch pt-2">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const conf = TAB_ICONS[route.name];
          // Si aparece una ruta desconocida (por seguridad ante cambios en el
          // layout), la renderizamos con un fallback neutro.
          const iconName: IoniconName = conf
            ? isFocused
              ? conf.filled
              : conf.outline
            : "ellipse-outline";
          const label = conf?.label ?? route.name;

          const { options } = descriptors[route.key] ?? {};
          const accessibilityLabel =
            options?.tabBarAccessibilityLabel ?? label;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name, route.params);
            }
          }

          function onLongPress() {
            navigation.emit({ type: "tabLongPress", target: route.key });
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint={`Pestaña ${index + 1} de ${state.routes.length}`}
              accessibilityState={{ selected: isFocused }}
              className="flex-1 items-center justify-center py-2"
              hitSlop={8}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? "#2F6D6E" : "#9AAAAB"}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  color: isFocused ? "#2F6D6E" : "#9AAAAB",
                  fontWeight: isFocused ? "600" : "500",
                }}
              >
                {label}
              </Text>
              {/* Punto indicador bajo el icono activo — decorativo, oculto a
                  screen readers (el estado selected ya se anuncia). */}
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  marginTop: 3,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isFocused ? "#2F6D6E" : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
