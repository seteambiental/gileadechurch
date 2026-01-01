import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, HandHeart, Phone, MapPin, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InstituicaoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instituicao: any;
}

const tiposInstituicao: Record<string, string> = {
  idosos: "Idosos",
  criancas: "Crianças",
  comunidade_terapeutica: "Comunidade Terapêutica",
  abrigo: "Abrigo",
  ong: "ONG",
  outros: "Outros",
};

export function InstituicaoDetalhesDialog({ open, onOpenChange, instituicao }: InstituicaoDetalhesDialogProps) {
  const { data: ajudas } = useQuery({
    queryKey: ["instituicao_ajudas", instituicao?.id],
    queryFn: async () => {
      if (!instituicao?.id) return [];
      const { data, error } = await supabase
        .from("acao_social_ajudas")
        .select("*")
        .eq("instituicao_id", instituicao.id)
        .order("data_ajuda", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!instituicao?.id,
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  };

  if (!instituicao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {instituicao.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {tiposInstituicao[instituicao.tipo_instituicao] || instituicao.tipo_instituicao}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atendidos</p>
                    <p className="text-xl font-bold">{instituicao.quantidade_atendidos || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <HandHeart className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ajudas</p>
                    <p className="text-xl font-bold">{ajudas?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {instituicao.cnpj && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">CNPJ: {instituicao.cnpj}</span>
                  </div>
                )}
                {instituicao.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{instituicao.telefone}</span>
                  </div>
                )}
                {instituicao.whatsapp && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">WhatsApp: {instituicao.whatsapp}</span>
                  </div>
                )}
                {instituicao.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{instituicao.email}</span>
                  </div>
                )}
                {instituicao.endereco && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {instituicao.endereco}
                      {instituicao.numero && `, ${instituicao.numero}`}
                      {instituicao.bairro && ` - ${instituicao.bairro}`}
                      {instituicao.cidade && `, ${instituicao.cidade}`}
                      {instituicao.estado && `/${instituicao.estado}`}
                    </span>
                  </div>
                )}
              </div>

              {instituicao.responsavel_nome && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{instituicao.responsavel_nome}</p>
                  {instituicao.responsavel_telefone && (
                    <p className="text-sm">{instituicao.responsavel_telefone}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Ajuda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo de Ajuda:</span>{" "}
                  {instituicao.tipo_ajuda || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Frequência:</span>{" "}
                  {instituicao.frequencia_ajuda || "-"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Help History */}
          {ajudas && ajudas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas Ajudas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Kilos</TableHead>
                      <TableHead>Cestas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajudas.map((ajuda) => (
                      <TableRow key={ajuda.id}>
                        <TableCell>{formatDate(ajuda.data_ajuda)}</TableCell>
                        <TableCell>{ajuda.tipo_ajuda}</TableCell>
                        <TableCell>{formatCurrency(ajuda.valor)}</TableCell>
                        <TableCell>{ajuda.quantidade_kilos ? `${ajuda.quantidade_kilos} kg` : "-"}</TableCell>
                        <TableCell>{ajuda.quantidade_cestas || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {instituicao.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{instituicao.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
