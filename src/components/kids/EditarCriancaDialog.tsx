import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { todayDateStr } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, ArrowRightLeft, Check, X, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/masks";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { DateInput } from "@/components/ui/date-input";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface EditarCriancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    idade: number;
    genero: string | null;
    whatsapp: string | null;
    foto?: string | null;
    tipo: "membro" | "novo_convertido";
  } | null;
  turmaAtual?: TurmaConfig;
  turmasConfig?: TurmaConfig[];
}

export function EditarCriancaDialog({ open, onOpenChange, crianca, turmaAtual, turmasConfig = [] }: EditarCriancaDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [turmaDestino, setTurmaDestino] = useState("");
  const [motivoTransferencia, setMotivoTransferencia] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    responsavelNome: "",
    responsavelWhatsapp: "",
  });

  // Get current user's member_id
  const { data: currentMember } = useQuery({
    queryKey: ["current-member-kids", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  // Get user's kids funcao
  const { data: userKidsFuncao } = useQuery({
    queryKey: ["user-kids-funcao", currentMember?.id],
    queryFn: async () => {
      if (!currentMember) return null;
      const { data } = await supabase
        .from("kids_lideres")
        .select("funcao")
        .eq("member_id", currentMember.id)
        .eq("ativo", true);
      if (!data || data.length === 0) return null;
      // Return highest role: coordenador > professor > auxiliar
      if (data.some(d => d.funcao === "coordenador")) return "coordenador";
      if (data.some(d => d.funcao === "professor")) return "professor";
      return data[0].funcao;
    },
    enabled: !!currentMember && open,
  });

  // Check if user is admin/master
  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin-kids-edit", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_full_access");
      return !!data;
    },
    enabled: !!user && open,
  });

  const canTransfer = isAdmin || userKidsFuncao === "coordenador" || userKidsFuncao === "professor";
  const canApprove = isAdmin || userKidsFuncao === "coordenador";

  // Fetch existing transfer requests for this child
  const { data: transferencias = [] } = useQuery({
    queryKey: ["kids-transferencias", crianca?.id, crianca?.tipo],
    queryFn: async () => {
      if (!crianca) return [];
      const query = supabase
        .from("kids_transferencias_turma")
        .select(`
          *,
          solicitante:members!kids_transferencias_turma_solicitante_id_fkey(full_name),
          aprovador:members!kids_transferencias_turma_aprovador_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (crianca.tipo === "membro") {
        query.eq("crianca_member_id", crianca.id);
      } else {
        query.eq("crianca_novo_convertido_id", crianca.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!crianca && open,
  });

  // Buscar dados completos da criança
  const { data: dadosCompletos, isLoading: loadingDados } = useQuery({
    queryKey: ["crianca-detalhes", crianca?.id, crianca?.tipo],
    queryFn: async () => {
      if (!crianca) return null;
      
      if (crianca.tipo === "novo_convertido") {
        const { data, error } = await supabase
          .from("novos_convertidos")
          .select("*")
          .eq("id", crianca.id)
          .single();
        
        if (error) throw error;
        return { ...data, tipo: "novo_convertido" as const };
      } else {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("id", crianca.id)
          .single();
        
        if (error) throw error;
        return { ...data, tipo: "membro" as const, data_nascimento: data.birth_date };
      }
    },
    enabled: !!crianca && open,
  });

  useEffect(() => {
    if (dadosCompletos) {
      const ncData = dadosCompletos as { 
        responsavel_nome?: string; 
        responsavel_whatsapp?: string;
        photo_url?: string;
        full_name?: string;
        data_nascimento?: string;
        genero?: string;
      };
      
      setFormData({
        nome: dadosCompletos.full_name || "",
        dataNascimento: dadosCompletos.data_nascimento || "",
        genero: dadosCompletos.genero || "",
        responsavelNome: ncData.responsavel_nome || "",
        responsavelWhatsapp: ncData.responsavel_whatsapp || "",
      });
      setPhotoPreview(ncData.photo_url || null);
    }
  }, [dadosCompletos]);

  useEffect(() => {
    if (!open) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setTurmaDestino("");
      setMotivoTransferencia("");
    }
  }, [open]);

  const handlePhotoChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A foto deve ter no máximo 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  const uploadPhoto = async (criancaId: string, tipo: "membro" | "novo_convertido"): Promise<string | null> => {
    if (!photoFile) return null;
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${tipo}-${criancaId}-${Date.now()}.${fileExt}`;
    const filePath = `kids/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("member-photos").upload(filePath, photoFile);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("member-photos").getPublicUrl(filePath);
    return publicUrl;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!crianca) return;
      let photoUrl: string | null = null;
      if (photoFile) photoUrl = await uploadPhoto(crianca.id, crianca.tipo);
      
      if (crianca.tipo === "novo_convertido") {
        const updateData: Record<string, unknown> = {
          full_name: formData.nome.trim(),
          data_nascimento: formData.dataNascimento || null,
          genero: formData.genero || null,
          responsavel_nome: formData.responsavelNome.trim() || null,
          responsavel_whatsapp: formData.responsavelWhatsapp.replace(/\D/g, "") || null,
        };
        if (photoUrl) updateData.photo_url = photoUrl;
        const { error } = await supabase.from("novos_convertidos").update(updateData).eq("id", crianca.id);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = {
          full_name: formData.nome.trim(),
          birth_date: formData.dataNascimento || null,
          genero: formData.genero || null,
        };
        if (photoUrl) updateData.photo_url = photoUrl;
        const { error } = await supabase.from("members").update(updateData).eq("id", crianca.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes"] });
      toast.success("Criança atualizada com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao atualizar criança:", error);
      toast.error("Erro ao atualizar criança");
    },
  });

  // Transfer request mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!crianca || !turmaAtual || !turmaDestino || !currentMember) return;

      if (canApprove) {
        // Coordenador/admin: auto-approve - directly set the override
        const table = crianca.tipo === "membro" ? "members" : "novos_convertidos";
        const { error } = await supabase
          .from(table)
          .update({ kids_turma_override: turmaDestino } as Record<string, unknown>)
          .eq("id", crianca.id);
        if (error) throw error;

        // Record the transfer
        const insertData: Record<string, unknown> = {
          turma_origem: turmaAtual.turma,
          turma_destino: turmaDestino,
          motivo: motivoTransferencia || null,
          status: "aprovado",
          solicitante_id: currentMember.id,
          aprovador_id: currentMember.id,
          data_aprovacao: new Date().toISOString(),
        };
        if (crianca.tipo === "membro") {
          insertData.crianca_member_id = crianca.id;
        } else {
          insertData.crianca_novo_convertido_id = crianca.id;
        }
        await supabase.from("kids_transferencias_turma").insert(insertData);
      } else {
        // Professor: create pending request
        const insertData: Record<string, unknown> = {
          turma_origem: turmaAtual.turma,
          turma_destino: turmaDestino,
          motivo: motivoTransferencia || null,
          status: "pendente",
          solicitante_id: currentMember.id,
        };
        if (crianca.tipo === "membro") {
          insertData.crianca_member_id = crianca.id;
        } else {
          insertData.crianca_novo_convertido_id = crianca.id;
        }
        await supabase.from("kids_transferencias_turma").insert(insertData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      toast.success(canApprove ? "Transferência realizada!" : "Solicitação de transferência enviada!");
      setTurmaDestino("");
      setMotivoTransferencia("");
    },
    onError: (error) => {
      console.error("Erro na transferência:", error);
      toast.error("Erro ao processar transferência");
    },
  });

  // Approve transfer mutation
  const approveMutation = useMutation({
    mutationFn: async (transferId: string) => {
      if (!currentMember) return;
      const transfer = transferencias.find(t => t.id === transferId);
      if (!transfer) return;

      // Apply the override
      const childId = transfer.crianca_member_id || transfer.crianca_novo_convertido_id;
      const table = transfer.crianca_member_id ? "members" : "novos_convertidos";
      const { error: updateError } = await supabase
        .from(table)
        .update({ kids_turma_override: transfer.turma_destino } as Record<string, unknown>)
        .eq("id", childId!);
      if (updateError) throw updateError;

      const { error } = await supabase
        .from("kids_transferencias_turma")
        .update({
          status: "aprovado",
          aprovador_id: currentMember.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      toast.success("Transferência aprovada!");
    },
    onError: () => toast.error("Erro ao aprovar transferência"),
  });

  // Deny transfer mutation
  const denyMutation = useMutation({
    mutationFn: async (transferId: string) => {
      if (!currentMember) return;
      const { error } = await supabase
        .from("kids_transferencias_turma")
        .update({
          status: "negado",
          aprovador_id: currentMember.id,
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-transferencias"] });
      toast.success("Transferência negada.");
    },
    onError: () => toast.error("Erro ao negar transferência"),
  });

  // Delete transfer mutation
  const deleteTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from("kids_transferencias_turma")
        .delete()
        .eq("id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-transferencias"] });
      toast.success("Solicitação excluída.");
    },
    onError: () => toast.error("Erro ao excluir solicitação"),
  });

  const convertToMemberMutation = useMutation({
    mutationFn: async () => {
      if (!crianca || crianca.tipo !== "novo_convertido" || !dadosCompletos) return;
      let photoUrl: string | null = null;
      if (photoFile) photoUrl = await uploadPhoto(crianca.id, "membro");
      
      const ncData = dadosCompletos as { 
        full_name: string; data_nascimento: string; genero: string; whatsapp: string;
        email: string; cep: string; address: string; numero: string; complement: string;
        neighborhood: string; city: string; state: string; cpf: string;
      };
      
      const { data: novoMembro, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: ncData.full_name,
          birth_date: ncData.data_nascimento,
          genero: ncData.genero,
          whatsapp: ncData.whatsapp,
          email: ncData.email,
          cep: ncData.cep,
          address: ncData.address,
          number: ncData.numero,
          complement: ncData.complement,
          neighborhood: ncData.neighborhood,
          city: ncData.city,
          state: ncData.state,
          cpf: ncData.cpf,
          photo_url: photoUrl,
          member_since: todayDateStr(),
        })
        .select()
        .single();
      
      if (memberError) throw memberError;

      await supabase
        .from("novos_convertidos")
        .update({ tornou_membro: true, member_id: novoMembro.id, data_membresia: todayDateStr() })
        .eq("id", crianca.id);

      await supabase
        .from("kids_responsaveis")
        .update({ crianca_member_id: novoMembro.id, crianca_novo_convertido_id: null })
        .eq("crianca_novo_convertido_id", crianca.id);

      return novoMembro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      toast.success("Criança convertida para membro com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao converter para membro:", error);
      toast.error("Erro ao converter para membro");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMutation.mutate();
  };

  if (!crianca) return null;

  const pendingTransfers = transferencias.filter(t => t.status === "pendente");
  const turmaDestinoConfig = turmasConfig.find(t => t.turma === turmaDestino);
  const otherTurmas = turmasConfig.filter(t => t.turma !== turmaAtual?.turma);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "aprovado": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "negado": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Negado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            ✏️ Editar Criança {crianca.tipo === "novo_convertido" && "(Visitante)"}
          </DialogTitle>
        </DialogHeader>

        {loadingDados ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Turma atual */}
            {turmaAtual && (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: turmaAtual.cor_hex }} />
                <span className="text-sm font-medium">Turma atual:</span>
                <Badge style={{ backgroundColor: `${turmaAtual.cor_hex}20`, color: turmaAtual.cor_hex, borderColor: turmaAtual.cor_hex }} variant="outline">
                  {turmaAtual.nome_exibicao}
                </Badge>
              </div>
            )}

            {/* Upload de foto */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-4 border-muted">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-2xl">
                  {crianca.nome.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <CameraPhotoInput onPhotoCapture={handlePhotoChange} photoPreview={photoPreview} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Criança *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <DateInput
                  id="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={(value) => setFormData((prev) => ({ ...prev, dataNascimento: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero</Label>
                <Select
                  value={formData.genero}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, genero: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos de responsável - apenas para visitantes */}
            {crianca.tipo === "novo_convertido" && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">👨‍👩‍👧 Responsável</h4>
                <div className="space-y-2">
                  <Label htmlFor="responsavelNome">Nome do Responsável</Label>
                  <Input
                    id="responsavelNome"
                    value={formData.responsavelNome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, responsavelNome: e.target.value }))}
                    placeholder="Nome do pai/mãe/responsável"
                  />
                </div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="responsavelWhatsapp">WhatsApp do Responsável</Label>
                  <Input
                    id="responsavelWhatsapp"
                    value={formatPhone(formData.responsavelWhatsapp)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, responsavelWhatsapp: e.target.value.replace(/\D/g, "") }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>

            {/* Seção de Transferência de Turma */}
            {canTransfer && turmaAtual && otherTurmas.length > 0 && (
              <>
                <Separator />
                <div className="pt-2 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transferência de Turma
                  </h4>

                  <div className="space-y-2">
                    <Label>Turma de destino</Label>
                    <Select value={turmaDestino} onValueChange={setTurmaDestino}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a nova turma..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherTurmas.map((t) => (
                          <SelectItem key={t.turma} value={t.turma}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.cor_hex }} />
                              {t.nome_exibicao} ({t.idade_minima}-{t.idade_maxima} anos)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {turmaDestino && (
                    <div className="space-y-2">
                      <Label>Motivo (opcional)</Label>
                      <Input
                        value={motivoTransferencia}
                        onChange={(e) => setMotivoTransferencia(e.target.value)}
                        placeholder="Ex: Criança avançada para a idade..."
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!turmaDestino || transferMutation.isPending}
                    onClick={() => transferMutation.mutate()}
                  >
                    {transferMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    {canApprove ? "Transferir agora" : "Solicitar transferência"}
                  </Button>

                  {!canApprove && (
                    <p className="text-xs text-muted-foreground text-center">
                      A transferência será enviada para aprovação do Coordenador
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Transferências pendentes - visíveis para coordenador e professor */}
            {canTransfer && pendingTransfers.length > 0 && (
              <>
                <Separator />
                <div className="pt-2 space-y-3">
                  <h4 className="font-medium text-sm">📋 Solicitações pendentes</h4>
                  {pendingTransfers.map((t) => {
                    const origemTurma = turmasConfig.find(tc => tc.turma === t.turma_origem);
                    const destinoTurma = turmasConfig.find(tc => tc.turma === t.turma_destino);
                    const solicitanteData = t.solicitante as { full_name: string } | null;
                    return (
                      <div key={t.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" style={{ backgroundColor: `${origemTurma?.cor_hex || '#888'}20`, color: origemTurma?.cor_hex, borderColor: origemTurma?.cor_hex }}>
                            {origemTurma?.nome_exibicao || t.turma_origem}
                          </Badge>
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" style={{ backgroundColor: `${destinoTurma?.cor_hex || '#888'}20`, color: destinoTurma?.cor_hex, borderColor: destinoTurma?.cor_hex }}>
                            {destinoTurma?.nome_exibicao || t.turma_destino}
                          </Badge>
                        </div>
                        {t.motivo && <p className="text-xs text-muted-foreground">{t.motivo}</p>}
                        <p className="text-xs text-muted-foreground">Por: {solicitanteData?.full_name || "—"}</p>
                        <div className="flex gap-2">
                          {canApprove && (
                            <>
                              <Button type="button" size="sm" variant="outline" className="flex-1 text-green-700 border-green-200 hover:bg-green-50" onClick={() => approveMutation.mutate(t.id)} disabled={approveMutation.isPending}>
                                <Check className="h-3 w-3 mr-1" /> Aprovar
                              </Button>
                              <Button type="button" size="sm" variant="outline" className="flex-1 text-red-700 border-red-200 hover:bg-red-50" onClick={() => denyMutation.mutate(t.id)} disabled={denyMutation.isPending}>
                                <X className="h-3 w-3 mr-1" /> Negar
                              </Button>
                            </>
                          )}
                          {canApprove && (
                            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTransferMutation.mutate(t.id)} disabled={deleteTransferMutation.isPending}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Histórico de transferências (não pendentes) */}
            {canTransfer && transferencias.filter(t => t.status !== "pendente").length > 0 && (
              <>
                <Separator />
                <div className="pt-2 space-y-2">
                  <h4 className="font-medium text-sm">📜 Histórico</h4>
                  {transferencias.filter(t => t.status !== "pendente").slice(0, 5).map((t) => {
                    const origemTurma = turmasConfig.find(tc => tc.turma === t.turma_origem);
                    const destinoTurma = turmasConfig.find(tc => tc.turma === t.turma_destino);
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{origemTurma?.nome_exibicao || t.turma_origem}</span>
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{destinoTurma?.nome_exibicao || t.turma_destino}</span>
                        {statusBadge(t.status)}
                        {canApprove && (
                          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteTransferMutation.mutate(t.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Botão converter para membro */}
            {crianca.tipo === "novo_convertido" && (
              <>
                <Separator />
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                    onClick={() => convertToMemberMutation.mutate()}
                    disabled={convertToMemberMutation.isPending}
                  >
                    {convertToMemberMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Converter para Membro
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Isso criará um cadastro completo de membro para esta criança
                  </p>
                </div>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
