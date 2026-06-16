-- Restringe a CRIAÇÃO de eventos na agenda apenas a administradores e pastores
DROP POLICY IF EXISTS "Authenticated users can insert agenda_igreja" ON public.agenda_igreja;
DROP POLICY IF EXISTS "Leaders can insert pending events" ON public.agenda_igreja;

CREATE POLICY "Only admins and pastors can insert agenda_igreja"
ON public.agenda_igreja
FOR INSERT
TO authenticated
WITH CHECK (public.has_full_access());