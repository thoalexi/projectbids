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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bid_payments: {
        Row: {
          bid_id: string
          contractor_id: string
          created_at: string
          currency: string
          environment: string
          failure_message: string | null
          fee_amount_cents: number
          id: string
          project_id: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_setup_intent_id: string | null
          updated_at: string
        }
        Insert: {
          bid_id: string
          contractor_id: string
          created_at?: string
          currency?: string
          environment?: string
          failure_message?: string | null
          fee_amount_cents: number
          id?: string
          project_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          bid_id?: string
          contractor_id?: string
          created_at?: string
          currency?: string
          environment?: string
          failure_message?: string | null
          fee_amount_cents?: number
          id?: string
          project_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_payments_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          contractor_id: string
          contractor_name: string
          created_at: string
          disposal: number | null
          duration_days: number | null
          earliest_start: string | null
          google_url: string | null
          id: string
          insured: boolean
          labor: number | null
          materials: number | null
          message: string
          portfolio_images: Json
          project_id: string
          question_answers: Json
          thumbtack_url: string | null
          trade: string | null
          warranty: string | null
          website: string | null
          yelp_url: string | null
        }
        Insert: {
          amount: number
          contractor_id: string
          contractor_name: string
          created_at?: string
          disposal?: number | null
          duration_days?: number | null
          earliest_start?: string | null
          google_url?: string | null
          id?: string
          insured?: boolean
          labor?: number | null
          materials?: number | null
          message?: string
          portfolio_images?: Json
          project_id: string
          question_answers?: Json
          thumbtack_url?: string | null
          trade?: string | null
          warranty?: string | null
          website?: string | null
          yelp_url?: string | null
        }
        Update: {
          amount?: number
          contractor_id?: string
          contractor_name?: string
          created_at?: string
          disposal?: number | null
          duration_days?: number | null
          earliest_start?: string | null
          google_url?: string | null
          id?: string
          insured?: boolean
          labor?: number | null
          materials?: number | null
          message?: string
          portfolio_images?: Json
          project_id?: string
          question_answers?: Json
          thumbtack_url?: string | null
          trade?: string | null
          warranty?: string | null
          website?: string | null
          yelp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_verifications: {
        Row: {
          admin_note: string | null
          business_name: string
          created_at: string
          environment: string
          google_url: string | null
          id: string
          insurance_details: string | null
          insurance_images: Json
          insured: boolean
          portfolio_images: Json
          reviewed_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          submitted_at: string | null
          thumbtack_url: string | null
          trade: string | null
          updated_at: string
          user_id: string
          website: string | null
          yelp_url: string | null
        }
        Insert: {
          admin_note?: string | null
          business_name: string
          created_at?: string
          environment?: string
          google_url?: string | null
          id?: string
          insurance_details?: string | null
          insurance_images?: Json
          insured?: boolean
          portfolio_images?: Json
          reviewed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          thumbtack_url?: string | null
          trade?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          yelp_url?: string | null
        }
        Update: {
          admin_note?: string | null
          business_name?: string
          created_at?: string
          environment?: string
          google_url?: string | null
          id?: string
          insurance_details?: string | null
          insurance_images?: Json
          insured?: boolean
          portfolio_images?: Json
          reviewed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          thumbtack_url?: string | null
          trade?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          yelp_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          trade: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          trade?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          trade?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          accepted_bid_id: string | null
          ai_questions: Json
          answers: Json
          budget_max: number | null
          budget_min: number | null
          category: string
          comparison: Json | null
          comparison_bid_hash: string | null
          contractor_requirement: string
          created_at: string
          description: string
          desired_date: string
          expired_at: string | null
          id: string
          image_url: string | null
          location: string
          owner_id: string
          owner_name: string
          owner_questions: Json
          payment_status: string
          pending_bid_id: string | null
          status: string
          title: string
        }
        Insert: {
          accepted_bid_id?: string | null
          ai_questions?: Json
          answers?: Json
          budget_max?: number | null
          budget_min?: number | null
          category: string
          comparison?: Json | null
          comparison_bid_hash?: string | null
          contractor_requirement?: string
          created_at?: string
          description: string
          desired_date: string
          expired_at?: string | null
          id?: string
          image_url?: string | null
          location: string
          owner_id: string
          owner_name?: string
          owner_questions?: Json
          payment_status?: string
          pending_bid_id?: string | null
          status?: string
          title: string
        }
        Update: {
          accepted_bid_id?: string | null
          ai_questions?: Json
          answers?: Json
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          comparison?: Json | null
          comparison_bid_hash?: string | null
          contractor_requirement?: string
          created_at?: string
          description?: string
          desired_date?: string
          expired_at?: string | null
          id?: string
          image_url?: string | null
          location?: string
          owner_id?: string
          owner_name?: string
          owner_questions?: Json
          payment_status?: string
          pending_bid_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_pending_bid_id_fkey"
            columns: ["pending_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bid_count: {
        Args: { p: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: number
      }
      contractor_verified: {
        Args: { b: Database["public"]["Tables"]["bids"]["Row"] }
        Returns: boolean
      }
      expire_past_due_projects: { Args: never; Returns: number }
      finalize_paid_bid: {
        Args: { p_payment_intent_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_contractor: { Args: { _user_id: string }; Returns: boolean }
      is_verified_homeowner: { Args: { _user_id: string }; Returns: boolean }
      owner_verified: {
        Args: { p: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
