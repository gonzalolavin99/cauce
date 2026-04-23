import type { CrisisResource } from "@/src/features/crisis/data/resources";
import { cn } from "@/src/shared/lib/cn";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Alert, Linking, Pressable, Text, View } from "react-native";

interface ResourceCardProps {
  resource: CrisisResource;
}

function formatPhoneDisplay(phone: string): string {
  // 131 → 131
  // 1515 → 1515
  // 6003607777 → 600 360 7777
  // 800200818 → 800 200 818
  if (phone.length === 10 && phone.startsWith("600")) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  if (phone.length === 9 && phone.startsWith("800")) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  async function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const target = resource.phone
      ? `tel:${resource.phone}`
      : resource.url ?? "";

    if (!target) return;

    try {
      const supported = await Linking.canOpenURL(target);
      if (supported) {
        await Linking.openURL(target);
      } else {
        Alert.alert(
          "No se pudo abrir",
          resource.phone
            ? `Marca manualmente: ${formatPhoneDisplay(resource.phone)}`
            : `Visita: ${resource.url}`
        );
      }
    } catch {
      Alert.alert("No se pudo abrir", "Intenta marcar manualmente.");
    }
  }

  const isEmergency = resource.primary;
  const isPhone = !!resource.phone;

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "p-5 rounded-2xl border",
        isEmergency
          ? "bg-alert/10 border-alert active:bg-alert/20"
          : "bg-white border-river-100 active:bg-river-50"
      )}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text
            className={cn(
              "text-lg font-semibold mb-1",
              isEmergency ? "text-alert" : "text-ink"
            )}
          >
            {resource.label}
          </Text>
          <Text className="text-sm text-ink/70 leading-5">
            {resource.description}
          </Text>
        </View>
        <View
          className={cn(
            "px-3 py-2 rounded-xl flex-row items-center gap-1.5",
            isEmergency ? "bg-alert" : "bg-river-500"
          )}
        >
          <Ionicons
            name={isPhone ? "call" : "open-outline"}
            size={14}
            color="#FFFFFF"
          />
          <Text className="text-white font-semibold">
            {resource.phone ? formatPhoneDisplay(resource.phone) : "Abrir"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
