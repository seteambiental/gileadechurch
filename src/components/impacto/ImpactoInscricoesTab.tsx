import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Printer, Tag, Pencil } from "lucide-react";
import ImpactoInscricaoFormDialog from "./ImpactoInscricaoFormDialog";

interface ImpactoInscricoesTabProps {
  eventoSelecionado?: string;
}

const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  misto: "Misto",
};

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Família",
  equipe: "Equipe (apoio/serviço)",
};

const ImpactoInscricoesTab = ({ eventoSelecionado }: ImpactoInscricoesTabProps) => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInscricao, setEditingInscricao] = useState<any>(null);
  const [selectedEventoId, setSelectedEventoId] = useState(eventoSelecionado || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: eventos } = useQuery({
    queryKey: ["impacto-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("*")
        .eq("ativo", true)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rawInscricoes, isLoading } = useQuery({
    queryKey: ["impacto-inscricoes", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select(`
          *,
          member:members(id, full_name, photo_url, whatsapp, casa_refugio_id)
        `)
        .eq("evento_id", selectedEventoId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  // Sort alphabetically
  const inscricoes = useMemo(() => {
    if (!rawInscricoes) return [];
    return [...rawInscricoes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rawInscricoes]);

  // Fetch casas refugio for name/condominio lookup
  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name, condominio");
      if (error) throw error;
      return data;
    },
  });

  // Fetch member functions for supervisor/sindico identification
  const { data: memberFunctions = [] } = useQuery({
    queryKey: ["member-functions-supervisores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, function_type, casa_refugio_id, condominio_id")
        .in("function_type", ["supervisor_casa_refugio", "sindico_condominio"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch condominios for sindico lookup
  const { data: condominios = [] } = useQuery({
    queryKey: ["condominios-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const getLocationLabel = (inscricao: any) => {
    const member = inscricao.member;
    if (!member) return "-";
    
    const sindicoFunc = memberFunctions.find(
      (mf) => mf.member_id === member.id && mf.function_type === "sindico_condominio"
    );
    if (sindicoFunc?.condominio_id) {
      const cond = condominios.find((c) => c.id === sindicoFunc.condominio_id);
      if (cond) return cond.name;
    }
    
    const supervisorFunc = memberFunctions.find(
      (mf) => mf.member_id === member.id && mf.function_type === "supervisor_casa_refugio"
    );
    if (supervisorFunc?.casa_refugio_id) {
      const cr = casasRefugio.find((c) => c.id === supervisorFunc.casa_refugio_id);
      if (cr?.condominio) return cr.condominio;
    }
    
    if (member.casa_refugio_id) {
      const cr = casasRefugio.find((c) => c.id === member.casa_refugio_id);
      if (cr) return cr.name;
    }
    
    return "-";
  };

  const getPhone = (inscricao: any) => {
    return inscricao.telefone || inscricao.member?.whatsapp || "-";
  };

  const getValorPago = (inscricao: any): number => {
    const pagamentos = inscricao.pagamentos as any[] | null;
    if (pagamentos && pagamentos.length > 0) {
      return pagamentos.reduce((sum: number, p: any) => sum + (parseFloat(p.valor) || 0), 0);
    }
    return parseFloat(inscricao.valor_pago) || 0;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impacto_inscricoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição removida!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", selectedEventoId] });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(inscricoes.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleEdit = (inscricao: any) => {
    setEditingInscricao(inscricao);
    setFormOpen(true);
  };

  const handleNewInscricao = () => {
    setEditingInscricao(null);
    setFormOpen(true);
  };

  const printCrachas = () => {
    const selected = inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const crachasHtml = selected.map((inscricao) => `
      <div class="cracha">
        <div class="evento">${evento?.titulo || "Impacto"}</div>
        <div class="nome">${inscricao.nome}</div>
        ${inscricao.genero ? `<div class="info">${inscricao.genero === 'M' ? 'Masculino' : 'Feminino'}</div>` : ''}
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Crachás - ${evento?.titulo}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; flex-wrap: wrap; gap: 10px; }
        .cracha { width: 85mm; height: 55mm; border: 2px solid #333; border-radius: 8px; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-inside: avoid; }
        .evento { font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
        .nome { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .info { font-size: 12px; color: #666; }
      </style></head><body>
      <div class="container">${crachasHtml}</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const printEtiquetas = () => {
    const selected = inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const etiquetasHtml = selected.map((inscricao) => `
      <div class="etiqueta">
        <div class="nome">${inscricao.nome}</div>
        <div class="evento">${evento?.titulo || "Impacto"}</div>
        <div class="data">${evento?.data_inicio ? format(new Date(evento.data_inicio), "dd/MM/yyyy") : ''}</div>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas de Mala - ${evento?.titulo}</title>
      <style>
        @page { size: A4; margin: 5mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; flex-wrap: wrap; }
        .etiqueta { width: 63.5mm; height: 38.1mm; border: 1px dashed #ccc; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; page-break-inside: avoid; }
        .nome { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
        .evento { font-size: 11px; color: #333; }
        .data { font-size: 10px; color: #666; }
      </style></head><body>
      <div class="container">${etiquetasHtml}</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Inscrições</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {eventos?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventoId && (
            <Button onClick={handleNewInscricao}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Inscrição
            </Button>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground self-center">
            {selectedIds.length} selecionado(s)
          </span>
          <Button size="sm" variant="outline" onClick={printCrachas}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Crachás
          </Button>
          <Button size="sm" variant="outline" onClick={printEtiquetas}>
            <Tag className="w-4 h-4 mr-2" />
            Etiquetas de Mala
          </Button>
        </div>
      )}

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver as inscrições.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : inscricoes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma inscrição registrada para este evento.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === inscricoes.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Casa Refúgio / Condomínio</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscricoes.map((inscricao) => {
                const valorPago = getValorPago(inscricao);
                return (
                  <TableRow key={inscricao.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(inscricao.id)}
                        onCheckedChange={(checked) => handleSelect(inscricao.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{inscricao.nome}</TableCell>
                    <TableCell className="text-sm">
                      {TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao] || "Membro"}
                    </TableCell>
                    <TableCell>{getPhone(inscricao)}</TableCell>
                    <TableCell>{getLocationLabel(inscricao)}</TableCell>
                    <TableCell className="text-sm">
                      {inscricao.forma_pagamento
                        ? FORMAS_PAGAMENTO_LABELS[inscricao.forma_pagamento] || inscricao.forma_pagamento
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {valorPago > 0 ? `R$ ${valorPago.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(inscricao)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(inscricao.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedEventoId && (
        <ImpactoInscricaoFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingInscricao(null);
          }}
          eventoId={selectedEventoId}
          inscricao={editingInscricao}
        />
      )}
    </div>
  );
};

export default ImpactoInscricoesTab;
