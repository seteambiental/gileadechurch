UPDATE public.comunicacao_fila
SET status='pendente', tentativas=0, ultimo_erro=NULL, proxima_tentativa_em=now()
WHERE status='descartado' AND ultimo_erro ILIKE '%Bad Request%' AND updated_at > now() - interval '7 days';