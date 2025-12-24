
-- Adicionar campos de gênero, data de nascimento e controle de mensagens na tabela novos_convertidos
ALTER TABLE public.novos_convertidos 
ADD COLUMN IF NOT EXISTS genero text,
ADD COLUMN IF NOT EXISTS data_nascimento date,
ADD COLUMN IF NOT EXISTS mensagens_enviadas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_mensagem_enviada timestamp with time zone,
ADD COLUMN IF NOT EXISTS mensagem_boas_vindas_enviada boolean DEFAULT false;

-- Criar tabela de agenda/programação da igreja
CREATE TABLE public.agenda_igreja (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  data_evento date NOT NULL,
  hora_inicio time,
  hora_fim time,
  local text,
  tipo_evento text NOT NULL, -- culto, impacto, casa_refugio, retiro, conferencia, etc
  genero_alvo text DEFAULT 'todos', -- todos, masculino, feminino
  idade_minima integer,
  idade_maxima integer,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela para histórico de mensagens enviadas
CREATE TABLE public.mensagens_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novo_convertido_id UUID NOT NULL REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  tipo_mensagem text NOT NULL, -- boas_vindas, convite_evento, acompanhamento
  evento_id UUID REFERENCES public.agenda_igreja(id),
  conteudo text NOT NULL,
  enviada_em timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'enviada' -- enviada, entregue, lida, erro
);

-- Habilitar RLS
ALTER TABLE public.agenda_igreja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para agenda_igreja
CREATE POLICY "Authenticated users can view agenda_igreja" 
ON public.agenda_igreja FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert agenda_igreja" 
ON public.agenda_igreja FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update agenda_igreja" 
ON public.agenda_igreja FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete agenda_igreja" 
ON public.agenda_igreja FOR DELETE USING (true);

-- Políticas RLS para mensagens_whatsapp
CREATE POLICY "Authenticated users can view mensagens_whatsapp" 
ON public.mensagens_whatsapp FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert mensagens_whatsapp" 
ON public.mensagens_whatsapp FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update mensagens_whatsapp" 
ON public.mensagens_whatsapp FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete mensagens_whatsapp" 
ON public.mensagens_whatsapp FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_agenda_igreja_updated_at
BEFORE UPDATE ON public.agenda_igreja
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
