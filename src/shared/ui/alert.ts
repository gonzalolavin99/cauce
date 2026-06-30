/**
 * Reemplazo web-safe de `Alert.alert` de react-native.
 *
 * `Alert.alert` NO funciona en react-native-web (la PWA): los diálogos no
 * aparecen y los botones nunca se disparan, dejando acciones "muertas". Esta
 * API imita la firma de `Alert.alert` pero la renderiza con un `<AlertHost/>`
 * montado en el layout raíz, así funciona igual en nativo y en web.
 *
 * Uso (drop-in):
 *   import { showAlert } from "@/src/shared/ui/alert";
 *   showAlert("Título", "Mensaje");
 *   showAlert("¿Borrar?", "No se puede deshacer", [
 *     { text: "Cancelar", style: "cancel" },
 *     { text: "Borrar", style: "destructive", onPress: doDelete },
 *   ]);
 */

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (req: AlertRequest) => void;

let listener: Listener | null = null;

/** Interno: lo registra el AlertHost al montarse. */
export function _setAlertListener(l: Listener | null): void {
  listener = l;
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  const resolved =
    buttons && buttons.length > 0 ? buttons : [{ text: "Entendido" }];
  if (listener) {
    listener({ title, message, buttons: resolved });
  } else {
    // El host aún no está montado: no perdemos del todo el aviso.
    console.warn(`[alert] host no montado: ${title}${message ? ` — ${message}` : ""}`);
  }
}
