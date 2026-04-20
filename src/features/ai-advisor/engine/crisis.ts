/**
 * Detector de señales de crisis vital en el texto del usuario.
 *
 * Estrategia: regex en español chileno/neutro sobre frases explícitas
 * de ideación suicida, autolesión y desesperanza severa. Es intencionalmente
 * sensible — preferimos falsos positivos (que muestran recursos de apoyo)
 * sobre falsos negativos (que omiten ayuda cuando la persona la necesita).
 *
 * Este módulo debe mantenerse en sincronía con su gemelo server-side en
 * supabase/functions/ai-chat/crisis.ts (copia idéntica sin imports).
 */

const CRISIS_PATTERNS: RegExp[] = [
  // suicidio / ideación directa
  /\bsuicid\w*/i,
  /\b(matar(me|nos)|me\s+quiero\s+morir|quiero\s+morir(me)?)/i,
  /\b(quitarme|acabar\s+con)\s+(la\s+vida|mi\s+vida|todo)/i,
  /\bno\s+quiero\s+(vivir|seguir|estar\s+aqu[ií])/i,
  /\b(mejor\s+(muert[oa]|no\s+estar)|no\s+vale\s+la\s+pena\s+(seguir|vivir))/i,
  /\b(pastillas?\s+para\s+(terminar|morir|dormir\s+para\s+siempre))/i,
  /\b(nadie\s+me\s+extra[ñn]ar[íi]a|si\s+no\s+estuviera)/i,
  /\b(termin(ar|o)|acabar)\s+con\s+(esto|todo|mi\s+vida)/i,

  // autolesión
  /\b(cortarme|hacerme\s+da[ñn]o|autolesi\w*|lastimarme)/i,
  /\b(quemarme|golpearme)\b/i,
];

export interface CrisisSignal {
  isCrisis: boolean;
  /** Fragmentos del texto que dispararon la detección (para auditoría) */
  matches: string[];
}

/**
 * Devuelve una señal de crisis si el texto contiene frases de riesgo.
 * No intenta diagnosticar ni juzgar: solo es un filtro de primera línea.
 */
export function detectCrisis(text: string): CrisisSignal {
  if (!text || typeof text !== "string") {
    return { isCrisis: false, matches: [] };
  }
  const matches: string[] = [];
  for (const pattern of CRISIS_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[0]) matches.push(m[0].toLowerCase());
  }
  return { isCrisis: matches.length > 0, matches };
}
