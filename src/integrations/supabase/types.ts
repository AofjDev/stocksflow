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
      count_items: {
        Row: {
          count_id: string
          created_at: string
          id: string
          location_id: string | null
          product_id: string | null
          quantity: number
          scanned_code: string | null
          sku: string | null
        }
        Insert: {
          count_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          scanned_code?: string | null
          sku?: string | null
        }
        Update: {
          count_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          scanned_code?: string | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "count_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_photos: {
        Row: {
          created_at: string
          damage_id: string
          id: string
          photo_url: string
        }
        Insert: {
          created_at?: string
          damage_id: string
          id?: string
          photo_url: string
        }
        Update: {
          created_at?: string
          damage_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_photos_damage_id_fkey"
            columns: ["damage_id"]
            isOneToOne: false
            referencedRelation: "damages"
            referencedColumns: ["id"]
          },
        ]
      }
      damages: {
        Row: {
          created_at: string
          created_by: string
          damage_date: string
          id: string
          material_type: string
          notes: string | null
          order_number: string | null
          product_id: string | null
          quantity: number
          responsible: string
          scanned_code: string | null
          sku: string | null
          sold: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          damage_date?: string
          id?: string
          material_type?: string
          notes?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number
          responsible: string
          scanned_code?: string | null
          sku?: string | null
          sold?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          damage_date?: string
          id?: string
          material_type?: string
          notes?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number
          responsible?: string
          scanned_code?: string | null
          sku?: string | null
          sold?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "damages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
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
          status_id: string | null
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
          status_id?: string | null
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
          status_id?: string | null
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
          {
            foreignKeyName: "inventory_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "inventory_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          count_date: string
          count_type: string
          created_at: string
          id: string
          notes: string | null
          performed_by: string
        }
        Insert: {
          count_date?: string
          count_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by: string
        }
        Update: {
          count_date?: string
          count_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string
        }
        Relationships: []
      }
      inventory_statuses: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
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
      task_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
        ]
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
