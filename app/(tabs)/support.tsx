import { ResourceCard } from "@/src/features/crisis/components/ResourceCard";
import { CRISIS_RESOURCES } from "@/src/features/crisis/data/resources";
import {
    isCrisisPlanUseful,
    useCrisisPlan,
} from "@/src/features/crisis/hooks/useCrisisPlan";
import { Card } from "@/src/shared/ui/Card";
import { Screen } from "@/src/shared/ui/Screen";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

function SupportScreen() {
  const router = useRouter();
  const { data } = useCrisisPlan();
  const plan = data?.plan ?? null;
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
          style={
            hasPlan
              ? {
                  shadowColor: "#193838",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.16,
                  shadowRadius: 14,
                  elevation: 3,
                }
              : undefined
          }
        >
          <View className="flex-row items-start gap-4">
            <View
              className={
                hasPlan
                  ? "h-11 w-11 rounded-2xl bg-surface/20 items-center justify-center"
                  : "h-11 w-11 rounded-2xl bg-river-100 items-center justify-center"
              }
            >
              <Ionicons
                name={hasPlan ? "shield-checkmark" : "shield-outline"}
                size={22}
                color={hasPlan ? "#FFFFFF" : "#2F6D6E"}
              />
            </View>
            <View className="flex-1">
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
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={hasPlan ? "rgba(255,255,255,0.8)" : "#6B7280"}
            />
          </View>
        </Pressable>

        {/* Sección emergencia */}
        {emergency.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3 gap-2">
              <Ionicons name="alert-circle" size={14} color="#C0392B" />
              <Text className="text-xs uppercase text-alert font-semibold tracking-wider">
                Emergencia
              </Text>
            </View>
            <View className="gap-3">
              {emergency.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </View>
          </View>
        )}

        {/* Sección apoyo general */}
        <View className="mb-8">
          <View className="flex-row items-center mb-3 gap-2">
            <Ionicons name="heart-outline" size={14} color="#2F6D6E" />
            <Text className="text-xs uppercase text-ink/70 font-semibold tracking-wider">
              Apoyo psicológico
            </Text>
          </View>
          <View className="gap-3">
            {others.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </View>
        </View>

        {/* Disclaimer legal */}
        <Card variant="muted">
          <View className="flex-row items-start gap-3">
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#2F6D6E"
              style={{ marginTop: 1 }}
            />
            <Text className="flex-1 text-xs text-ink/70 leading-5">
              Cauce es una app de bienestar. No es un servicio de emergencia ni
              reemplaza atención médica o psicológica profesional. Si estás en
              peligro inmediato, llama al{" "}
              <Text className="font-semibold text-alert">131 (SAMU)</Text> o
              acude al servicio de urgencia más cercano.
            </Text>
          </View>
        </Card>

        <Text className="text-xs text-ink/70 text-center mt-6">
          Tu privacidad importa. No registramos cuándo ves esta pantalla ni a
          quién llamas.
        </Text>
      </ScrollView>
    </Screen>
  );
}

export default withErrorBoundary(SupportScreen, { source: "support" });
