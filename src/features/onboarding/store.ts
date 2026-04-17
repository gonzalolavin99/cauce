import type { Diagnosis } from "@/src/types/database.types";
import { create } from "zustand";

interface OnboardingState {
  diagnoses: Diagnosis[];
  calming_inputs: string[];
  triggering_inputs: string[];
  default_time_available: number;
  default_mobility: "still" | "seated" | "any";
  prefers_voice_guidance: boolean;
  prefers_haptics: boolean;
  setDiagnoses: (d: Diagnosis[]) => void;
  setCalming: (c: string[]) => void;
  setTriggering: (t: string[]) => void;
  setTime: (n: number) => void;
  setMobility: (m: "still" | "seated" | "any") => void;
  setVoice: (v: boolean) => void;
  setHaptics: (h: boolean) => void;
  reset: () => void;
}

const initial = {
  diagnoses: [] as Diagnosis[],
  calming_inputs: [] as string[],
  triggering_inputs: [] as string[],
  default_time_available: 5,
  default_mobility: "any" as const,
  prefers_voice_guidance: true,
  prefers_haptics: true,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  setDiagnoses: (diagnoses) => set({ diagnoses }),
  setCalming: (calming_inputs) => set({ calming_inputs }),
  setTriggering: (triggering_inputs) => set({ triggering_inputs }),
  setTime: (default_time_available) => set({ default_time_available }),
  setMobility: (default_mobility) => set({ default_mobility }),
  setVoice: (prefers_voice_guidance) => set({ prefers_voice_guidance }),
  setHaptics: (prefers_haptics) => set({ prefers_haptics }),
  reset: () => set(initial),
}));