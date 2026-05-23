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
          {
            foreignKeyName: "acao_social_ajudas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "acao_social_familias_lider_responsavel_id_fkey"
            columns: ["lider_responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      agenda_ambientes: {
        Row: {
          agenda_id: string
          ambiente_id: string
          bloqueio_fim: string | null
          bloqueio_inicio: string | null
          created_at: string
          id: string
        }
        Insert: {
          agenda_id: string
          ambiente_id: string
          bloqueio_fim?: string | null
          bloqueio_inicio?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          agenda_id?: string
          ambiente_id?: string
          bloqueio_fim?: string | null
          bloqueio_inicio?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_ambientes_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agenda_igreja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_ambientes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "ambientes"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_igreja: {
        Row: {
          ambiente_id: string | null
          ativo: boolean | null
          bloqueio_fim: string | null
          bloqueio_inicio: string | null
          campos_formulario: Json | null
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
          link_grupo_whatsapp: string | null
          link_grupo_whatsapp_equipe: string | null
          link_grupo_whatsapp_ministradores: string | null
          link_grupo_whatsapp_participantes: string | null
          local: string | null
          local_tipo: string
          motivo_rejeicao: string | null
          necessita_inscricao: boolean
          observacoes: string | null
          recorrente: boolean | null
          semana_mes: number | null
          solicitante_id: string | null
          status: string
          tem_custo: boolean | null
          tem_refeicao: boolean | null
          tipo_evento: string
          tipo_recorrencia: string | null
          titulo: string
          updated_at: string
          vagas_por_tipo: Json | null
          valor_custo: number | null
          valores_por_tipo: Json | null
          visibilidade: string
        }
        Insert: {
          ambiente_id?: string | null
          ativo?: boolean | null
          bloqueio_fim?: string | null
          bloqueio_inicio?: string | null
          campos_formulario?: Json | null
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
          link_grupo_whatsapp?: string | null
          link_grupo_whatsapp_equipe?: string | null
          link_grupo_whatsapp_ministradores?: string | null
          link_grupo_whatsapp_participantes?: string | null
          local?: string | null
          local_tipo?: string
          motivo_rejeicao?: string | null
          necessita_inscricao?: boolean
          observacoes?: string | null
          recorrente?: boolean | null
          semana_mes?: number | null
          solicitante_id?: string | null
          status?: string
          tem_custo?: boolean | null
          tem_refeicao?: boolean | null
          tipo_evento: string
          tipo_recorrencia?: string | null
          titulo: string
          updated_at?: string
          vagas_por_tipo?: Json | null
          valor_custo?: number | null
          valores_por_tipo?: Json | null
          visibilidade?: string
        }
        Update: {
          ambiente_id?: string | null
          ativo?: boolean | null
          bloqueio_fim?: string | null
          bloqueio_inicio?: string | null
          campos_formulario?: Json | null
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
          link_grupo_whatsapp?: string | null
          link_grupo_whatsapp_equipe?: string | null
          link_grupo_whatsapp_ministradores?: string | null
          link_grupo_whatsapp_participantes?: string | null
          local?: string | null
          local_tipo?: string
          motivo_rejeicao?: string | null
          necessita_inscricao?: boolean
          observacoes?: string | null
          recorrente?: boolean | null
          semana_mes?: number | null
          solicitante_id?: string | null
          status?: string
          tem_custo?: boolean | null
          tem_refeicao?: boolean | null
          tipo_evento?: string
          tipo_recorrencia?: string | null
          titulo?: string
          updated_at?: string
          vagas_por_tipo?: Json | null
          valor_custo?: number | null
          valores_por_tipo?: Json | null
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_igreja_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_igreja_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_igreja_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ambientes: {
        Row: {
          ativo: boolean
          capacidade: number | null
          created_at: string
          descricao: string | null
          foto_url: string | null
          id: string
          nome: string
          recursos: string[] | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          recursos?: string[] | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          recursos?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      aniversarios_enviados: {
        Row: {
          created_at: string
          data_envio: string
          erro_mensagem: string | null
          id: string
          inscricao_evento_id: string | null
          member_id: string | null
          novo_convertido_id: string | null
          sucesso: boolean
        }
        Insert: {
          created_at?: string
          data_envio?: string
          erro_mensagem?: string | null
          id?: string
          inscricao_evento_id?: string | null
          member_id?: string | null
          novo_convertido_id?: string | null
          sucesso?: boolean
        }
        Update: {
          created_at?: string
          data_envio?: string
          erro_mensagem?: string | null
          id?: string
          inscricao_evento_id?: string | null
          member_id?: string | null
          novo_convertido_id?: string | null
          sucesso?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aniversarios_enviados_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aniversarios_enviados_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aniversarios_enviados_novo_convertido_id_fkey"
            columns: ["novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacao_criancas_inscricoes: {
        Row: {
          created_at: string
          crianca_cpf: string | null
          crianca_data_nascimento: string | null
          crianca_genero: string | null
          crianca_nome: string
          evento_id: string
          id: string
          mae_member_id: string | null
          mae_nome: string | null
          mae_request_id: string | null
          observacoes: string | null
          pai_member_id: string | null
          pai_nome: string | null
          pai_request_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crianca_cpf?: string | null
          crianca_data_nascimento?: string | null
          crianca_genero?: string | null
          crianca_nome: string
          evento_id: string
          id?: string
          mae_member_id?: string | null
          mae_nome?: string | null
          mae_request_id?: string | null
          observacoes?: string | null
          pai_member_id?: string | null
          pai_nome?: string | null
          pai_request_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crianca_cpf?: string | null
          crianca_data_nascimento?: string | null
          crianca_genero?: string | null
          crianca_nome?: string
          evento_id?: string
          id?: string
          mae_member_id?: string | null
          mae_nome?: string | null
          mae_request_id?: string | null
          observacoes?: string | null
          pai_member_id?: string | null
          pai_nome?: string | null
          pai_request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_igreja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_mae_member_id_fkey"
            columns: ["mae_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_mae_member_id_fkey"
            columns: ["mae_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_mae_request_id_fkey"
            columns: ["mae_request_id"]
            isOneToOne: false
            referencedRelation: "member_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_pai_member_id_fkey"
            columns: ["pai_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_pai_member_id_fkey"
            columns: ["pai_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_criancas_inscricoes_pai_request_id_fkey"
            columns: ["pai_request_id"]
            isOneToOne: false
            referencedRelation: "member_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      candidaturas_ministerio: {
        Row: {
          created_at: string
          id: string
          member_id: string
          mensagem: string | null
          ministry_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          mensagem?: string | null
          ministry_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          mensagem?: string | null
          ministry_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_ministerio_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_ministerio_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_ministerio_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      casais_despesas: {
        Row: {
          categoria: string
          created_at: string
          data_despesa: string
          descricao: string | null
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      casais_inscritos: {
        Row: {
          aceite_confidencialidade: boolean | null
          aceite_imagem: boolean | null
          bairro: string | null
          casa_refugio_id: string | null
          cep: string | null
          certificado_emitido: boolean | null
          cidade: string | null
          complemento: string | null
          congrega_gileade: boolean | null
          created_at: string
          data_casamento: string | null
          data_certificado: string | null
          data_modalidade: string | null
          email_feminino: string | null
          email_masculino: string | null
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          ja_foi_casado: boolean | null
          membro_feminino_id: string | null
          membro_masculino_id: string | null
          modalidade_casamento: string | null
          nome_feminino: string | null
          nome_masculino: string | null
          numero_endereco: string | null
          observacoes: string | null
          onde_congrega: string | null
          qtd_filhos_meninas: number | null
          qtd_filhos_meninos: number | null
          quantas_vezes_casado: number | null
          status: string | null
          tempo_casamento: string | null
          turma_id: string | null
          updated_at: string
          whatsapp_feminino: string | null
          whatsapp_masculino: string | null
        }
        Insert: {
          aceite_confidencialidade?: boolean | null
          aceite_imagem?: boolean | null
          bairro?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          certificado_emitido?: boolean | null
          cidade?: string | null
          complemento?: string | null
          congrega_gileade?: boolean | null
          created_at?: string
          data_casamento?: string | null
          data_certificado?: string | null
          data_modalidade?: string | null
          email_feminino?: string | null
          email_masculino?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          ja_foi_casado?: boolean | null
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          modalidade_casamento?: string | null
          nome_feminino?: string | null
          nome_masculino?: string | null
          numero_endereco?: string | null
          observacoes?: string | null
          onde_congrega?: string | null
          qtd_filhos_meninas?: number | null
          qtd_filhos_meninos?: number | null
          quantas_vezes_casado?: number | null
          status?: string | null
          tempo_casamento?: string | null
          turma_id?: string | null
          updated_at?: string
          whatsapp_feminino?: string | null
          whatsapp_masculino?: string | null
        }
        Update: {
          aceite_confidencialidade?: boolean | null
          aceite_imagem?: boolean | null
          bairro?: string | null
          casa_refugio_id?: string | null
          cep?: string | null
          certificado_emitido?: boolean | null
          cidade?: string | null
          complemento?: string | null
          congrega_gileade?: boolean | null
          created_at?: string
          data_casamento?: string | null
          data_certificado?: string | null
          data_modalidade?: string | null
          email_feminino?: string | null
          email_masculino?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          ja_foi_casado?: boolean | null
          membro_feminino_id?: string | null
          membro_masculino_id?: string | null
          modalidade_casamento?: string | null
          nome_feminino?: string | null
          nome_masculino?: string | null
          numero_endereco?: string | null
          observacoes?: string | null
          onde_congrega?: string | null
          qtd_filhos_meninas?: number | null
          qtd_filhos_meninos?: number | null
          quantas_vezes_casado?: number | null
          status?: string | null
          tempo_casamento?: string | null
          turma_id?: string | null
          updated_at?: string
          whatsapp_feminino?: string | null
          whatsapp_masculino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casais_inscritos_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_membro_feminino_id_fkey"
            columns: ["membro_feminino_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_membro_feminino_id_fkey"
            columns: ["membro_feminino_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "casais_inscritos_membro_masculino_id_fkey"
            columns: ["membro_masculino_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      casais_inscritos_filhos: {
        Row: {
          created_at: string
          genero: string | null
          id: string
          idade: number | null
          inscricao_id: string
          member_id: string | null
          nome: string
        }
        Insert: {
          created_at?: string
          genero?: string | null
          id?: string
          idade?: number | null
          inscricao_id: string
          member_id?: string | null
          nome: string
        }
        Update: {
          created_at?: string
          genero?: string | null
          id?: string
          idade?: number | null
          inscricao_id?: string
          member_id?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "casais_inscritos_filhos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "casais_inscritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_filhos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_inscritos_filhos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "casais_lideres_membro_feminino_id_fkey"
            columns: ["membro_feminino_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "casais_lideres_membro_masculino_id_fkey"
            columns: ["membro_masculino_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      casais_pagamentos: {
        Row: {
          casal_id: string
          created_at: string
          data_pagamento: string | null
          data_previsao: string | null
          forma_pagamento: string | null
          id: string
          mes_referencia: string | null
          observacoes: string | null
          registrado_por: string | null
          status: string
          turma_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          casal_id: string
          created_at?: string
          data_pagamento?: string | null
          data_previsao?: string | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          status?: string
          turma_id?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          casal_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_previsao?: string | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          status?: string
          turma_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "casais_pagamentos_casal_id_fkey"
            columns: ["casal_id"]
            isOneToOne: false
            referencedRelation: "casais_inscritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_pagamentos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_pagamentos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_pagamentos_turma_id_fkey"
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
      casais_professores: {
        Row: {
          ativo: boolean
          created_at: string
          dia_semana: string
          esposa_id: string | null
          horario: string
          id: string
          marido_id: string | null
          observacoes: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_semana: string
          esposa_id?: string | null
          horario: string
          id?: string
          marido_id?: string | null
          observacoes?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_semana?: string
          esposa_id?: string | null
          horario?: string
          id?: string
          marido_id?: string | null
          observacoes?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casais_professores_esposa_id_fkey"
            columns: ["esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_professores_esposa_id_fkey"
            columns: ["esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_professores_marido_id_fkey"
            columns: ["marido_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_professores_marido_id_fkey"
            columns: ["marido_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casais_professores_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "casais_turmas"
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
          dia_semana: string | null
          horario: string | null
          horario_fim: string | null
          horario_inicio: string | null
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
          dia_semana?: string | null
          horario?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
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
          dia_semana?: string | null
          horario?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
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
          anfitriao_esposa_id: string | null
          anfitriao_id: string | null
          anfitrioes: string | null
          cep: string | null
          city: string | null
          complement: string | null
          condominio: string | null
          created_at: string
          data_inicio_cr: string | null
          dias: string | null
          frequencia: string | null
          id: string
          latitude: number | null
          lider_esposa_id: string | null
          lider_id: string | null
          lideres: string | null
          longitude: number | null
          name: string
          neighborhood: string | null
          numero: string | null
          state: string | null
          supervisor_esposa_id: string | null
          supervisor_id: string | null
          supervisores: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          anfitriao_esposa_id?: string | null
          anfitriao_id?: string | null
          anfitrioes?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          condominio?: string | null
          created_at?: string
          data_inicio_cr?: string | null
          dias?: string | null
          frequencia?: string | null
          id?: string
          latitude?: number | null
          lider_esposa_id?: string | null
          lider_id?: string | null
          lideres?: string | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          numero?: string | null
          state?: string | null
          supervisor_esposa_id?: string | null
          supervisor_id?: string | null
          supervisores?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          anfitriao_esposa_id?: string | null
          anfitriao_id?: string | null
          anfitrioes?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          condominio?: string | null
          created_at?: string
          data_inicio_cr?: string | null
          dias?: string | null
          frequencia?: string | null
          id?: string
          latitude?: number | null
          lider_esposa_id?: string | null
          lider_id?: string | null
          lideres?: string | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          numero?: string | null
          state?: string | null
          supervisor_esposa_id?: string | null
          supervisor_id?: string | null
          supervisores?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casas_refugio_anfitriao_esposa_id_fkey"
            columns: ["anfitriao_esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_anfitriao_esposa_id_fkey"
            columns: ["anfitriao_esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_anfitriao_id_fkey"
            columns: ["anfitriao_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_anfitriao_id_fkey"
            columns: ["anfitriao_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_lider_esposa_id_fkey"
            columns: ["lider_esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_lider_esposa_id_fkey"
            columns: ["lider_esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_supervisor_esposa_id_fkey"
            columns: ["supervisor_esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_supervisor_esposa_id_fkey"
            columns: ["supervisor_esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casas_refugio_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      casas_refugio_dia_historico: {
        Row: {
          casa_refugio_id: string
          created_at: string
          dias: string
          frequencia: string | null
          id: string
          vigente_desde: string
        }
        Insert: {
          casa_refugio_id: string
          created_at?: string
          dias: string
          frequencia?: string | null
          id?: string
          vigente_desde?: string
        }
        Update: {
          casa_refugio_id?: string
          created_at?: string
          dias?: string
          frequencia?: string | null
          id?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "casas_refugio_dia_historico_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_mensagem_config: {
        Row: {
          ativo: boolean
          categoria_evento: string
          created_at: string
          id: string
          tipo_mensagem: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_evento: string
          created_at?: string
          id?: string
          tipo_mensagem: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_evento?: string
          created_at?: string
          id?: string
          tipo_mensagem?: string
          updated_at?: string
        }
        Relationships: []
      }
      comunicacao_envios: {
        Row: {
          conteudo: string | null
          created_at: string
          destinatario_member_id: string | null
          destinatario_nome: string | null
          destinatario_telefone: string | null
          erro_mensagem: string | null
          evento_id: string | null
          fila_id: string | null
          id: string
          iniciado_por: string | null
          midia_url: string | null
          segmento: string | null
          status: string
          tentativas: number
          tipo: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          destinatario_member_id?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string | null
          erro_mensagem?: string | null
          evento_id?: string | null
          fila_id?: string | null
          id?: string
          iniciado_por?: string | null
          midia_url?: string | null
          segmento?: string | null
          status?: string
          tentativas?: number
          tipo: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          destinatario_member_id?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string | null
          erro_mensagem?: string | null
          evento_id?: string | null
          fila_id?: string | null
          id?: string
          iniciado_por?: string | null
          midia_url?: string | null
          segmento?: string | null
          status?: string
          tentativas?: number
          tipo?: string
        }
        Relationships: []
      }
      comunicacao_fila: {
        Row: {
          conteudo: string
          created_at: string
          dedupe_hash: string
          destinatario_member_id: string | null
          destinatario_nome: string | null
          destinatario_telefone: string
          enviado_em: string | null
          evento_id: string | null
          id: string
          iniciado_por: string | null
          max_tentativas: number
          midia_url: string | null
          proxima_tentativa_em: string
          segmento: string | null
          status: string
          tentativas: number
          tipo: string
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          dedupe_hash: string
          destinatario_member_id?: string | null
          destinatario_nome?: string | null
          destinatario_telefone: string
          enviado_em?: string | null
          evento_id?: string | null
          id?: string
          iniciado_por?: string | null
          max_tentativas?: number
          midia_url?: string | null
          proxima_tentativa_em?: string
          segmento?: string | null
          status?: string
          tentativas?: number
          tipo: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          dedupe_hash?: string
          destinatario_member_id?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string
          enviado_em?: string | null
          evento_id?: string | null
          id?: string
          iniciado_por?: string | null
          max_tentativas?: number
          midia_url?: string | null
          proxima_tentativa_em?: string
          segmento?: string | null
          status?: string
          tentativas?: number
          tipo?: string
          ultimo_erro?: string | null
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
          sindico_esposa_id: string | null
          sindico_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sindico_esposa_id?: string | null
          sindico_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sindico_esposa_id?: string | null
          sindico_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominios_sindico_esposa_id_fkey"
            columns: ["sindico_esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condominios_sindico_esposa_id_fkey"
            columns: ["sindico_esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condominios_sindico_id_fkey"
            columns: ["sindico_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condominios_sindico_id_fkey"
            columns: ["sindico_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contingencia_acoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          incidente_id: string
          responsavel_id: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          incidente_id: string
          responsavel_id?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          incidente_id?: string
          responsavel_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contingencia_acoes_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "contingencia_incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_acoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_acoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contingencia_backups: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          hash_integridade: string | null
          id: string
          localizacao: string | null
          observacoes: string | null
          responsavel_id: string | null
          status: string
          tamanho_bytes: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          hash_integridade?: string | null
          id?: string
          localizacao?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          hash_integridade?: string | null
          id?: string
          localizacao?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contingencia_backups_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_backups_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contingencia_incidentes: {
        Row: {
          analise_pos_incidente: string | null
          checklist_contencao: boolean | null
          checklist_encerramento: boolean | null
          checklist_identificacao: boolean | null
          checklist_recuperacao: boolean | null
          checklist_validacao: boolean | null
          created_at: string
          descricao: string | null
          hora_contencao: string | null
          hora_encerramento: string | null
          hora_inicio: string
          hora_resolucao: string | null
          id: string
          impacto: string | null
          plano_comunicacao: string | null
          responsavel_id: string | null
          rpo_minutos: number | null
          rto_minutos: number | null
          severidade: string
          status: string
          tipo_falha: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          analise_pos_incidente?: string | null
          checklist_contencao?: boolean | null
          checklist_encerramento?: boolean | null
          checklist_identificacao?: boolean | null
          checklist_recuperacao?: boolean | null
          checklist_validacao?: boolean | null
          created_at?: string
          descricao?: string | null
          hora_contencao?: string | null
          hora_encerramento?: string | null
          hora_inicio?: string
          hora_resolucao?: string | null
          id?: string
          impacto?: string | null
          plano_comunicacao?: string | null
          responsavel_id?: string | null
          rpo_minutos?: number | null
          rto_minutos?: number | null
          severidade?: string
          status?: string
          tipo_falha?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          analise_pos_incidente?: string | null
          checklist_contencao?: boolean | null
          checklist_encerramento?: boolean | null
          checklist_identificacao?: boolean | null
          checklist_recuperacao?: boolean | null
          checklist_validacao?: boolean | null
          created_at?: string
          descricao?: string | null
          hora_contencao?: string | null
          hora_encerramento?: string | null
          hora_inicio?: string
          hora_resolucao?: string | null
          id?: string
          impacto?: string | null
          plano_comunicacao?: string | null
          responsavel_id?: string | null
          rpo_minutos?: number | null
          rto_minutos?: number | null
          severidade?: string
          status?: string
          tipo_falha?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contingencia_incidentes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_incidentes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contingencia_procedimentos: {
        Row: {
          ativo: boolean
          atualizado_por: string | null
          categoria: string
          conteudo: string
          created_at: string
          id: string
          ordem: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atualizado_por?: string | null
          categoria: string
          conteudo: string
          created_at?: string
          id?: string
          ordem?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atualizado_por?: string | null
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contingencia_procedimentos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_procedimentos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contingencia_versoes: {
        Row: {
          commit_hash: string | null
          created_at: string
          data_deploy: string
          descricao: string | null
          estavel: boolean
          id: string
          observacoes: string | null
          responsavel_id: string | null
          rollback_disponivel: boolean
          versao: string
        }
        Insert: {
          commit_hash?: string | null
          created_at?: string
          data_deploy?: string
          descricao?: string | null
          estavel?: boolean
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          rollback_disponivel?: boolean
          versao: string
        }
        Update: {
          commit_hash?: string | null
          created_at?: string
          data_deploy?: string
          descricao?: string | null
          estavel?: boolean
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          rollback_disponivel?: boolean
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "contingencia_versoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contingencia_versoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_express: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          arquivo_url: string | null
          avisos_importantes: string | null
          conclusao: string | null
          created_at: string
          data_culto: string
          desenvolvimento: string | null
          gerado_por: string | null
          id: string
          introducao: string | null
          numero: string
          pastor_ministrador: string
          status: string
          tema: string
          texto_base: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          arquivo_url?: string | null
          avisos_importantes?: string | null
          conclusao?: string | null
          created_at?: string
          data_culto: string
          desenvolvimento?: string | null
          gerado_por?: string | null
          id?: string
          introducao?: string | null
          numero: string
          pastor_ministrador: string
          status?: string
          tema: string
          texto_base: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          arquivo_url?: string | null
          avisos_importantes?: string | null
          conclusao?: string | null
          created_at?: string
          data_culto?: string
          desenvolvimento?: string | null
          gerado_por?: string | null
          id?: string
          introducao?: string | null
          numero?: string
          pastor_ministrador?: string
          status?: string
          tema?: string
          texto_base?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cr_express_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_express_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_express_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cr_express_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "danca_equipe_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      emergencia_envios_log: {
        Row: {
          enviado_em: string
          enviado_por: string | null
          erro: string | null
          evento_id: string
          evento_tipo: string
          id: string
          inscricao_id: string | null
          mensagem_enviada: string
          nome_contato_emergencia: string | null
          nome_participante: string | null
          status: string
          telefone_destino: string
          tipo_envio: string
        }
        Insert: {
          enviado_em?: string
          enviado_por?: string | null
          erro?: string | null
          evento_id: string
          evento_tipo: string
          id?: string
          inscricao_id?: string | null
          mensagem_enviada: string
          nome_contato_emergencia?: string | null
          nome_participante?: string | null
          status?: string
          telefone_destino: string
          tipo_envio: string
        }
        Update: {
          enviado_em?: string
          enviado_por?: string | null
          erro?: string | null
          evento_id?: string
          evento_tipo?: string
          id?: string
          inscricao_id?: string | null
          mensagem_enviada?: string
          nome_contato_emergencia?: string | null
          nome_participante?: string | null
          status?: string
          telefone_destino?: string
          tipo_envio?: string
        }
        Relationships: []
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
            foreignKeyName: "encontro_presencas_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          conferido: boolean
          conferido_em: string | null
          conferido_por: string | null
          created_at: string
          data_encontro: string
          data_esperada: string | null
          id: string
          justificativa: string | null
          kilos_arrecadados: number | null
          observacoes: string | null
          ofertas: number | null
          ofertas_dinheiro: number | null
          ofertas_pix: number | null
          photo_url: string | null
          qtd_criancas: number
          qtd_lideres: number
          qtd_membros: number
          qtd_visitantes: number
          reuniao_realizada: boolean
          updated_at: string
        }
        Insert: {
          casa_refugio_id: string
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          data_encontro: string
          data_esperada?: string | null
          id?: string
          justificativa?: string | null
          kilos_arrecadados?: number | null
          observacoes?: string | null
          ofertas?: number | null
          ofertas_dinheiro?: number | null
          ofertas_pix?: number | null
          photo_url?: string | null
          qtd_criancas?: number
          qtd_lideres?: number
          qtd_membros?: number
          qtd_visitantes?: number
          reuniao_realizada?: boolean
          updated_at?: string
        }
        Update: {
          casa_refugio_id?: string
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          data_encontro?: string
          data_esperada?: string | null
          id?: string
          justificativa?: string | null
          kilos_arrecadados?: number | null
          observacoes?: string | null
          ofertas?: number | null
          ofertas_dinheiro?: number | null
          ofertas_pix?: number | null
          photo_url?: string | null
          qtd_criancas?: number
          qtd_lideres?: number
          qtd_membros?: number
          qtd_visitantes?: number
          reuniao_realizada?: boolean
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
          {
            foreignKeyName: "encontros_casa_refugio_conferido_por_fkey"
            columns: ["conferido_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encontros_casa_refugio_conferido_por_fkey"
            columns: ["conferido_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      escala_servico_membros: {
        Row: {
          created_at: string
          escala_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          escala_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          escala_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escala_servico_membros_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_servico_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escala_servico_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas_servico: {
        Row: {
          casa_refugio_id: string | null
          created_at: string
          data_culto: string
          id: string
          member_id: string | null
          ministry_id: string
          observacoes: string | null
          status: string
          tipo_culto: string
          tipo_escala: string
          updated_at: string
        }
        Insert: {
          casa_refugio_id?: string | null
          created_at?: string
          data_culto: string
          id?: string
          member_id?: string | null
          ministry_id: string
          observacoes?: string | null
          status?: string
          tipo_culto: string
          tipo_escala: string
          updated_at?: string
        }
        Update: {
          casa_refugio_id?: string | null
          created_at?: string
          data_culto?: string
          id?: string
          member_id?: string | null
          ministry_id?: string
          observacoes?: string | null
          status?: string
          tipo_culto?: string
          tipo_escala?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_servico_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servico_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servico_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servico_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
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
          {
            foreignKeyName: "evangelizacao_frentes_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "evangelizacao_frentes_membros_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_emergencia_config: {
        Row: {
          ativo: boolean
          created_at: string
          data_envio_unico: string | null
          data_inicio_recorrencia: string | null
          enviar_recorrente: boolean
          evento_id: string
          evento_tipo: string
          frequencia_dias: number
          id: string
          mensagem_inicial: string
          mensagem_recorrente: string
          modo_envio: string
          recorrencia_dia_semana: number | null
          recorrencia_dias_semana: number[]
          recorrencia_hora: string
          recorrencia_meses: number[]
          recorrencia_semana_ordinal: string | null
          recorrencia_tipo: string
          tipo_mensagem: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_envio_unico?: string | null
          data_inicio_recorrencia?: string | null
          enviar_recorrente?: boolean
          evento_id: string
          evento_tipo: string
          frequencia_dias?: number
          id?: string
          mensagem_inicial?: string
          mensagem_recorrente?: string
          modo_envio?: string
          recorrencia_dia_semana?: number | null
          recorrencia_dias_semana?: number[]
          recorrencia_hora?: string
          recorrencia_meses?: number[]
          recorrencia_semana_ordinal?: string | null
          recorrencia_tipo?: string
          tipo_mensagem?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_envio_unico?: string | null
          data_inicio_recorrencia?: string | null
          enviar_recorrente?: boolean
          evento_id?: string
          evento_tipo?: string
          frequencia_dias?: number
          id?: string
          mensagem_inicial?: string
          mensagem_recorrente?: string
          modo_envio?: string
          recorrencia_dia_semana?: number | null
          recorrencia_dias_semana?: number[]
          recorrencia_hora?: string
          recorrencia_meses?: number[]
          recorrencia_semana_ordinal?: string | null
          recorrencia_tipo?: string
          tipo_mensagem?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_avisos: {
        Row: {
          ativo: boolean
          created_at: string
          data: string | null
          descricao: string
          horario: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data?: string | null
          descricao: string
          horario?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data?: string | null
          descricao?: string
          horario?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_carrossel: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          imagem_url: string
          link_url: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url: string
          link_url?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url?: string
          link_url?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_config: {
        Row: {
          created_at: string
          facebook: string | null
          hero_image_url: string | null
          hero_subtitulo: string | null
          hero_titulo: string
          id: string
          instagram: string | null
          lema: string
          mensagem_aniversario: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string
          youtube: string | null
        }
        Insert: {
          created_at?: string
          facebook?: string | null
          hero_image_url?: string | null
          hero_subtitulo?: string | null
          hero_titulo?: string
          id?: string
          instagram?: string | null
          lema?: string
          mensagem_aniversario?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Update: {
          created_at?: string
          facebook?: string | null
          hero_image_url?: string | null
          hero_subtitulo?: string | null
          hero_titulo?: string
          id?: string
          instagram?: string | null
          lema?: string
          mensagem_aniversario?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Relationships: []
      }
      homepage_programacao: {
        Row: {
          ativo: boolean | null
          created_at: string
          dia_semana: number
          horario: string | null
          id: string
          ordem: number | null
          subtitulo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          dia_semana: number
          horario?: string | null
          id?: string
          ordem?: number | null
          subtitulo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          dia_semana?: number
          horario?: string | null
          id?: string
          ordem?: number | null
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_videos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          thumbnail_url: string | null
          titulo: string
          updated_at: string
          video_url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo: string
          updated_at?: string
          video_url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
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
          latitude: number | null
          logo_dark_url: string | null
          logo_dark_url_2: string | null
          logo_icon_url: string | null
          logo_light_url: string | null
          logo_light_url_2: string | null
          logo_url: string | null
          longitude: number | null
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
          latitude?: number | null
          logo_dark_url?: string | null
          logo_dark_url_2?: string | null
          logo_icon_url?: string | null
          logo_light_url?: string | null
          logo_light_url_2?: string | null
          logo_url?: string | null
          longitude?: number | null
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
          latitude?: number | null
          logo_dark_url?: string | null
          logo_dark_url_2?: string | null
          logo_icon_url?: string | null
          logo_light_url?: string | null
          logo_light_url_2?: string | null
          logo_url?: string | null
          longitude?: number | null
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
      igreja_pix: {
        Row: {
          ativo: boolean
          chave: string
          cidade: string | null
          created_at: string
          descricao: string | null
          id: string
          nome_beneficiario: string
          tipo_chave: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_beneficiario: string
          tipo_chave: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          cidade?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_beneficiario?: string
          tipo_chave?: string
          updated_at?: string
        }
        Relationships: []
      }
      impacto_departamentos: {
        Row: {
          created_at: string
          evento_id: string
          id: string
          lider_id: string | null
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          id?: string
          lider_id?: string | null
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          id?: string
          lider_id?: string | null
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impacto_departamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "impacto_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_departamentos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_departamentos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      impacto_despesas: {
        Row: {
          categoria: string
          created_at: string
          data_despesa: string
          descricao: string | null
          evento_id: string
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          evento_id: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          evento_id?: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "impacto_despesas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "impacto_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      impacto_equipe_membros: {
        Row: {
          created_at: string
          departamento_id: string
          funcao: string | null
          id: string
          member_id: string | null
          nome_manual: string | null
        }
        Insert: {
          created_at?: string
          departamento_id: string
          funcao?: string | null
          id?: string
          member_id?: string | null
          nome_manual?: string | null
        }
        Update: {
          created_at?: string
          departamento_id?: string
          funcao?: string | null
          id?: string
          member_id?: string | null
          nome_manual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impacto_equipe_membros_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "impacto_departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_equipe_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_equipe_membros_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      impacto_eventos: {
        Row: {
          ativo: boolean
          campos_formulario: Json | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          finalizado: boolean
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          limite_vagas: number | null
          link_grupo_whatsapp: string | null
          link_grupo_whatsapp_equipe: string | null
          link_grupo_whatsapp_ministradores: string | null
          link_grupo_whatsapp_participantes: string | null
          local: string | null
          prefixo_referencia: string | null
          tem_custo: boolean | null
          tipo: string
          tipos_inscricao: string[] | null
          titulo: string
          updated_at: string
          valor_inscricao: number | null
          valores_por_tipo: Json | null
        }
        Insert: {
          ativo?: boolean
          campos_formulario?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          finalizado?: boolean
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          limite_vagas?: number | null
          link_grupo_whatsapp?: string | null
          link_grupo_whatsapp_equipe?: string | null
          link_grupo_whatsapp_ministradores?: string | null
          link_grupo_whatsapp_participantes?: string | null
          local?: string | null
          prefixo_referencia?: string | null
          tem_custo?: boolean | null
          tipo: string
          tipos_inscricao?: string[] | null
          titulo: string
          updated_at?: string
          valor_inscricao?: number | null
          valores_por_tipo?: Json | null
        }
        Update: {
          ativo?: boolean
          campos_formulario?: Json | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          finalizado?: boolean
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          limite_vagas?: number | null
          link_grupo_whatsapp?: string | null
          link_grupo_whatsapp_equipe?: string | null
          link_grupo_whatsapp_ministradores?: string | null
          link_grupo_whatsapp_participantes?: string | null
          local?: string | null
          prefixo_referencia?: string | null
          tem_custo?: boolean | null
          tipo?: string
          tipos_inscricao?: string[] | null
          titulo?: string
          updated_at?: string
          valor_inscricao?: number | null
          valores_por_tipo?: Json | null
        }
        Relationships: []
      }
      impacto_inscricoes: {
        Row: {
          aprovado: boolean
          converteu: boolean
          created_at: string
          data_nascimento: string | null
          data_pagamento: string | null
          email: string | null
          evento_id: string
          forma_pagamento: string | null
          genero: string | null
          id: string
          member_id: string | null
          nome: string
          nome_responsavel: string | null
          observacoes: string | null
          pagamentos: Json | null
          previsoes_pagamento: Json | null
          reconciliou: boolean
          referencia: string | null
          status_pagamento: string
          telefone: string | null
          telefone_emergencia: string | null
          telefone_responsavel: string | null
          tipo_inscricao: string | null
          updated_at: string
          valor_inscricao: number | null
          valor_pago: number | null
        }
        Insert: {
          aprovado?: boolean
          converteu?: boolean
          created_at?: string
          data_nascimento?: string | null
          data_pagamento?: string | null
          email?: string | null
          evento_id: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          member_id?: string | null
          nome: string
          nome_responsavel?: string | null
          observacoes?: string | null
          pagamentos?: Json | null
          previsoes_pagamento?: Json | null
          reconciliou?: boolean
          referencia?: string | null
          status_pagamento?: string
          telefone?: string | null
          telefone_emergencia?: string | null
          telefone_responsavel?: string | null
          tipo_inscricao?: string | null
          updated_at?: string
          valor_inscricao?: number | null
          valor_pago?: number | null
        }
        Update: {
          aprovado?: boolean
          converteu?: boolean
          created_at?: string
          data_nascimento?: string | null
          data_pagamento?: string | null
          email?: string | null
          evento_id?: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          member_id?: string | null
          nome?: string
          nome_responsavel?: string | null
          observacoes?: string | null
          pagamentos?: Json | null
          previsoes_pagamento?: Json | null
          reconciliou?: boolean
          referencia?: string | null
          status_pagamento?: string
          telefone?: string | null
          telefone_emergencia?: string | null
          telefone_responsavel?: string | null
          tipo_inscricao?: string | null
          updated_at?: string
          valor_inscricao?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impacto_inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "impacto_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_inscricoes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impacto_inscricoes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_eventos: {
        Row: {
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          casa_refugio_id: string | null
          cpf: string | null
          created_at: string
          descricao_alergia: string | null
          descricao_medicamento: string | null
          evento_id: string
          forma_pagamento: string | null
          genero: string | null
          id: string
          igreja_congrega: string | null
          is_menor: boolean | null
          lista_espera: boolean | null
          member_id: string | null
          ministerio_igreja: string | null
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
          tipo_inscricao: string | null
          toma_medicamento: boolean | null
          updated_at: string
          valor_inscricao: number | null
        }
        Insert: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          casa_refugio_id?: string | null
          cpf?: string | null
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          igreja_congrega?: string | null
          is_menor?: boolean | null
          lista_espera?: boolean | null
          member_id?: string | null
          ministerio_igreja?: string | null
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
          tipo_inscricao?: string | null
          toma_medicamento?: boolean | null
          updated_at?: string
          valor_inscricao?: number | null
        }
        Update: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          casa_refugio_id?: string | null
          cpf?: string | null
          created_at?: string
          descricao_alergia?: string | null
          descricao_medicamento?: string | null
          evento_id?: string
          forma_pagamento?: string | null
          genero?: string | null
          id?: string
          igreja_congrega?: string | null
          is_menor?: boolean | null
          lista_espera?: boolean | null
          member_id?: string | null
          ministerio_igreja?: string | null
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
          tipo_inscricao?: string | null
          toma_medicamento?: boolean | null
          updated_at?: string
          valor_inscricao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_eventos_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "inscricoes_eventos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      jiujitsu_alunos: {
        Row: {
          alergias: string | null
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          faixa: string
          foto_url: string | null
          genero: string | null
          graus: number
          id: string
          medicamento_continuo: string | null
          member_id: string | null
          nome: string
          plano_saude: boolean | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          restricao_fisica: string | null
          telefone: string | null
          termo_emergencia_aceito: boolean | null
          termo_imagem_aceito: boolean | null
          tipo: string
          tipo_sanguineo: string | null
          turma_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alergias?: string | null
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          faixa?: string
          foto_url?: string | null
          genero?: string | null
          graus?: number
          id?: string
          medicamento_continuo?: string | null
          member_id?: string | null
          nome: string
          plano_saude?: boolean | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          restricao_fisica?: string | null
          telefone?: string | null
          termo_emergencia_aceito?: boolean | null
          termo_imagem_aceito?: boolean | null
          tipo?: string
          tipo_sanguineo?: string | null
          turma_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alergias?: string | null
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          faixa?: string
          foto_url?: string | null
          genero?: string | null
          graus?: number
          id?: string
          medicamento_continuo?: string | null
          member_id?: string | null
          nome?: string
          plano_saude?: boolean | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          restricao_fisica?: string | null
          telefone?: string | null
          termo_emergencia_aceito?: boolean | null
          termo_imagem_aceito?: boolean | null
          tipo?: string
          tipo_sanguineo?: string | null
          turma_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_alunos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_alunos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "jiujitsu_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      jiujitsu_despesas: {
        Row: {
          categoria: string
          created_at: string
          data_despesa: string
          descricao: string | null
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      jiujitsu_graduacoes: {
        Row: {
          aluno_id: string
          created_at: string
          data_graduacao: string
          faixa_anterior: string | null
          faixa_nova: string
          graus: number
          id: string
          observacoes: string | null
          professor: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_graduacao: string
          faixa_anterior?: string | null
          faixa_nova: string
          graus?: number
          id?: string
          observacoes?: string | null
          professor?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_graduacao?: string
          faixa_anterior?: string | null
          faixa_nova?: string
          graus?: number
          id?: string
          observacoes?: string | null
          professor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_graduacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "jiujitsu_alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      jiujitsu_inscricoes: {
        Row: {
          alergias: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          genero: string | null
          id: string
          medicamento_continuo: string | null
          member_id: string | null
          nome: string
          observacoes: string | null
          plano_saude: boolean | null
          possui_graduacao: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          restricao_fisica: string | null
          status: string
          telefone: string | null
          termo_emergencia_aceito: boolean | null
          termo_imagem_aceito: boolean | null
          tipo: string
          turma_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alergias?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          medicamento_continuo?: string | null
          member_id?: string | null
          nome: string
          observacoes?: string | null
          plano_saude?: boolean | null
          possui_graduacao?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          restricao_fisica?: string | null
          status?: string
          telefone?: string | null
          termo_emergencia_aceito?: boolean | null
          termo_imagem_aceito?: boolean | null
          tipo?: string
          turma_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alergias?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          medicamento_continuo?: string | null
          member_id?: string | null
          nome?: string
          observacoes?: string | null
          plano_saude?: boolean | null
          possui_graduacao?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          restricao_fisica?: string | null
          status?: string
          telefone?: string | null
          termo_emergencia_aceito?: boolean | null
          termo_imagem_aceito?: boolean | null
          tipo?: string
          turma_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_inscricoes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_inscricoes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_inscricoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "jiujitsu_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      jiujitsu_pagamentos: {
        Row: {
          aluno_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          valor: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          valor?: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "jiujitsu_alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      jiujitsu_professores: {
        Row: {
          ativo: boolean
          created_at: string
          faixa_etaria: string
          funcao: string
          id: string
          member_id: string | null
          nome: string
          observacoes: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          faixa_etaria: string
          funcao?: string
          id?: string
          member_id?: string | null
          nome: string
          observacoes?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          faixa_etaria?: string
          funcao?: string
          id?: string
          member_id?: string | null
          nome?: string
          observacoes?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_professores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_professores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_professores_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "jiujitsu_turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      jiujitsu_turmas: {
        Row: {
          ativo: boolean
          categoria_idade: string
          created_at: string
          dia_semana: string | null
          faixa_maxima: string
          faixa_minima: string
          horario: string | null
          id: string
          lider_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_idade?: string
          created_at?: string
          dia_semana?: string | null
          faixa_maxima?: string
          faixa_minima?: string
          horario?: string | null
          id?: string
          lider_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_idade?: string
          created_at?: string
          dia_semana?: string | null
          faixa_maxima?: string
          faixa_minima?: string
          horario?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jiujitsu_turmas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jiujitsu_turmas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_checkins: {
        Row: {
          check_in_at: string | null
          check_in_by: string | null
          check_me_at: string | null
          check_out_at: string | null
          check_out_by: string | null
          created_at: string | null
          crianca_member_id: string | null
          crianca_nome: string
          crianca_novo_convertido_id: string | null
          data_culto: string
          id: string
          responsavel_member_id: string | null
          responsavel_nome: string | null
          tipo_culto: string
          token: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at: string | null
        }
        Insert: {
          check_in_at?: string | null
          check_in_by?: string | null
          check_me_at?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string | null
          crianca_member_id?: string | null
          crianca_nome: string
          crianca_novo_convertido_id?: string | null
          data_culto?: string
          id?: string
          responsavel_member_id?: string | null
          responsavel_nome?: string | null
          tipo_culto?: string
          token: string
          turma: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string | null
        }
        Update: {
          check_in_at?: string | null
          check_in_by?: string | null
          check_me_at?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string | null
          crianca_member_id?: string | null
          crianca_nome?: string
          crianca_novo_convertido_id?: string | null
          data_culto?: string
          id?: string
          responsavel_member_id?: string | null
          responsavel_nome?: string | null
          tipo_culto?: string
          token?: string
          turma?: Database["public"]["Enums"]["kids_turma"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_checkins_check_in_by_fkey"
            columns: ["check_in_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_check_in_by_fkey"
            columns: ["check_in_by"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_check_out_by_fkey"
            columns: ["check_out_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_check_out_by_fkey"
            columns: ["check_out_by"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_crianca_novo_convertido_id_fkey"
            columns: ["crianca_novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "kids_escalas_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "kids_escalas_ajudantes_ajudante_id_fkey"
            columns: ["ajudante_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "kids_lideres_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "kids_notificacoes_log_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "kids_notificacoes_log_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "kids_presencas_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "kids_presencas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "kids_responsaveis_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          {
            foreignKeyName: "kids_responsaveis_responsavel_member_id_fkey"
            columns: ["responsavel_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_transferencias_turma: {
        Row: {
          aprovador_id: string | null
          created_at: string
          crianca_member_id: string | null
          crianca_novo_convertido_id: string | null
          data_aprovacao: string | null
          id: string
          motivo: string | null
          solicitante_id: string
          status: string
          turma_destino: string
          turma_origem: string
          updated_at: string
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          data_aprovacao?: string | null
          id?: string
          motivo?: string | null
          solicitante_id: string
          status?: string
          turma_destino: string
          turma_origem: string
          updated_at?: string
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          data_aprovacao?: string | null
          id?: string
          motivo?: string | null
          solicitante_id?: string
          status?: string
          turma_destino?: string
          turma_origem?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_transferencias_turma_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_crianca_novo_convertido_id_fkey"
            columns: ["crianca_novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transferencias_turma_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_transicoes: {
        Row: {
          aprovado_por: string | null
          created_at: string
          crianca_member_id: string | null
          crianca_novo_convertido_id: string | null
          id: string
          status: string
          tipo: string
          turma_atual: string
          turma_nova: string
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          id?: string
          status?: string
          tipo?: string
          turma_atual: string
          turma_nova: string
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          crianca_member_id?: string | null
          crianca_novo_convertido_id?: string | null
          id?: string
          status?: string
          tipo?: string
          turma_atual?: string
          turma_nova?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_transicoes_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transicoes_crianca_member_id_fkey"
            columns: ["crianca_member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_transicoes_crianca_novo_convertido_id_fkey"
            columns: ["crianca_novo_convertido_id"]
            isOneToOne: false
            referencedRelation: "novos_convertidos"
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
      louvor_musicas: {
        Row: {
          artista: string | null
          audio_url: string | null
          bpm: number | null
          categoria: string | null
          cifra: string | null
          created_at: string
          criado_por: string | null
          id: string
          letra: string | null
          observacoes: string | null
          tags: string[] | null
          titulo: string
          tom: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          artista?: string | null
          audio_url?: string | null
          bpm?: number | null
          categoria?: string | null
          cifra?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          letra?: string | null
          observacoes?: string | null
          tags?: string[] | null
          titulo: string
          tom?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          artista?: string | null
          audio_url?: string | null
          bpm?: number | null
          categoria?: string | null
          cifra?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          letra?: string | null
          observacoes?: string | null
          tags?: string[] | null
          titulo?: string
          tom?: string | null
          updated_at?: string
          video_url?: string | null
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
            foreignKeyName: "member_face_indexes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
            foreignKeyName: "member_functions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      member_request_filhos: {
        Row: {
          cpf: string
          created_at: string
          data_nascimento: string | null
          genero: string | null
          id: string
          member_request_id: string | null
          nome_completo: string
          tipo: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          genero?: string | null
          id?: string
          member_request_id?: string | null
          nome_completo: string
          tipo?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          genero?: string | null
          id?: string
          member_request_id?: string | null
          nome_completo?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_request_filhos_member_request_id_fkey"
            columns: ["member_request_id"]
            isOneToOne: false
            referencedRelation: "member_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      member_requests: {
        Row: {
          address: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string | null
          estado_civil: string | null
          full_name: string
          genero: string | null
          id: string
          member_id: string | null
          ministerios_interesse: string[] | null
          motivo_rejeicao: string | null
          nao_pretende_servir: boolean | null
          neighborhood: string | null
          number: string | null
          parent_request_id: string | null
          photo_url: string | null
          responsavel_id: string | null
          rg: string | null
          state: string | null
          status: string
          tipo_dependente: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          estado_civil?: string | null
          full_name: string
          genero?: string | null
          id?: string
          member_id?: string | null
          ministerios_interesse?: string[] | null
          motivo_rejeicao?: string | null
          nao_pretende_servir?: boolean | null
          neighborhood?: string | null
          number?: string | null
          parent_request_id?: string | null
          photo_url?: string | null
          responsavel_id?: string | null
          rg?: string | null
          state?: string | null
          status?: string
          tipo_dependente?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          estado_civil?: string | null
          full_name?: string
          genero?: string | null
          id?: string
          member_id?: string | null
          ministerios_interesse?: string[] | null
          motivo_rejeicao?: string | null
          nao_pretende_servir?: boolean | null
          neighborhood?: string | null
          number?: string | null
          parent_request_id?: string | null
          photo_url?: string | null
          responsavel_id?: string | null
          rg?: string | null
          state?: string | null
          status?: string
          tipo_dependente?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "member_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          estado_civil: string | null
          excluido: boolean | null
          excluido_em: string | null
          excluido_por: string | null
          full_name: string
          genero: string | null
          id: string
          kids_numero: number | null
          kids_turma_override: string | null
          member_since: string | null
          ministerios_interesse: string[] | null
          nao_pretende_servir: boolean | null
          neighborhood: string | null
          number: string | null
          photo_url: string | null
          responsavel_id: string | null
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
          estado_civil?: string | null
          excluido?: boolean | null
          excluido_em?: string | null
          excluido_por?: string | null
          full_name: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          kids_turma_override?: string | null
          member_since?: string | null
          ministerios_interesse?: string[] | null
          nao_pretende_servir?: boolean | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          responsavel_id?: string | null
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
          estado_civil?: string | null
          excluido?: boolean | null
          excluido_em?: string | null
          excluido_por?: string | null
          full_name?: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          kids_turma_override?: string | null
          member_since?: string | null
          ministerios_interesse?: string[] | null
          nao_pretende_servir?: boolean | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          responsavel_id?: string | null
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
          {
            foreignKeyName: "members_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_evento_templates: {
        Row: {
          created_at: string
          evento_id: string
          evento_tipo: string
          id: string
          mensagem: string
          tipo_mensagem: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          evento_tipo: string
          id?: string
          mensagem: string
          tipo_mensagem: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          evento_tipo?: string
          id?: string
          mensagem?: string
          tipo_mensagem?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "ministerio_escalas_compartilhadas_compartilhado_por_fkey"
            columns: ["compartilhado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          funcao_id: string | null
          id: string
          member_id: string
          ministry_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao_id?: string | null
          id?: string
          member_id: string
          ministry_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao_id?: string | null
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
            foreignKeyName: "ministerio_integrantes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
          lider_esposa_id: string | null
          lider_id: string | null
          lider_whatsapp: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lider_esposa_id?: string | null
          lider_id?: string | null
          lider_whatsapp?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lider_esposa_id?: string | null
          lider_id?: string | null
          lider_whatsapp?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministries_lider_esposa_id_fkey"
            columns: ["lider_esposa_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_lider_esposa_id_fkey"
            columns: ["lider_esposa_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes_mocambique_contribuicoes: {
        Row: {
          agradecimento_enviado: boolean | null
          contribuinte_id: string
          created_at: string
          data_agradecimento: string | null
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          pago: boolean
          updated_at: string
          valor: number
        }
        Insert: {
          agradecimento_enviado?: boolean | null
          contribuinte_id: string
          created_at?: string
          data_agradecimento?: string | null
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          pago?: boolean
          updated_at?: string
          valor?: number
        }
        Update: {
          agradecimento_enviado?: boolean | null
          contribuinte_id?: string
          created_at?: string
          data_agradecimento?: string | null
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          pago?: boolean
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "missoes_mocambique_contribuicoes_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "missoes_mocambique_contribuintes"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes_mocambique_contribuintes: {
        Row: {
          ativo: boolean
          created_at: string
          data_inicio: string
          dia_vencimento: number | null
          id: string
          lembrete_enviado_mes: string | null
          member_id: string | null
          nome_manual: string | null
          observacoes: string | null
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          dia_vencimento?: number | null
          id?: string
          lembrete_enviado_mes?: string | null
          member_id?: string | null
          nome_manual?: string | null
          observacoes?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          dia_vencimento?: number | null
          id?: string
          lembrete_enviado_mes?: string | null
          member_id?: string | null
          nome_manual?: string | null
          observacoes?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "missoes_mocambique_contribuintes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_mocambique_contribuintes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes_mocambique_fechamentos: {
        Row: {
          cotacao_mzn: number
          created_at: string
          fechado: boolean
          id: string
          mes_referencia: string
          observacoes: string | null
          total_arrecadado: number
          total_contribuintes: number
          updated_at: string
          valor_convertido_mzn: number
        }
        Insert: {
          cotacao_mzn?: number
          created_at?: string
          fechado?: boolean
          id?: string
          mes_referencia: string
          observacoes?: string | null
          total_arrecadado?: number
          total_contribuintes?: number
          updated_at?: string
          valor_convertido_mzn?: number
        }
        Update: {
          cotacao_mzn?: number
          created_at?: string
          fechado?: boolean
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          total_arrecadado?: number
          total_contribuintes?: number
          updated_at?: string
          valor_convertido_mzn?: number
        }
        Relationships: []
      }
      mudancas_pendentes: {
        Row: {
          acao: string
          aprovado_em: string | null
          aprovado_por: string | null
          aprovador_id: string | null
          casa_refugio_id: string | null
          condominio_id: string | null
          created_at: string
          data_email_enviado: string | null
          email_enviado: boolean | null
          funcao_id: string | null
          id: string
          membro_atual_id: string | null
          membro_id: string | null
          ministry_id: string | null
          motivo_rejeicao: string | null
          solicitante_id: string | null
          status: string
          tipo_mudanca: string
          updated_at: string
        }
        Insert: {
          acao: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovador_id?: string | null
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          data_email_enviado?: string | null
          email_enviado?: boolean | null
          funcao_id?: string | null
          id?: string
          membro_atual_id?: string | null
          membro_id?: string | null
          ministry_id?: string | null
          motivo_rejeicao?: string | null
          solicitante_id?: string | null
          status?: string
          tipo_mudanca: string
          updated_at?: string
        }
        Update: {
          acao?: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovador_id?: string | null
          casa_refugio_id?: string | null
          condominio_id?: string | null
          created_at?: string
          data_email_enviado?: string | null
          email_enviado?: boolean | null
          funcao_id?: string | null
          id?: string
          membro_atual_id?: string | null
          membro_id?: string | null
          ministry_id?: string | null
          motivo_rejeicao?: string | null
          solicitante_id?: string | null
          status?: string
          tipo_mudanca?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mudancas_pendentes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_casa_refugio_id_fkey"
            columns: ["casa_refugio_id"]
            isOneToOne: false
            referencedRelation: "casas_refugio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "ministerio_funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_membro_atual_id_fkey"
            columns: ["membro_atual_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_membro_atual_id_fkey"
            columns: ["membro_atual_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mudancas_pendentes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
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
          evento_id: string | null
          frequenta_casa_refugio: boolean | null
          full_name: string
          genero: string | null
          id: string
          kids_numero: number | null
          kids_turma_override: string | null
          member_id: string | null
          membro_vinculado_id: string | null
          mensagem_boas_vindas_enviada: boolean | null
          mensagens_enviadas: number | null
          neighborhood: string | null
          numero: string | null
          observacoes: string | null
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
          evento_id?: string | null
          frequenta_casa_refugio?: boolean | null
          full_name: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          kids_turma_override?: string | null
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          observacoes?: string | null
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
          evento_id?: string | null
          frequenta_casa_refugio?: boolean | null
          full_name?: string
          genero?: string | null
          id?: string
          kids_numero?: number | null
          kids_turma_override?: string | null
          member_id?: string | null
          membro_vinculado_id?: string | null
          mensagem_boas_vindas_enviada?: boolean | null
          mensagens_enviadas?: number | null
          neighborhood?: string | null
          numero?: string | null
          observacoes?: string | null
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
            foreignKeyName: "novos_convertidos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_igreja"
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
            foreignKeyName: "novos_convertidos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novos_convertidos_membro_vinculado_id_fkey"
            columns: ["membro_vinculado_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novos_convertidos_membro_vinculado_id_fkey"
            columns: ["membro_vinculado_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      pastor_auxiliar_permissoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          modulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          modulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          modulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      reservas_ambientes: {
        Row: {
          ambiente_id: string
          aprovador_id: string | null
          created_at: string
          data_fim_recorrencia: string | null
          data_reserva: string
          descricao: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          motivo_rejeicao: string | null
          recorrente: boolean
          solicitante_id: string | null
          status: string
          tipo_recorrencia: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ambiente_id: string
          aprovador_id?: string | null
          created_at?: string
          data_fim_recorrencia?: string | null
          data_reserva: string
          descricao?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          motivo_rejeicao?: string | null
          recorrente?: boolean
          solicitante_id?: string | null
          status?: string
          tipo_recorrencia?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ambiente_id?: string
          aprovador_id?: string | null
          created_at?: string
          data_fim_recorrencia?: string | null
          data_reserva?: string
          descricao?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          motivo_rejeicao?: string | null
          recorrente?: boolean
          solicitante_id?: string | null
          status?: string
          tipo_recorrencia?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_ambientes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ambientes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ambientes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ambientes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ambientes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_tarefa_voluntarios: {
        Row: {
          created_at: string
          id: string
          member_id: string | null
          status: string | null
          tarefa_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id?: string | null
          status?: string | null
          tarefa_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string | null
          status?: string | null
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_tarefa_voluntarios_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_tarefa_voluntarios_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_tarefa_voluntarios_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "servico_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_tarefas: {
        Row: {
          created_at: string
          criado_por: string | null
          data_tarefa: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          local: string | null
          status: string | null
          titulo: string
          updated_at: string
          vagas_necessarias: number | null
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_tarefa: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          status?: string | null
          titulo: string
          updated_at?: string
          vagas_necessarias?: number | null
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_tarefa?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string
          vagas_necessarias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_solicitacoes: {
        Row: {
          aba: string | null
          card: string | null
          confirmacao_solicitante: string | null
          confirmado_em: string | null
          created_at: string
          descricao: string
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          imagem_url: string | null
          numero: number
          observacao_finalizacao: string | null
          painel: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta_admin: string | null
          resposta_solicitante: string | null
          resposta_solicitante_em: string | null
          solicitante_id: string | null
          solicitante_nome: string | null
          status: string
          sub_aba: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aba?: string | null
          card?: string | null
          confirmacao_solicitante?: string | null
          confirmado_em?: string | null
          created_at?: string
          descricao: string
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          imagem_url?: string | null
          numero?: number
          observacao_finalizacao?: string | null
          painel?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_admin?: string | null
          resposta_solicitante?: string | null
          resposta_solicitante_em?: string | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: string
          sub_aba?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          aba?: string | null
          card?: string | null
          confirmacao_solicitante?: string | null
          confirmado_em?: string | null
          created_at?: string
          descricao?: string
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          imagem_url?: string | null
          numero?: number
          observacao_finalizacao?: string | null
          painel?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_admin?: string | null
          resposta_solicitante?: string | null
          resposta_solicitante_em?: string | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: string
          sub_aba?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      teologia_alunos: {
        Row: {
          cpf_aluno: string | null
          created_at: string
          email_aluno: string | null
          id: string
          member_id: string | null
          nome_aluno: string | null
          observacoes: string | null
          status: string
          turma: string | null
          updated_at: string
          valor_total: number
          whatsapp_aluno: string | null
        }
        Insert: {
          cpf_aluno?: string | null
          created_at?: string
          email_aluno?: string | null
          id?: string
          member_id?: string | null
          nome_aluno?: string | null
          observacoes?: string | null
          status?: string
          turma?: string | null
          updated_at?: string
          valor_total?: number
          whatsapp_aluno?: string | null
        }
        Update: {
          cpf_aluno?: string | null
          created_at?: string
          email_aluno?: string | null
          id?: string
          member_id?: string | null
          nome_aluno?: string | null
          observacoes?: string | null
          status?: string
          turma?: string | null
          updated_at?: string
          valor_total?: number
          whatsapp_aluno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teologia_alunos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teologia_alunos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      teologia_despesas: {
        Row: {
          categoria: string
          created_at: string
          data_despesa: string
          descricao: string | null
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_despesa?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      teologia_pagamentos: {
        Row: {
          aluno_id: string
          created_at: string
          data_pagamento: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          registrado_por: string | null
          valor: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_pagamento?: string
          forma_pagamento: string
          id?: string
          observacoes?: string | null
          registrado_por?: string | null
          valor: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "teologia_pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "teologia_alunos"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_access_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
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
      whatsapp_config: {
        Row: {
          backoff_base_minutes: number
          backoff_factor: number
          batch_size: number
          delay_max_seconds: number
          delay_min_seconds: number
          id: boolean
          max_tentativas: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          backoff_base_minutes?: number
          backoff_factor?: number
          batch_size?: number
          delay_max_seconds?: number
          delay_min_seconds?: number
          id?: boolean
          max_tentativas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          backoff_base_minutes?: number
          backoff_factor?: number
          batch_size?: number
          delay_max_seconds?: number
          delay_min_seconds?: number
          id?: boolean
          max_tentativas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      inscricao_pessoas_busca: {
        Row: {
          casa_refugio_id: string | null
          cpf: string | null
          full_name: string | null
          genero: string | null
          id: string | null
          tipo_pessoa: string | null
          whatsapp: string | null
        }
        Relationships: []
      }
      members_safe: {
        Row: {
          address: string | null
          birth_date: string | null
          casa_refugio_id: string | null
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          estado_civil: string | null
          full_name: string | null
          genero: string | null
          id: string | null
          kids_numero: number | null
          member_since: string | null
          neighborhood: string | null
          number: string | null
          photo_url: string | null
          rg: string | null
          state: string | null
          updated_at: string | null
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
          created_at?: string | null
          email?: string | null
          estado_civil?: string | null
          full_name?: string | null
          genero?: string | null
          id?: string | null
          kids_numero?: number | null
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          rg?: string | null
          state?: string | null
          updated_at?: string | null
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
          created_at?: string | null
          email?: string | null
          estado_civil?: string | null
          full_name?: string | null
          genero?: string | null
          id?: string | null
          kids_numero?: number | null
          member_since?: string | null
          neighborhood?: string | null
          number?: string | null
          photo_url?: string | null
          rg?: string | null
          state?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      buscar_responsaveis_publico: {
        Args: { termo: string }
        Returns: {
          full_name: string
          id: string
          origem: string
          status: string
        }[]
      }
      can_access_kids_data: { Args: never; Returns: boolean }
      can_manage_casa_refugio: { Args: { casa_id: string }; Returns: boolean }
      can_manage_member_requests: { Args: never; Returns: boolean }
      can_manage_ministry: { Args: { ministry_uuid: string }; Returns: boolean }
      get_members_count: { Args: never; Returns: number }
      get_next_kids_numero: { Args: never; Returns: number }
      has_full_access: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_integrante_ministerio: { Args: never; Returns: boolean }
      is_kids_leader: { Args: never; Returns: boolean }
      is_lider_casa_refugio: { Args: never; Returns: boolean }
      is_lider_condominio: { Args: never; Returns: boolean }
      is_lider_ministerio: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      is_ministry_leader: { Args: { ministry_uuid: string }; Returns: boolean }
      is_ministry_member: { Args: { ministry_uuid: string }; Returns: boolean }
      is_supervisor_casa_refugio: { Args: never; Returns: boolean }
      pastor_auxiliar_has_permission: {
        Args: { modulo_check: string; pa_user_id: string }
        Returns: boolean
      }
      to_title_case_pt: { Args: { text_input: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "pastor_geral"
        | "pastor_auxiliar"
        | "lider_condominio"
        | "supervisor_casa_refugio"
        | "lider_casa_refugio"
        | "secretario_casa_refugio"
        | "lider_ministerio"
        | "integrante_ministerio"
        | "membro"
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
        | "membro"
        | "supervisor_casa_refugio"
        | "secretario_casa_refugio"
        | "anfitriao_casa_refugio"
      conversion_type: "conversao" | "reconciliacao" | "visitante"
      kids_turma:
        | "laranja"
        | "amarelo"
        | "verde"
        | "azul"
        | "bercario"
        | "todas"
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
      app_role: [
        "admin",
        "pastor_geral",
        "pastor_auxiliar",
        "lider_condominio",
        "supervisor_casa_refugio",
        "lider_casa_refugio",
        "secretario_casa_refugio",
        "lider_ministerio",
        "integrante_ministerio",
        "membro",
      ],
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
        "membro",
        "supervisor_casa_refugio",
        "secretario_casa_refugio",
        "anfitriao_casa_refugio",
      ],
      conversion_type: ["conversao", "reconciliacao", "visitante"],
      kids_turma: ["laranja", "amarelo", "verde", "azul", "bercario", "todas"],
    },
  },
} as const
