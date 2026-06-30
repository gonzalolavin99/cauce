import { showAlert } from "@/src/shared/ui/alert";
import {
  CONSENT_DESCRIPTIONS,
  CONSENT_LABELS,
  PRIVACY_POLICY_VERSION,
} from "@/src/features/privacy/constants";
import { useRecordConsent } from "@/src/features/privacy/hooks/useConsents";
import { cn } from "@/src/shared/lib/cn";
import { Button } from "@/src/shared/ui/Button";
import type { ConsentType } from "@/src/types/database.types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

interface ConsentFormProps {
  /** Callback tras registrar los consentimientos exitosamente */
  onGranted: () => void;
  /** Texto del botón de aceptación */
  submitLabel?: string;
}

/**
 * Form reusable de consentimiento. Registra 3 eventos atómicos:
 * data_processing (grant), sensitive_health_data (grant),
 * anonymous_analytics (grant o revoke según el toggle).
 * No incluye el consent ai_advisor — ese se pide por separado en Fase 3.
 */
export function ConsentForm({
  onGranted,
  submitLabel = "Aceptar y continuar",
}: ConsentFormProps) {
  const router = useRouter();
  const recordConsent = useRecordConsent();

  const [dataProcessing, setDataProcessing] = useState(false);
  const [sensitiveData, setSensitiveData] = useState(false);
  const [anonAnalytics, setAnonAnalytics] = useState(false);

  const canContinue = dataProcessing && sensitiveData;

  async function handleContinue() {
    try {
      await recordConsent.mutateAsync([
        { type: "data_processing", action: "grant" },
        { type: "sensitive_health_data", action: "grant" },
        {
          type: "anonymous_analytics",
          action: anonAnalytics ? "grant" : "revoke",
        },
      ]);
      onGranted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      showAlert("No se pudo registrar tu consentimiento", message);
    }
  }

  return (
    <View>
      <ConsentCard
        type="data_processing"
        value={dataProcessing}
        onChange={setDataProcessing}
        required
      />
      <ConsentCard
        type="sensitive_health_data"
        value={sensitiveData}
        onChange={setSensitiveData}
        required
      />
      <ConsentCard
        type="anonymous_analytics"
        value={anonAnalytics}
        onChange={setAnonAnalytics}
      />

      <View className="mt-2 mb-6 p-4 rounded-2xl bg-sand border border-river-100">
        <Text className="text-sm text-ink/70 leading-5">
          El consentimiento para el asistente con IA se pide por separado
          la primera vez que lo abras. Puedes usar la app completa sin
          activarlo.
        </Text>
      </View>

      <Pressable onPress={() => router.push("/privacy")} className="mb-8">
        <Text className="text-river-700 font-medium text-center">
          Leer política de privacidad completa →
        </Text>
      </Pressable>

      <Button
        onPress={handleContinue}
        disabled={!canContinue}
        loading={recordConsent.isPending}
      >
        {submitLabel}
      </Button>

      <Text className="text-xs text-ink/40 text-center mt-4">
        Versión de política: {PRIVACY_POLICY_VERSION}
      </Text>
    </View>
  );
}

interface ConsentCardProps {
  type: ConsentType;
  value: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}

function ConsentCard({ type, value, onChange, required }: ConsentCardProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className={cn(
        "mb-3 p-4 rounded-2xl border",
        value
          ? "bg-river-50 border-river-500"
          : "bg-surface border-river-100"
      )}
    >
      <View className="flex-row items-start">
        <View
          className={cn(
            "w-6 h-6 rounded-md border-2 mr-3 mt-0.5 items-center justify-center",
            value
              ? "bg-river-500 border-river-500"
              : "bg-surface border-river-300"
          )}
        >
          {value && (
            <Text className="text-white text-xs font-bold leading-3">✓</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap gap-2 mb-1">
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
          <Text className="text-sm text-ink/70 leading-5">
            {CONSENT_DESCRIPTIONS[type]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
