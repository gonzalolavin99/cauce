import {
  isCrisisPlanUseful,
  useCrisisPlan,
  useDeleteCrisisPlan,
  useUpsertCrisisPlan,
  type CrisisPlanInput,
} from "@/src/features/crisis/hooks/useCrisisPlan";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";
import type { CrisisPlan } from "@/src/types/database.types";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type Mode = "view" | "edit";

export default function CrisisPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { data: plan, isLoading } = useCrisisPlan();

  const hasPlan = isCrisisPlanUseful(plan);
  const initialMode: Mode =
    params.mode === "edit" || !hasPlan ? "edit" : "view";

  const [mode, setMode] = useState<Mode>(initialMode);

  // Si entra con plan cargado y no se forzó edit, arranca en view.
  // (Este useEffect cubre el caso en que el fetch todavía no había resuelto.)
  useEffect(() => {
    if (params.mode === "edit") return;
    if (isLoading) return;
    setMode(hasPlan ? "view" : "edit");
  }, [params.mode, isLoading, hasPlan]);

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (mode === "edit") {
    return (
      <EditPlan
        plan={plan ?? null}
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
      onEdit={() => setMode("edit")}
      onClose={() => router.back()}
    />
  );
}

// ====================================================================
// Vista de lectura (modo "estoy mal y abrí mi plan")
// ====================================================================

function ViewPlan({
  plan,
  onEdit,
  onClose,
}: {
  plan: CrisisPlan;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const deletePlan = useDeleteCrisisPlan();

  const phone = plan.trusted_contact_phone?.trim();
  const phoneClean = phone?.replace(/\s+/g, "");

  function handleCall() {
    if (!phoneClean) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${phoneClean}`).catch(() => {
      Alert.alert(
        "No se pudo abrir",
        "Intenta llamar manualmente al número que guardaste."
      );
    });
  }

  function handleGoToSupport() {
    Haptics.selectionAsync().catch(() => {});
    router.replace("/(tabs)/support");
  }

  function handleDelete() {
    Alert.alert(
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
                Alert.alert("Listo", "El plan se borró.");
                onClose();
              },
              onError: (err: Error) =>
                Alert.alert("No se pudo borrar", err.message),
            });
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-ink flex-1 pr-4">
            Mi plan
          </Text>
          <Pressable
            onPress={onClose}
            className="px-3 py-2 rounded-xl bg-river-50"
          >
            <Text className="text-river-900 font-medium">Cerrar</Text>
          </Pressable>
        </View>

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
          className="mb-8 p-4 rounded-2xl bg-sand border border-river-100 active:bg-river-50"
        >
          <Text className="text-river-900 text-base font-semibold text-center">
            Ver números de emergencia
          </Text>
          <Text className="text-ink/60 text-xs text-center mt-0.5">
            SAMU, Salud Responde, Línea Libre
          </Text>
        </Pressable>

        {/* Secciones del plan */}
        <Section title="Mis señales de alerta" value={plan.warning_signs} />
        <Section title="Lo que me ha ayudado antes" value={plan.what_helps} />
        <Section title="Mi lugar seguro" value={plan.safe_place} />
        <Section
          title="Lo que más me importa sostener"
          value={plan.reasons_to_stay}
        />
        <Section
          title="Cosas que mejor evito cuando estoy mal"
          value={plan.avoid_list}
        />
        <Section title="Notas" value={plan.notes} />

        {/* Footer: editar / borrar */}
        <View className="mt-4 gap-3">
          <Button variant="secondary" onPress={onEdit}>
            Editar mi plan
          </Button>
          <Pressable
            onPress={handleDelete}
            disabled={deletePlan.isPending}
            className="p-3 rounded-2xl bg-alert/10 border border-alert/30 active:bg-alert/20"
          >
            <Text className="text-alert text-sm font-medium text-center">
              {deletePlan.isPending ? "Borrando..." : "Borrar plan"}
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs text-ink/40 text-center mt-6 leading-4">
          Tu plan es privado. Solo tú lo ves. Se guarda encriptado en tu
          cuenta.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  if (!value || value.trim().length === 0) return null;
  return (
    <View className="mb-5 p-4 rounded-2xl bg-white border border-river-100">
      <Text className="text-xs uppercase text-ink/60 font-semibold mb-2 tracking-wider">
        {title}
      </Text>
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
        onSaved();
      },
      onError: (err: Error) =>
        Alert.alert("No se pudo guardar", err.message),
    });
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-2xl font-bold text-ink flex-1 pr-4">
              Mi plan de crisis
            </Text>
            <Pressable
              onPress={onCancel}
              className="px-3 py-2 rounded-xl bg-river-50"
            >
              <Text className="text-river-900 font-medium">
                {plan ? "Cancelar" : "Cerrar"}
              </Text>
            </Pressable>
          </View>

          <Text className="text-sm text-ink/70 leading-5 mb-8">
            Escribe en calma lo que quieras poder recordar cuando estés
            mal. Todos los campos son opcionales — llena sólo lo que te
            haga sentido.
          </Text>

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
              autoCapitalize="words"
            />
            <Input
              value={form.trusted_contact_phone ?? ""}
              onChangeText={(v) => set("trusted_contact_phone", v)}
              placeholder="Teléfono (ej: +56 9 1234 5678)"
              keyboardType="phone-pad"
            />
            <Input
              value={form.trusted_contact_relation ?? ""}
              onChangeText={(v) => set("trusted_contact_relation", v)}
              placeholder="Relación (ej: mamá, amiga, terapeuta)"
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

          <Text className="text-xs text-ink/40 text-center mt-6 leading-4">
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
  return (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-ink mb-1">{label}</Text>
      {hint && <Text className="text-xs text-ink/60 leading-4 mb-3">{hint}</Text>}
      {children}
    </View>
  );
}

function MultilineInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline
      maxLength={2000}
      className="rounded-2xl px-4 py-3 bg-white border border-river-100 text-ink text-base"
      style={{ minHeight: 88, maxHeight: 200, textAlignVertical: "top" }}
    />
  );
}
