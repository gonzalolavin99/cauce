export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Feeling = "sobrecargado" | "ansioso" | "agitado" | "bloqueado";
export type Mobility = "still" | "seated" | "any";
export type EvidenceLevel = "high" | "moderate" | "emerging";
export type ExerciseCategory =
  | "breathing"
  | "grounding"
  | "distress_tolerance"
  | "sensory"
  | "body";
export type Diagnosis = "tea" | "tdah" | "ansiedad" | "otro" | "ninguno";
export type WasHelpful = "yes" | "somewhat" | "no" | "skipped";
export type MessageRole = "user" | "assistant" | "system";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          birth_year: number | null;
          country: string | null;
          locale: string | null;
          onboarding_completed: boolean;
          onboarding_level: "basic" | "detailed";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_diagnoses: {
        Row: {
          user_id: string;
          diagnosis: Diagnosis;
          self_reported: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          diagnosis: Diagnosis;
          self_reported?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["user_diagnoses"]["Row"]>;
      };
      sensory_preferences: {
        Row: {
          user_id: string;
          calming_inputs: string[];
          triggering_inputs: string[];
          dislikes: string[];
          default_mobility: Mobility;
          default_time_available: number;
          prefers_voice_guidance: boolean;
          prefers_haptics: boolean;
          updated_at: string;
        };
        Insert: { user_id: string } & Partial<
          Omit<Database["public"]["Tables"]["sensory_preferences"]["Row"], "user_id">
        >;
        Update: Partial<
          Database["public"]["Tables"]["sensory_preferences"]["Row"]
        >;
      };
      exercises: {
        Row: {
          id: string;
          name_es: string;
          short_description_es: string | null;
          category: ExerciseCategory;
          duration_seconds: number;
          mobility_required: Mobility;
          evidence_level: EvidenceLevel;
          sources: { title: string; url: string }[];
          targets: Feeling[];
          tags: string[];
          steps: ExerciseStep[];
          audio_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      regulation_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          completed_at: string | null;
          feeling_before: Feeling | null;
          feeling_intensity_before: number | null;
          feeling_intensity_after: number | null;
          exercise_id: string | null;
          was_helpful: WasHelpful | null;
          notes: string | null;
          created_at: string;
        };
        Insert: { user_id: string } & Partial<
          Omit<
            Database["public"]["Tables"]["regulation_sessions"]["Row"],
            "id" | "created_at" | "started_at"
          >
        >;
        Update: Partial<
          Database["public"]["Tables"]["regulation_sessions"]["Row"]
        >;
      };
      mood_logs: {
        Row: {
          id: string;
          user_id: string;
          mood: string | null;
          energy: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: { user_id: string } & Partial<
          Omit<
            Database["public"]["Tables"]["mood_logs"]["Row"],
            "id" | "created_at"
          >
        >;
        Update: Partial<Database["public"]["Tables"]["mood_logs"]["Row"]>;
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
        };
        Insert: { user_id: string; title?: string | null };
        Update: Partial<
          Database["public"]["Tables"]["ai_conversations"]["Row"]
        >;
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          flagged_for_crisis: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          role: MessageRole;
          content: string;
          flagged_for_crisis?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------- Tipos derivados útiles ----------

export type ExerciseStep =
  | { type: "intro"; text: string; seconds: number }
  | { type: "prompt"; text: string; seconds: number }
  | { type: "outro"; text: string; seconds: number }
  | {
      type: "cycle";
      phases: { label: string; seconds: number }[];
      repeat: number;
    };

export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SensoryPreferences =
  Database["public"]["Tables"]["sensory_preferences"]["Row"];
export type RegulationSession =
  Database["public"]["Tables"]["regulation_sessions"]["Row"];