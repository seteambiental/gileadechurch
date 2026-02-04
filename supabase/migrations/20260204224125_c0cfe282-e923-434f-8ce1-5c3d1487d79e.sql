-- Add casa_refugio_id to inscricoes_eventos if not exists
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS casa_refugio_id uuid REFERENCES public.casas_refugio(id);

-- Drop and recreate the view to include CPF and casa_refugio_id
DROP VIEW IF EXISTS public.inscricao_pessoas_busca;

CREATE VIEW public.inscricao_pessoas_busca AS
SELECT 
  members.id,
  members.full_name,
  members.whatsapp,
  members.genero,
  members.cpf,
  members.casa_refugio_id,
  'member'::text AS tipo_pessoa
FROM members
UNION ALL
SELECT 
  novos_convertidos.id,
  novos_convertidos.full_name,
  novos_convertidos.whatsapp,
  novos_convertidos.genero,
  novos_convertidos.cpf,
  novos_convertidos.casa_refugio_id,
  'convertido'::text AS tipo_pessoa
FROM novos_convertidos;