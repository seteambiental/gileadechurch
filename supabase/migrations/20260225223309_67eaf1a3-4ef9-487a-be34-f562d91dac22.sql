ALTER TABLE public.sistema_solicitacoes
  ADD COLUMN resposta_solicitante TEXT,
  ADD COLUMN resposta_solicitante_em TIMESTAMPTZ,
  ADD COLUMN confirmacao_solicitante TEXT,
  ADD COLUMN confirmado_em TIMESTAMPTZ;