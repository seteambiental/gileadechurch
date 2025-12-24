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
      casas_refugio: {
        Row: {
          address: string | null
          anfitrioes: string | null
          cep: string | null
          city: string | null
          condominio: string | null
          created_at: string
          dias: string | null
          frequencia: string | null
          id: string
          lideres: string | null
          name: string
          neighborhood: string | null
          numero: string | null
          state: string | null
          supervisores: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          anfitrioes?: string | null
          cep?: string | null
          city?: string | null
          condominio?: string | null
          created_at?: string
          dias?: string | null
          frequencia?: string | null
          id?: string
          lideres?: string | null
          name: string
          neighborhood?: string | null
          numero?: string | null
          state?: string | null
          supervisores?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          anfitrioes?: string | null
          cep?: string | null
          city?: string | null
          condominio?: string | null
          created_at?: string
          dias?: string | null
          frequencia?: string | null
          id?: string
          lideres?: string | null
          name?: string
          neighborhood?: string | null
          numero?: string | null
          state?: string | null
          supervisores?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      condominios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      encontros_casa_refugio: {
        Row: {
          casa_refugio_id: string
          created_at: string
          data_encontro: string
          id: string
          kilos_arrecadados: number | null
          observacoes: string | null
          ofertas: number | null
          qtd_criancas: number
          qtd_lideres: number
          qtd_membros: number
          qtd_visitantes: number
          updated_at: string
        }
        Insert: {
          casa_refugio_id: string
          created_at?: string
          data_encontro: string
          id?: string
          kilos_arrecadados?: number | null
          observacoes?: string | null
          ofertas?: number | null
          qtd_criancas?: number
          qtd_lideres?: number
          qtd_membros?: number
          qtd_visitantes?: number
          updated_at?: string
        }
        Update: {
          casa_refugio_id?: string
          created_at?: string
          data_encontro?: string
          id?: string
          kilos_arrecadados?: number | null
          observacoes?: string | null
          ofertas?: number | null
          qtd_criancas?: number
          qtd_lideres?: number
          qtd_membros?: number
          qtd_visitantes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encontros_casa_refugio_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
        ]
      }
      member_functions: {
        Row: {
          casa_refugio_id: string | null
          condominio_id: string | null
          created_at: string
          function_type: Database["public"]["Enums"]["church_function_type"]
          id: string
          member_id: string
          ministry_id: string | null
        }
        Insert: {
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          function_type: Database["public"]["Enums"]["church_function_type"]
          id?: string
          member_id: string
          ministry_id?: string | null
        }
        Update: {
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          function_type?: Database["public"]["Enums"]["church_function_type"]
          id?: string
          member_id?: string
          ministry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_functions_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_functions_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_functions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_functions_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          member_since: string | null
          neighborhood: string | null
          number: string | null
          photo_url: string | null
          state: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      ministries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      church_function_type:
        | "lider_casa_refugio"
        | "lider_ministerio"
        | "pastor_geral"
        | "pastor_auxiliar"
        | "supervisor_condominio"
        | "sindico_condominio"
        | "integrante_ministerio"
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
      church_function_type: [
        "lider_casa_refugio",
        "lider_ministerio",
        "pastor_geral",
        "pastor_auxiliar",
        "supervisor_condominio",
        "sindico_condominio",
        "integrante_ministerio",
      ],
    },
  },
} as const
