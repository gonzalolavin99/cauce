import { supabase } from "@/src/shared/lib/supabase";
import type { Exercise } from "@/src/types/database.types";
import { useQuery } from "@tanstack/react-query";

export function useExercises() {
  return useQuery<Exercise[]>({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("active", true)
        .order("category");

      if (error) throw error;
      return data ?? [];
    },
  });
}