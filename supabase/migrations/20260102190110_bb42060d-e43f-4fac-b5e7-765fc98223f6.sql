-- Create prayer requests table
CREATE TABLE public.pedidos_oracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT,
  pedido TEXT NOT NULL,
  anonimo BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonies table
CREATE TABLE public.testemunhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT,
  testemunho TEXT NOT NULL CHECK (char_length(testemunho) <= 300),
  foto_url TEXT,
  anonimo BOOLEAN NOT NULL DEFAULT false,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos_oracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testemunhos ENABLE ROW LEVEL SECURITY;

-- RLS policies for prayer requests
CREATE POLICY "Anyone can view prayer requests" 
ON public.pedidos_oracao 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert prayer requests" 
ON public.pedidos_oracao 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update prayer requests" 
ON public.pedidos_oracao 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete prayer requests" 
ON public.pedidos_oracao 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS policies for testimonies
CREATE POLICY "Anyone can view approved testimonies" 
ON public.testemunhos 
FOR SELECT 
USING (aprovado = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert testimonies" 
ON public.testemunhos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update testimonies" 
ON public.testemunhos 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete testimonies" 
ON public.testemunhos 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_pedidos_oracao_updated_at
BEFORE UPDATE ON public.pedidos_oracao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testemunhos_updated_at
BEFORE UPDATE ON public.testemunhos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();