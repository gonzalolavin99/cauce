import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { ScrollView, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface Promise {
  icon: IconName;
  title: string;
  description: string;
}

const PROMISES: Promise[] = [
  {
    icon: "shield-checkmark-outline",
    title: "Privado por diseño",
    description:
      "Cifrado en tránsito y reposo. Tus datos son solo tuyos; puedes exportarlos o borrarlos cuando quieras.",
  },
  {
    icon: "heart-outline",
    title: "Sin juicio, sin rachas",
    description:
      "No hay puntajes, ni streaks, ni gamificación. Solo herramientas para ayudarte cuando lo necesites.",
  },
  {
    icon: "options-outline",
    title: "Se adapta a ti",
    description:
      "Sensorialmente amigable. Elige qué te calma, qué te desregula, y el ritmo lo pones tú.",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center mt-8 mb-10">
          <View
            className="h-24 w-24 rounded-3xl bg-river-500 items-center justify-center mb-6"
            style={{
              shadowColor: "#193838",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <Ionicons name="water" size={46} color="#FFFFFF" />
          </View>
          <Text className="text-4xl font-bold text-ink mb-3 tracking-tight">
            Bienvenido a Cauce
          </Text>
          <Text className="text-base text-ink/70 text-center leading-6 max-w-sm">
            Tu espacio para regularte cuando lo necesites. A tu ritmo, sin
            presión.
          </Text>
        </View>

        {/* Promises */}
        <View className="gap-4 mb-10">
          {PROMISES.map((p) => (
            <View
              key={p.title}
              className="flex-row items-start gap-4 p-4 rounded-2xl bg-surface border border-river-100"
            >
              <View className="h-11 w-11 rounded-2xl bg-river-50 items-center justify-center">
                <Ionicons name={p.icon} size={22} color="#2F6D6E" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink mb-1">
                  {p.title}
                </Text>
                <Text className="text-sm text-ink/70 leading-5">
                  {p.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tiempo estimado */}
        <View className="flex-row items-center justify-center gap-2 mb-8">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-ink/70">
            Toma 1-2 minutos · Puedes cambiar todo después
          </Text>
        </View>

        <Button onPress={() => router.push("/(onboarding)/consent")}>
          Empezar
        </Button>
      </ScrollView>
    </Screen>
  );
}
