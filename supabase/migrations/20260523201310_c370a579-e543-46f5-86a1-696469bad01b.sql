CREATE TABLE IF NOT EXISTS public.missoes_mocambique_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_mensagem text NOT NULL DEFAULT '🙏 *Olá, {nome}!*

Lembramos com carinho que hoje é o seu dia de contribuição para a *Missão Moçambique* 🌍.

💰 Valor: *R$ {valor}*
📅 Forma: {forma}

Sua contribuição transforma vidas! 💙

_Igreja Gileade_',
  lembretes_ativos boolean NOT NULL DEFAULT true,
  hora_envio time NOT NULL DEFAULT '09:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missoes_mocambique_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer autenticado ve config missoes" ON public.missoes_mocambique_config;
CREATE POLICY "Qualquer autenticado ve config missoes"
  ON public.missoes_mocambique_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin master gerencia config missoes" ON public.missoes_mocambique_config;
CREATE POLICY "Admin master gerencia config missoes"
  ON public.missoes_mocambique_config FOR ALL
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

CREATE TRIGGER trg_missoes_config_updated_at
  BEFORE UPDATE ON public.missoes_mocambique_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.missoes_mocambique_config (template_mensagem)
SELECT '🙏 *Olá, {nome}!*

Lembramos com carinho que hoje é o seu dia de contribuição para a *Missão Moçambique* 🌍.

💰 Valor: *R$ {valor}*
📅 Forma: {forma}

Sua contribuição transforma vidas! 💙

_Igreja Gileade_'
WHERE NOT EXISTS (SELECT 1 FROM public.missoes_mocambique_config);