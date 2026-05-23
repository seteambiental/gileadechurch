
-- Despesas do módulo Missões Moçambique
CREATE TABLE IF NOT EXISTS public.missoes_mocambique_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia DATE NOT NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mm_despesas_mes ON public.missoes_mocambique_despesas(mes_referencia);

ALTER TABLE public.missoes_mocambique_despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mm_despesas"
ON public.missoes_mocambique_despesas FOR SELECT USING (true);
CREATE POLICY "Auth users insert mm_despesas"
ON public.missoes_mocambique_despesas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update mm_despesas"
ON public.missoes_mocambique_despesas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete mm_despesas"
ON public.missoes_mocambique_despesas FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_mm_despesas_updated_at
BEFORE UPDATE ON public.missoes_mocambique_despesas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lançamentos avulsos (membro ou condomínio)
CREATE TABLE IF NOT EXISTS public.missoes_mocambique_lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origem TEXT NOT NULL DEFAULT 'membro', -- 'membro' | 'condominio' | 'manual'
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  nome_manual TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia DATE NOT NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mm_lancamentos_mes ON public.missoes_mocambique_lancamentos(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_mm_lancamentos_member ON public.missoes_mocambique_lancamentos(member_id);
CREATE INDEX IF NOT EXISTS idx_mm_lancamentos_cond ON public.missoes_mocambique_lancamentos(condominio_id);

ALTER TABLE public.missoes_mocambique_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mm_lancamentos"
ON public.missoes_mocambique_lancamentos FOR SELECT USING (true);
CREATE POLICY "Auth users insert mm_lancamentos"
ON public.missoes_mocambique_lancamentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update mm_lancamentos"
ON public.missoes_mocambique_lancamentos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete mm_lancamentos"
ON public.missoes_mocambique_lancamentos FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_mm_lancamentos_updated_at
BEFORE UPDATE ON public.missoes_mocambique_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cache da cotação BRL -> MZN
CREATE TABLE IF NOT EXISTS public.missoes_mocambique_cotacao_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao NUMERIC NOT NULL,
  fonte TEXT,
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.missoes_mocambique_cotacao_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mm_cotacao"
ON public.missoes_mocambique_cotacao_cache FOR SELECT USING (true);
CREATE POLICY "Auth users insert mm_cotacao"
ON public.missoes_mocambique_cotacao_cache FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users update mm_cotacao"
ON public.missoes_mocambique_cotacao_cache FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users delete mm_cotacao"
ON public.missoes_mocambique_cotacao_cache FOR DELETE USING (auth.uid() IS NOT NULL);
