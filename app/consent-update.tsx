import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ConsentForm } from "@/src/features/privacy/components/ConsentForm";
import { Screen } from "@/src/shared/ui/Screen";
import { Redirect, useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";

/**
 * Pantalla de consentimiento retroactivo.
 * Se muestra cuando un usuario ya onboarded (o con una versión anterior de
 * política) no tiene registrados los consentimientos mínimos vigentes.
 * No se puede cerrar: es un gate duro antes de usar la app.
 */
export default function ConsentUpdateScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-3xl font-bold text-ink mb-2">
          Actualizamos cómo cuidamos tus datos
        </Text>
        <Text className="text-ink/70 mb-6 leading-6">
          Incorporamos la Ley 21.719 y reforzamos el registro de tus
          consentimientos. Necesitamos que confirmes los siguientes puntos
          para seguir usando Cauce.
        </Text>

        <ConsentForm
          onGranted={() => router.replace("/(tabs)")}
          submitLabel="Confirmar"
        />
      </ScrollView>
    </Screen>
  );
}
