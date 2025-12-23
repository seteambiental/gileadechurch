
-- Enum para tipos de funções na igreja
CREATE TYPE public.church_function_type AS ENUM (
  'lider_casa_refugio',
  'lider_ministerio',
  'pastor_geral',
  'pastor_auxiliar',
  'supervisor_condominio',
  'sindico_condominio',
  'integrante_ministerio'
);

-- Tabela de ministérios
CREATE TABLE public.ministries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de casas refúgio
CREATE TABLE public.casas_refugio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de condomínios
CREATE TABLE public.condominios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de membros
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  cep TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  whatsapp TEXT,
  email TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de funções dos membros (cada membro pode ter múltiplas funções)
CREATE TABLE public.member_functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  function_type church_function_type NOT NULL,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  casa_refugio_id UUID REFERENCES public.casas_refugio(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casas_refugio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_functions ENABLE ROW LEVEL SECURITY;

-- Policies para usuários autenticados
CREATE POLICY "Authenticated users can view ministries" ON public.ministries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ministries" ON public.ministries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ministries" ON public.ministries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ministries" ON public.ministries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view casas_refugio" ON public.casas_refugio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert casas_refugio" ON public.casas_refugio FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update casas_refugio" ON public.casas_refugio FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete casas_refugio" ON public.casas_refugio FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view condominios" ON public.condominios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert condominios" ON public.condominios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update condominios" ON public.condominios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete condominios" ON public.condominios FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view member_functions" ON public.member_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert member_functions" ON public.member_functions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update member_functions" ON public.member_functions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete member_functions" ON public.member_functions FOR DELETE TO authenticated USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_ministries_updated_at BEFORE UPDATE ON public.ministries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_casas_refugio_updated_at BEFORE UPDATE ON public.casas_refugio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_condominios_updated_at BEFORE UPDATE ON public.condominios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para fotos de membros
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true);

CREATE POLICY "Anyone can view member photos" ON storage.objects FOR SELECT USING (bucket_id = 'member-photos');
CREATE POLICY "Authenticated users can upload member photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'member-photos');
CREATE POLICY "Authenticated users can update member photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'member-photos');
CREATE POLICY "Authenticated users can delete member photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'member-photos');
