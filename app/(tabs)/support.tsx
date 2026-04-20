import { ResourceCard } from "@/src/features/crisis/components/ResourceCard";
import { CRISIS_RESOURCES } from "@/src/features/crisis/data/resources";
import {
  isCrisisPlanUseful,
  useCrisisPlan,
} from "@/src/features/crisis/hooks/useCrisisPlan";
import { Screen } from "@/src/shared/ui/Screen";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function SupportScreen() {
  const router = useRouter();
  const { data: plan } = useCrisisPlan();
  const hasPlan = isCrisisPlanUseful(plan);

  const emergency = CRISIS_RESOURCES.filter((r) => r.primary);
  const others = CRISIS_RESOURCES.filter((r) => !r.primary);

  function handleOpenPlan() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/crisis-plan");
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-3xl font-bold text-ink mb-3">No estás solo/a</Text>
        <Text className="text-base text-ink/70 leading-6 mb-8">
          Si lo que sientes es más grande que un ejercicio, hay personas
          esperando para escucharte. Llamar es gratis y confidencial.
        </Text>

        {/* Mi plan personal */}
        <Pressable
          onPress={handleOpenPlan}
          className={
            hasPlan
              ? "mb-8 p-5 rounded-3xl bg-river-500 active:bg-river-700"
              : "mb-8 p-5 rounded-3xl bg-sand border border-river-200 active:bg-river-50"
          }
        >
          <Text
            className={
              hasPlan
                ? "text-xs uppercase text-white/70 font-semibold mb-2 tracking-wider"
                : "text-xs uppercase text-river-700 font-semibold mb-2 tracking-wider"
            }
          >
            {hasPlan ? "Tu plan personal" : "Prepárate antes"}
          </Text>
          <Text
            className={
              hasPlan
                ? "text-xl text-white font-bold mb-1"
                : "text-xl text-ink font-bold mb-1"
            }
          >
            {hasPlan ? "Abrir mi plan" : "Crea tu plan personal"}
          </Text>
          <Text
            className={
              hasPlan
                ? "text-sm text-white/80 leading-5"
                : "text-sm text-ink/70 leading-5"
            }
          >
            {hasPlan
              ? "Lo que escribiste para ti en momentos de calma: frase ancla, contacto, lo que te ayuda."
              : "Escribe en calma qué hacer cuando estés mal: señales, contacto, frase ancla. Solo tú lo ves."}
          </Text>
        </Pressable>

        {/* Sección emergencia */}
        {emergency.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs uppercase text-alert font-semibold mb-3 tracking-wider">
              Emergencia
            </Text>
            <View className="gap-3">
              {emergency.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </View>
          </View>
        )}

        {/* Sección apoyo general */}
        <View className="mb-8">
          <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
            Apoyo psicológico
          </Text>
          <View className="gap-3">
            {others.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </View>
        </View>

        {/* Disclaimer legal */}
        <View className="mt-4 p-4 rounded-xl bg-river-50 border border-river-100">
          <Text className="text-xs text-ink/60 leading-5">
            Cauce es una app de bienestar. No es un servicio de emergencia ni
            reemplaza atención médica o psicológica profesional. Si estás en
            peligro inmediato, llama al{" "}
            <Text className="font-semibold text-alert">131 (SAMU)</Text> o
            acude al servicio de urgencia más cercano.
          </Text>
        </View>

        <Text className="text-xs text-ink/40 text-center mt-6">
          Tu privacidad importa. No registramos cuándo ves esta pantalla ni a
          quién llamas.
        </Text>
      </ScrollView>
    </Screen>
  );
}
