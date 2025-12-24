-- Create table for Casa Refúgio meetings/encounters
CREATE TABLE public.encontros_casa_refugio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  casa_refugio_id UUID NOT NULL REFERENCES public.casas_refugio(id) ON DELETE CASCADE,
  data_encontro DATE NOT NULL,
  qtd_lideres INTEGER NOT NULL DEFAULT 0,
  qtd_membros INTEGER NOT NULL DEFAULT 0,
  qtd_criancas INTEGER NOT NULL DEFAULT 0,
  qtd_visitantes INTEGER NOT NULL DEFAULT 0,
  kilos_arrecadados DECIMAL(10,2) DEFAULT 0,
  ofertas DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.encontros_casa_refugio ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view encontros" 
ON public.encontros_casa_refugio 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert encontros" 
ON public.encontros_casa_refugio 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update encontros" 
ON public.encontros_casa_refugio 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete encontros" 
ON public.encontros_casa_refugio 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_encontros_casa_refugio_updated_at
BEFORE UPDATE ON public.encontros_casa_refugio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();