-- Adicionar campo kids_numero na tabela members para crianças
ALTER TABLE public.members 
ADD COLUMN kids_numero INTEGER UNIQUE;

-- Adicionar campo kids_numero na tabela novos_convertidos
ALTER TABLE public.novos_convertidos 
ADD COLUMN kids_numero INTEGER UNIQUE;

-- Criar função para gerar próximo número kids
CREATE OR REPLACE FUNCTION public.get_next_kids_numero()
RETURNS INTEGER AS $$
DECLARE
  max_members INTEGER;
  max_nc INTEGER;
  next_num INTEGER;
BEGIN
  -- Pegar o maior número de members
  SELECT COALESCE(MAX(kids_numero), 0) INTO max_members FROM public.members;
  
  -- Pegar o maior número de novos_convertidos
  SELECT COALESCE(MAX(kids_numero), 0) INTO max_nc FROM public.novos_convertidos;
  
  -- Retornar o próximo número (maior entre os dois + 1)
  next_num := GREATEST(max_members, max_nc) + 1;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;