import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { Diagnosis } from "@/src/types/database.types";
import { useQuery } from "@tanstack/react-query";

export function useDiagnoses() {
  const { user } = useAuth();

  return useQuery<Diagnosis[]>({
    queryKey: ["user_diagnoses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_diagnoses")
        .select("diagnosis")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []).map((row) => row.diagnosis as Diagnosis);
    },
  });
}
