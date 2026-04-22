import { signOut, useAuth } from "@/src/features/auth/hooks/useAuth";
import {
  resolvePrefs,
  useNotificationPreferences,
  useUpsertNotificationPreferences,
} from "@/src/features/notifications/hooks/useNotificationPreferences";
import {
  cancelAllCauce,
  ensureAndroidChannel,
  ensureNotificationPermission,
  hasNotificationPermission,
  isNotificationsAvailable,
} from "@/src/features/notifications/service";
import {
  CALMING_INPUTS,
  TRIGGERING_INPUTS,
} from "@/src/features/onboarding/data/options";
import { DIAGNOSIS_OPTIONS } from "@/src/features/onboarding/data/options";
import { useDeleteAccount } from "@/src/features/profile/hooks/useDeleteAccount";
import { useDiagnoses } from "@/src/features/profile/hooks/useDiagnoses";
import {
  useSensoryPreferences,
  useProfile,
} from "@/src/features/profile/hooks/useProfile";
import {
  useUpdateDiagnoses,
  useUpdatePreferences,
  useUpdateProfile,
} from "@/src/features/profile/hooks/useUpdateProfile";
import { cn } from "@/src/shared/lib/cn";
import { Button } from "@/src/shared/ui/Button";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";
import type { Diagnosis, Mobility } from "@/src/types/database.types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

const TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: "2 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
];

const MOBILITY_OPTIONS: { value: Mobility; label: string; hint?: string }[] = [
  { value: "any", label: "Cualquiera" },
  { value: "seated", label: "Sentado/a" },
  { value: "still", label: "Quieto/a" },
];

const CHECKIN_HOUR_PRESETS: { value: number; label: string }[] = [
  { value: 8, label: "8:00" },
  { value: 12, label: "12:00" },
  { value: 18, label: "18:00" },
  { value: 20, label: "20:00" },
  { value: 22, label: "22:00" },
];

const INACTIVITY_DAY_PRESETS: { value: number; label: string }[] = [
  { value: 2, label: "2 días" },
  { value: 3, label: "3 días" },
  { value: 5, label: "5 días" },
  { value: 7, label: "1 semana" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: prefs } = useSensoryPreferences();
  const { data: diagnoses } = useDiagnoses();

  const updateProfile = useUpdateProfile();
  const updateDiagnoses = useUpdateDiagnoses();
  const updatePreferences = useUpdatePreferences();
  const deleteAccount = useDeleteAccount();

  const { data: rawNotifPrefs } = useNotificationPreferences();
  const upsertNotifPrefs = useUpsertNotificationPreferences();
  const notifPrefs = resolvePrefs(rawNotifPrefs);
  const [notifPermissionGranted, setNotifPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    hasNotificationPermission().then((v) => {
      if (alive) setNotifPermissionGranted(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Estados locales espejados a la BD
  const [displayName, setDisplayName] = useState("");
  const [localDiagnoses, setLocalDiagnoses] = useState<Diagnosis[]>([]);
  const [localCalming, setLocalCalming] = useState<string[]>([]);
  const [localTriggering, setLocalTriggering] = useState<string[]>([]);
  const [localTime, setLocalTime] = useState<number>(5);
  const [localMobility, setLocalMobility] = useState<Mobility>("any");

  // Hidratar desde la BD cuando carguen los datos
  useEffect(() => {
    if (profile?.display_name != null) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  useEffect(() => {
    if (diagnoses) setLocalDiagnoses(diagnoses);
  }, [diagnoses]);

  useEffect(() => {
    if (prefs) {
      setLocalCalming(
        Array.isArray(prefs.calming_inputs)
          ? (prefs.calming_inputs as string[])
          : []
      );
      setLocalTriggering(
        Array.isArray(prefs.triggering_inputs)
          ? (prefs.triggering_inputs as string[])
          : []
      );
      setLocalTime(prefs.default_time_available ?? 5);
      setLocalMobility((prefs.default_mobility as Mobility) ?? "any");
    }
  }, [prefs]);

  function handleSaveName() {
    updateProfile.mutate(
      { display_name: displayName.trim() || null },
      {
        onSuccess: () => Alert.alert("Guardado", "Tu nombre fue actualizado."),
        onError: (err: Error) =>
          Alert.alert("Error", err.message),
      }
    );
  }

  function handleSaveDiagnoses() {
    updateDiagnoses.mutate(localDiagnoses, {
      onSuccess: () => Alert.alert("Guardado", "Tus diagnósticos fueron actualizados."),
      onError: (err: Error) => Alert.alert("Error", err.message),
    });
  }

  function handleSavePreferences() {
    updatePreferences.mutate(
      {
        calming_inputs: localCalming,
        triggering_inputs: localTriggering,
        default_time_available: localTime,
        default_mobility: localMobility,
      },
      {
        onSuccess: () =>
          Alert.alert("Guardado", "Tus preferencias fueron actualizadas."),
        onError: (err: Error) => Alert.alert("Error", err.message),
      }
    );
  }

  function handleToggleVoice(value: boolean) {
    updatePreferences.mutate({ prefers_voice_guidance: value });
  }

  function handleToggleHaptics(value: boolean) {
    updatePreferences.mutate({ prefers_haptics: value });
  }

  async function handleToggleDailyCheckin(value: boolean) {
    if (value) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          "Permiso requerido",
          "Para enviarte recordatorios necesitamos permiso de notificaciones. Puedes activarlo desde los ajustes del teléfono."
        );
        return;
      }
      await ensureAndroidChannel();
    }
    upsertNotifPrefs.mutate(
      { daily_checkin_enabled: value },
      {
        onError: (err: Error) => Alert.alert("Error", err.message),
      }
    );
  }

  function handleChangeCheckinHour(hour: number) {
    upsertNotifPrefs.mutate(
      { daily_checkin_hour: hour, daily_checkin_minute: 0 },
      { onError: (err: Error) => Alert.alert("Error", err.message) }
    );
  }

  async function handleToggleExerciseReminder(value: boolean) {
    if (value) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          "Permiso requerido",
          "Para enviarte recordatorios necesitamos permiso de notificaciones."
        );
        return;
      }
      await ensureAndroidChannel();
    }
    upsertNotifPrefs.mutate(
      { exercise_reminder_enabled: value },
      { onError: (err: Error) => Alert.alert("Error", err.message) }
    );
  }

  function handleChangeInactivityDays(days: number) {
    upsertNotifPrefs.mutate(
      { exercise_reminder_days: days },
      { onError: (err: Error) => Alert.alert("Error", err.message) }
    );
  }

  async function handleTogglePostCrisis(value: boolean) {
    if (value) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          "Permiso requerido",
          "Para enviarte recordatorios necesitamos permiso de notificaciones."
        );
        return;
      }
      await ensureAndroidChannel();
    }
    upsertNotifPrefs.mutate(
      { post_crisis_checkin_enabled: value },
      { onError: (err: Error) => Alert.alert("Error", err.message) }
    );
  }

  function handleSignOut() {
    Alert.alert("¿Cerrar sesión?", "Tendrás que volver a ingresar.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        onPress: async () => {
          // Limpiamos notificaciones locales para no disparar en un teléfono
          // prestado o tras logout.
          await cancelAllCauce().catch(() => {});
          signOut();
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "¿Eliminar cuenta?",
      "Esto borra permanentemente tu información: sesiones, preferencias, diagnósticos e historial. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            // Segunda confirmación para prevenir tap accidental
            Alert.alert(
              "Confirmación final",
              "¿Estás seguro/a? Esta acción es irreversible.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sí, eliminar",
                  style: "destructive",
                  onPress: () => {
                    deleteAccount.mutate(undefined, {
                      onError: (err: Error) =>
                        Alert.alert(
                          "Error al eliminar",
                          `${err.message}\n\nPor favor contacta soporte si persiste.`
                        ),
                    });
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64 }}>
        <Text className="text-3xl font-bold text-ink mb-8">Mi cuenta</Text>

        {/* Sección: Info básica */}
        <Section title="Información">
          <Input
            label="Nombre"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Cómo quieres que te llamemos"
            autoCapitalize="words"
          />
          <Text className="text-xs text-ink/50 mb-3">
            Correo: {user?.email}
          </Text>
          <Button
            variant="secondary"
            onPress={handleSaveName}
            loading={updateProfile.isPending}
          >
            Guardar nombre
          </Button>
        </Section>

        {/* Sección: Diagnósticos */}
        <Section title="Cómo me identifico">
          <Text className="text-sm text-ink/60 mb-4">
            No necesitas diagnóstico formal para marcar algo.
          </Text>
          <ChipSelector<Diagnosis>
            options={DIAGNOSIS_OPTIONS}
            selected={localDiagnoses}
            onChange={setLocalDiagnoses}
          />
          <View className="mt-4">
            <Button
              variant="secondary"
              onPress={handleSaveDiagnoses}
              loading={updateDiagnoses.isPending}
            >
              Guardar diagnósticos
            </Button>
          </View>
        </Section>

        {/* Sección: Preferencias sensoriales */}
        <Section title="Lo que me calma">
          <ChipSelector<string>
            options={CALMING_INPUTS}
            selected={localCalming}
            onChange={setLocalCalming}
            allowCustom
            addPlaceholder="Ej: abrazar a mi perro"
          />
        </Section>

        <Section title="Lo que me desregula">
          <ChipSelector<string>
            options={TRIGGERING_INPUTS}
            selected={localTriggering}
            onChange={setLocalTriggering}
            allowCustom
            addPlaceholder="Ej: recuerdos, ruido de la ciudad"
          />
        </Section>

        {/* Sección: Tiempo y movilidad */}
        <Section title="Tiempo disponible habitual">
          <ChipSelector<string>
            options={TIME_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
            selected={[String(localTime)]}
            onChange={(next) => {
              if (next[0]) setLocalTime(Number(next[0]));
            }}
            multi={false}
          />
        </Section>

        <Section title="Movilidad habitual">
          <ChipSelector<Mobility>
            options={MOBILITY_OPTIONS}
            selected={[localMobility]}
            onChange={(next) => {
              if (next[0]) setLocalMobility(next[0]);
            }}
            multi={false}
          />
          <View className="mt-4">
            <Button
              variant="secondary"
              onPress={handleSavePreferences}
              loading={updatePreferences.isPending}
            >
              Guardar preferencias
            </Button>
          </View>
        </Section>

        {/* Sección: Tus patrones (insights) */}
        <Section title="Tus patrones">
          <Text className="text-sm text-ink/60 mb-4 leading-5">
            Un resumen honesto de lo que tú mismo/a has registrado en los
            últimos 30 días. Sin rachas ni puntajes.
          </Text>
          <Pressable
            onPress={() => router.push("/insights")}
            className="p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
          >
            <Text className="text-river-900 font-medium">Ver mis patrones</Text>
            <Text className="text-xs text-ink/60 mt-0.5">
              Check-ins, mood predominante, ejercicios usados
            </Text>
          </Pressable>
        </Section>

        {/* Sección: Recordatorios (notificaciones locales) */}
        <Section title="Recordatorios">
          <Text className="text-sm text-ink/60 mb-4 leading-5">
            Notificaciones suaves, sólo en tu teléfono. Todo apagado por
            defecto — eliges qué te hace sentido.
          </Text>

          {!isNotificationsAvailable() && (
            <View className="mb-4 p-3 rounded-xl bg-sand border border-river-100">
              <Text className="text-xs text-ink/70 leading-4">
                Las notificaciones requieren una versión de desarrollo de la
                app (dev build). En la versión actual puedes guardar tus
                preferencias, pero los recordatorios no se programan todavía.
              </Text>
            </View>
          )}

          {isNotificationsAvailable() && notifPermissionGranted === false && (
            <View className="mb-4 p-3 rounded-xl bg-sand border border-river-100">
              <Text className="text-xs text-ink/70">
                No tenemos permiso de notificaciones. Al activar un
                recordatorio te lo pediremos; si lo bloqueaste, tendrás
                que habilitarlo desde los ajustes del teléfono.
              </Text>
            </View>
          )}

          <ToggleRow
            label="Check-in diario"
            description="Te recordamos anotar cómo estás una vez al día."
            value={notifPrefs.daily_checkin_enabled}
            onChange={handleToggleDailyCheckin}
          />

          {notifPrefs.daily_checkin_enabled && (
            <View className="mt-3 mb-4">
              <Text className="text-xs text-ink/60 mb-2">Hora</Text>
              <View className="flex-row flex-wrap gap-2">
                {CHECKIN_HOUR_PRESETS.map((opt) => {
                  const active = notifPrefs.daily_checkin_hour === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleChangeCheckinHour(opt.value)}
                      className={cn(
                        "px-4 py-2 rounded-2xl border",
                        active
                          ? "bg-river-500 border-river-500"
                          : "bg-white border-river-100"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          active ? "text-white" : "text-ink"
                        )}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <ToggleRow
            label="Empujón por inactividad"
            description="Si pasan varios días sin un ejercicio de regulación."
            value={notifPrefs.exercise_reminder_enabled}
            onChange={handleToggleExerciseReminder}
          />

          {notifPrefs.exercise_reminder_enabled && (
            <View className="mt-3 mb-4">
              <Text className="text-xs text-ink/60 mb-2">Después de</Text>
              <View className="flex-row flex-wrap gap-2">
                {INACTIVITY_DAY_PRESETS.map((opt) => {
                  const active =
                    notifPrefs.exercise_reminder_days === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleChangeInactivityDays(opt.value)}
                      className={cn(
                        "px-4 py-2 rounded-2xl border",
                        active
                          ? "bg-river-500 border-river-500"
                          : "bg-white border-river-100"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-medium",
                          active ? "text-white" : "text-ink"
                        )}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <ToggleRow
            label="Check-in post-crisis"
            description="Un saludo 24h después de un momento difícil en el chat."
            value={notifPrefs.post_crisis_checkin_enabled}
            onChange={handleTogglePostCrisis}
          />
        </Section>

        {/* Sección: Toggles */}
        <Section title="Ajustes del ejercicio">
          <ToggleRow
            label="Guía por voz"
            description="La app te habla durante los ejercicios"
            value={prefs?.prefers_voice_guidance ?? true}
            onChange={handleToggleVoice}
          />
          <ToggleRow
            label="Vibración"
            description="Pequeñas vibraciones en cada cambio de fase"
            value={prefs?.prefers_haptics ?? true}
            onChange={handleToggleHaptics}
          />
        </Section>

        {/* Sección: Sesión */}
        <Section title="Sesión">
          <Pressable
            onPress={handleSignOut}
            className="p-4 rounded-2xl bg-river-50 border border-river-100"
          >
            <Text className="text-river-900 font-medium text-center">
              Cerrar sesión
            </Text>
          </Pressable>
        </Section>

        {/* Sección: Privacidad */}
        <Section title="Privacidad y datos">
          <Text className="text-sm text-ink/60 mb-4 leading-5">
            Tus datos son tuyos. Puedes ver, exportar o eliminar todo
            cuando quieras.
          </Text>

          <Pressable
            onPress={() => router.push("/my-data")}
            className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
          >
            <Text className="text-river-900 font-medium">Mis datos</Text>
            <Text className="text-xs text-ink/60 mt-0.5">
              Ver, exportar, revocar consentimientos
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/privacy")}
            className="mb-4 p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
          >
            <Text className="text-river-900 font-medium">
              Política de privacidad
            </Text>
            <Text className="text-xs text-ink/60 mt-0.5">
              Cómo tratamos tus datos
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleteAccount.isPending}
            className="p-4 rounded-2xl bg-alert/10 border border-alert/30 active:bg-alert/20"
          >
            <Text className="text-alert font-medium text-center">
              {deleteAccount.isPending
                ? "Eliminando..."
                : "Eliminar mi cuenta"}
            </Text>
          </Pressable>
          <Text className="text-xs text-ink/40 mt-3 leading-4 text-center">
            Cumplimiento Ley 19.628 y Ley 21.719 (Chile)
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

// --- Helpers locales ---

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-10">
      <Text className="text-xs uppercase text-ink/60 font-semibold mb-4 tracking-wider">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-river-100">
      <View className="flex-1 pr-4">
        <Text className="text-base font-medium text-ink">{label}</Text>
        <Text className="text-xs text-ink/60 mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D6E7E7", true: "#4E8B8C" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
