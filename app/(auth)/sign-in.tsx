import { signInWithEmail } from "@/src/features/auth/hooks/useAuth";
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

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
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
              Cauce
            </Text>
            <Text className="text-base text-ink/70 text-center leading-6 max-w-xs">
              Tu espacio para regularte. A tu ritmo, sin juicio.
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
              Iniciar sesión
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
              autoComplete="password"
              placeholder="••••••••"
              error={error ?? undefined}
            />

            <Button onPress={handleSignIn} loading={loading}>
              Ingresar
            </Button>
          </View>

          <View className="mt-8 items-center">
            <Link href="/(auth)/sign-up" asChild>
              <Pressable className="py-3 px-4 active:opacity-70">
                <Text className="text-river-700 text-base">
                  ¿No tienes cuenta?{" "}
                  <Text className="font-semibold">Regístrate</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
