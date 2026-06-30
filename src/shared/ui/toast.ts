/**
 * Toasts no-bloqueantes (mejora 3.5).
 *
 * Para confirmaciones de éxito ("Plan guardado", "Check-in registrado") un
 * diálogo modal es demasiado: interrumpe y exige un tap extra. `showToast`
 * muestra un aviso breve con auto-dismiss, anunciado a lectores de pantalla.
 *
 * Mismo patrón listener que `alert.ts`: la API es un módulo plano y el
 * `<ToastHost/>` del layout raíz renderiza (funciona igual en nativo y web).
 *
 * Uso:
 *   import { showToast } from "@/src/shared/ui/toast";
 *   showToast("Plan guardado");                 // success (default)
 *   showToast("Sin conexión", "info");
 */

export type ToastTone = "success" | "info";

export interface ToastRequest {
  message: string;
  tone: ToastTone;
}

type Listener = (req: ToastRequest) => void;

let listener: Listener | null = null;

/** Interno: lo registra el ToastHost al montarse. */
export function _setToastListener(l: Listener | null): void {
  listener = l;
}

export function showToast(message: string, tone: ToastTone = "success"): void {
  if (listener) {
    listener({ message, tone });
  } else {
    console.warn(`[toast] host no montado: ${message}`);
  }
}
