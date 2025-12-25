-- Create table for kids notification configuration
CREATE TABLE public.kids_notificacoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_notificacao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  dia_semana INTEGER, -- 0=domingo, 1=segunda, etc
  hora TEXT NOT NULL, -- formato HH:MM
  minutos_antes INTEGER, -- para lembretes antes do culto
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kids_notificacoes_config ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (configs are public)
CREATE POLICY "Anyone can read notification config" 
ON public.kids_notificacoes_config 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update notification config" 
ON public.kids_notificacoes_config 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_kids_notificacoes_config_updated_at
BEFORE UPDATE ON public.kids_notificacoes_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations
INSERT INTO public.kids_notificacoes_config (tipo_notificacao, ativo, dia_semana, hora, descricao) VALUES
('ausencia_domingo', true, 0, '21:00', 'Notificação de ausência após culto de domingo'),
('ausencia_quarta', true, 3, '22:00', 'Notificação de ausência após culto de quarta'),
('lembrete_domingo', true, 6, '18:00', 'Lembrete antes do culto de domingo (enviado no sábado)'),
('lembrete_quarta', true, 2, '18:00', 'Lembrete antes do culto de quarta (enviado na terça)'),
('relatorio_mensal', true, 1, '10:00', 'Relatório mensal de frequência (dia 1 de cada mês)');