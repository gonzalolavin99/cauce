import { ResourceCard } from "@/src/features/crisis/components/ResourceCard";
import { CRISIS_RESOURCES } from "@/src/features/crisis/data/resources";
import { Screen } from "@/src/shared/ui/Screen";
import { ScrollView, Text, View } from "react-native";

export default function SupportScreen() {
  const emergency = CRISIS_RESOURCES.filter((r) => r.primary);
  const others = CRISIS_RESOURCES.filter((r) => !r.primary);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-3xl font-bold text-ink mb-3">No estás solo/a</Text>
        <Text className="text-base text-ink/70 leading-6 mb-8">
          Si lo que sientes es más grande que un ejercicio, hay personas
          esperando para escucharte. Llamar es gratis y confidencial.
        </Text>

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
