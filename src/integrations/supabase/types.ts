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
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          id: string
          local_id: string | null
          numero: string
          pdf_file_path: string | null
          qr_code: string | null
          valor_total: number | null
          xml_file_path: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: string
          id?: string
          local_id?: string | null
          numero: string
          pdf_file_path?: string | null
          qr_code?: string | null
          valor_total?: number | null
          xml_file_path?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          id?: string
          local_id?: string | null
          numero?: string
          pdf_file_path?: string | null
          qr_code?: string | null
          valor_total?: number | null
          xml_file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          dia: string
          id: string
          invoice_id: string | null
          local_id: string | null
          observacao: string | null
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dia?: string
          id?: string
          invoice_id?: string | null
          local_id?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dia?: string
          id?: string
          invoice_id?: string | null
          local_id?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_entries_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_entries_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_exits: {
        Row: {
          created_at: string | null
          created_by: string | null
          dia: string
          id: string
          local_id: string | null
          motivo: string | null
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dia?: string
          id?: string
          local_id?: string | null
          motivo?: string | null
          produto_id?: string | null
          quantidade: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dia?: string
          id?: string
          local_id?: string | null
          motivo?: string | null
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_exits_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_exits_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          created_by: string | null
          estoque_minimo: number | null
          id: string
          local_id: string | null
          marca: string
          produto: string
          quantidade: number
          status: Database["public"]["Enums"]["product_status"] | null
          unidade: Database["public"]["Enums"]["unit_type"] | null
          updated_at: string | null
          validade: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          estoque_minimo?: number | null
          id?: string
          local_id?: string | null
          marca: string
          produto: string
          quantidade?: number
          status?: Database["public"]["Enums"]["product_status"] | null
          unidade?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string | null
          validade?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          estoque_minimo?: number | null
          id?: string
          local_id?: string | null
          marca?: string
          produto?: string
          quantidade?: number
          status?: Database["public"]["Enums"]["product_status"] | null
          unidade?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string | null
          validade?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          comprado: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          prioridade: string | null
          produto: string
          quantidade: number
          unidade: Database["public"]["Enums"]["unit_type"] | null
        }
        Insert: {
          comprado?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          prioridade?: string | null
          produto: string
          quantidade: number
          unidade?: Database["public"]["Enums"]["unit_type"] | null
        }
        Update: {
          comprado?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          prioridade?: string | null
          produto?: string
          quantidade?: number
          unidade?: Database["public"]["Enums"]["unit_type"] | null
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      product_status: "disponivel" | "baixo_estoque" | "fora_de_estoque"
      unit_type: "unidade" | "kg" | "litro" | "caixa" | "pacote"
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
      app_role: ["admin", "user"],
      product_status: ["disponivel", "baixo_estoque", "fora_de_estoque"],
      unit_type: ["unidade", "kg", "litro", "caixa", "pacote"],
    },
  },
} as const
