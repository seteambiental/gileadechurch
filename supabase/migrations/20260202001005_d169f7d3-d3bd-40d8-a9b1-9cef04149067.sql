-- Adicionar coluna responsavel_id na tabela members para vincular menores de 12 anos a um responsável
ALTER TABLE public.members 
ADD COLUMN responsavel_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

-- Criar índice para otimizar buscas por responsável
CREATE INDEX idx_members_responsavel_id ON public.members(responsavel_id) WHERE responsavel_id IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.members.responsavel_id IS 'ID do membro responsável. Obrigatório para menores de 12 anos.';