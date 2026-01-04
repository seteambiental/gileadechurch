-- Adicionar campo para controlar se mensagem de agradecimento foi enviada
ALTER TABLE public.missoes_mocambique_contribuicoes 
ADD COLUMN IF NOT EXISTS agradecimento_enviado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_agradecimento timestamp with time zone;

-- Adicionar campo para data de vencimento/compromisso do contribuinte
ALTER TABLE public.missoes_mocambique_contribuintes
ADD COLUMN IF NOT EXISTS dia_vencimento integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS lembrete_enviado_mes text;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.missoes_mocambique_contribuintes.dia_vencimento IS 'Dia do mês em que o contribuinte se comprometeu a contribuir';
COMMENT ON COLUMN public.missoes_mocambique_contribuintes.lembrete_enviado_mes IS 'Mês/ano do último lembrete enviado (formato YYYY-MM)';