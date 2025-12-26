-- Create table for dance teams (Adolescentes, Kids, Jovens/Adultos)
CREATE TABLE public.danca_equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- "Adolescentes", "Kids", "Jovens/Adultos"
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for dance team members
CREATE TABLE public.danca_equipe_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID NOT NULL REFERENCES public.danca_equipes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  funcao TEXT DEFAULT 'integrante',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(equipe_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE public.danca_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.danca_equipe_membros ENABLE ROW LEVEL SECURITY;

-- Create policies for danca_equipes
CREATE POLICY "Anyone can view danca_equipes" 
ON public.danca_equipes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert danca_equipes" 
ON public.danca_equipes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update danca_equipes" 
ON public.danca_equipes 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete danca_equipes" 
ON public.danca_equipes 
FOR DELETE 
USING (true);

-- Create policies for danca_equipe_membros
CREATE POLICY "Anyone can view danca_equipe_membros" 
ON public.danca_equipe_membros 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert danca_equipe_membros" 
ON public.danca_equipe_membros 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update danca_equipe_membros" 
ON public.danca_equipe_membros 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete danca_equipe_membros" 
ON public.danca_equipe_membros 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_danca_equipes_updated_at
BEFORE UPDATE ON public.danca_equipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_danca_equipe_membros_updated_at
BEFORE UPDATE ON public.danca_equipe_membros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();