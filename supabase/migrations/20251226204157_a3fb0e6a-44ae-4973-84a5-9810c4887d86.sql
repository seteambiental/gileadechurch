-- Adicionar colunas para armazenar equipe e sub-time selecionados na escala
ALTER TABLE public.ministerio_escalas 
ADD COLUMN danca_equipe_id uuid REFERENCES public.danca_equipes(id) ON DELETE SET NULL,
ADD COLUMN danca_sub_time text;

-- Criar índice para melhor performance
CREATE INDEX idx_ministerio_escalas_danca_equipe ON public.ministerio_escalas(danca_equipe_id) WHERE danca_equipe_id IS NOT NULL;