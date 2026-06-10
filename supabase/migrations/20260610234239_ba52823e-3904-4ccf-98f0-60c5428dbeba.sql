-- 1) Limpar duplicatas existentes (mantém a mais antiga de cada grupo)

-- a) Mesmo evento + mesmo membro
DELETE FROM public.inscricoes_eventos a
USING public.inscricoes_eventos b
WHERE a.evento_id = b.evento_id
  AND a.member_id IS NOT NULL
  AND a.member_id = b.member_id
  AND a.status_pagamento IS DISTINCT FROM 'cancelado'
  AND b.status_pagamento IS DISTINCT FROM 'cancelado'
  AND (COALESCE(a.created_at, 'epoch') > COALESCE(b.created_at, 'epoch')
       OR (COALESCE(a.created_at, 'epoch') = COALESCE(b.created_at, 'epoch') AND a.ctid > b.ctid));

-- b) Mesmo evento + mesmo novo convertido
DELETE FROM public.inscricoes_eventos a
USING public.inscricoes_eventos b
WHERE a.evento_id = b.evento_id
  AND a.novo_convertido_id IS NOT NULL
  AND a.novo_convertido_id = b.novo_convertido_id
  AND a.status_pagamento IS DISTINCT FROM 'cancelado'
  AND b.status_pagamento IS DISTINCT FROM 'cancelado'
  AND (COALESCE(a.created_at, 'epoch') > COALESCE(b.created_at, 'epoch')
       OR (COALESCE(a.created_at, 'epoch') = COALESCE(b.created_at, 'epoch') AND a.ctid > b.ctid));

-- c) Mesmo evento + mesmo nome (participantes sem cadastro)
DELETE FROM public.inscricoes_eventos a
USING public.inscricoes_eventos b
WHERE a.evento_id = b.evento_id
  AND a.member_id IS NULL AND a.novo_convertido_id IS NULL
  AND b.member_id IS NULL AND b.novo_convertido_id IS NULL
  AND lower(btrim(a.nome_participante)) = lower(btrim(b.nome_participante))
  AND a.status_pagamento IS DISTINCT FROM 'cancelado'
  AND b.status_pagamento IS DISTINCT FROM 'cancelado'
  AND (COALESCE(a.created_at, 'epoch') > COALESCE(b.created_at, 'epoch')
       OR (COALESCE(a.created_at, 'epoch') = COALESCE(b.created_at, 'epoch') AND a.ctid > b.ctid));

-- 2) Travas definitivas contra novas duplicatas

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_eventos_dedup_member
  ON public.inscricoes_eventos (evento_id, member_id)
  WHERE member_id IS NOT NULL AND status_pagamento IS DISTINCT FROM 'cancelado';

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_eventos_dedup_convertido
  ON public.inscricoes_eventos (evento_id, novo_convertido_id)
  WHERE novo_convertido_id IS NOT NULL AND status_pagamento IS DISTINCT FROM 'cancelado';

CREATE UNIQUE INDEX IF NOT EXISTS inscricoes_eventos_dedup_nome
  ON public.inscricoes_eventos (evento_id, lower(btrim(nome_participante)))
  WHERE member_id IS NULL AND novo_convertido_id IS NULL AND status_pagamento IS DISTINCT FROM 'cancelado';