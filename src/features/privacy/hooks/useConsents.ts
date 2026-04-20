import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { PRIVACY_POLICY_VERSION } from "@/src/features/privacy/constants";
import { supabase } from "@/src/shared/lib/supabase";
import type {
  Consent,
  ConsentAction,
  ConsentType,
} from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Platform } from "react-native";

/** Último evento por consent_type (granted | revoked | inexistente). */
export interface CurrentConsents {
  byType: Partial<Record<ConsentType, { action: ConsentAction; at: string; policy_version: string }>>;
  isGranted: (type: ConsentType) => boolean;
}

export function useConsents() {
  const { user } = useAuth();

  const query = useQuery<Consent[]>({
    queryKey: ["consents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const current = useMemo<CurrentConsents>(() => {
    const byType: CurrentConsents["byType"] = {};
    for (const event of query.data ?? []) {
      const t = event.consent_type as ConsentType;
      if (byType[t]) continue; // ya tenemos el más reciente (orden desc)
      byType[t] = {
        action: event.action as ConsentAction,
        at: event.created_at,
        policy_version: event.policy_version,
      };
    }
    return {
      byType,
      isGranted: (type: ConsentType) => byType[type]?.action === "grant",
    };
  }, [query.data]);

  return {
    events: query.data ?? [],
    current,
    isLoading: query.isLoading,
  };
}

export interface ConsentChange {
  type: ConsentType;
  action: ConsentAction;
}

export function useRecordConsent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: ConsentChange[]) => {
      if (!user) throw new Error("No autenticado");
      if (changes.length === 0) return [];

      const rows = changes.map((c) => ({
        user_id: user.id,
        consent_type: c.type,
        action: c.action,
        policy_version: PRIVACY_POLICY_VERSION,
        device_info: { platform: Platform.OS, os: Platform.Version },
      }));

      const { data, error } = await (supabase.from("consents") as any)
        .insert(rows)
        .select();

      if (error) throw error;
      return data as Consent[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents"] });
    },
  });
}
