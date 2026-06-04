import { detectCrisis } from "@/src/features/ai-advisor/engine/crisis";
import {
    useActiveConversation,
    useMessages,
    type AiMessage,
} from "@/src/features/ai-advisor/hooks/useAiConversation";
import { useSendMessage } from "@/src/features/ai-advisor/hooks/useSendMessage";
import {
    isCrisisPlanUseful,
    useCrisisPlan,
} from "@/src/features/crisis/hooks/useCrisisPlan";
import {
    resolvePrefs,
    useNotificationPreferences,
} from "@/src/features/notifications/hooks/useNotificationPreferences";
import {
    ensureAndroidChannel,
    hasNotificationPermission,
    schedulePostCrisisCheckin,
} from "@/src/features/notifications/service";
import {
    CONSENT_DESCRIPTIONS,
    CONSENT_LABELS,
} from "@/src/features/privacy/constants";
import {
    useConsents,
    useRecordConsent,
} from "@/src/features/privacy/hooks/useConsents";
import { cn } from "@/src/shared/lib/cn";
import { Button } from "@/src/shared/ui/Button";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { PageHeader } from "@/src/shared/ui/PageHeader";
import { Screen } from "@/src/shared/ui/Screen";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ChatScreen() {
  const router = useRouter();
  const { current, isLoading: consentLoading } = useConsents();
  const recordConsent = useRecordConsent();

  const hasAiConsent = current.isGranted("ai_advisor");

  // Si el usuario aún no consintió IA, mostramos una pantalla previa.
  if (consentLoading) {
    return (
      <Screen>
        <PageHeader title="Asistente" />
        <View style={{ paddingHorizontal: 24 }} className="gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  if (!hasAiConsent) {
    return (
      <AiConsentGate
        onGrant={() =>
          recordConsent.mutate(
            [{ type: "ai_advisor", action: "grant" }],
            {
              onError: (err: Error) =>
                Alert.alert("No se pudo guardar", err.message),
            }
          )
        }
        onClose={() => router.back()}
        isPending={recordConsent.isPending}
      />
    );
  }

  return <ChatBody onClose={() => router.back()} />;
}

// ====================================================================
// Gate de consentimiento IA
// ====================================================================

function AiConsentGate({
  onGrant,
  onClose,
  isPending,
}: {
  onGrant: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const router = useRouter();
  return (
    <Screen>
      <PageHeader
        title="Asistente con IA"
        subtitle="Cauce puede incluir un acompañante conversacional. Para usarlo, necesitamos un consentimiento específico y adicional, porque tus mensajes salen del servidor de Cauce hacia un proveedor de IA."
        onBack={onClose}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>

        <View className="mb-5 p-4 rounded-2xl bg-sand border border-river-100">
          <Text className="font-semibold text-ink mb-2">
            {CONSENT_LABELS.ai_advisor}
          </Text>
          <Text className="text-sm text-ink/70 leading-5">
            {CONSENT_DESCRIPTIONS.ai_advisor}
          </Text>
        </View>

        <View className="mb-6 p-4 rounded-2xl bg-white border border-river-100">
          <Text className="text-sm font-semibold text-ink mb-3">
            Antes de aceptar, ten presente:
          </Text>
          <Bullet>El asistente NO es terapeuta, psicólogo ni psiquiatra.</Bullet>
          <Bullet>
            No diagnostica ni recomienda medicamentos. No sustituye atención
            profesional.
          </Bullet>
          <Bullet>
            Tus mensajes se envían a un proveedor de IA externo (ubicado
            fuera de Chile) para generar la respuesta.
          </Bullet>
          <Bullet>
            Puedes revocar este consentimiento cuando quieras desde
            Perfil → Mis datos.
          </Bullet>
          <Bullet>
            Si estás en crisis vital, ve a la pestaña Apoyo ahora mismo.
          </Bullet>
        </View>

        <Pressable onPress={() => router.push("/privacy")} className="mb-6">
          <Text className="text-river-700 font-medium text-center">
            Leer política de privacidad completa →
          </Text>
        </Pressable>

        <Button onPress={onGrant} loading={isPending}>
          Activar el asistente
        </Button>
      </ScrollView>
    </Screen>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row mb-1.5">
      <Text className="text-sm text-ink/70 leading-5 mr-2">•</Text>
      <Text className="text-sm text-ink/70 leading-5 flex-1">{children}</Text>
    </View>
  );
}

// ====================================================================
// Chat propiamente tal
// ====================================================================

function ChatBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: activeConvId } = useActiveConversation();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const { data: crisisPlanResult } = useCrisisPlan();
  const crisisPlan = crisisPlanResult?.plan ?? null;
  const hasCrisisPlan = isCrisisPlanUseful(crisisPlan);
  const { data: rawNotifPrefs } = useNotificationPreferences();
  const notifPrefs = resolvePrefs(rawNotifPrefs);

  const [input, setInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );
  const scrollRef = useRef<ScrollView | null>(null);

  // Sincronizar conversación activa al montar
  useEffect(() => {
    if (activeConvId && !conversationId) setConversationId(activeConvId);
  }, [activeConvId, conversationId]);

  // Auto-scroll al final cuando llegan mensajes nuevos o cuando el usuario
  // acaba de enviar un mensaje (optimista).
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(t);
  }, [messages?.length, sendMessage.isPending, pendingUserMessage]);

  const inputCrisis = useMemo(() => detectCrisis(input), [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sendMessage.isPending) return;

    Haptics.selectionAsync().catch(() => {});

    // Respuesta optimista: limpiamos el input y mostramos el mensaje del
    // usuario inmediatamente. Cuando el servidor responde, invalidamos la
    // query de mensajes y el bubble optimista se reemplaza por el persistido.
    setInput("");
    setPendingUserMessage(trimmed);

    sendMessage.mutate(
      { conversationId, message: trimmed },
      {
        onSuccess: (data) => {
          setConversationId(data.conversation_id);
          setPendingUserMessage(null);
          if (data.flagged_for_crisis) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            ).catch(() => {});

            // Check-in 24h después, sólo si la persona lo activó en ajustes.
            if (notifPrefs.post_crisis_checkin_enabled) {
              void (async () => {
                try {
                  const granted = await hasNotificationPermission();
                  if (!granted) return;
                  await ensureAndroidChannel();
                  await schedulePostCrisisCheckin();
                } catch {
                  // silent — no bloqueamos el chat por esto
                }
              })();
            }
          }
        },
        onError: (err: Error) => {
          // Si falló, devolvemos el texto al input para que pueda reintentar.
          setPendingUserMessage(null);
          setInput(trimmed);

          // SEC-3 M4: mapear códigos del server a mensajes en español.
          // Nunca mostramos el .message crudo porque puede filtrar tokens
          // técnicos ("rate_limited", "invalid_conversation_id") que no son
          // útiles para el usuario.
          const code = err.message ?? "";
          if (code === "ai_consent_missing") {
            Alert.alert(
              "Consentimiento requerido",
              "Necesitamos tu consentimiento para usar el asistente con IA."
            );
            return;
          }
          if (code === "rate_limited") {
            Alert.alert(
              "Muchos mensajes seguidos",
              "Has mandado varios mensajes en poco tiempo. Descansa unos minutos y vuelve a intentar."
            );
            return;
          }
          if (code === "message_too_long") {
            Alert.alert(
              "Mensaje muy largo",
              "Intenta con un mensaje más corto."
            );
            return;
          }
          if (code === "invalid_conversation_id") {
            Alert.alert(
              "Conversación inválida",
              "No pudimos identificar esta conversación. Intenta abrir una nueva."
            );
            return;
          }
          if (code.startsWith("llm_timeout_")) {
            Alert.alert(
              "El asistente está lento",
              "No obtuvimos respuesta a tiempo. Intenta de nuevo en un momento."
            );
            return;
          }
          Alert.alert(
            "No se pudo enviar",
            "Intenta de nuevo en un momento."
          );
        },
      }
    );
  }

  function handleGoToSupport() {
    Haptics.selectionAsync().catch(() => {});
    router.replace("/(tabs)/support");
  }

  const hasMessages = (messages?.length ?? 0) > 0;
  const showCrisisBanner = inputCrisis.isCrisis;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        {/* Header compacto sticky: el chat necesita el header pegado y con
            borde visible, por eso no usamos el PageHeader generoso acá. */}
        <View className="px-5 pt-3 pb-3 border-b border-river-100 flex-row items-center bg-white/60">
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="w-10 h-10 rounded-full items-center justify-center bg-river-50 active:bg-river-100 mr-3"
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color="#2E5F60" />
          </Pressable>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="w-10 h-10 rounded-2xl bg-river-500 items-center justify-center mr-3"
          >
            <Text className="text-white text-xl">🫧</Text>
          </View>
          <View
            accessibilityRole="header"
            accessible
            accessibilityLabel="Asistente Cauce. Asistente con IA, no es terapia."
            className="flex-1"
          >
            <Text className="text-base font-bold text-ink">Asistente Cauce</Text>
            <View className="flex-row items-center mt-0.5">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="w-1.5 h-1.5 rounded-full bg-river-500 mr-1.5"
              />
              <Text className="text-xs text-ink/60">IA · no es terapia</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer permanente */}
        <View className="px-6 py-3 bg-sand border-b border-river-100">
          <Text className="text-xs text-ink/70 leading-4">
            Esto es un acompañamiento, no diagnóstico ni tratamiento. Si
            estás en crisis, ve a{" "}
            <Text
              onPress={handleGoToSupport}
              className="text-river-900 font-semibold underline"
            >
              Apoyo
            </Text>
            .
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          )}

          {!isLoading && !hasMessages && <ChatWelcome />}

          {messages?.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

          {/* Bubble optimista del usuario mientras el servidor procesa */}
          {pendingUserMessage && (
            <View className="my-1 max-w-[85%] px-4 py-3 rounded-2xl self-end bg-river-500">
              <Text className="text-sm leading-5 text-white">
                {pendingUserMessage}
              </Text>
            </View>
          )}

          {sendMessage.isPending && (
            <View
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel="El asistente está pensando"
              className="my-2 px-4 py-3 rounded-2xl self-start bg-river-50 border border-river-100"
            >
              <Text className="text-sm text-ink/50">Pensando…</Text>
            </View>
          )}
        </ScrollView>

        {/* Banner de crisis in-input */}
        {showCrisisBanner && (
          <View className="mx-4 mb-2 p-3 rounded-2xl bg-alert/10 border border-alert/30">
            <Text className="text-sm text-alert font-semibold mb-1">
              Estamos leyendo señales de riesgo.
            </Text>
            <Text className="text-xs text-ink/70 leading-4 mb-2">
              Si estás en una crisis, te recomendamos ir a Apoyo ahora. El
              asistente puede acompañar pero no reemplaza ayuda especializada.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleGoToSupport}
                accessibilityRole="button"
                accessibilityLabel="Ir a Apoyo"
                accessibilityHint="Abre la pestaña de apoyo con números de emergencia"
                className="px-3 py-2 rounded-xl bg-alert"
              >
                <Text className="text-white text-sm font-semibold">
                  Ir a Apoyo
                </Text>
              </Pressable>
              {hasCrisisPlan && (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push("/crisis-plan");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver mi plan de crisis"
                  className="px-3 py-2 rounded-xl bg-white border border-alert/40"
                >
                  <Text className="text-alert text-sm font-semibold">
                    Ver mi plan
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-end gap-2 px-4 py-3 border-t border-river-100 bg-white">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Cuéntame cómo estás…"
            placeholderTextColor="rgba(0,0,0,0.4)"
            multiline
            maxLength={4000}
            className="flex-1 px-4 py-3 rounded-2xl border border-river-100 bg-white text-ink"
            style={{ minHeight: 44, maxHeight: 120, textAlignVertical: "top" }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityState={{
              disabled: !input.trim() || sendMessage.isPending,
              busy: sendMessage.isPending,
            }}
            className={cn(
              "px-4 py-3 rounded-2xl",
              !input.trim() || sendMessage.isPending
                ? "bg-river-100"
                : "bg-river-500 active:bg-river-700"
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                !input.trim() || sendMessage.isPending
                  ? "text-ink/50"
                  : "text-white"
              )}
            >
              Enviar
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ChatWelcome() {
  return (
    <View className="px-2 pt-6">
      <EmptyState
        variant="warm"
        icon="chatbubbles-outline"
        title="¿Cómo te puedo acompañar?"
        description="Cuéntame qué estás sintiendo. Voy a escuchar y, si sirve, te voy a sugerir algo pequeño. Respuestas cortas, sin diagnósticos."
      />
    </View>
  );
}

const MessageBubble = memo(function MessageBubble({
  msg,
}: {
  msg: AiMessage;
}) {
  const isUser = msg.role === "user";
  return (
    <View
      className={cn(
        "my-1 max-w-[85%] px-4 py-3 rounded-2xl",
        isUser
          ? "self-end bg-river-500"
          : "self-start bg-river-50 border border-river-100"
      )}
    >
      <Text
        className={cn(
          "text-sm leading-5",
          isUser ? "text-white" : "text-ink"
        )}
      >
        {msg.content}
      </Text>
      {msg.flagged_for_crisis && !isUser && (
        <Text className="text-xs text-alert mt-2">
          Mensaje marcado como sensible
        </Text>
      )}
    </View>
  );
});
