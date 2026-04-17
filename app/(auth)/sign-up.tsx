import { signUpWithEmail } from "@/src/features/auth/hooks/useAuth";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password);
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
            placeholder="Al menos 8 caracteres"
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