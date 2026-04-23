import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
              backgroundColor: "#F0DDC8",
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
              backgroundColor: "#D0E7E8",
              opacity: 0.45,
            }}
          />
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}
