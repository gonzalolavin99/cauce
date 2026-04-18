import { signOut } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import { useMutation } from "@tanstack/react-query";

/**
 * Elimina permanentemente la cuenta del usuario y toda su información.
 *
 * Requiere que exista en Supabase la función RPC `delete_my_account`.
 * Ver instrucciones de setup en el mensaje de bienvenida de esta feature.
 *
 * Cumplimiento: Ley 19.628 (protección de datos personales) y Ley 21.719
 * (nueva ley de datos personales, Chile) — derecho de cancelación.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_my_account" as never);
      if (error) throw error;
      await signOut();
    },
  });
}
