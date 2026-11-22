import { supabase } from "@/integrations/supabase/client";

export interface EdicaoTelefoneInscricao {
  id: string;
  eventoId: string;
  memberId: string | null;
  nome: string;
  value: string;
}

export async function atualizarTelefoneInscricao(edicao: EdicaoTelefoneInscricao) {
  const telefone = edicao.value.replace(/\D/g, "");
  if (telefone.length !== 10 && telefone.length !== 11) {
    throw new Error("Informe o telefone com DDD e 10 ou 11 dígitos.");
  }

  const { error } = await supabase
    .from("impacto_inscricoes")
    .update({ telefone })
    .eq("id", edicao.id)
    .select("id")
    .single();
  if (error) throw error;

  // O envio de mensagens lê o telefone do Impacto; a Agenda deve manter o mesmo número.
  let original = supabase
    .from("inscricoes_eventos")
    .update({ telefone_contato: telefone })
    .eq("evento_id", edicao.eventoId);
  original = edicao.memberId
    ? original.eq("member_id", edicao.memberId)
    : original.eq("nome_participante", edicao.nome);
  const { error: originalError } = await original;
  if (originalError) throw originalError;
}