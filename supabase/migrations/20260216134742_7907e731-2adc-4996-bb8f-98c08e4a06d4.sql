
-- Junction table for multiple ambientes per agenda event
CREATE TABLE public.agenda_ambientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_id UUID NOT NULL REFERENCES public.agenda_igreja(id) ON DELETE CASCADE,
  ambiente_id UUID NOT NULL REFERENCES public.ambientes(id) ON DELETE CASCADE,
  bloqueio_inicio TIMESTAMPTZ,
  bloqueio_fim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agenda_id, ambiente_id)
);

-- Enable RLS
ALTER TABLE public.agenda_ambientes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view agenda_ambientes" ON public.agenda_ambientes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert agenda_ambientes" ON public.agenda_ambientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agenda_ambientes" ON public.agenda_ambientes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agenda_ambientes" ON public.agenda_ambientes
  FOR DELETE USING (auth.uid() IS NOT NULL);
