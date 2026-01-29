import { useEffect, useRef, useState } from "react";
import { unformatCep } from "@/lib/masks";

type CepAddress = {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function useCepLookup(
  cepFormatted: string | undefined,
  onResolved: (data: CepAddress) => void,
  opts?: { debounceMs?: number }
) {
  const debounceMs = opts?.debounceMs ?? 400;
  const [isLoading, setIsLoading] = useState(false);
  const callbackRef = useRef(onResolved);

  useEffect(() => {
    callbackRef.current = onResolved;
  }, [onResolved]);

  useEffect(() => {
    const cep = cepFormatted ? unformatCep(cepFormatted) : "";
    // Se o CEP estiver incompleto, garanta que não ficamos presos em loading
    if (cep.length !== 8) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${encodeURIComponent(cep)}/json/`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!data?.erro) {
          callbackRef.current({
            address: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          });
        }
      } catch {
        // Silencioso: erro de rede/abort não deve travar o formulário
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(t);

      // Abort também não pode deixar o formulário travado em loading
      setIsLoading(false);
    };
  }, [cepFormatted, debounceMs]);

  return { isLoading };
}
