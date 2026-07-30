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
    DIAGNOSIS_OPTIONS,
    TRIGGERING_INPUTS,
} from "@/src/features/onboarding/data/options";
import {
    authenticate,
    isAppLockEnabled,
    isBiometricAvailable,
    isScreenPrivacyEnabled,
    setAppLockEnabled,
    setScreenPrivacyEnabled,
} from "@/src/features/privacy/lib/appLock";
import { useDeleteAccount } from "@/src/features/profile/hooks/useDeleteAccount";
import { useDiagnoses } from "@/src/features/profile/hooks/useDiagnoses";
import {
    useProfile,
    useSensoryPreferences,
} from "@/src/features/profile/hooks/useProfile";
import {
    useUpdateDiagnoses,
    useUpdatePreferences,
    useUpdateProfile,
} from "@/src/features/profile/hooks/useUpdateProfile";
import { cn } from "@/src/shared/lib/cn";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/src/shared/theme/themeMode";
import { useRiverColor } from "@/src/shared/theme/useRiverColor";
import { showAlert } from "@/src/shared/ui/alert";
import { Avatar, initialsFrom } from "@/src/shared/ui/Avatar";
import { Button } from "@/src/shared/ui/Button";
import { Card } from "@/src/shared/ui/Card";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Input } from "@/src/shared/ui/Input";
import { ListRow } from "@/src/shared/ui/ListRow";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import { showToast } from "@/src/shared/ui/toast";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import type { Diagnosis, Mobility } from "@/src/types/database.types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";

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

function ProfileScreen() {
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

  // Apariencia (3.1): preferencia local por dispositivo.
  const [themeMode, setLocalThemeMode] = useState<ThemeMode>("system");
  useEffect(() => {
    let alive = true;
    getThemeMode().then((m) => {
      if (alive) setLocalThemeMode(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  function handleThemeMode(mode: ThemeMode) {
    setLocalThemeMode(mode);
    setThemeMode(mode);
  }

  // Protección en el dispositivo (1.7): preferencias locales, no van a la BD.
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appLockOn, setAppLockOn] = useState(false);
  const [screenPrivacyOn, setScreenPrivacyOn] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let alive = true;
    Promise.all([
      isBiometricAvailable(),
      isAppLockEnabled(),
      isScreenPrivacyEnabled(),
    ]).then(([avail, lock, screen]) => {
      if (!alive) return;
      setBiometricAvailable(avail);
      setAppLockOn(lock);
      setScreenPrivacyOn(screen);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function handleToggleAppLock(value: boolean) {
    // Pedimos biometría ANTES de cambiar el estado: activa solo quien puede
    // desbloquear, y desactiva solo quien acredita ser el dueño.
    const ok = await authenticate();
    if (!ok) return;
    await setAppLockEnabled(value);
    setAppLockOn(value);
  }

  async function handleToggleScreenPrivacy(value: boolean) {
    await setScreenPrivacyEnabled(value);
    setScreenPrivacyOn(value);
  }

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
        onSuccess: () => showToast("Tu nombre fue actualizado"),
        onError: (err: Error) =>
          showAlert("Error", err.message),
      }
    );
  }

  function handleSaveDiagnoses() {
    updateDiagnoses.mutate(localDiagnoses, {
      onSuccess: () => showToast("Tus diagnósticos fueron actualizados"),
      onError: (err: Error) => showAlert("Error", err.message),
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
          showToast("Tus preferencias fueron actualizadas"),
        onError: (err: Error) => showAlert("Error", err.message),
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
    // Solo pedimos permiso cuando las notificaciones están disponibles
    // (dev build native). En web / Expo Go el usuario igual puede guardar
    // la preferencia; los recordatorios simplemente no se programan.
    if (value && isNotificationsAvailable()) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        showAlert(
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
        onError: (err: Error) => showAlert("Error", err.message),
      }
    );
  }

  function handleChangeCheckinHour(hour: number) {
    upsertNotifPrefs.mutate(
      { daily_checkin_hour: hour, daily_checkin_minute: 0 },
      { onError: (err: Error) => showAlert("Error", err.message) }
    );
  }

  async function handleToggleExerciseReminder(value: boolean) {
    if (value && isNotificationsAvailable()) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        showAlert(
          "Permiso requerido",
          "Para enviarte recordatorios necesitamos permiso de notificaciones."
        );
        return;
      }
      await ensureAndroidChannel();
    }
    upsertNotifPrefs.mutate(
      { exercise_reminder_enabled: value },
      { onError: (err: Error) => showAlert("Error", err.message) }
    );
  }

  function handleChangeInactivityDays(days: number) {
    upsertNotifPrefs.mutate(
      { exercise_reminder_days: days },
      { onError: (err: Error) => showAlert("Error", err.message) }
    );
  }

  async function handleTogglePostCrisis(value: boolean) {
    if (value && isNotificationsAvailable()) {
      const granted = await ensureNotificationPermission();
      setNotifPermissionGranted(granted);
      if (!granted) {
        showAlert(
          "Permiso requerido",
          "Para enviarte recordatorios necesitamos permiso de notificaciones."
        );
        return;
      }
      await ensureAndroidChannel();
    }
    upsertNotifPrefs.mutate(
      { post_crisis_checkin_enabled: value },
      { onError: (err: Error) => showAlert("Error", err.message) }
    );
  }

  function handleSignOut() {
    showAlert("¿Cerrar sesión?", "Tendrás que volver a ingresar.", [
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
    showAlert(
      "¿Eliminar cuenta?",
      "Esto borra permanentemente tu información: sesiones, preferencias, diagnósticos e historial. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            // Segunda confirmación para prevenir tap accidental
            showAlert(
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
                        showAlert(
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

  const greeting =
    profile?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "tú";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64 }}>
        {/* Header con avatar */}
        <View className="flex-row items-center gap-4 mb-8">
          <Avatar
            initials={initialsFrom(profile?.display_name ?? user?.email)}
            size="xl"
            tone="river"
          />
          <View className="flex-1">
            <Text className="text-xs uppercase text-ink/70 font-semibold tracking-wider mb-1">
              Hola
            </Text>
            <Text
              className="text-2xl font-bold text-ink"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {greeting}
            </Text>
            <Text
              className="text-xs text-ink/70 mt-0.5"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Sección: Info básica */}
        <View className="mb-10">
          <SectionHeader label="Información" icon="person-outline" />
          <Input
            label="Nombre"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Cómo quieres que te llamemos"
            autoCapitalize="words"
          />
          <Button
            variant="secondary"
            onPress={handleSaveName}
            loading={updateProfile.isPending}
          >
            Guardar nombre
          </Button>
        </View>

        {/* Sección: Diagnósticos */}
        <View className="mb-10">
          <SectionHeader label="Cómo me identifico" icon="flower-outline" />
          <Text className="text-sm text-ink/70 mb-4 leading-5">
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
        </View>

        {/* Sección: Preferencias sensoriales */}
        <View className="mb-10">
          <SectionHeader label="Lo que me calma" icon="sparkles-outline" />
          <ChipSelector<string>
            options={CALMING_INPUTS}
            selected={localCalming}
            onChange={setLocalCalming}
            allowCustom
            addPlaceholder="Ej: abrazar a mi perro"
          />
        </View>

        <View className="mb-10">
          <SectionHeader label="Lo que me desregula" icon="flash-outline" />
          <ChipSelector<string>
            options={TRIGGERING_INPUTS}
            selected={localTriggering}
            onChange={setLocalTriggering}
            allowCustom
            addPlaceholder="Ej: recuerdos, ruido de la ciudad"
          />
        </View>

        {/* Sección: Tiempo y movilidad */}
        <View className="mb-10">
          <SectionHeader label="Tiempo disponible habitual" icon="time-outline" />
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
        </View>

        <View className="mb-10">
          <SectionHeader label="Movilidad habitual" icon="walk-outline" />
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
        </View>

        {/* Sección: Tus patrones (insights) */}
        <View className="mb-10">
          <SectionHeader label="Tus patrones" icon="pulse-outline" />
          <ListRow
            title="Ver mis patrones"
            subtitle="Check-ins, mood predominante, ejercicios usados"
            icon="analytics-outline"
            onPress={() => router.push("/insights")}
          />
        </View>

        {/* Sección: Recordatorios */}
        <View className="mb-10">
          <SectionHeader label="Recordatorios" icon="notifications-outline" />
          <Text className="text-sm text-ink/70 mb-4 leading-5">
            Notificaciones suaves, sólo en tu teléfono. Todo apagado por
            defecto — eliges qué te hace sentido.
          </Text>

          {!isNotificationsAvailable() && (
            <Card variant="warm" className="mb-4">
              <Text className="text-xs text-ink/70 leading-4">
                Las notificaciones requieren una versión de desarrollo de la
                app (dev build). En la versión actual puedes guardar tus
                preferencias, pero los recordatorios no se programan todavía.
              </Text>
            </Card>
          )}

          {isNotificationsAvailable() && notifPermissionGranted === false && (
            <Card variant="warm" className="mb-4">
              <Text className="text-xs text-ink/70 leading-5">
                No tenemos permiso de notificaciones. Al activar un
                recordatorio te lo pediremos; si lo bloqueaste, tendrás
                que habilitarlo desde los ajustes del teléfono.
              </Text>
            </Card>
          )}

          <ToggleRow
            label="Check-in diario"
            description="Te recordamos anotar cómo estás una vez al día."
            value={notifPrefs.daily_checkin_enabled}
            onChange={handleToggleDailyCheckin}
          />

          {notifPrefs.daily_checkin_enabled && (
            <View className="mt-3 mb-4">
              <Text className="text-xs text-ink/70 mb-2">Hora</Text>
              <ChipSelector<string>
                options={CHECKIN_HOUR_PRESETS.map((o) => ({
                  value: String(o.value),
                  label: o.label,
                }))}
                selected={[String(notifPrefs.daily_checkin_hour)]}
                onChange={(next) => {
                  if (next[0]) handleChangeCheckinHour(Number(next[0]));
                }}
                multi={false}
              />
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
              <Text className="text-xs text-ink/70 mb-2">Después de</Text>
              <ChipSelector<string>
                options={INACTIVITY_DAY_PRESETS.map((o) => ({
                  value: String(o.value),
                  label: o.label,
                }))}
                selected={[String(notifPrefs.exercise_reminder_days)]}
                onChange={(next) => {
                  if (next[0]) handleChangeInactivityDays(Number(next[0]));
                }}
                multi={false}
              />
            </View>
          )}

          <ToggleRow
            label="Check-in post-crisis"
            description="Un saludo 24h después de un momento difícil en el chat."
            value={notifPrefs.post_crisis_checkin_enabled}
            onChange={handleTogglePostCrisis}
          />
        </View>

        {/* Sección: Toggles */}
        <View className="mb-10">
          <SectionHeader
            label="Ajustes del ejercicio"
            icon="options-outline"
          />
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
        </View>

        {/* Sección: Apariencia (3.1) */}
        <View className="mb-10">
          <SectionHeader label="Apariencia" icon="moon-outline" />
          <View className="flex-row gap-2">
            {(
              [
                { value: "system", label: "Sistema" },
                { value: "light", label: "Claro" },
                { value: "dark", label: "Oscuro" },
              ] as const
            ).map((opt) => {
              const active = themeMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleThemeMode(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Tema ${opt.label}`}
                  className={cn(
                    "flex-1 py-3 rounded-2xl border items-center",
                    active
                      ? "bg-river-500 border-river-500"
                      : "bg-surface border-river-100"
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

        {/* Sección: Privacidad y datos */}
        <View className="mb-10">
          <SectionHeader
            label="Privacidad y datos"
            icon="shield-checkmark-outline"
          />
          <Text className="text-sm text-ink/70 mb-4 leading-5">
            Tus datos son tuyos. Puedes ver, exportar o eliminar todo
            cuando quieras.
          </Text>

          {/* Protección en el dispositivo: solo nativo (en web no existe
              biometría de app ni FLAG_SECURE) */}
          {Platform.OS !== "web" && (
            <View className="mb-4">
              {biometricAvailable && (
                <ToggleRow
                  label="Bloqueo con huella o rostro"
                  description="Pide tu biometría al abrir la app o tras 2 min en segundo plano"
                  value={appLockOn}
                  onChange={handleToggleAppLock}
                />
              )}
              <ToggleRow
                label="Privacidad de pantalla"
                description="Bloquea capturas de pantalla y oculta la app en recientes (Android)"
                value={screenPrivacyOn}
                onChange={handleToggleScreenPrivacy}
              />
            </View>
          )}

          <View className="gap-3">
            <ListRow
              title="Mis datos"
              subtitle="Ver, exportar, revocar consentimientos"
              icon="document-text-outline"
              onPress={() => router.push("/my-data")}
            />
            <ListRow
              title="Política de privacidad"
              subtitle="Cómo tratamos tus datos"
              icon="book-outline"
              onPress={() => router.push("/privacy")}
            />
          </View>
        </View>

        {/* Sección: Cuenta */}
        <View className="mb-6">
          <SectionHeader label="Cuenta" icon="key-outline" />
          <View className="gap-3">
            <ListRow
              title="Cerrar sesión"
              icon="log-out-outline"
              onPress={handleSignOut}
              showChevron={false}
            />
            <ListRow
              title={
                deleteAccount.isPending
                  ? "Eliminando..."
                  : "Eliminar mi cuenta"
              }
              subtitle="Borra toda tu información permanentemente"
              icon="trash-outline"
              tone="destructive"
              onPress={handleDeleteAccount}
              disabled={deleteAccount.isPending}
              showChevron={false}
            />
          </View>
        </View>

        <Text className="text-xs text-ink/40 mt-2 leading-4 text-center">
          Cumplimiento Ley 19.628 y Ley 21.719 (Chile)
        </Text>
      </ScrollView>
    </Screen>
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
  const trackOff = useRiverColor(100);
  const trackOn = useRiverColor(500);
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-river-100">
      <View className="flex-1 pr-4">
        <Text className="text-base font-medium text-ink">{label}</Text>
        <Text className="text-xs text-ink/70 mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: trackOff, true: trackOn }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default withErrorBoundary(ProfileScreen, { source: "profile" });
