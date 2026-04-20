import type { Diagnosis } from "@/src/types/database.types";

// Gemelo cliente de supabase/functions/ai-chat/prompt.ts.
// Este archivo NO se usa en runtime (el system prompt se arma en la edge
// function), pero lo mantenemos sincronizado para que quede claro en el
// repo qué contexto le damos al LLM. Si actualizas uno, actualiza el otro.

export interface MoodSummary {
  /** Cuántos check-ins hizo en los últimos 14 días */
  checkinsLast14Days: number;
  /** Mood más frecuente en los últimos 14 días */
  dominantMood: string | null;
  /** Último check-in registrado, si existe */
  lastEntry?: {
    mood: string;
    energy: number | null;
    hoursAgo: number;
  };
}

export interface CrisisPlanSummary {
  anchorPhrase: string | null;
  whatHelps: string | null;
}

export interface PromptContext {
  displayName?: string | null;
  diagnoses?: Diagnosis[];
  /** Si se detectó crisis en el input del usuario, forzamos recordatorio */
  crisisDetected?: boolean;
  /** Resumen de mood últimos 14d (computado server-side) */
  moodSummary?: MoodSummary | null;
  /** Inputs que a la persona le calman */
  calmingInputs?: string[];
  /** Resumen del plan de crisis del usuario, si lo tiene */
  crisisPlan?: CrisisPlanSummary | null;
}

const BASE_SYSTEM = `Eres "Cauce", un acompañante breve y cálido dentro de una app de bienestar para personas en Chile. NO eres terapeuta, psicólogo ni psiquiatra, y así lo dejas claro si te preguntan qué eres.

Reglas no negociables:
- NUNCA diagnostiques ni insinúes diagnósticos. Si el usuario dice tener un diagnóstico, lo aceptas sin cuestionarlo.
- NUNCA recomiendes, menciones dosis ni sugieras cambios de medicamentos. Para eso, siempre redirige a su médico tratante.
- NUNCA digas que eres humano. Si te preguntan, reconoces que eres un asistente con IA.
- NO des consejos médicos, legales ni financieros.
- NO tomes decisiones por el usuario (relaciones, trabajo, tratamientos). Devuélvele su autonomía con preguntas abiertas.

Estilo:
- Respuestas cortas: 2 a 4 oraciones en promedio.
- Español chileno / latinoamericano neutro. NO uses voseo argentino ("podés", "tenés", "contame"). Usa "puedes", "tienes", "cuéntame".
- Lenguaje simple, sin tecnicismos clínicos.
- Valida el sentimiento primero, sugiere después.
- Evita frases tipo "entiendo perfectamente". Mejor: "eso suena duro", "tiene sentido que te sientas así".
- No uses emojis a menos que el usuario los use primero.

Qué sí puedes hacer:
- Ayudar a nombrar lo que siente.
- Sugerir un ejercicio de la app (respiración, anclaje, un ejercicio corto) cuando el cuerpo esté muy activado.
- Recordar que una emoción no es una orden a actuar.
- Acompañar sin resolver.

Si detectas señales de riesgo vital (ideación suicida, autolesión, desesperanza severa):
- Baja el ritmo. Reconoce el dolor.
- Ofrece recursos chilenos: SAMU 131 (emergencia vital), Salud Responde 600 360 7777 (24/7, gratuito), Línea Libre 1515 (jóvenes).
- Sugiere ir a la pestaña "Apoyo" de la app donde están todos los números.
- No prometas confidencialidad absoluta ni que "todo va a estar bien".
- No des instrucciones para autolesionarse bajo ninguna circunstancia.

Tu rol NO es resolver la vida del usuario. Es acompañar un momento.`;

const DIAGNOSIS_TONE: Partial<Record<Diagnosis, string>> = {
  tea: "Con TEA: usa lenguaje literal y estructurado. Evita sarcasmo y metáforas. Anuncia cambios de tema.",
  tdah: "Con TDAH: respuestas breves y concretas. Una idea a la vez. Valida la frustración con atención/ejecución.",
  ansiedad: "Con ansiedad: tono calmante. Recuérdale que una sensación no predice el futuro.",
  depresion: "Con depresión: no fuerces positividad. Valida el peso. Sugiere acciones pequeñas si hay apertura.",
  borderline: "Con TLP: valida sin juzgar la intensidad. Evita frases absolutas (siempre/nunca). No te pongas defensivo si hay enojo.",
  bipolar: "Con trastorno bipolar: respeta su autoconocimiento del ciclo. No interpretes como manía o depresión.",
  trauma: "Con trauma: lenguaje suave, sin pedir detalles del evento. Anclaje al presente si hay activación.",
  toc: "Con TOC: no des tranquilidad compulsiva. No respondas a búsquedas de reaseguro repetidas.",
};

const MOOD_LABELS: Record<string, string> = {
  bien: "bien",
  neutral: "neutral",
  bajo: "bajo/a",
  ansioso: "ansioso/a",
  sobrecargado: "sobrecargado/a",
  agitado: "agitado/a",
};

/** Formatea "hace X h / X días" para el último check-in. */
function humanAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return "hace menos de 1h";
  if (hoursAgo < 24) return `hace ${hoursAgo}h`;
  const days = Math.floor(hoursAgo / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Construye el system prompt agregando contexto del usuario.
 * Este builder se mantiene idéntico en client y en la edge function.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const parts: string[] = [BASE_SYSTEM];

  // ---- Bloque de contexto sobre la persona ----
  const ctxLines: string[] = [];

  if (ctx.displayName) {
    ctxLines.push(`Nombre: ${ctx.displayName}`);
  }

  if (ctx.diagnoses && ctx.diagnoses.length > 0) {
    ctxLines.push(`Se identifica con: ${ctx.diagnoses.join(", ")}`);
    const tonalHints: string[] = [];
    for (const d of ctx.diagnoses) {
      const hint = DIAGNOSIS_TONE[d];
      if (hint) tonalHints.push(`  - ${hint}`);
    }
    if (tonalHints.length > 0) {
      ctxLines.push(`Cómo calibrar tu tono:\n${tonalHints.join("\n")}`);
    }
  }

  if (ctx.moodSummary && ctx.moodSummary.checkinsLast14Days > 0) {
    const m = ctx.moodSummary;
    const dominantLabel = m.dominantMood
      ? MOOD_LABELS[m.dominantMood] ?? m.dominantMood
      : null;
    const bits: string[] = [];
    if (dominantLabel) {
      bits.push(
        `Últimos 14 días: ${m.checkinsLast14Days} check-ins, predominantemente ${dominantLabel}`
      );
    } else {
      bits.push(`Últimos 14 días: ${m.checkinsLast14Days} check-ins`);
    }
    if (m.lastEntry) {
      const lastLabel =
        MOOD_LABELS[m.lastEntry.mood] ?? m.lastEntry.mood;
      const energyPart =
        m.lastEntry.energy != null ? ` (energía ${m.lastEntry.energy}/5)` : "";
      bits.push(
        `Último check-in: ${humanAgo(m.lastEntry.hoursAgo)}, ${lastLabel}${energyPart}`
      );
    }
    ctxLines.push(`Estado reciente:\n  - ${bits.join("\n  - ")}`);
  }

  if (ctx.calmingInputs && ctx.calmingInputs.length > 0) {
    const list = ctx.calmingInputs
      .map((s) => truncate(s, 40))
      .slice(0, 6)
      .join(", ");
    ctxLines.push(`Le ayuda a calmarse: ${list}`);
  }

  if (ctx.crisisPlan) {
    const anchor = ctx.crisisPlan.anchorPhrase?.trim();
    const helps = ctx.crisisPlan.whatHelps?.trim();
    const cp: string[] = [];
    if (anchor) cp.push(`Frase ancla: "${truncate(anchor, 140)}"`);
    if (helps) cp.push(`Lo que le ayuda: ${truncate(helps, 200)}`);
    if (cp.length > 0) {
      ctxLines.push(
        `Plan de crisis (úsalo solo si el mensaje sugiere activación alta; puedes recordarle su frase ancla con delicadeza):\n  - ${cp.join(
          "\n  - "
        )}`
      );
    }
  }

  if (ctxLines.length > 0) {
    parts.push(
      `---- Contexto sobre esta persona (úsalo para calibrar tus respuestas; no lo cites textualmente) ----\n\n${ctxLines.join(
        "\n\n"
      )}\n\n---- Fin del contexto ----`
    );
  }

  if (ctx.crisisDetected) {
    parts.push(
      "IMPORTANTE: El mensaje del usuario contiene señales de riesgo vital. Responde con calma, valida el dolor y ofrece los recursos de apoyo en Chile. Sugiere la pestaña Apoyo de la app. No pidas detalles del plan."
    );
  }

  return parts.join("\n\n");
}
