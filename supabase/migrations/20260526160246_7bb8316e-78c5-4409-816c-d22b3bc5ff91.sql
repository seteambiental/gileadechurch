
CREATE OR REPLACE FUNCTION public.criar_inscricao_evento_publica(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.inscricoes_eventos (
    evento_id, member_id, novo_convertido_id, nome_participante, genero,
    telefone_contato, telefone_emergencia, is_menor, nome_responsavel, telefone_responsavel,
    preferencia_beliche, tem_alergia_alimentar, descricao_alergia, toma_medicamento, descricao_medicamento,
    forma_pagamento, lista_espera, observacoes, cpf, casa_refugio_id, tipo_inscricao, valor_inscricao
  ) VALUES (
    NULLIF(payload->>'evento_id','')::uuid,
    NULLIF(payload->>'member_id','')::uuid,
    NULLIF(payload->>'novo_convertido_id','')::uuid,
    payload->>'nome_participante',
    payload->>'genero',
    payload->>'telefone_contato',
    payload->>'telefone_emergencia',
    COALESCE((payload->>'is_menor')::boolean, false),
    payload->>'nome_responsavel',
    payload->>'telefone_responsavel',
    payload->>'preferencia_beliche',
    COALESCE((payload->>'tem_alergia_alimentar')::boolean, false),
    payload->>'descricao_alergia',
    COALESCE((payload->>'toma_medicamento')::boolean, false),
    payload->>'descricao_medicamento',
    payload->>'forma_pagamento',
    COALESCE((payload->>'lista_espera')::boolean, false),
    payload->>'observacoes',
    payload->>'cpf',
    NULLIF(payload->>'casa_refugio_id','')::uuid,
    COALESCE(payload->>'tipo_inscricao','membro'),
    NULLIF(payload->>'valor_inscricao','')::numeric
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_inscricao_evento_publica(jsonb) TO anon, authenticated;
