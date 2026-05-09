INSERT INTO public.categoria_mensagem_config (categoria_evento, tipo_mensagem, ativo) VALUES
  ('culto', 'aviso_importante', true),
  ('culto', 'lembrete_evento', true),
  ('culto', 'contato_emergencia', false),
  ('culto', 'vaga_liberada', false),
  ('culto', 'lembrete_pagamento', false),
  ('culto', 'inscricao_recebida', false),
  ('culto', 'confirmacao_inscricao', false)
ON CONFLICT (categoria_evento, tipo_mensagem) DO UPDATE SET ativo = EXCLUDED.ativo;