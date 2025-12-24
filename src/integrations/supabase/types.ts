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
      agenda_igreja: {
        Row: {
          ativo: boolean | null
          comentarios_custo: string | null
          comentarios_refeicao: string | null
          cor: string | null
          created_at: string
          data_evento: string
          data_fim: string | null
          descricao: string | null
          dia_semana: number | null
          flyer_url: string | null
          genero_alvo: string | null
          hora_fim: string | null
          hora_inicio: string | null
          horarios_por_dia: Json | null
          id: string
          idade_maxima: number | null
          idade_minima: number | null
          local: string | null
          observacoes: string | null
          recorrente: boolean | null
          semana_mes: number | null
          tem_custo: boolean | null
          tem_refeicao: boolean | null
          tipo_evento: string
          tipo_recorrencia: string | null
          titulo: string
          updated_at: string
          valor_custo: number | null
        }
        Insert: {
          ativo?: boolean | null
          comentarios_custo?: string | null
          comentarios_refeicao?: string | null
          cor?: string | null
          created_at?: string
          data_evento: string
          data_fim?: string | null
          descricao?: string | null
          dia_semana?: number | null
          flyer_url?: string | null
          genero_alvo?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios_por_dia?: Json | null
          id?: string
          idade_maxima?: number | null
          idade_minima?: number | null
          local?: string | null
          observacoes?: string | null
          recorrente?: boolean | null
          semana_mes?: number | null
          tem_custo?: boolean | null
          tem_refeicao?: boolean | null
          tipo_evento: string
          tipo_recorrencia?: string | null
          titulo: string
          updated_at?: string
          valor_custo?: number | null
        }
        Update: {
          ativo?: boolean | null
          comentarios_custo?: string | null
          comentarios_refeicao?: string | null
          cor?: string | null
          created_at?: string
          data_evento?: string
          data_fim?: string | null
          descricao?: string | null
          dia_semana?: number | null
          flyer_url?: string | null
          genero_alvo?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios_por_dia?: Json | null
          id?: string
          idade_maxima?: number | null
          idade_minima?: number | null
          local?: string | null
          observacoes?: string | null
          recorrente?: boolean | null
          semana_mes?: number | null
          tem_custo?: boolean | null
          tem_refeicao?: boolean | null
          tipo_evento?: string
          tipo_recorrencia?: string | null
          titulo?: string
          updated_at?: string
          valor_custo?: number | null
        }
        Relationships: []
      }
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
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
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
      inscricoes_eventos: {
        Row: {
          created_at: string
          descricao_alergia: string | null
          descricao_medicamento: string | null
          evento_id: string
          forma_pagamento: string | null
          genero: string | null
          id: string
          is_menor: boolean | null
          member_id: string | null
          nome_participante: string
          nome_responsavel: string | null
          novo_convertido_id: string | null
          observacoes: string | null
          preferencia_beliche: string | null
          status_pagamento: string | null
          telefone_contato: string
          telefone_emergencia: string | null
          telefone_responsavel: string | null
          tem_alergia_alimentar: boolean | null
          toma_medicamento: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          is_menor?: boolean | null
          member_id?: string | null
          nome_participante: string
          nome_responsavel?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          preferencia_beliche?: string | null
          status_pagamento?: string | null
          telefone_contato: string
          telefone_emergencia?: string | null
          telefone_responsavel?: string | null
          tem_alergia_alimentar?: boolean | null
          toma_medicamento?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id?: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          is_menor?: boolean | null
          member_id?: string | null
          nome_participante?: string
          nome_responsavel?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          preferencia_beliche?: string | null
          status_pagamento?: string | null
          telefone_contato?: string
          telefone_emergencia?: string | null
          telefone_responsavel?: string | null
          tem_alergia_alimentar?: boolean | null
          toma_medicamento?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_eventos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_igreja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_eventos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_eventos_novo_convertido_id_fkey"
            columns: ["novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
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
          casa_refugio_id: string | null
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          email: string | null
          full_name: string
          genero: string | null
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
          casa_refugio_id?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          genero?: string | null
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
          casa_refugio_id?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          genero?: string | null
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
        Relationships: [
          {
            foreignKeyName: "members_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_whatsapp: {
        Row: {
          conteudo: string
          enviada_em: string
          evento_id: string | null
          id: string
          novo_convertido_id: string
          status: string | null
          tipo_mensagem: string
        }
        Insert: {
          conteudo: string
          enviada_em?: string
          evento_id?: string | null
          id?: string
          novo_convertido_id: string
          status?: string | null
          tipo_mensagem: string
        }
        Update: {
          conteudo?: string
          enviada_em?: string
          evento_id?: string | null
          id?: string
          novo_convertido_id?: string
          status?: string | null
          tipo_mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_igreja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_novo_convertido_id_fkey"
            columns: ["novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
        ]
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
      novos_convertidos: {
        Row: {
          address: string | null
          batizado: boolean | null
          casa_refugio_frequenta_id: string | null
          casa_refugio_id: string | null
          cep: string | null
          city: string | null
          como_chegou: Database["public"]["Enums"]["arrival_method"] | null
          complement: string | null
          created_at: string
          data_batismo: string | null
          data_culto_membresia: string | null
          data_decisao: string | null
          data_manaim: string | null
          data_membresia: string | null
          data_nascimento: string | null
          datas_impacto: string[] | null
          email: string | null
          frequenta_casa_refugio: boolean | null
          full_name: string
          genero: string | null
          id: string
          member_id: string | null
          membro_vinculado_id: string | null
          mensagem_boas_vindas_enviada: boolean | null
          mensagens_enviadas: number | null
          neighborhood: string | null
          numero: string | null
          participou_culto_membresia: boolean | null
          participou_impacto: boolean | null
          participou_manaim: boolean | null
          state: string | null
          tipo_conversao: Database["public"]["Enums"]["conversion_type"] | null
          tornou_membro: boolean | null
          ultima_mensagem_enviada: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          batizado?: boolean | null
          casa_refugio_frequenta_id?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          city?: string | null
          como_chegou?: Database["public"]["Enums"]["arrival_method"] | null
          complement?: string | null
          created_at?: string
          data_batismo?: string | null
          data_culto_membresia?: string | null
          data_decisao?: string | null
          data_manaim?: string | null
          data_membresia?: string | null
          data_nascimento?: string | null
          datas_impacto?: string[] | null
          email?: string | null
          frequenta_casa_refugio?: boolean | null
          full_name: string
          genero?: string | null
          id?: string
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          participou_culto_membresia?: boolean | null
          participou_impacto?: boolean | null
          participou_manaim?: boolean | null
          state?: string | null
          tipo_conversao?: Database["public"]["Enums"]["conversion_type"] | null
          tornou_membro?: boolean | null
          ultima_mensagem_enviada?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          batizado?: boolean | null
          casa_refugio_frequenta_id?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          city?: string | null
          como_chegou?: Database["public"]["Enums"]["arrival_method"] | null
          complement?: string | null
          created_at?: string
          data_batismo?: string | null
          data_culto_membresia?: string | null
          data_decisao?: string | null
          data_manaim?: string | null
          data_membresia?: string | null
          data_nascimento?: string | null
          datas_impacto?: string[] | null
          email?: string | null
          frequenta_casa_refugio?: boolean | null
          full_name?: string
          genero?: string | null
          id?: string
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          participou_culto_membresia?: boolean | null
          participou_impacto?: boolean | null
          participou_manaim?: boolean | null
          state?: string | null
          tipo_conversao?: Database["public"]["Enums"]["conversion_type"] | null
          tornou_membro?: boolean | null
          ultima_mensagem_enviada?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "novos_convertidos_casa_refugio_frequenta_id_fkey"
            columns: ["casa_refugio_frequenta_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novos_convertidos_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novos_convertidos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novos_convertidos_membro_vinculado_id_fkey"
            columns: ["membro_vinculado_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      arrival_method:
        | "culto_domingo"
        | "culto_quarta"
        | "casa_refugio"
        | "impacto"
        | "acao_evangelistica"
      church_function_type:
        | "lider_casa_refugio"
        | "lider_ministerio"
        | "pastor_geral"
        | "pastor_auxiliar"
        | "supervisor_condominio"
        | "sindico_condominio"
        | "integrante_ministerio"
      conversion_type: "conversao" | "reconciliacao"
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
      arrival_method: [
        "culto_domingo",
        "culto_quarta",
        "casa_refugio",
        "impacto",
        "acao_evangelistica",
      ],
      church_function_type: [
        "lider_casa_refugio",
        "lider_ministerio",
        "pastor_geral",
        "pastor_auxiliar",
        "supervisor_condominio",
        "sindico_condominio",
        "integrante_ministerio",
      ],
      conversion_type: ["conversao", "reconciliacao"],
    },
  },
} as const
