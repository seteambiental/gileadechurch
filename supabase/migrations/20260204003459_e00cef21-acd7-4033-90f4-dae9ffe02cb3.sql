-- Adicionar coluna para marcar membros como excluídos (soft delete)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS excluido boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS excluido_por uuid REFERENCES auth.users(id);

-- Criar índice para buscar membros excluídos
CREATE INDEX IF NOT EXISTS idx_members_excluido ON public.members(excluido) WHERE excluido = true;

-- Atualizar a view members_safe para não incluir membros excluídos
DROP VIEW IF EXISTS public.members_safe;
CREATE VIEW public.members_safe 
WITH (security_invoker=on) AS
  SELECT 
    id,
    full_name,
    email,
    whatsapp,
    address,
    number,
    complement,
    neighborhood,
    city,
    state,
    cep,
    photo_url,
    genero,
    estado_civil,
    cpf,
    rg,
    birth_date,
    member_since,
    casa_refugio_id,
    user_id,
    kids_numero,
    created_at,
    updated_at
  FROM public.members
  WHERE excluido = false OR excluido IS NULL;