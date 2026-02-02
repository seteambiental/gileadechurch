-- Adicionar coluna responsavel_id na tabela member_requests para solicitações de menores de 12 anos
ALTER TABLE public.member_requests 
ADD COLUMN responsavel_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.member_requests.responsavel_id IS 'ID do membro responsável para menores de 12 anos.';