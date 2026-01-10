-- Adicionar campo de mensagem de aniversário na configuração da homepage
ALTER TABLE public.homepage_config
ADD COLUMN IF NOT EXISTS mensagem_aniversario TEXT DEFAULT '🎂🎉 *FELIZ ANIVERSÁRIO, {NOME}!* 🎉🎂

Que o Senhor continue abençoando sua vida abundantemente neste novo ciclo que se inicia!

📖 *"{VERSICULO}"*
— {REFERENCIA}

Que este dia seja repleto de alegria, paz e amor. Você é muito especial para nossa família!

Com carinho,
_Igreja Gileade_ 💙🙏';

COMMENT ON COLUMN public.homepage_config.mensagem_aniversario IS 'Mensagem de aniversário personalizada. Use {NOME} para o nome, {VERSICULO} para o versículo e {REFERENCIA} para a referência bíblica.';