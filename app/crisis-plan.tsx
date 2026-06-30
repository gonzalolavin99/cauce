import { showAlert } from "@/src/shared/ui/alert";
import { showToast } from "@/src/shared/ui/toast";
import { usePlaceholderColor } from "@/src/shared/theme/usePlaceholderColor";
import {
    isCrisisPlanUseful,
    useCrisisPlan,
    useDeleteCrisisPlan,
    useUpsertCrisisPlan,
    type CrisisPlanInput,
} from "@/src/features/crisis/hooks/useCrisisPlan";
import { exportPlanPdf } from "@/src/features/crisis/lib/exportPlanPdf";
import { sharePlan } from "@/src/features/crisis/lib/sharePlan";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import type { CrisisPlan } from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import React, { useEffect, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

type Mode = "view" | "edit";

function CrisisPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { data, isLoading } = useCrisisPlan();

  const plan = data?.plan ?? null;
  const fromCache = data?.fromCache ?? false;
  const lastSyncedAt = data?.lastSyncedAt ?? null;
  const hasPlan = isCrisisPlanUseful(plan);

  // Si estamos sirviendo desde cache (sin conexión), bloqueamos la edición:
  // no queremos sobrescribir lo que haya en el server con cambios ciegos.
  const initialMode: Mode =
    params.mode === "edit" && !fromCache
      ? "edit"
      : !hasPlan && !fromCache
        ? "edit"
        : "view";

  const [mode, setMode] = useState<Mode>(initialMode);

  // Si entra con plan cargado y no se forzó edit, arranca en view.
  // (Este useEffect cubre el caso en que el fetch todavía no había resuelto.)
  useEffect(() => {
    if (isLoading) return;
    if (fromCache) {
      setMode("view");
      return;
    }
    if (params.mode === "edit") return;
    setMode(hasPlan ? "view" : "edit");
  }, [params.mode, isLoading, hasPlan, fromCache]);

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Mi plan" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          <View className="gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (mode === "edit") {
    return (
      <EditPlan
        plan={plan}
        onSaved={() => setMode("view")}
        onCancel={() => {
          if (hasPlan) {
            setMode("view");
          } else {
            router.back();
          }
        }}
      />
    );
  }

  return (
    <ViewPlan
      plan={plan!}
      fromCache={fromCache}
      lastSyncedAt={lastSyncedAt}
      onEdit={() => setMode("edit")}
      onClose={() => router.back()}
    />
  );
}

/**
 * "hace 3h", "hace 2 días", etc. Para el banner de offline.
 */
function humanSince(iso: string | null): string {
  if (!iso) return "hace tiempo";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "hace tiempo";
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

// ====================================================================
// Vista de lectura (modo "estoy mal y abrí mi plan")
// ====================================================================

function ViewPlan({
  plan,
  fromCache,
  lastSyncedAt,
  onEdit,
  onClose,
}: {
  plan: CrisisPlan;
  fromCache: boolean;
  lastSyncedAt: string | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const deletePlan = useDeleteCrisisPlan();
  const [isExporting, setIsExporting] = useState(false);

  const phone = plan.trusted_contact_phone?.trim();
  const phoneClean = phone?.replace(/\s+/g, "");

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      await exportPlanPdf(plan);
    } catch {
      showAlert(
        "No se pudo exportar",
        "Intenta de nuevo en un momento."
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleShare() {
    Haptics.selectionAsync().catch(() => {});
    try {
      await sharePlan(plan);
    } catch {
      showAlert("No se pudo compartir", "Intenta de nuevo en un momento.");
    }
  }

  function handleCall() {
    if (!phoneClean) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${phoneClean}`).catch(() => {
      showAlert(
        "No se pudo abrir",
        "Intenta llamar manualmente al número que guardaste."
      );
    });
  }

  function handleGoToSupport() {
    Haptics.selectionAsync().catch(() => {});
    router.replace("/(tabs)/support");
  }

  function handleOfflineEdit() {
    showAlert(
      "Sin conexión",
      "No podemos editar tu plan ahora para no pisar una versión más nueva que pueda haber en tu cuenta. Intenta de nuevo cuando vuelva la señal."
    );
  }

  function handleDelete() {
    showAlert(
      "¿Borrar el plan?",
      "Vas a perder lo que escribiste. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: () => {
            deletePlan.mutate(undefined, {
              onSuccess: () => {
                showToast("El plan se borró");
                onClose();
              },
              onError: (err: Error) =>
                showAlert("No se pudo borrar", err.message),
            });
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <PageHeader title="Mi plan" onBack={onClose} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {/* Banner sutil si estamos sirviendo desde cache local */}
        {fromCache && (
          <View className="mb-5 p-3 rounded-2xl bg-sand border border-river-100">
            <Text className="text-xs text-ink/70 leading-5">
              Sin conexión. Te estamos mostrando tu plan guardado (
              {humanSince(lastSyncedAt)}). Cuando vuelva la señal, se
              sincroniza solo.
            </Text>
          </View>
        )}

        {/* Frase ancla — grande, prominente */}
        {plan.anchor_phrase && (
          <View className="mb-6 p-5 rounded-3xl bg-river-500">
            <Text className="text-xs uppercase text-white/70 font-semibold mb-2 tracking-wider">
              Recuerda
            </Text>
            <Text className="text-xl text-white font-semibold leading-7">
              {plan.anchor_phrase}
            </Text>
          </View>
        )}

        {/* Acciones rápidas */}
        {phoneClean && (
          <Pressable
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel={
              plan.trusted_contact_name
                ? `Llamar a ${plan.trusted_contact_name}`
                : "Llamar a mi contacto"
            }
            accessibilityHint={
              plan.trusted_contact_relation
                ? `Contacto: ${plan.trusted_contact_relation}. Abre el teléfono para marcar.`
                : "Abre el teléfono para marcar."
            }
            className="mb-3 p-4 rounded-2xl bg-alert active:bg-alert/80"
          >
            <Text className="text-white text-base font-semibold text-center">
              {plan.trusted_contact_name
                ? `Llamar a ${plan.trusted_contact_name}`
                : "Llamar a mi contacto"}
            </Text>
            {plan.trusted_contact_relation && (
              <Text className="text-white/80 text-xs text-center mt-0.5">
                {plan.trusted_contact_relation}
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={handleGoToSupport}
          accessibilityRole="button"
          accessibilityLabel="Ver números de emergencia"
          accessibilityHint="Abre la pestaña de apoyo con SAMU, Salud Responde y Línea Libre"
          className="mb-8 p-4 rounded-2xl bg-sand border border-river-100 active:bg-river-50"
        >
          <Text className="text-river-900 text-base font-semibold text-center">
            Ver números de emergencia
          </Text>
          <Text className="text-ink/70 text-xs text-center mt-0.5">
            SAMU, Salud Responde, Línea Libre
          </Text>
        </Pressable>

        {/* Secciones del plan */}
        <Section
          title="Mis señales de alerta"
          icon="alert-circle-outline"
          value={plan.warning_signs}
        />
        <Section
          title="Lo que me ha ayudado antes"
          icon="heart-outline"
          value={plan.what_helps}
        />
        <Section
          title="Mi lugar seguro"
          icon="home-outline"
          value={plan.safe_place}
        />
        <Section
          title="Lo que más me importa sostener"
          icon="flower-outline"
          value={plan.reasons_to_stay}
        />
        <Section
          title="Cosas que mejor evito cuando estoy mal"
          icon="remove-circle-outline"
          value={plan.avoid_list}
        />
        <Section
          title="Notas"
          icon="document-text-outline"
          value={plan.notes}
        />

        {/* Footer: compartir / exportar / editar / borrar. */}
        <View className="mt-4 gap-3">
          <Button variant="secondary" onPress={handleShare}>
            Compartir con un contacto
          </Button>
          <Button
            variant="secondary"
            onPress={handleExport}
            loading={isExporting}
          >
            {isExporting ? "Generando PDF…" : "Exportar como PDF"}
          </Button>
          <Button
            variant="secondary"
            onPress={fromCache ? handleOfflineEdit : onEdit}
            disabled={fromCache}
          >
            {fromCache ? "Editar (requiere conexión)" : "Editar mi plan"}
          </Button>
          {!fromCache && (
            <Pressable
              onPress={handleDelete}
              disabled={deletePlan.isPending}
              accessibilityRole="button"
              accessibilityLabel="Borrar plan"
              accessibilityHint="Acción destructiva e irreversible"
              accessibilityState={{
                disabled: deletePlan.isPending,
                busy: deletePlan.isPending,
              }}
              className="p-3 rounded-2xl bg-alert/10 border border-alert/30 active:bg-alert/20"
            >
              <Text className="text-alert text-sm font-medium text-center">
                {deletePlan.isPending ? "Borrando..." : "Borrar plan"}
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="text-xs text-ink/70 text-center mt-6 leading-4">
          Tu plan es privado. Solo tú lo ves. Se guarda encriptado en tu
          cuenta.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  icon,
  value,
}: {
  title: string;
  icon?: IconName;
  value: string | null | undefined;
}) {
  if (!value || value.trim().length === 0) return null;
  return (
    <View className="mb-5 p-4 rounded-2xl bg-surface border border-river-100">
      <SectionHeader label={title} icon={icon} spacing={8} />
      <Text className="text-base text-ink leading-6">{value.trim()}</Text>
    </View>
  );
}

// ====================================================================
// Vista de edición
// ====================================================================

function EditPlan({
  plan,
  onSaved,
  onCancel,
}: {
  plan: CrisisPlan | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const upsert = useUpsertCrisisPlan();

  const initial = useMemo<CrisisPlanInput>(
    () => ({
      warning_signs: plan?.warning_signs ?? "",
      what_helps: plan?.what_helps ?? "",
      anchor_phrase: plan?.anchor_phrase ?? "",
      safe_place: plan?.safe_place ?? "",
      trusted_contact_name: plan?.trusted_contact_name ?? "",
      trusted_contact_phone: plan?.trusted_contact_phone ?? "",
      trusted_contact_relation: plan?.trusted_contact_relation ?? "",
      reasons_to_stay: plan?.reasons_to_stay ?? "",
      avoid_list: plan?.avoid_list ?? "",
      notes: plan?.notes ?? "",
    }),
    [plan]
  );

  const [form, setForm] = useState<CrisisPlanInput>(initial);

  function set<K extends keyof CrisisPlanInput>(
    key: K,
    value: CrisisPlanInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    Haptics.selectionAsync().catch(() => {});
    upsert.mutate(form, {
      onSuccess: () => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        showToast("Plan guardado");
        onSaved();
      },
      onError: (err: Error) =>
        showAlert("No se pudo guardar", err.message),
    });
  }

  return (
    <Screen>
      <PageHeader
        title="Mi plan de crisis"
        subtitle="Escribe en calma lo que quieras poder recordar cuando estés mal. Todos los campos son opcionales — llena sólo lo que te haga sentido."
        onBack={onCancel}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Frase ancla */}
          <Field
            label="Frase ancla"
            hint="Una frase corta que te recuerde algo importante. Se verá grande al abrir tu plan."
          >
            <Input
              value={form.anchor_phrase ?? ""}
              onChangeText={(v) => set("anchor_phrase", v)}
              placeholder="Ej: esto también pasa, ya salí antes"
              maxLength={140}
            />
          </Field>

          {/* Señales de alerta */}
          <Field
            label="Mis señales de alerta"
            hint="¿Cómo me doy cuenta que estoy mal? Pensamientos, sensaciones, cosas que hago."
          >
            <MultilineInput
              value={form.warning_signs ?? ""}
              onChangeText={(v) => set("warning_signs", v)}
              placeholder="Ej: no quiero hablar con nadie, me aprieta el pecho, no duermo bien hace días"
            />
          </Field>

          {/* Qué me ha ayudado */}
          <Field
            label="Lo que me ha ayudado antes"
            hint="Ejercicios, acciones pequeñas, rutinas, personas."
          >
            <MultilineInput
              value={form.what_helps ?? ""}
              onChangeText={(v) => set("what_helps", v)}
              placeholder="Ej: salir a caminar 10 min, agua fría en la cara, escribir lo que siento, llamar a mi hermana"
            />
          </Field>

          {/* Lugar seguro */}
          <Field
            label="Mi lugar seguro"
            hint="Un espacio físico (tu pieza, un parque) o mental donde te sientes más tú."
          >
            <MultilineInput
              value={form.safe_place ?? ""}
              onChangeText={(v) => set("safe_place", v)}
              placeholder="Ej: mi pieza con la luz baja y los audífonos"
            />
          </Field>

          {/* Contacto de confianza */}
          <Field
            label="Contacto de confianza"
            hint="Una persona a la que puedes llamar. Guardar el número te permite marcarlo con un toque."
          >
            <Input
              value={form.trusted_contact_name ?? ""}
              onChangeText={(v) => set("trusted_contact_name", v)}
              placeholder="Nombre"
              accessibilityLabel="Nombre del contacto de confianza"
              autoCapitalize="words"
              maxLength={80}
            />
            <Input
              value={form.trusted_contact_phone ?? ""}
              onChangeText={(v) => set("trusted_contact_phone", v)}
              placeholder="Teléfono (ej: +56 9 1234 5678)"
              accessibilityLabel="Teléfono del contacto"
              accessibilityHint="Formato internacional, por ejemplo +56 9 1234 5678"
              keyboardType="phone-pad"
              maxLength={24}
            />
            <Input
              value={form.trusted_contact_relation ?? ""}
              onChangeText={(v) => set("trusted_contact_relation", v)}
              placeholder="Relación (ej: mamá, amiga, terapeuta)"
              accessibilityLabel="Relación con el contacto"
              maxLength={40}
            />
          </Field>

          {/* Razones para sostenerme */}
          <Field
            label="Lo que más me importa sostener"
            hint="Personas, proyectos, cosas que te importan. Opcional. Sólo tú lo ves."
          >
            <MultilineInput
              value={form.reasons_to_stay ?? ""}
              onChangeText={(v) => set("reasons_to_stay", v)}
              placeholder="Ej: mi perro, terminar el año, estar para mi sobrina"
            />
          </Field>

          {/* Evitar */}
          <Field
            label="Cosas que mejor evito cuando estoy mal"
            hint="Lugares, personas, sustancias, redes. Poner límites claros te cuida."
          >
            <MultilineInput
              value={form.avoid_list ?? ""}
              onChangeText={(v) => set("avoid_list", v)}
              placeholder="Ej: alcohol, ciertas redes sociales, discutir por mensaje"
            />
          </Field>

          {/* Notas */}
          <Field label="Notas" hint="Cualquier otra cosa que te sirva recordar.">
            <MultilineInput
              value={form.notes ?? ""}
              onChangeText={(v) => set("notes", v)}
              placeholder="Lo que sea"
            />
          </Field>

          <View className="mt-4">
            <Button onPress={handleSave} loading={upsert.isPending}>
              Guardar mi plan
            </Button>
          </View>

          <Text className="text-xs text-ink/70 text-center mt-6 leading-4">
            Tu plan es privado. Solo tú lo ves.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Si el Field envuelve un único input, inyectamos el `label` visible como
  // `accessibilityLabel` del input (equivalente a <label htmlFor> en web),
  // respetando cualquier override explícito. Cuando hay múltiples inputs
  // (ej: el bloque de contacto con nombre/teléfono/relación), cada hijo
  // trae su propio accessibilityLabel.
  const count = React.Children.count(children);
  const enhanced =
    count === 1
      ? React.Children.map(children, (child) => {
          if (React.isValidElement<Record<string, unknown>>(child)) {
            return React.cloneElement(child, {
              accessibilityLabel:
                (child.props.accessibilityLabel as string | undefined) ?? label,
              accessibilityHint:
                (child.props.accessibilityHint as string | undefined) ?? hint,
            });
          }
          return child;
        })
      : children;

  return (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-ink mb-1">{label}</Text>
      {hint && <Text className="text-xs text-ink/70 leading-4 mb-3">{hint}</Text>}
      {enhanced}
    </View>
  );
}

function MultilineInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const placeholderColor = usePlaceholderColor();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      multiline
      maxLength={2000}
      className="rounded-2xl px-4 py-3 bg-surface border border-river-100 text-ink text-base"
      style={{ minHeight: 88, maxHeight: 200, textAlignVertical: "top" }}
    />
  );
}

export default withErrorBoundary(CrisisPlanScreen, { source: "crisis-plan" });
