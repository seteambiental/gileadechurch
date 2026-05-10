ALTER TABLE public.impacto_eventos
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_participantes TEXT,
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_equipe TEXT,
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_ministradores TEXT;

ALTER TABLE public.agenda_igreja
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_participantes TEXT,
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_equipe TEXT,
  ADD COLUMN IF NOT EXISTS link_grupo_whatsapp_ministradores TEXT;