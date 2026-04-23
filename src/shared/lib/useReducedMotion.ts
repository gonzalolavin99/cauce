import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Lee la preferencia del sistema "Reducir movimiento".
 * Devuelve true si el usuario pidió menos animación — respetamos esa
 * señal especialmente acá porque la app atiende a personas con TEA,
 * ansiedad y trauma, para quienes el movimiento en pantalla puede ser
 * activante.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        if (mounted) setReduced(v);
      }
    );

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
