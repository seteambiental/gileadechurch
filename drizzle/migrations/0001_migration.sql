create or replace function public.contar_inscricoes_por_tipo(_evento_id uuid)
returns table(tipo text, total bigint)
language sql stable security definer set search_path=public as $$
  select coalesce(tipo_inscricao,'membro'), count(*) from (
    select tipo_inscricao from impacto_inscricoes where evento_id=_evento_id
    union all
    select tipo_inscricao from inscricoes_eventos where evento_id=_evento_id
      and aprovado=false and lista_espera=false and coalesce(status_pagamento,'')<>'cancelado'
  ) s group by 1;
$$;
grant execute on function public.contar_inscricoes_por_tipo(uuid) to anon, authenticated;