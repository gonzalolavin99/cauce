import { z } from "zod";

const EnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  // Opcional: si está presente, se inicializa Sentry para reporte de errores.
  // Si falta, el logger cae a consola (no rompe nada).
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid env. Check .env.local");
}

export const env = parsed.data;