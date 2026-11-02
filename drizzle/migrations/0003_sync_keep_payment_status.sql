DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.sync_inscricao_evento_to_impacto'::regproc);
  d := replace(d, '      status_pagamento = NEW.status_pagamento,
', '      status_pagamento = CASE WHEN TG_OP = ''UPDATE'' AND NEW.status_pagamento IS NOT DISTINCT FROM OLD.status_pagamento THEN status_pagamento ELSE NEW.status_pagamento END,
');
  EXECUTE d;
END $$;