import { ConsentForm } from "@/src/features/privacy/components/ConsentForm";
import { ProgressDots } from "@/src/shared/ui/ProgressDots";
import { Screen } from "@/src/shared/ui/Screen";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function ConsentScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between mb-8">
          <ProgressDots total={3} current={0} />
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="lock-closed-outline" size={12} color="#6B7280" />
            <Text className="text-xs text-ink/70">Paso 1 de 3</Text>
          </View>
        </View>

        <Text className="text-3xl font-bold text-ink mb-3 tracking-tight">
          Tus datos son tuyos
        </Text>
        <Text className="text-ink/70 mb-8 leading-6">
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
