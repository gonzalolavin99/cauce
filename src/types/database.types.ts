export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          flagged_for_crisis: boolean | null
          id: string
          role: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          flagged_for_crisis?: boolean | null
          id?: string
          role?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          flagged_for_crisis?: boolean | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          active: boolean | null
          audio_url: string | null
          category: string | null
          created_at: string | null
          duration_seconds: number
          evidence_level: string | null
          id: string
          mobility_required: string | null
          name_es: string
          short_description_es: string | null
          sources: Json | null
          steps: Json
          tags: Json | null
          targets: Json | null
        }
        Insert: {
          active?: boolean | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          duration_seconds: number
          evidence_level?: string | null
          id: string
          mobility_required?: string | null
          name_es: string
          short_description_es?: string | null
          sources?: Json | null
          steps: Json
          tags?: Json | null
          targets?: Json | null
        }
        Update: {
          active?: boolean | null
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          duration_seconds?: number
          evidence_level?: string | null
          id?: string
          mobility_required?: string | null
          name_es?: string
          short_description_es?: string | null
          sources?: Json | null
          steps?: Json
          tags?: Json | null
          targets?: Json | null
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string | null
          energy: number | null
          id: string
          mood: string | null
          note: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          energy?: number | null
          id?: string
          mood?: string | null
          note?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          energy?: number | null
          id?: string
          mood?: string | null
          note?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_year: number | null
          country: string | null
          created_at: string | null
          display_name: string | null
          id: string
          locale: string | null
          onboarding_completed: boolean | null
          onboarding_level: string | null
          updated_at: string | null
        }
        Insert: {
          birth_year?: number | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          locale?: string | null
          onboarding_completed?: boolean | null
          onboarding_level?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_year?: number | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          locale?: string | null
          onboarding_completed?: boolean | null
          onboarding_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regulation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          exercise_id: string | null
          feeling_before: string | null
          feeling_intensity_after: number | null
          feeling_intensity_before: number | null
          id: string
          notes: string | null
          started_at: string | null
          user_id: string | null
          was_helpful: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          exercise_id?: string | null
          feeling_before?: string | null
          feeling_intensity_after?: number | null
          feeling_intensity_before?: number | null
          id?: string
          notes?: string | null
          started_at?: string | null
          user_id?: string | null
          was_helpful?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          exercise_id?: string | null
          feeling_before?: string | null
          feeling_intensity_after?: number | null
          feeling_intensity_before?: number | null
          id?: string
          notes?: string | null
          started_at?: string | null
          user_id?: string | null
          was_helpful?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulation_sessions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensory_preferences: {
        Row: {
          calming_inputs: Json | null
          default_mobility: string | null
          default_time_available: number | null
          dislikes: Json | null
          prefers_haptics: boolean | null
          prefers_voice_guidance: boolean | null
          triggering_inputs: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calming_inputs?: Json | null
          default_mobility?: string | null
          default_time_available?: number | null
          dislikes?: Json | null
          prefers_haptics?: boolean | null
          prefers_voice_guidance?: boolean | null
          triggering_inputs?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calming_inputs?: Json | null
          default_mobility?: string | null
          default_time_available?: number | null
          dislikes?: Json | null
          prefers_haptics?: boolean | null
          prefers_voice_guidance?: boolean | null
          triggering_inputs?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensory_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_diagnoses: {
        Row: {
          created_at: string | null
          diagnosis: string
          self_reported: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          diagnosis: string
          self_reported?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          diagnosis?: string
          self_reported?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_diagnoses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type Diagnosis =
  | "tea"
  | "tdah"
  | "ansiedad"
  | "depresion"
  | "borderline"
  | "bipolar"
  | "trauma"
  | "toc"
  | "otro"
  | "ninguno";
export type Feeling = "sobrecargado" | "ansioso" | "agitado" | "bloqueado";
export type Mobility = "still" | "seated" | "any";
export type EvidenceLevel = "high" | "moderate" | "emerging";
export type ExerciseCategory =
  | "breathing"
  | "grounding"
  | "distress_tolerance"
  | "sensory"
  | "body";
export type WasHelpful = "yes" | "somewhat" | "no" | "skipped";
export type MessageRole = "user" | "assistant" | "system";

export type ExerciseStep =
  | { type: "intro"; text: string; seconds: number }
  | { type: "prompt"; text: string; seconds: number }
  | { type: "outro"; text: string; seconds: number }
  | {
      type: "cycle";
      phases: { label: string; seconds: number }[];
      repeat: number;
    };

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SensoryPreferences =
  Database["public"]["Tables"]["sensory_preferences"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type RegulationSession =
  Database["public"]["Tables"]["regulation_sessions"]["Row"];
export type MoodLog = Database["public"]["Tables"]["mood_logs"]["Row"];