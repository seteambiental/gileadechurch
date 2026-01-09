import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCPF } from "@/lib/masks";

interface MemberRequest {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  genero: string | null;
  birth_date: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cpf: string | null;
  status: string;
  motivo_rejeicao: string | null;
  created_at: string;
}

const SolicitacoesMembrosTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["member-requests", statusFilter],
    queryFn: async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const userId = sessionRes?.session?.user?.id;

      if (!userId) {
        throw new Error("Você precisa estar logado para ver solicitações.");
      }

      // Busca via função backend para evitar qualquer bloqueio de visibilidade (RLS)
      const { data, error } = await supabase.functions.invoke("listar-solicitacoes-membro", {
        body: { status: statusFilter },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Não foi possível carregar as solicitações.");

      return (data.data ?? []) as MemberRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: MemberRequest) => {
      // Criar o membro na tabela members
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: request.full_name,
          email: request.email,
          whatsapp: request.whatsapp,
          genero: request.genero,
          birth_date: request.birth_date,
          cep: request.cep,
          address: request.address,
          number: request.number,
          neighborhood: request.neighborhood,
          city: request.city,
          state: request.state,
          cpf: request.cpf,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Atualizar a solicitação como aprovada
      const { error: updateError } = await supabase
        .from("member_requests")
        .update({
          status: "aprovado",
          aprovado_em: new Date().toISOString(),
          member_id: newMember.id,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Solicitação aprovada!", description: "Membro cadastrado com sucesso." });
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from("member_requests")
        .update({
          status: "rejeitado",
          motivo_rejeicao: reason,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      toast({ title: "Solicitação rejeitada" });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao rejeitar",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const filteredRequests = requests.filter((req) =>
    req.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "aprovado":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="py-12">
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar as solicitações</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : String(error)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === "pendente" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pendente")}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pendentes
          </Button>
          <Button
            variant={statusFilter === "aprovado" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("aprovado")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Aprovados
          </Button>
          <Button
            variant={statusFilter === "rejeitado" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("rejeitado")}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Rejeitados
          </Button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma solicitação {statusFilter ? `${statusFilter}` : ""} encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:border-secondary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.full_name}</CardTitle>
                    <CardDescription>
                      {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.whatsapp && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {formatPhone(request.whatsapp)}
                  </div>
                )}
                {request.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {request.email}
                  </div>
                )}
                {request.city && request.state && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {request.city}, {request.state}
                  </div>
                )}

                {request.status === "pendente" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => approveMutation.mutate(request)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Aprovar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRequest(request);
                        setRejectDialogOpen(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}

                {request.status === "rejeitado" && request.motivo_rejeicao && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                    <strong>Motivo:</strong> {request.motivo_rejeicao}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Rejeição */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para {selectedRequest?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRequest) {
                  rejectMutation.mutate({
                    requestId: selectedRequest.id,
                    reason: rejectReason,
                  });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SolicitacoesMembrosTab;
