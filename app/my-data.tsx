import { showAlert } from "@/src/shared/ui/alert";
import {
  CONSENT_DESCRIPTIONS,
  CONSENT_LABELS,
  OPTIONAL_CONSENTS,
  REQUIRED_CONSENTS,
  PRIVACY_POLICY_VERSION,
} from "@/src/features/privacy/constants";
import {
  useConsents,
  useRecordConsent,
} from "@/src/features/privacy/hooks/useConsents";
import { useMyDataExport } from "@/src/features/privacy/hooks/useMyDataExport";
import { Button } from "@/src/shared/ui/Button";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import type { ConsentType } from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  View,
} from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function MyDataScreen() {
  const router = useRouter();
  const { current, events, isLoading } = useConsents();
  const recordConsent = useRecordConsent();
  const exportData = useMyDataExport();

  async function handleExport() {
    try {
      const dump = await exportData.mutateAsync();
      const json = JSON.stringify(dump, null, 2);
      await Share.share({
        title: "Mis datos de Cauce",
        message: json,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo exportar";
      showAlert("Error", message);
    }
  }

  function handleToggleOptional(type: ConsentType, next: boolean) {
    recordConsent.mutate(
      [{ type, action: next ? "grant" : "revoke" }],
      {
        onError: (err: Error) =>
          showAlert("No se pudo actualizar", err.message),
      }
    );
  }

  function handleRevokeRequired(type: ConsentType) {
    showAlert(
      "Revocar este consentimiento",
      "Si revocas esto, no podremos seguir prestándote el servicio. Te recomendamos usar 'Eliminar cuenta' en Perfil si quieres borrar todo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revocar igual",
          style: "destructive",
          onPress: () =>
            recordConsent.mutate([{ type, action: "revoke" }], {
              onError: (err: Error) =>
                showAlert("Error", err.message),
            }),
        },
      ]
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Mis datos"
        subtitle="Ejerce tus derechos ARCOPP (Acceso, Rectificación, Cancelación, Oposición, Portabilidad)."
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>

        {/* Exportar */}
        <Section title="Portabilidad" icon="cloud-download-outline">
          <Text className="text-sm text-ink/70 mb-4 leading-5">
            Descarga una copia de todo lo que tenemos sobre ti en formato
            JSON. Incluye perfil, diagnósticos, preferencias, mood logs,
            sesiones de regulación, consentimientos y conversaciones con
            IA.
          </Text>
          <Button
            variant="secondary"
            onPress={handleExport}
            loading={exportData.isPending}
          >
            Exportar mis datos
          </Button>
        </Section>

        {/* Consentimientos activos */}
        <Section title="Mis consentimientos" icon="shield-checkmark-outline">
          {isLoading && <ActivityIndicator />}

          {!isLoading && (
            <>
              {REQUIRED_CONSENTS.map((type) => {
                const granted = current.isGranted(type);
                return (
                  <ConsentRow
                    key={type}
                    type={type}
                    granted={granted}
                    required
                    onRevoke={() => handleRevokeRequired(type)}
                  />
                );
              })}
              {OPTIONAL_CONSENTS.map((type) => {
                const granted = current.isGranted(type);
                return (
                  <ConsentRow
                    key={type}
                    type={type}
                    granted={granted}
                    onToggle={(v) => handleToggleOptional(type, v)}
                  />
                );
              })}
            </>
          )}
        </Section>

        {/* Historial de eventos */}
        <Section title="Historial de consentimientos" icon="time-outline">
          <Text className="text-sm text-ink/70 mb-4 leading-5">
            Registro inmutable de cada vez que aceptaste o revocaste un
            consentimiento. Útil si alguna vez necesitas probarlo.
          </Text>
          {events.length === 0 && (
            <Text className="text-sm text-ink/70">Aún no hay eventos.</Text>
          )}
          {events.slice(0, 20).map((ev) => (
            <View
              key={ev.id}
              className="mb-2 p-3 rounded-xl bg-surface border border-river-100"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-ink">
                    {CONSENT_LABELS[ev.consent_type as ConsentType] ??
                      ev.consent_type}
                  </Text>
                  <Text
                    className={
                      "text-xs mt-0.5 " +
                      (ev.action === "grant"
                        ? "text-river-700"
                        : "text-alert")
                    }
                  >
                    {ev.action === "grant" ? "✓ Otorgado" : "× Revocado"} ·
                    política {ev.policy_version}
                  </Text>
                </View>
                <Text className="text-xs text-ink/70">
                  {new Date(ev.created_at).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}
        </Section>

        <Section title="Cancelación" icon="trash-outline">
          <Text className="text-sm text-ink/70 mb-4 leading-5">
            Para eliminar toda tu información, usa{" "}
            <Text className="font-medium">Perfil → Eliminar mi cuenta</Text>.
            Es irreversible y borra todo en segundos.
          </Text>
        </Section>

        <Pressable onPress={() => router.push("/privacy")} className="mt-2">
          <Text className="text-river-700 font-medium text-center">
            Ver política de privacidad completa →
          </Text>
        </Pressable>

        <Text className="text-xs text-ink/40 text-center mt-6">
          Versión de política vigente: {PRIVACY_POLICY_VERSION}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-10">
      <SectionHeader label={title} icon={icon} spacing={16} />
      {children}
    </View>
  );
}

interface ConsentRowProps {
  type: ConsentType;
  granted: boolean;
  required?: boolean;
  onToggle?: (next: boolean) => void;
  onRevoke?: () => void;
}

function ConsentRow({
  type,
  granted,
  required,
  onToggle,
  onRevoke,
}: ConsentRowProps) {
  return (
    <View className="mb-3 p-4 rounded-2xl bg-surface border border-river-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center flex-wrap gap-2">
            <Text className="text-base font-semibold text-ink">
              {CONSENT_LABELS[type]}
            </Text>
            {required && (
              <View className="px-2 py-0.5 rounded-full bg-alert/10">
                <Text className="text-xs text-alert font-medium">
                  Requerido
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-ink/70 mt-1 leading-5">
            {CONSENT_DESCRIPTIONS[type]}
          </Text>
        </View>
        {required ? (
          <Pressable
            onPress={onRevoke}
            disabled={!granted}
            className="px-3 py-2 rounded-xl bg-alert/10"
          >
            <Text className="text-xs text-alert font-medium">Revocar</Text>
          </Pressable>
        ) : (
          <Switch
            value={granted}
            onValueChange={onToggle}
            trackColor={{ false: "#D6E7E7", true: "#4E8B8C" }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>
    </View>
  );
}
