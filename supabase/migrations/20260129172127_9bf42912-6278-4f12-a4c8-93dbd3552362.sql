-- Adicionar campos para supervisor e esposa do supervisor na tabela casas_refugio
ALTER TABLE public.casas_refugio
ADD COLUMN supervisor_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
ADD COLUMN supervisor_esposa_id uuid REFERENCES public.members(id) ON DELETE SET NULL;