import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

/**
 * Pull-to-refresh (mejora 3.6): refetch de todas las queries activas de la
 * pantalla. Devuelve las props que espera `RefreshControl`.
 *
 * En web RefreshControl es no-op (no hay gesto); en nativo es el patrón
 * esperado en móvil.
 */
export function useRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Solo las activas: refrescar lo visible, no todo el cache.
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshing, onRefresh };
}

/** Color del spinner consistente con la paleta (river-500). */
export const REFRESH_TINT = "#4E8B8C";
