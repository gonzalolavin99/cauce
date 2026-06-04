import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

// Evento no estándar disparado por Chromium cuando la PWA es instalable.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cauce.pwa.install_dismissed";

/**
 * Banner sutil "Instalar app" para web. Captura `beforeinstallprompt`,
 * respeta el dismissal del usuario y se oculta si la app ya está instalada
 * (modo standalone).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Ya instalada (standalone) → no mostramos nada.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Respetar dismissal previo.
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage no disponible: seguimos sin persistir el dismissal.
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // El usuario canceló o el navegador rechazó: no hacemos nada.
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sin persistencia: el banner podría reaparecer en otra sesión.
    }
  }

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 480,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 20,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#D7E3E3",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F3B3B" }}>
          Instalar Cauce
        </Text>
        <Text style={{ fontSize: 13, color: "#4B5B5B", marginTop: 2 }}>
          Acceso rápido desde tu pantalla de inicio, también offline.
        </Text>
      </View>
      <Pressable onPress={handleDismiss} hitSlop={8} style={{ padding: 8 }}>
        <Text style={{ color: "#4B5B5B", fontSize: 14 }}>Ahora no</Text>
      </Pressable>
      <Pressable
        onPress={handleInstall}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: "#2F6D6E",
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>
          Instalar
        </Text>
      </Pressable>
    </View>
  );
}
