export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      credit_installments: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          credit_id: string
          days_overdue: number
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          status: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          credit_id: string
          days_overdue?: number
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          credit_id?: string
          days_overdue?: number
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_installments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          created_by: string | null
          credit_id: string
          evidence_urls: Json
          id: string
          new_balance: number
          payment_date: string
          payment_method: string
          previous_balance: number
          user_notes: string | null
          voucher_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          credit_id: string
          evidence_urls?: Json
          id?: string
          new_balance: number
          payment_date?: string
          payment_method?: string
          previous_balance: number
          user_notes?: string | null
          voucher_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          credit_id?: string
          evidence_urls?: Json
          id?: string
          new_balance?: number
          payment_date?: string
          payment_method?: string
          previous_balance?: number
          user_notes?: string | null
          voucher_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_dni: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          down_payment: number
          financed_amount: number
          first_due_date: string
          frequency: string
          id: string
          installment_amount: number
          interest_rate: number
          item_category: string
          item_description: string
          item_identifier: string | null
          notes: string | null
          remaining_balance: number
          start_date: string
          status: string
          total_debt: number
          total_installments: number
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_dni?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          down_payment?: number
          financed_amount: number
          first_due_date?: string
          frequency: string
          id?: string
          installment_amount: number
          interest_rate?: number
          item_category?: string
          item_description: string
          item_identifier?: string | null
          notes?: string | null
          remaining_balance: number
          start_date?: string
          status?: string
          total_debt: number
          total_installments: number
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_dni?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          down_payment?: number
          financed_amount?: number
          first_due_date?: string
          frequency?: string
          id?: string
          installment_amount?: number
          interest_rate?: number
          item_category?: string
          item_description?: string
          item_identifier?: string | null
          notes?: string | null
          remaining_balance?: number
          start_date?: string
          status?: string
          total_debt?: number
          total_installments?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string | null
          due_date: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          evidence_urls: Json
          id: string
          payment_date: string
          payment_method: string
          plan_id: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
          user_notes: string | null
          verified_at: string | null
          verified_by: string | null
          voucher_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          evidence_urls?: Json
          id?: string
          payment_date?: string
          payment_method: string
          plan_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
          user_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          voucher_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          evidence_urls?: Json
          id?: string
          payment_date?: string
          payment_method?: string
          plan_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          voucher_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          duration_months: number
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_months: number
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_months?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      refresh_credits_overdue_status: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Credit = Database['public']['Tables']['credits']['Row']
export type CreditInsert = Database['public']['Tables']['credits']['Insert']
export type CreditUpdate = Database['public']['Tables']['credits']['Update']

export type CreditInstallment = Database['public']['Tables']['credit_installments']['Row']
export type CreditInstallmentInsert = Database['public']['Tables']['credit_installments']['Insert']
export type CreditInstallmentUpdate = Database['public']['Tables']['credit_installments']['Update']

export type CreditPayment = Database['public']['Tables']['credit_payments']['Row']
export type CreditPaymentInsert = Database['public']['Tables']['credit_payments']['Insert']
export type CreditPaymentUpdate = Database['public']['Tables']['credit_payments']['Update']
