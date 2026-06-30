import { useEffect, useState } from "react";

/**
 * Cuenta regresiva visual para los ejercicios.
 *
 * Devuelve los segundos restantes de la fase/paso actual y los va
 * decrementando cada segundo. Se reinicia a `seconds` cada vez que cambia
 * `resetKey` (p. ej. al pasar de una fase a otra).
 *
 * Es solo para el display: el avance real entre pasos lo maneja el `setTimeout`
 * del runner. Un pequeño desfase visual es aceptable.
 */
export function useCountdown(
  seconds: number,
  resetKey: string | number,
  running = true
): number {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    setSecondsLeft(seconds);
    if (!running || seconds <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, [seconds, resetKey, running]);

  return secondsLeft;
}
