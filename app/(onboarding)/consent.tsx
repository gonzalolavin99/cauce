import { ConsentForm } from "@/src/features/privacy/components/ConsentForm";
import { Screen } from "@/src/shared/ui/Screen";
import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";

export default function ConsentScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-3xl font-bold text-ink mb-2">
          Tus datos son tuyos
        </Text>
        <Text className="text-ink/70 mb-6 leading-6">
          Antes de continuar, necesitamos tu consentimiento explícito para
          tratar ciertos datos. En cualquier momento puedes revocarlo o
          eliminar toda tu información desde Perfil.
        </Text>

        <ConsentForm
          onGranted={() => router.push("/(onboarding)/diagnosis")}
          submitLabel="Aceptar y continuar"
        />
      </ScrollView>
    </Screen>
  );
}
