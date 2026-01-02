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
      acao_social_ajudas: {
        Row: {
          created_at: string
          data_ajuda: string
          descricao: string | null
          familia_id: string | null
          id: string
          instituicao_id: string | null
          observacoes: string | null
          quantidade_cestas: number | null
          quantidade_itens: number | null
          quantidade_kilos: number | null
          registrado_por: string | null
          tipo_ajuda: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_ajuda?: string
          descricao?: string | null
          familia_id?: string | null
          id?: string
          instituicao_id?: string | null
          observacoes?: string | null
          quantidade_cestas?: number | null
          quantidade_itens?: number | null
          quantidade_kilos?: number | null
          registrado_por?: string | null
          tipo_ajuda: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_ajuda?: string
          descricao?: string | null
          familia_id?: string | null
          id?: string
          instituicao_id?: string | null
          observacoes?: string | null
          quantidade_cestas?: number | null
          quantidade_itens?: number | null
          quantidade_kilos?: number | null
          registrado_por?: string | null
          tipo_ajuda?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acao_social_ajudas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "acao_social_familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acao_social_ajudas_instituicao_id_fkey"
            columns: ["instituicao_id"]
            isOneToOne: false
            referencedRelation: "acao_social_instituicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acao_social_ajudas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      acao_social_familia_membros: {
        Row: {
          created_at: string
          data_nascimento: string | null
          escolaridade: string | null
          familia_id: string
          genero: string | null
          id: string
          local_trabalho: string | null
          nome: string
          observacoes: string | null
          parentesco: string | null
          profissao: string | null
          salario: number | null
          trabalha: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_nascimento?: string | null
          escolaridade?: string | null
          familia_id: string
          genero?: string | null
          id?: string
          local_trabalho?: string | null
          nome: string
          observacoes?: string | null
          parentesco?: string | null
          profissao?: string | null
          salario?: number | null
          trabalha?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_nascimento?: string | null
          escolaridade?: string | null
          familia_id?: string
          genero?: string | null
          id?: string
          local_trabalho?: string | null
          nome?: string
          observacoes?: string | null
          parentesco?: string | null
          profissao?: string | null
          salario?: number | null
          trabalha?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acao_social_familia_membros_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "acao_social_familias"
            referencedColumns: ["id"]
          },
        ]
      }
      acao_social_familias: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          casa_refugio_id: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          frequencia_ajuda: string | null
          id: string
          lider_responsavel_id: string | null
          nome_familia: string
          numero: string | null
          observacoes: string | null
          renda_total: number | null
          telefone: string | null
          tipo_ajuda: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia_ajuda?: string | null
          id?: string
          lider_responsavel_id?: string | null
          nome_familia: string
          numero?: string | null
          observacoes?: string | null
          renda_total?: number | null
          telefone?: string | null
          tipo_ajuda?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia_ajuda?: string | null
          id?: string
          lider_responsavel_id?: string | null
          nome_familia?: string
          numero?: string | null
          observacoes?: string | null
          renda_total?: number | null
          telefone?: string | null
          tipo_ajuda?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acao_social_familias_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acao_social_familias_lider_responsavel_id_fkey"
            columns: ["lider_responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      acao_social_instituicoes: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          frequencia_ajuda: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          quantidade_atendidos: number | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          telefone: string | null
          tipo_ajuda: string | null
          tipo_instituicao: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia_ajuda?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          quantidade_atendidos?: number | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
          tipo_ajuda?: string | null
          tipo_instituicao: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          frequencia_ajuda?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          quantidade_atendidos?: number | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
          tipo_ajuda?: string | null
          tipo_instituicao?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
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
          limite_vagas: number | null
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
          limite_vagas?: number | null
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
          limite_vagas?: number | null
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
      casais_inscritos: {
        Row: {
          certificado_emitido: boolean | null
          created_at: string
          data_casamento: string | null
          data_certificado: string | null
          id: string
          membro_feminino_id: string | null
          membro_masculino_id: string | null
          nome_feminino: string | null
          nome_masculino: string | null
          observacoes: string | null
          status: string | null
          tempo_casamento: string | null
          turma_id: string
          updated_at: string
          whatsapp_feminino: string | null
          whatsapp_masculino: string | null
        }
        Insert: {
          certificado_emitido?: boolean | null
          created_at?: string
          data_casamento?: string | null
          data_certificado?: string | null
          id?: string
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          nome_feminino?: string | null
          nome_masculino?: string | null
          observacoes?: string | null
          status?: string | null
          tempo_casamento?: string | null
          turma_id: string
          updated_at?: string
          whatsapp_feminino?: string | null
          whatsapp_masculino?: string | null
        }
        Update: {
          certificado_emitido?: boolean | null
          created_at?: string
          data_casamento?: string | null
          data_certificado?: string | null
          id?: string
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          nome_feminino?: string | null
          nome_masculino?: string | null
          observacoes?: string | null
          status?: string | null
          tempo_casamento?: string | null
          turma_id?: string
          updated_at?: string
          whatsapp_feminino?: string | null
          whatsapp_masculino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casais_inscritos_membro_feminino_id_fkey"
            columns: ["membro_feminino_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_membro_masculino_id_fkey"
            columns: ["membro_masculino_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "casais_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      casais_lideres: {
        Row: {
          ativo: boolean | null
          created_at: string
          funcao: string | null
          id: string
          membro_feminino_id: string | null
          membro_masculino_id: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          funcao?: string | null
          id?: string
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          funcao?: string | null
          id?: string
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casais_lideres_membro_feminino_id_fkey"
            columns: ["membro_feminino_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_lideres_membro_masculino_id_fkey"
            columns: ["membro_masculino_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_lideres_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "casais_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      casais_materiais: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          ordem: number | null
          tipo: string | null
          titulo: string
          turma_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string | null
          titulo: string
          turma_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string | null
          titulo?: string
          turma_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casais_materiais_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "casais_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      casais_presencas: {
        Row: {
          casal_id: string
          created_at: string
          data_aula: string
          id: string
          observacoes: string | null
          presente: boolean | null
        }
        Insert: {
          casal_id: string
          created_at?: string
          data_aula: string
          id?: string
          observacoes?: string | null
          presente?: boolean | null
        }
        Update: {
          casal_id?: string
          created_at?: string
          data_aula?: string
          id?: string
          observacoes?: string | null
          presente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "casais_presencas_casal_id_fkey"
            columns: ["casal_id"]
            isOneToOne: false
            referencedRelation: "casais_inscritos"
            referencedColumns: ["id"]
          },
        ]
      }
      casais_turmas: {
        Row: {
          ativo: boolean | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          horario: string | null
          id: string
          local: string | null
          nome: string
          updated_at: string
          vagas: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          nome: string
          updated_at?: string
          vagas?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          nome?: string
          updated_at?: string
          vagas?: number | null
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
      danca_equipe_membros: {
        Row: {
          ativo: boolean
          created_at: string
          equipe_id: string
          funcao: string | null
          id: string
          member_id: string
          sub_time: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          equipe_id: string
          funcao?: string | null
          id?: string
          member_id: string
          sub_time?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          equipe_id?: string
          funcao?: string | null
          id?: string
          member_id?: string
          sub_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "danca_equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "danca_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "danca_equipe_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      danca_equipes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ministry_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ministry_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ministry_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "danca_equipes_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      encontro_presencas: {
        Row: {
          confidence: number | null
          created_at: string
          encontro_id: string
          id: string
          member_id: string | null
          mensagem_ausencia_enviada: boolean
          mensagem_enviada_em: string | null
          novo_convertido_id: string | null
          presente: boolean
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          encontro_id: string
          id?: string
          member_id?: string | null
          mensagem_ausencia_enviada?: boolean
          mensagem_enviada_em?: string | null
          novo_convertido_id?: string | null
          presente?: boolean
        }
        Update: {
          confidence?: number | null
          created_at?: string
          encontro_id?: string
          id?: string
          member_id?: string | null
          mensagem_ausencia_enviada?: boolean
          mensagem_enviada_em?: string | null
          novo_convertido_id?: string | null
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "encontro_presencas_encontro_id_fkey"
            columns: ["encontro_id"]
            isOneToOne: false
            referencedRelation: "encontros_casa_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encontro_presencas_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encontro_presencas_novo_convertido_id_fkey"
            columns: ["novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
        ]
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
      evangelizacao_eventos: {
        Row: {
          created_at: string
          data_evento: string
          decisoes: number
          descricao: string | null
          frente_id: string
          id: string
          local: string | null
          nome: string
          observacoes: string | null
          updated_at: string
          vidas_alcancadas: number
        }
        Insert: {
          created_at?: string
          data_evento: string
          decisoes?: number
          descricao?: string | null
          frente_id: string
          id?: string
          local?: string | null
          nome: string
          observacoes?: string | null
          updated_at?: string
          vidas_alcancadas?: number
        }
        Update: {
          created_at?: string
          data_evento?: string
          decisoes?: number
          descricao?: string | null
          frente_id?: string
          id?: string
          local?: string | null
          nome?: string
          observacoes?: string | null
          updated_at?: string
          vidas_alcancadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "evangelizacao_eventos_frente_id_fkey"
            columns: ["frente_id"]
            isOneToOne: false
            referencedRelation: "evangelizacao_frentes"
            referencedColumns: ["id"]
          },
        ]
      }
      evangelizacao_frentes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          lider_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evangelizacao_frentes_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      evangelizacao_frentes_membros: {
        Row: {
          created_at: string
          frente_id: string
          funcao: string | null
          id: string
          membro_id: string
        }
        Insert: {
          created_at?: string
          frente_id: string
          funcao?: string | null
          id?: string
          membro_id: string
        }
        Update: {
          created_at?: string
          frente_id?: string
          funcao?: string | null
          id?: string
          membro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evangelizacao_frentes_membros_frente_id_fkey"
            columns: ["frente_id"]
            isOneToOne: false
            referencedRelation: "evangelizacao_frentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evangelizacao_frentes_membros_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      igreja_config: {
        Row: {
          address: string | null
          cargo_responsavel: string | null
          celular: string | null
          cep: string | null
          city: string | null
          cnpj: string
          complement: string | null
          cpf_responsavel: string | null
          created_at: string
          email: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          neighborhood: string | null
          nome_fantasia: string
          number: string | null
          razao_social: string
          responsavel_legal: string
          state: string | null
          telefone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cargo_responsavel?: string | null
          celular?: string | null
          cep?: string | null
          city?: string | null
          cnpj: string
          complement?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          nome_fantasia: string
          number?: string | null
          razao_social: string
          responsavel_legal: string
          state?: string | null
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cargo_responsavel?: string | null
          celular?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string
          complement?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          neighborhood?: string | null
          nome_fantasia?: string
          number?: string | null
          razao_social?: string
          responsavel_legal?: string
          state?: string | null
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      inscricoes_eventos: {
        Row: {
          cpf: string | null
          created_at: string
          descricao_alergia: string | null
          descricao_medicamento: string | null
          evento_id: string
          forma_pagamento: string | null
          genero: string | null
          id: string
          is_menor: boolean | null
          lista_espera: boolean | null
          member_id: string | null
          nome_participante: string
          nome_responsavel: string | null
          novo_convertido_id: string | null
          observacoes: string | null
          preferencia_beliche: string | null
          rg: string | null
          status_pagamento: string | null
          telefone_contato: string
          telefone_emergencia: string | null
          telefone_responsavel: string | null
          tem_alergia_alimentar: boolean | null
          toma_medicamento: boolean | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          is_menor?: boolean | null
          lista_espera?: boolean | null
          member_id?: string | null
          nome_participante: string
          nome_responsavel?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          preferencia_beliche?: string | null
          rg?: string | null
          status_pagamento?: string | null
          telefone_contato: string
          telefone_emergencia?: string | null
          telefone_responsavel?: string | null
          tem_alergia_alimentar?: boolean | null
          toma_medicamento?: boolean | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id?: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          is_menor?: boolean | null
          lista_espera?: boolean | null
          member_id?: string | null
          nome_participante?: string
          nome_responsavel?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          preferencia_beliche?: string | null
          rg?: string | null
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
      kids_escalas: {
        Row: {
          created_at: string
          data_culto: string
          id: string
          lider_id: string | null
          observacoes: string | null
          tipo_culto: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_culto: string
          id?: string
          lider_id?: string | null
          observacoes?: string | null
          tipo_culto?: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_culto?: string
          id?: string
          lider_id?: string | null
          observacoes?: string | null
          tipo_culto?: string
          turma?: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_escalas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_escalas_ajudantes: {
        Row: {
          ajudante_id: string
          created_at: string
          escala_id: string
          id: string
        }
        Insert: {
          ajudante_id: string
          created_at?: string
          escala_id: string
          id?: string
        }
        Update: {
          ajudante_id?: string
          created_at?: string
          escala_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_escalas_ajudantes_ajudante_id_fkey"
            columns: ["ajudante_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_escalas_ajudantes_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "kids_escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_lideres: {
        Row: {
          ativo: boolean
          created_at: string
          funcao: string
          id: string
          member_id: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao?: string
          id?: string
          member_id: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string
          id?: string
          member_id?: string
          turma?: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_lideres_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_notificacoes_config: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          dia_semana: number | null
          hora: string
          id: string
          minutos_antes: number | null
          tipo_notificacao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          dia_semana?: number | null
          hora: string
          id?: string
          minutos_antes?: number | null
          tipo_notificacao: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          dia_semana?: number | null
          hora?: string
          id?: string
          minutos_antes?: number | null
          tipo_notificacao?: string
          updated_at?: string
        }
        Relationships: []
      }
      kids_notificacoes_log: {
        Row: {
          crianca_member_id: string | null
          crianca_novo_convertido_id: string | null
          data_culto: string | null
          enviada_em: string
          erro_mensagem: string | null
          id: string
          mensagem: string
          responsavel_member_id: string | null
          status: string
          tipo_notificacao: string
          turma: string | null
          whatsapp_destino: string | null
        }
        Insert: {
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          data_culto?: string | null
          enviada_em?: string
          erro_mensagem?: string | null
          id?: string
          mensagem: string
          responsavel_member_id?: string | null
          status?: string
          tipo_notificacao: string
          turma?: string | null
          whatsapp_destino?: string | null
        }
        Update: {
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          data_culto?: string | null
          enviada_em?: string
          erro_mensagem?: string | null
          id?: string
          mensagem?: string
          responsavel_member_id?: string | null
          status?: string
          tipo_notificacao?: string
          turma?: string | null
          whatsapp_destino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_notificacoes_log_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_notificacoes_log_crianca_novo_convertido_id_fkey"
            columns: ["crianca_novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_notificacoes_log_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_presencas: {
        Row: {
          created_at: string
          data_culto: string
          id: string
          member_id: string | null
          novo_convertido_id: string | null
          observacoes: string | null
          presente: boolean
          registrado_por: string | null
          tipo_culto: string
          turma: Database["public"]["Enums"]["kids_turma"]
        }
        Insert: {
          created_at?: string
          data_culto: string
          id?: string
          member_id?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          presente?: boolean
          registrado_por?: string | null
          tipo_culto?: string
          turma: Database["public"]["Enums"]["kids_turma"]
        }
        Update: {
          created_at?: string
          data_culto?: string
          id?: string
          member_id?: string | null
          novo_convertido_id?: string | null
          observacoes?: string | null
          presente?: boolean
          registrado_por?: string | null
          tipo_culto?: string
          turma?: Database["public"]["Enums"]["kids_turma"]
        }
        Relationships: [
          {
            foreignKeyName: "kids_presencas_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_presencas_novo_convertido_id_fkey"
            columns: ["novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_presencas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_responsaveis: {
        Row: {
          created_at: string
          crianca_member_id: string | null
          crianca_novo_convertido_id: string | null
          id: string
          notificar_ausencia: boolean
          parentesco: string
          principal: boolean
          responsavel_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          id?: string
          notificar_ausencia?: boolean
          parentesco?: string
          principal?: boolean
          responsavel_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          id?: string
          notificar_ausencia?: boolean
          parentesco?: string
          principal?: boolean
          responsavel_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_responsaveis_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_responsaveis_crianca_novo_convertido_id_fkey"
            columns: ["crianca_novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_responsaveis_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_turmas_config: {
        Row: {
          cor_hex: string
          created_at: string
          id: string
          idade_maxima: number
          idade_minima: number
          nome_exibicao: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at: string
        }
        Insert: {
          cor_hex: string
          created_at?: string
          id?: string
          idade_maxima: number
          idade_minima: number
          nome_exibicao: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Update: {
          cor_hex?: string
          created_at?: string
          id?: string
          idade_maxima?: number
          idade_minima?: number
          nome_exibicao?: string
          turma?: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string
        }
        Relationships: []
      }
      member_face_indexes: {
        Row: {
          created_at: string
          external_image_id: string | null
          face_id: string
          id: string
          member_id: string | null
          novo_convertido_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_image_id?: string | null
          face_id: string
          id?: string
          member_id?: string | null
          novo_convertido_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_image_id?: string | null
          face_id?: string
          id?: string
          member_id?: string | null
          novo_convertido_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_face_indexes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_face_indexes_novo_convertido_id_fkey"
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
          subfuncao: string | null
        }
        Insert: {
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          function_type: Database["public"]["Enums"]["church_function_type"]
          id?: string
          member_id: string
          ministry_id?: string | null
          subfuncao?: string | null
        }
        Update: {
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          function_type?: Database["public"]["Enums"]["church_function_type"]
          id?: string
          member_id?: string
          ministry_id?: string | null
          subfuncao?: string | null
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
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          genero: string | null
          id: string
          kids_numero: number | null
          member_since: string | null
          neighborhood: string | null
          number: string | null
          photo_url: string | null
          rg: string | null
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
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          rg?: string | null
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
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          rg?: string | null
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
      ministerio_escala_membros: {
        Row: {
          created_at: string
          escala_id: string
          id: string
          integrante_id: string
        }
        Insert: {
          created_at?: string
          escala_id: string
          id?: string
          integrante_id: string
        }
        Update: {
          created_at?: string
          escala_id?: string
          id?: string
          integrante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_escala_membros_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "ministerio_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_escala_membros_integrante_id_fkey"
            columns: ["integrante_id"]
            isOneToOne: false
            referencedRelation: "ministerio_integrantes"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_escalas: {
        Row: {
          created_at: string
          danca_equipe_id: string | null
          danca_sub_time: string | null
          data_culto: string
          id: string
          ministry_id: string
          observacoes: string | null
          tipo_culto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          danca_equipe_id?: string | null
          danca_sub_time?: string | null
          data_culto: string
          id?: string
          ministry_id: string
          observacoes?: string | null
          tipo_culto?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          danca_equipe_id?: string | null
          danca_sub_time?: string | null
          data_culto?: string
          id?: string
          ministry_id?: string
          observacoes?: string | null
          tipo_culto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_escalas_danca_equipe_id_fkey"
            columns: ["danca_equipe_id"]
            isOneToOne: false
            referencedRelation: "danca_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_escalas_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_escalas_compartilhadas: {
        Row: {
          compartilhado_em: string
          compartilhado_por: string | null
          escala_id: string
          id: string
          ministry_destino_id: string
          visualizado: boolean | null
          visualizado_em: string | null
        }
        Insert: {
          compartilhado_em?: string
          compartilhado_por?: string | null
          escala_id: string
          id?: string
          ministry_destino_id: string
          visualizado?: boolean | null
          visualizado_em?: string | null
        }
        Update: {
          compartilhado_em?: string
          compartilhado_por?: string | null
          escala_id?: string
          id?: string
          ministry_destino_id?: string
          visualizado?: boolean | null
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_escalas_compartilhadas_compartilhado_por_fkey"
            columns: ["compartilhado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_escalas_compartilhadas_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "ministerio_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_escalas_compartilhadas_ministry_destino_id_fkey"
            columns: ["ministry_destino_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_funcoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ministry_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ministry_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ministry_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_funcoes_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_integrantes: {
        Row: {
          ativo: boolean
          created_at: string
          funcao_id: string
          id: string
          member_id: string
          ministry_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao_id: string
          id?: string
          member_id: string
          ministry_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao_id?: string
          id?: string
          member_id?: string
          ministry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_integrantes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "ministerio_funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_integrantes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_integrantes_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_musicas_banco: {
        Row: {
          artista: string | null
          created_at: string
          id: string
          ministry_id: string
          titulo: string
          tom: string | null
          ultima_vez_tocada: string | null
          updated_at: string
          vezes_tocada: number | null
          video_url: string | null
        }
        Insert: {
          artista?: string | null
          created_at?: string
          id?: string
          ministry_id: string
          titulo: string
          tom?: string | null
          ultima_vez_tocada?: string | null
          updated_at?: string
          vezes_tocada?: number | null
          video_url?: string | null
        }
        Update: {
          artista?: string | null
          created_at?: string
          id?: string
          ministry_id?: string
          titulo?: string
          tom?: string | null
          ultima_vez_tocada?: string | null
          updated_at?: string
          vezes_tocada?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_musicas_banco_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministerio_repertorio: {
        Row: {
          artista: string | null
          created_at: string
          escala_id: string
          id: string
          ministry_id: string
          observacoes: string | null
          ordem: number | null
          titulo: string
          tom: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          artista?: string | null
          created_at?: string
          escala_id: string
          id?: string
          ministry_id: string
          observacoes?: string | null
          ordem?: number | null
          titulo: string
          tom?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          artista?: string | null
          created_at?: string
          escala_id?: string
          id?: string
          ministry_id?: string
          observacoes?: string | null
          ordem?: number | null
          titulo?: string
          tom?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_repertorio_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "ministerio_escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministerio_repertorio_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
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
          cpf: string | null
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
          kids_numero: number | null
          member_id: string | null
          membro_vinculado_id: string | null
          mensagem_boas_vindas_enviada: boolean | null
          mensagens_enviadas: number | null
          neighborhood: string | null
          numero: string | null
          participou_culto_membresia: boolean | null
          participou_impacto: boolean | null
          participou_manaim: boolean | null
          photo_url: string | null
          responsavel_nome: string | null
          responsavel_whatsapp: string | null
          rg: string | null
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
          cpf?: string | null
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
          kids_numero?: number | null
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          participou_culto_membresia?: boolean | null
          participou_impacto?: boolean | null
          participou_manaim?: boolean | null
          photo_url?: string | null
          responsavel_nome?: string | null
          responsavel_whatsapp?: string | null
          rg?: string | null
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
          cpf?: string | null
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
          kids_numero?: number | null
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          participou_culto_membresia?: boolean | null
          participou_impacto?: boolean | null
          participou_manaim?: boolean | null
          photo_url?: string | null
          responsavel_nome?: string | null
          responsavel_whatsapp?: string | null
          rg?: string | null
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
      pedidos_oracao: {
        Row: {
          anonimo: boolean
          created_at: string
          id: string
          nome: string | null
          pedido: string
          status: string
          updated_at: string
        }
        Insert: {
          anonimo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          pedido: string
          status?: string
          updated_at?: string
        }
        Update: {
          anonimo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          pedido?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      testemunhos: {
        Row: {
          anonimo: boolean
          aprovado: boolean
          arquivado: boolean
          arquivado_em: string | null
          created_at: string
          foto_url: string | null
          id: string
          nome: string | null
          testemunho: string
          updated_at: string
        }
        Insert: {
          anonimo?: boolean
          aprovado?: boolean
          arquivado?: boolean
          arquivado_em?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string | null
          testemunho: string
          updated_at?: string
        }
        Update: {
          anonimo?: boolean
          aprovado?: boolean
          arquivado?: boolean
          arquivado_em?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string | null
          testemunho?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          id: string
          member_id: string
          rejection_reason: string | null
          requested_ministry_ids: string[] | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
          member_id: string
          rejection_reason?: string | null
          requested_ministry_ids?: string[] | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
          member_id?: string
          rejection_reason?: string | null
          requested_ministry_ids?: string[] | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ministries: {
        Row: {
          created_at: string
          id: string
          ministry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ministry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ministry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ministries_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
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
      get_next_kids_numero: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "lider" | "membro" | "master" | "ministerial"
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
      kids_turma: "laranja" | "amarelo" | "verde" | "azul"
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
      app_role: ["admin", "lider", "membro", "master", "ministerial"],
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
      kids_turma: ["laranja", "amarelo", "verde", "azul"],
    },
  },
} as const
