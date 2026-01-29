-- Adicionar campos de interesse em ministérios na tabela member_requests
ALTER TABLE public.member_requests
ADD COLUMN ministerios_interesse uuid[] DEFAULT '{}',
ADD COLUMN nao_pretende_servir boolean DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN public.member_requests.ministerios_interesse IS 'Array de IDs dos ministérios que o candidato gostaria de servir';
COMMENT ON COLUMN public.member_requests.nao_pretende_servir IS 'Indica se o candidato ainda não pretende servir em nenhum ministério';