UPDATE public.casais_inscritos
SET certificado_emitido = false,
    data_certificado = NULL
WHERE certificado_emitido = true;