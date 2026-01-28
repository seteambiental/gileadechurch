
-- Criar uma view pública específica para a busca de inscrições
-- Esta view expõe apenas os campos mínimos necessários para identificação
CREATE OR REPLACE VIEW public.inscricao_pessoas_busca 
WITH (security_invoker = false)
AS
SELECT 
    id,
    full_name,
    whatsapp,
    genero,
    'member' as tipo_pessoa
FROM public.members
UNION ALL
SELECT 
    id,
    full_name,
    whatsapp,
    genero,
    'convertido' as tipo_pessoa
FROM public.novos_convertidos;

-- Permitir acesso anônimo à view de busca para inscrições
GRANT SELECT ON public.inscricao_pessoas_busca TO anon;
GRANT SELECT ON public.inscricao_pessoas_busca TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW public.inscricao_pessoas_busca IS 'View pública para busca de pessoas na inscrição de eventos. Expõe apenas nome, whatsapp e gênero para auto-complete.';
