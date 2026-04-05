-- Add explicit DELETE and UPDATE policies for teologia_pagamentos
-- Drop the ALL policy and replace with specific ones
DROP POLICY IF EXISTS "Admins can manage teologia_pagamentos" ON public.teologia_pagamentos;

CREATE POLICY "Admins can select teologia_pagamentos"
ON public.teologia_pagamentos FOR SELECT
TO authenticated
USING (has_full_access());

CREATE POLICY "Admins can insert teologia_pagamentos"
ON public.teologia_pagamentos FOR INSERT
TO authenticated
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update teologia_pagamentos"
ON public.teologia_pagamentos FOR UPDATE
TO authenticated
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete teologia_pagamentos"
ON public.teologia_pagamentos FOR DELETE
TO authenticated
USING (has_full_access());

-- Fix jiujitsu_pagamentos - drop ALL policy and replace with specific ones
DROP POLICY IF EXISTS "Full access users can manage jiujitsu_pagamentos" ON public.jiujitsu_pagamentos;

CREATE POLICY "Full access users can select jiujitsu_pagamentos"
ON public.jiujitsu_pagamentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Full access users can insert jiujitsu_pagamentos"
ON public.jiujitsu_pagamentos FOR INSERT
TO authenticated
WITH CHECK (has_full_access());

CREATE POLICY "Full access users can update jiujitsu_pagamentos"
ON public.jiujitsu_pagamentos FOR UPDATE
TO authenticated
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Full access users can delete jiujitsu_pagamentos"
ON public.jiujitsu_pagamentos FOR DELETE
TO authenticated
USING (has_full_access());