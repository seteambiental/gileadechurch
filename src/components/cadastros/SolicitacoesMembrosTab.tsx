import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Baby,
  UserX,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembrosExcluidosTab from "@/components/cadastros/MembrosExcluidosTab";
import { includesNormalized } from "@/lib/text-utils";
import { SearchInput } from "@/components/ui/search-input";
import { needsResponsible, getAgeString } from "@/lib/age-utils";
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
  estado_civil: string | null;
  birth_date: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cpf: string | null;
  photo_url: string | null;
  status: string;
  motivo_rejeicao: string | null;
  created_at: string;
  ministerios_interesse: string[] | null;
  nao_pretende_servir: boolean | null;
  responsavel_id: string | null;
  parent_request_id: string | null;
  tipo_dependente: string | null;
  member_id: string | null;
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
      // Consulta direta via RLS - muito mais rápido que edge function
      let query = supabase
        .from("member_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []) as MemberRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: MemberRequest) => {
      // Se é filho e tem parent_request_id, buscar o member_id do pai/mãe aprovado
      let responsavelId = request.responsavel_id || null;
      if (request.tipo_dependente === "filho" && request.parent_request_id) {
        const { data: parentRequest } = await supabase
          .from("member_requests")
          .select("member_id")
          .eq("id", request.parent_request_id)
          .single();

        if (parentRequest?.member_id) {
          responsavelId = parentRequest.member_id;
        }
      }

      // Criar o membro na tabela members
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: request.full_name,
          email: request.email,
          whatsapp: request.whatsapp,
          genero: request.genero,
          estado_civil: request.estado_civil || null,
          birth_date: request.birth_date,
          cep: request.cep,
          address: request.address,
          number: request.number,
          neighborhood: request.neighborhood,
          city: request.city,
          state: request.state,
          cpf: request.cpf,
          photo_url: request.photo_url,
          ministerios_interesse: request.ministerios_interesse || [],
          nao_pretende_servir: request.nao_pretende_servir || false,
          responsavel_id: responsavelId,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Se é menor de 12 anos e tem responsável, criar vínculo em kids_responsaveis
      if (responsavelId && needsResponsible(request.birth_date)) {
        const { error: kidsError } = await supabase
          .from("kids_responsaveis")
          .insert({
            crianca_member_id: newMember.id,
            responsavel_member_id: responsavelId,
            parentesco: "responsavel",
            principal: true,
            notificar_ausencia: true,
          });

        if (kidsError) {
          console.error("Erro ao criar vínculo kids_responsaveis:", kidsError);
        }
      }

      // Criar candidaturas para os ministérios de interesse
      if (request.ministerios_interesse && request.ministerios_interesse.length > 0 && !request.nao_pretende_servir) {
        const candidaturas = request.ministerios_interesse.map((ministryId) => ({
          member_id: newMember.id,
          ministry_id: ministryId,
          mensagem: "Interesse manifestado durante o cadastro",
          status: "pendente",
        }));

        const { error: candidaturaError } = await supabase
          .from("candidaturas_ministerio")
          .insert(candidaturas);

        if (candidaturaError) {
          console.error("Erro ao criar candidaturas:", candidaturaError);
        }
      }

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

      // Se este é o titular (sem parent_request_id), atualizar responsavel_id dos filhos vinculados
      if (!request.parent_request_id) {
        const { error: updateFilhosError } = await supabase
          .from("member_requests")
          .update({ responsavel_id: newMember.id })
          .eq("parent_request_id", request.id)
          .eq("tipo_dependente", "filho");

        if (updateFilhosError) {
          console.error("Erro ao atualizar responsável dos filhos:", updateFilhosError);
        }
      }

      // Criar usuário de autenticação automaticamente se tiver email
      if (request.email) {
        try {
          // Determinar se precisa de email fictício (familiar com mesmo email do titular)
          let authEmail: string | undefined = undefined;
          
          if (request.parent_request_id && request.cpf) {
            // É um dependente/cônjuge - verificar se o email é o mesmo do titular
            const { data: parentRequest } = await supabase
              .from("member_requests")
              .select("email")
              .eq("id", request.parent_request_id)
              .single();
            
            if (parentRequest?.email && parentRequest.email === request.email) {
              // Mesmo email do titular - gerar email fictício baseado no CPF
              const cpfClean = request.cpf.replace(/\D/g, "");
              if (cpfClean.length >= 11) {
                authEmail = `${cpfClean}@gileade.app`;
              }
            }
          } else if (!request.parent_request_id && request.cpf) {
            // É o titular - verificar se já existe OUTRO membro com o mesmo email
            const normalizedEmail = request.email.trim();
            const { data: existingMembers } = await supabase
              .from("members")
              .select("id")
              .ilike("email", normalizedEmail)
              .neq("id", newMember.id)
              .limit(1);
            
            if (existingMembers && existingMembers.length > 0) {
              // Email já existe para outro membro - gerar email fictício
              const cpfClean = request.cpf.replace(/\D/g, "");
              if (cpfClean.length >= 11) {
                authEmail = `${cpfClean}@gileade.app`;
              }
            }
          }

          const { data: userResult, error: userError } = await supabase.functions.invoke(
            "criar-usuario-membro",
            {
              body: {
                email: request.email,
                auth_email: authEmail,
                cpf: request.cpf || null,
                member_id: newMember.id,
                perfil: "membro",
              },
            }
          );

          if (userError) {
            console.error("Erro ao criar usuário:", userError);
          } else {
            console.log("Usuário criado automaticamente:", userResult);
          }
        } catch (userCreateError) {
          console.error("Erro ao criar usuário de autenticação:", userCreateError);
        }

        // Enviar email de boas-vindas após aprovação
        try {
          await supabase.functions.invoke("enviar-email-boas-vindas", {
            body: {
              email: request.email,
              nome: request.full_name,
            },
          });
          console.log("Email de boas-vindas enviado para:", request.email);
        } catch (emailError) {
          console.error("Erro ao enviar email de boas-vindas:", emailError);
        }
      }

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["candidaturas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-candidaturas"] });
      toast({ title: "Solicitação aprovada!", description: "Membro cadastrado e candidaturas aos ministérios criadas." });
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
    includesNormalized(req.full_name, search)
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
      <Tabs defaultValue="pendente" value={statusFilter || "excluidos"} onValueChange={(val) => {
        if (val === "excluidos") {
          setStatusFilter("");
        } else {
          setStatusFilter(val);
        }
      }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pendente" className="gap-1">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pendentes</span>
          </TabsTrigger>
          <TabsTrigger value="aprovado" className="gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Aprovados</span>
          </TabsTrigger>
          <TabsTrigger value="rejeitado" className="gap-1">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Rejeitados</span>
          </TabsTrigger>
          <TabsTrigger value="excluidos" className="gap-1" onClick={() => setStatusFilter("")}>
            <UserX className="w-4 h-4" />
            <span className="hidden sm:inline">Excluídos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excluidos" className="mt-6">
          <MembrosExcluidosTab />
        </TabsContent>

        {statusFilter && (
          <div className="mt-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <SearchInput
          placeholder="Buscar por nome..."
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-sm"
        />
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
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(request.status)}
                    {request.tipo_dependente === "filho" && (
                      <Badge variant="outline" className="text-xs">👶 Filho(a)</Badge>
                    )}
                    {request.tipo_dependente === "conjuge" && (
                      <Badge variant="outline" className="text-xs">💍 Cônjuge</Badge>
                    )}
                  </div>
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
                {needsResponsible(request.birth_date) && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <Baby className="w-4 h-4" />
                    Menor de 12 anos ({getAgeString(request.birth_date)})
                    {request.responsavel_id 
                      ? " - Com responsável" 
                      : request.parent_request_id 
                        ? " - Responsável será vinculado na aprovação"
                        : " - Sem responsável!"}
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
        )}
      </Tabs>
    </div>
  );
};

export default SolicitacoesMembrosTab;
