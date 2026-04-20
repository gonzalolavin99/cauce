// NOTA: este archivo es gemelo server-side de
// src/features/ai-advisor/engine/crisis.ts. Mantener sincronizados.
// Se duplica porque el edge function corre en Deno y no puede
// importar desde la carpeta src/ del cliente.

const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid\w*/i,
  /\b(matar(me|nos)|me\s+quiero\s+morir|quiero\s+morir(me)?)/i,
  /\b(quitarme|acabar\s+con)\s+(la\s+vida|mi\s+vida|todo)/i,
  /\bno\s+quiero\s+(vivir|seguir|estar\s+aqu[ií])/i,
  /\b(mejor\s+(muert[oa]|no\s+estar)|no\s+vale\s+la\s+pena\s+(seguir|vivir))/i,
  /\b(pastillas?\s+para\s+(terminar|morir|dormir\s+para\s+siempre))/i,
  /\b(nadie\s+me\s+extra[ñn]ar[íi]a|si\s+no\s+estuviera)/i,
  /\b(termin(ar|o)|acabar)\s+con\s+(esto|todo|mi\s+vida)/i,
  /\b(cortarme|hacerme\s+da[ñn]o|autolesi\w*|lastimarme)/i,
  /\b(quemarme|golpearme)\b/i,
];

export interface CrisisSignal {
  isCrisis: boolean;
  matches: string[];
}

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
