
-- Add new columns to casais_inscritos
ALTER TABLE public.casais_inscritos
  ADD COLUMN IF NOT EXISTS email_masculino text,
  ADD COLUMN IF NOT EXISTS email_feminino text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS modalidade_casamento text,
  ADD COLUMN IF NOT EXISTS data_modalidade text,
  ADD COLUMN IF NOT EXISTS ja_foi_casado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantas_vezes_casado integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_filhos_meninos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_filhos_meninas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS congrega_gileade boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero_endereco text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS casa_refugio_id uuid REFERENCES public.casas_refugio(id);

-- Create filhos table
CREATE TABLE public.casais_inscritos_filhos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inscricao_id uuid NOT NULL REFERENCES public.casais_inscritos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  idade integer,
  genero text,
  member_id uuid REFERENCES public.members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.casais_inscritos_filhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view casais_inscritos_filhos"
  ON public.casais_inscritos_filhos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert casais_inscritos_filhos"
  ON public.casais_inscritos_filhos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update casais_inscritos_filhos"
  ON public.casais_inscritos_filhos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete casais_inscritos_filhos"
  ON public.casais_inscritos_filhos FOR DELETE
  USING (auth.uid() IS NOT NULL);
