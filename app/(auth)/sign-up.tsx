import { signUpWithEmail } from "@/src/features/auth/hooks/useAuth";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

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
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-4xl font-bold text-ink mb-2">Crear cuenta</Text>
          <Text className="text-ink/70 mb-8">
            Necesitamos solo un correo. Tus datos son privados.
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

          <View className="mt-6 items-center">
            <Link href="/(auth)/sign-in">
              <Text className="text-river-700">Ya tengo cuenta</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}