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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_trail: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          local_id: string | null
          notes: string | null
          sale_id: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          transaction_date: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          sale_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          transaction_date?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          sale_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          transaction_date?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          id: string
          local_id: string | null
          location: string | null
          name: string
          notes: string | null
          phone: string
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          local_id?: string | null
          location?: string | null
          name: string
          notes?: string | null
          phone: string
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          local_id?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          adjustment_date: string | null
          adjustment_quantity: number
          created_at: string | null
          id: string
          local_id: string | null
          notes: string | null
          product_id: string | null
          reason: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          user_id: string | null
        }
        Insert: {
          adjustment_date?: string | null
          adjustment_quantity: number
          created_at?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          product_id?: string | null
          reason?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          user_id?: string | null
        }
        Update: {
          adjustment_date?: string | null
          adjustment_quantity?: number
          created_at?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          product_id?: string | null
          reason?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          local_id: string | null
          min_stock_level: number | null
          name: string
          quantity: number | null
          selling_price: number
          sku: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          unit_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          local_id?: string | null
          min_stock_level?: number | null
          name: string
          quantity?: number | null
          selling_price: number
          sku?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          local_id?: string | null
          min_stock_level?: number | null
          name?: string
          quantity?: number | null
          selling_price?: number
          sku?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          local_id: string | null
          product_id: string | null
          quantity: number
          sale_id: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          local_id?: string | null
          product_id?: string | null
          quantity: number
          sale_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          local_id?: string | null
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          local_id: string | null
          notes: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          sale_date: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_amount: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          sale_date?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_date?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          operation: string
          record_id: string
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          synced_at: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation: string
          record_id: string
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          synced_at?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          record_id?: string
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          synced_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_credit_balances: {
        Row: {
          credit_balance: number | null
          id: string | null
          last_credit_date: string | null
          last_payment_date: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          credit_balance?: never
          id?: string | null
          last_credit_date?: never
          last_payment_date?: never
          name?: string | null
          phone?: string | null
        }
        Update: {
          credit_balance?: never
          id?: string | null
          last_credit_date?: never
          last_payment_date?: never
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      daily_sales_summary: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string | null
          local_id: string | null
          notes: string | null
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          sale_date: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string | null
          local_id?: string | null
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          sale_date?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string | null
          local_id?: string | null
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          sale_date?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_credit_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          expiry_date: string | null
          id: string | null
          local_id: string | null
          min_stock_level: number | null
          name: string | null
          quantity: number | null
          selling_price: number | null
          shortage_quantity: number | null
          sku: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          local_id?: string | null
          min_stock_level?: number | null
          name?: string | null
          quantity?: number | null
          selling_price?: number | null
          shortage_quantity?: never
          sku?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          local_id?: string | null
          min_stock_level?: number | null
          name?: string | null
          quantity?: number | null
          selling_price?: number | null
          shortage_quantity?: never
          sku?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cashier" | "manager"
      payment_type: "cash" | "mobile_money" | "credit"
      sync_status: "pending" | "synced" | "failed"
      transaction_type: "sale" | "payment" | "adjustment"
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
    Enums: {
      app_role: ["admin", "cashier", "manager"],
      payment_type: ["cash", "mobile_money", "credit"],
      sync_status: ["pending", "synced", "failed"],
      transaction_type: ["sale", "payment", "adjustment"],
    },
  },
} as const
