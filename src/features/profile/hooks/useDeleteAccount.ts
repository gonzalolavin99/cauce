import { signOut } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import { useMutation } from "@tanstack/react-query";


export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_my_account" as never);
      if (error) throw error;
      await signOut();
    },
  });
}
