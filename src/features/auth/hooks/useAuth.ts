import { supabase } from "@/src/shared/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const AUTH_KEY = ["auth", "session"] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery<Session | null>({
    queryKey: AUTH_KEY,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      queryClient.setQueryData(AUTH_KEY, newSession);
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session,
  };
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type { Session, User };
