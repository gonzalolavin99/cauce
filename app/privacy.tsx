import {
  DATA_CONTROLLER,
  PRIVACY_POLICY_VERSION,
} from "@/src/features/privacy/constants";
import { Screen } from "@/src/shared/ui/Screen";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold text-ink flex-1 pr-4">
            Política de privacidad
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-3 py-2 rounded-xl bg-river-50"
          >
            <Text className="text-river-900 font-medium">Cerrar</Text>
          </Pressable>
        </View>

        <Text className="text-xs text-ink/50 mb-8">
          Versión {PRIVACY_POLICY_VERSION} · Chile
        </Text>

        <Section title="1. Responsable del tratamiento">
          <Paragraph>
            {DATA_CONTROLLER.name} es responsable del tratamiento de tus
            datos personales en Chile. Contacto para consultas de privacidad:{" "}
            <Text className="font-medium text-ink">
              {DATA_CONTROLLER.email}
            </Text>
            .
          </Paragraph>
        </Section>

        <Section title="2. Qué datos tratamos">
          <Bullet>Datos de cuenta: correo electrónico, nombre visible.</Bullet>
          <Bullet>
            Datos sensibles de salud mental (Art. 2 letra g, Ley 19.628 y
            Art. 16 Ley 21.719): diagnósticos auto-reportados, estados de
            ánimo, sesiones de regulación, notas que escribes.
          </Bullet>
          <Bullet>
            Preferencias sensoriales, movilidad, tiempo disponible habitual.
          </Bullet>
          <Bullet>
            Datos técnicos mínimos (plataforma, sistema operativo) para
            auditoría de consentimiento.
          </Bullet>
          <Bullet>
            Conversaciones con el asistente de IA — solo si activas ese
            consentimiento por separado.
          </Bullet>
        </Section>

        <Section title="3. Base legal">
          <Paragraph>
            El tratamiento se basa en tu{" "}
            <Text className="font-medium text-ink">
              consentimiento libre, específico, informado e inequívoco
            </Text>
            , registrado con fecha, hora y versión de esta política. Para
            datos sensibles aplicamos consentimiento expreso conforme a la
            Ley 19.628 y los estándares reforzados de la Ley 21.719.
          </Paragraph>
        </Section>

        <Section title="4. Finalidades">
          <Bullet>
            Recomendarte ejercicios de regulación adaptados a tu perfil.
          </Bullet>
          <Bullet>Mostrarte tu historial de mood y sesiones.</Bullet>
          <Bullet>
            Si activas IA: responder tus mensajes con un asistente
            conversacional acotado.
          </Bullet>
          <Bullet>
            No usamos tus datos para publicidad ni los vendemos a terceros.
          </Bullet>
        </Section>

        <Section title="5. Destinatarios y proveedores">
          <Bullet>
            <Text className="font-medium text-ink">Supabase</Text> (base de
            datos y autenticación). Servidores en infraestructura cloud
            internacional. Cifrado en tránsito y en reposo.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">Proveedor de IA</Text> (si
            lo activas): procesará tus mensajes para generar respuestas. No
            los usa para entrenar modelos si configuramos la opción
            correspondiente.
          </Bullet>
          <Bullet>
            No compartimos tus datos con otros terceros sin tu consentimiento
            expreso.
          </Bullet>
        </Section>

        <Section title="6. Transferencia internacional">
          <Paragraph>
            Algunos servidores están fuera de Chile. Trabajamos con
            proveedores que adoptan garantías equivalentes (cifrado,
            contratos de tratamiento, certificaciones). Puedes oponerte a
            esta transferencia; en ese caso no podremos ofrecerte los
            servicios que la requieran.
          </Paragraph>
        </Section>

        <Section title="7. Conservación">
          <Paragraph>
            Conservamos tus datos mientras mantengas tu cuenta activa. Al
            eliminar la cuenta borramos inmediatamente perfil, diagnósticos,
            preferencias, sesiones, mood logs y conversaciones. Los eventos
            de consentimiento se conservan solo para auditoría legal y luego
            se eliminan en cascada.
          </Paragraph>
        </Section>

        <Section title="8. Tus derechos (ARCOPP)">
          <Bullet>
            <Text className="font-medium text-ink">Acceso</Text>: ver todos
            tus datos desde Perfil → Mis datos.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">Rectificación</Text>:
            editar nombre, diagnósticos, preferencias.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">Cancelación</Text>:
            eliminar tu cuenta entera desde Perfil.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">Oposición</Text>: revocar
            cualquier consentimiento en cualquier momento.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">Portabilidad</Text>:
            descargar tus datos en JSON desde Perfil → Mis datos.
          </Bullet>
          <Bullet>
            <Text className="font-medium text-ink">No-automatización</Text>:
            no tomamos decisiones automatizadas con efectos jurídicos sobre
            ti.
          </Bullet>
        </Section>

        <Section title="9. Seguridad">
          <Bullet>Cifrado en tránsito (HTTPS/TLS).</Bullet>
          <Bullet>Cifrado en reposo a nivel de base de datos.</Bullet>
          <Bullet>
            Row Level Security: cada usuario solo accede a sus propios
            datos.
          </Bullet>
          <Bullet>
            En caso de brecha notificaremos según Art. 14 quinquies de la
            Ley 21.719 (72 horas).
          </Bullet>
        </Section>

        <Section title="10. Menores de edad">
          <Paragraph>
            Si tienes menos de 14 años necesitas autorización de tu
            tutor/a. Si tienes entre 14 y 18, puedes consentir tú mismo/a
            para tratamiento general, pero recomendamos conversarlo con un
            adulto de confianza.
          </Paragraph>
        </Section>

        <Section title="11. No sustituye atención profesional">
          <Paragraph>
            Cauce es una herramienta de bienestar, no un servicio médico.
            No diagnosticamos, no medicamos y no reemplazamos psicoterapia
            ni atención psiquiátrica. Si estás en crisis, usa la pestaña
            Apoyo.
          </Paragraph>
        </Section>

        <Section title="12. Cambios a esta política">
          <Paragraph>
            Si cambiamos algo sustantivo incrementamos la versión y te
            pedimos re-consentir antes de seguir usando la app.
          </Paragraph>
        </Section>

        <Section title="13. Legislación y autoridad">
          <Paragraph>
            Aplican la Ley 19.628 sobre Protección de la Vida Privada y la
            Ley 21.719 de Protección de Datos Personales. La autoridad
            competente en Chile es la Agencia de Protección de Datos
            Personales.
          </Paragraph>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-8">
      <Text className="text-lg font-semibold text-ink mb-2">{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm text-ink/80 leading-6">{children}</Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row mb-2">
      <Text className="text-sm text-ink/80 leading-6 mr-2">•</Text>
      <Text className="text-sm text-ink/80 leading-6 flex-1">{children}</Text>
    </View>
  );
}
