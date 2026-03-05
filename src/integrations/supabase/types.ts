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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      inventory: {
        Row: {
          expiry_date: string | null
          id: string
          location_id: string
          lot_number: string | null
          manufacturing_date: string | null
          product_id: string
          quantity: number
          received_at: string
          updated_at: string
        }
        Insert: {
          expiry_date?: string | null
          id?: string
          location_id: string
          lot_number?: string | null
          manufacturing_date?: string | null
          product_id: string
          quantity?: number
          received_at?: string
          updated_at?: string
        }
        Update: {
          expiry_date?: string | null
          id?: string
          location_id?: string
          lot_number?: string | null
          manufacturing_date?: string | null
          product_id?: string
          quantity?: number
          received_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          area: string
          capacity: number
          created_at: string
          full_address: string | null
          id: string
          location_type: string
          position: string
        }
        Insert: {
          active?: boolean
          area: string
          capacity?: number
          created_at?: string
          full_address?: string | null
          id?: string
          location_type?: string
          position: string
        }
        Update: {
          active?: boolean
          area?: string
          capacity?: number
          created_at?: string
          full_address?: string | null
          id?: string
          location_type?: string
          position?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          created_at: string
          from_location_id: string | null
          id: string
          lot_number: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          performed_by: string
          product_id: string
          quantity: number
          reference_doc: string | null
          to_location_id: string | null
        }
        Insert: {
          created_at?: string
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          performed_by: string
          product_id: string
          quantity: number
          reference_doc?: string | null
          to_location_id?: string | null
        }
        Update: {
          created_at?: string
          from_location_id?: string | null
          id?: string
          lot_number?: string | null
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          performed_by?: string
          product_id?: string
          quantity?: number
          reference_doc?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonconformities: {
        Row: {
          actual_value: string | null
          corrective_action: string | null
          created_at: string
          damage_classification:
            | Database["public"]["Enums"]["damage_classification"]
            | null
          description: string
          expected_value: string | null
          id: string
          location_id: string | null
          lot_number: string | null
          product_id: string | null
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["nonconformity_status"]
          type: Database["public"]["Enums"]["nonconformity_type"]
          updated_at: string
        }
        Insert: {
          actual_value?: string | null
          corrective_action?: string | null
          created_at?: string
          damage_classification?:
            | Database["public"]["Enums"]["damage_classification"]
            | null
          description: string
          expected_value?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          product_id?: string | null
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["nonconformity_status"]
          type: Database["public"]["Enums"]["nonconformity_type"]
          updated_at?: string
        }
        Update: {
          actual_value?: string | null
          corrective_action?: string | null
          created_at?: string
          damage_classification?:
            | Database["public"]["Enums"]["damage_classification"]
            | null
          description?: string
          expected_value?: string | null
          id?: string
          location_id?: string | null
          lot_number?: string | null
          product_id?: string | null
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["nonconformity_status"]
          type?: Database["public"]["Enums"]["nonconformity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonconformities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          max_stock: number
          min_stock: number
          name: string
          shelf_life_days: number | null
          sku: string
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          max_stock?: number
          min_stock?: number
          name: string
          shelf_life_days?: number | null
          sku: string
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          max_stock?: number
          min_stock?: number
          name?: string
          shelf_life_days?: number | null
          sku?: string
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      bootstrap_current_user: {
        Args: { _full_name?: string }
        Returns: undefined
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
      app_role: "admin" | "user"
      damage_classification: "pav" | "if"
      movement_type:
        | "entrada"
        | "saida"
        | "transferencia"
        | "ajuste"
        | "devolucao"
      nonconformity_status: "aberta" | "em_analise" | "resolvida" | "encerrada"
      nonconformity_type:
        | "divergencia_quantidade"
        | "produto_avariado"
        | "validade_vencida"
        | "produto_errado"
        | "fifo_violado"
        | "endereco_errado"
        | "outro"
      product_category:
        | "placa_st"
        | "placa_ru"
        | "placa_rf"
        | "placa_fortissima"
        | "perfil_metalico"
        | "acessorio"
        | "massa"
        | "fita"
      unit_of_measure:
        | "unidade"
        | "metro"
        | "metro_quadrado"
        | "pacote"
        | "caixa"
        | "kg"
        | "litro"
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
      damage_classification: ["pav", "if"],
      movement_type: [
        "entrada",
        "saida",
        "transferencia",
        "ajuste",
        "devolucao",
      ],
      nonconformity_status: ["aberta", "em_analise", "resolvida", "encerrada"],
      nonconformity_type: [
        "divergencia_quantidade",
        "produto_avariado",
        "validade_vencida",
        "produto_errado",
        "fifo_violado",
        "endereco_errado",
        "outro",
      ],
      product_category: [
        "placa_st",
        "placa_ru",
        "placa_rf",
        "placa_fortissima",
        "perfil_metalico",
        "acessorio",
        "massa",
        "fita",
      ],
      unit_of_measure: [
        "unidade",
        "metro",
        "metro_quadrado",
        "pacote",
        "caixa",
        "kg",
        "litro",
      ],
    },
  },
} as const
