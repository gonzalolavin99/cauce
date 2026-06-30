import { useColorScheme } from "nativewind";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// En web/escritorio limitamos el ancho del contenido y lo centramos para que
// la app no se estire a todo lo ancho del viewport. En native es transparente.
const WEB_MAX_WIDTH = 480;

interface ScreenProps {
  children: ReactNode;
  /** Renderiza dos círculos decorativos muy sutiles detrás del contenido.
   *  Da "aire" y profundidad sin sobrecargar. Default: true. */
  ambient?: boolean;
  /** Incluir safe-area bottom. Usar `false` en tabs (el tab bar ya dibuja
   *  su propio safe area). Default: true — mantiene el comportamiento
   *  previo para pantallas stack/modal. */
  bottomInset?: boolean;
}

/**
 * Contenedor raíz de pantalla. Dibuja el fondo base y, opcionalmente, dos
 * círculos decorativos muy desaturados que dan profundidad sin competir
 * con el contenido. Evita la sensación "página en blanco".
 *
 * Los círculos están posicionados `absolute`, no interceptan toques, y usan
 * opacidad muy baja (inspirado en el estilo de apps como Apple Fitness,
 * Headspace — pero más contenido, para no sobreestimular).
 */
export function Screen({
  children,
  ambient = true,
  bottomInset = true,
}: ScreenProps) {
  const edges = bottomInset
    ? (["top", "bottom"] as const)
    : (["top"] as const);

  // Halos decorativos por tema: en oscuro, versiones profundas y aún más
  // sutiles de los mismos tonos (cálido + river).
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const warmHalo = isDark ? "#3A3226" : "#F0DDC8";
  const riverHalo = isDark ? "#1C2E2F" : "#D0E7E8";

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={edges}>
      {ambient && (
        <View
          pointerEvents="none"
          // Puramente decorativo. Oculto del árbol de a11y para que TalkBack/
          // VoiceOver no intente leer ni enfocar los halos.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          {/* Halo cálido arriba-derecha */}
          <View
            style={{
              position: "absolute",
              top: -120,
              right: -80,
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: warmHalo,
              opacity: 0.32,
            }}
          />
          {/* Halo river abajo-izquierda */}
          <View
            style={{
              position: "absolute",
              bottom: -140,
              left: -100,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: riverHalo,
              opacity: 0.45,
            }}
          />
        </View>
      )}
      {Platform.OS === "web" ? (
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: WEB_MAX_WIDTH,
            alignSelf: "center",
          }}
        >
          {children}
        </View>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
