ALTER TABLE public.inscricoes_eventos DROP CONSTRAINT inscricoes_eventos_evento_id_fkey;
ALTER TABLE public.inscricoes_eventos ADD CONSTRAINT inscricoes_eventos_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.agenda_igreja(id) ON DELETE RESTRICT;

ALTER TABLE public.apresentacao_criancas_inscricoes DROP CONSTRAINT apresentacao_criancas_inscricoes_evento_id_fkey;
ALTER TABLE public.apresentacao_criancas_inscricoes ADD CONSTRAINT apresentacao_criancas_inscricoes_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.agenda_igreja(id) ON DELETE RESTRICT;