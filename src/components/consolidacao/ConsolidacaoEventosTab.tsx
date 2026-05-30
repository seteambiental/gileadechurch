import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, MessageCircle, Mail, UserRoundCheck, HeartHandshake, Heart } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";
import { formatEventoPeriodo, parseLocalDate } from "@/lib/date-utils";
import { ConverterMembroDialog, type InscricaoConsolidacao } from "./ConverterMembroDialog";

interface ConsolidacaoEventosTabProps {
  tipo: "conversao" | "reconciliacao";
}

const resolveGenero = (g?: string | null) => {
  const lower = (g || "").toLowerCase();
  if (lower === "m" || lower === "masculino") return "Masculino";
  if (lower === "f" || lower === "feminino") return "Feminino";
  return "—";
};

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

export const ConsolidacaoEventosTab = ({ tipo }: ConsolidacaoEventosTabProps) => {
  const flagField = tipo === "conversao" ? "converteu" : "reconciliou";
  const queryKey = `consolidacao-${tipo}-eventos`;

  const [search, setSearch] = useState("");
  const [eventoFiltro, setEventoFiltro] = useState("__all__");
  const [generoFiltro, setGeneroFiltro] = useState("__all__");
  const [converting, setConverting] = useState<InscricaoConsolidacao | null>(null);

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select(
          `id, member_id, nome, telefone, email, genero, data_nascimento, observacoes,
           tipo_inscricao, status_pagamento, virou_membro,
           evento:impacto_eventos!inner(id, titulo, data_inicio, data_fim, finalizado)`
        )
        .eq(flagField, true)
        .eq("virou_membro", false)
        .eq("evento.finalizado", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const eventosDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    inscricoes.forEach((i) => {
      if (i.evento) {
        const label = `${i.evento.titulo} — ${formatEventoPeriodo(i.evento.data_inicio, i.evento.data_fim)}`;
        map.set(i.evento.id, label);
      }
    });
    return Array.from(map.entries());
  }, [inscricoes]);

  const filtradas = useMemo(() => {
    return inscricoes.filter((i) => {
      if (search && !includesNormalized(i.nome, search)) return false;
      if (eventoFiltro !== "__all__" && i.evento?.id !== eventoFiltro) return false;
      if (generoFiltro !== "__all__" && resolveGenero(i.genero) !== generoFiltro) return false;
      return true;
    });
  }, [inscricoes, search, eventoFiltro, generoFiltro]);

  const Icone = tipo === "conversao" ? Heart : HeartHandshake;
  const titulo = tipo === "conversao" ? "Convertidos em Eventos" : "Reconciliações";

  const enviarWhatsapp = (telefone?: string | null) => {
    const num = onlyDigits(telefone);
    if (!num) return;
    const full = num.startsWith("55") ? num : `55${num}`;
    window.open(`https://wa.me/${full}`, "_blank");
  };

  const enviarEmail = (email?: string | null) => {
    if (!email) return;
    window.open(`mailto:${email}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icone className="w-5 h-5 text-destructive" />
        <h2 className="font-heading font-bold text-xl">{titulo}</h2>
        <Badge variant="secondary">{filtradas.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Pessoas marcadas como {tipo === "conversao" ? "conversão" : "reconciliação"} nos eventos finalizados.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput placeholder="Buscar por nome..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={eventoFiltro} onValueChange={setEventoFiltro}>
          <SelectTrigger className="sm:w-72"><SelectValue placeholder="Evento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os eventos</SelectItem>
            {eventosDisponiveis.map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={generoFiltro} onValueChange={setGeneroFiltro}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Gênero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="Masculino">Masculino</SelectItem>
            <SelectItem value="Feminino">Feminino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-destructive animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum registro encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {i.evento ? (
                        <div>
                          <p className="text-sm">{i.evento.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatEventoPeriodo(i.evento.data_inicio, i.evento.data_fim)}
                          </p>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{i.telefone || "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{i.email || "—"}</TableCell>
                    <TableCell>{resolveGenero(i.genero)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {i.data_nascimento ? parseLocalDate(i.data_nascimento).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700"
                          disabled={!i.telefone}
                          title="Enviar WhatsApp"
                          onClick={() => enviarWhatsapp(i.telefone)}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700"
                          disabled={!i.email}
                          title="Enviar e-mail"
                          onClick={() => enviarEmail(i.email)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          title="Converter para Membro"
                          onClick={() => setConverting(i)}
                        >
                          <UserRoundCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConverterMembroDialog
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
        inscricao={converting}
        invalidateKeys={[queryKey]}
      />
    </div>
  );
};