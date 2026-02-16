
ALTER TABLE public.encontros_casa_refugio 
ADD COLUMN conferido boolean NOT NULL DEFAULT false,
ADD COLUMN conferido_por uuid REFERENCES public.members(id),
ADD COLUMN conferido_em timestamp with time zone;
