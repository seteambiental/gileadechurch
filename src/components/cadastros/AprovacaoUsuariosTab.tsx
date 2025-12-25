import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, X, UserPlus, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  master: "Master",
  ministerial: "Ministerial",
};

const AprovacaoUsuariosTab = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["user_access_requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("user_access_requests")
        .select(`
          *,
          member:members(id, full_name, email, whatsapp, photo_url)
        `)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data } = await supabase.from("ministries").select("id, name").order("name");
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Criar usuário no auth (usando a mesma senha temporária)
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: request.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário");

      const newUserId = authData.user.id;

      // 2. Vincular membro ao user_id
      await supabase
        .from("members")
        .update({ user_id: newUserId })
        .eq("id", request.member_id);

      // 3. Adicionar role
      await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: request.requested_role });

      // 4. Se ministerial, vincular aos ministérios selecionados
      if (request.requested_role === "ministerial" && selectedMinistries.length > 0) {
        const ministryInserts = selectedMinistries.map(ministry_id => ({
          user_id: newUserId,
          ministry_id,
        }));
        await supabase.from("user_ministries").insert(ministryInserts);
      }

      // 5. Atualizar status da solicitação
      await supabase
        .from("user_access_requests")
        .update({
          status: "aprovado",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      return { tempPassword, email: request.email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user_access_requests"] });
      toast({ 
        title: "Usuário aprovado!",
        description: `Senha temporária enviada para ${data.email}`,
      });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedMinistries([]);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao aprovar usuário", 
        description: String(error), 
        variant: "destructive" 
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (request: any) => {
      await supabase
        .from("user_access_requests")
        .update({
          status: "rejeitado",
          rejection_reason: rejectionReason,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_access_requests"] });
      toast({ title: "Solicitação rejeitada" });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao rejeitar", 
        description: String(error), 
        variant: "destructive" 
      });
    },
  });

  const filteredRequests = requests.filter(req => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      req.member?.full_name?.toLowerCase().includes(searchLower) ||
      req.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setSelectedMinistries(request.requested_ministry_ids || []);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "aprovado":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-secondary" />
            Aprovação de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma solicitação encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{request.member?.full_name}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{request.email}</span>
                      <span className="mx-2">•</span>
                      <span>Perfil: {ROLE_LABELS[request.requested_role]}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    {request.rejection_reason && (
                      <div className="text-sm text-red-400 mt-2">
                        Motivo: {request.rejection_reason}
                      </div>
                    )}
                  </div>
                  
                  {request.status === "pendente" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => handleApprove(request)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => handleReject(request)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-background border border-border">
                <p className="font-medium">{selectedRequest.member?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                <p className="text-sm text-muted-foreground">
                  Perfil solicitado: {ROLE_LABELS[selectedRequest.requested_role]}
                </p>
              </div>

              {selectedRequest.requested_role === "ministerial" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vincular aos Ministérios:</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-background border border-border">
                    {ministries.map((ministry) => (
                      <div key={ministry.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={ministry.id}
                          checked={selectedMinistries.includes(ministry.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMinistries([...selectedMinistries, ministry.id]);
                            } else {
                              setSelectedMinistries(selectedMinistries.filter(id => id !== ministry.id));
                            }
                          }}
                        />
                        <label htmlFor={ministry.id} className="text-sm cursor-pointer">
                          {ministry.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Uma senha temporária será gerada e o usuário receberá um email para confirmar o cadastro.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate(selectedRequest)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-background border border-border">
                <p className="font-medium">{selectedRequest.member?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo da rejeição:</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => rejectMutation.mutate(selectedRequest)}
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

export default AprovacaoUsuariosTab;
