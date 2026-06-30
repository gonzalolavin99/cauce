import { signUpWithEmail } from "@/src/features/auth/hooks/useAuth";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// SEC-3 M5: validación client-side de contraseña.
// Supabase Auth ya exige min 6 chars por default pero no calidad. Los datos
// detrás del login son sensibles (Ley 19.628), así que pedimos algo más
// resistente a diccionario:
//   - 10+ caracteres
//   - al menos una letra y al menos un número
// No forzamos símbolos ni mayúsculas — friccion sin subir mucho la barra
// contra ataques online (rate-limited por Supabase).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "La contraseña debe tener al menos 10 caracteres";
  if (!/[A-Za-z]/.test(pw)) return "Agrega al menos una letra";
  if (!/[0-9]/.test(pw)) return "Agrega al menos un número";
  return null;
}

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Revisa el correo");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(cleanEmail, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen ambient={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View className="items-center mb-10">
            <View
              className="h-20 w-20 rounded-3xl bg-river-500 items-center justify-center mb-5"
              style={{
                shadowColor: "#193838",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 5,
              }}
            >
              <Ionicons name="water" size={38} color="#FFFFFF" />
            </View>
            <Text className="text-4xl font-bold text-ink mb-2 tracking-tight">
              Crear cuenta
            </Text>
            <Text className="text-base text-ink/70 text-center leading-6 max-w-xs">
              Solo necesitamos un correo. Tus datos son tuyos y privados.
            </Text>
          </View>

          {/* Form card */}
          <View
            className="p-6 rounded-3xl bg-surface border border-river-100"
            style={{
              shadowColor: "#193838",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <Text className="text-xs uppercase text-ink/70 font-semibold mb-4 tracking-wider">
              Registro
            </Text>

            <Input
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="tu@email.com"
            />

            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mín. 10 caracteres, con letras y números"
              error={error ?? undefined}
            />

            <Button onPress={handleSignUp} loading={loading}>
              Crear cuenta
            </Button>
          </View>

          {/* Privacidad micro-reassurance */}
          <View className="mt-5 flex-row items-start gap-2 px-2">
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color="#6B7280"
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-xs text-ink/70 leading-4">
              Cifrado en tránsito y en reposo. Cumplimos Ley 19.628 y 21.719
              (Chile). Puedes exportar o eliminar tus datos cuando quieras.
            </Text>
          </View>

          <View className="mt-6 items-center">
            <Link href="/(auth)/sign-in" asChild>
              <Pressable className="py-3 px-4 active:opacity-70">
                <Text className="text-river-700 text-base">
                  Ya tengo cuenta.{" "}
                  <Text className="font-semibold">Ingresar</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
