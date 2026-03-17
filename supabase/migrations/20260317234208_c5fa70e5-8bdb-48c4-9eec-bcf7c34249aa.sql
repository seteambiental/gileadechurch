
ALTER TABLE public.jiujitsu_alunos
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS plano_saude boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alergias text,
  ADD COLUMN IF NOT EXISTS medicamento_continuo text,
  ADD COLUMN IF NOT EXISTS restricao_fisica text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_telefone text,
  ADD COLUMN IF NOT EXISTS termo_emergencia_aceito boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS termo_imagem_aceito boolean DEFAULT false;

ALTER TABLE public.jiujitsu_inscricoes
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text,
  ADD COLUMN IF NOT EXISTS plano_saude boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alergias text,
  ADD COLUMN IF NOT EXISTS medicamento_continuo text,
  ADD COLUMN IF NOT EXISTS restricao_fisica text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_telefone text,
  ADD COLUMN IF NOT EXISTS possui_graduacao text,
  ADD COLUMN IF NOT EXISTS termo_emergencia_aceito boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS termo_imagem_aceito boolean DEFAULT false;
