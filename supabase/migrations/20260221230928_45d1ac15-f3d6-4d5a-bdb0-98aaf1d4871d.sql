
-- Table to store children registered during member request
CREATE TABLE public.member_request_filhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_request_id UUID REFERENCES public.member_requests(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento TEXT,
  genero TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_request_filhos ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by edge function)
-- No anon access needed since edge function uses service role
CREATE POLICY "Service role full access on member_request_filhos"
  ON public.member_request_filhos
  FOR ALL
  USING (true)
  WITH CHECK (true);
