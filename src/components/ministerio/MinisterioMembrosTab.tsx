import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  MessageCircle, 
  Loader2, 
  UserCheck, 
  UserPlus,
  Send,
  Filter,
  ArrowUpDown,
  Share2,
  FileText,
} from "lucide-react";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { VisitanteFormDialog } from "./VisitanteFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { includesNormalized } from "@/lib/text-utils";

interface MinisterioMembrosTabProps {
  ministerioSlug: string;
  ministerioTitle: string;
  idadeMinima?: number;
  idadeMaxima?: number;
  generoFiltro?: "masculino" | "feminino" | null;
  estadoCivilFiltro?: "solteiro" | "casado" | null;
}

interface Membro {
  id: string;
  full_name: string;
  birth_date: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  genero: string | null;
  tipo: "membro" | "visitante";
  idade?: number;
}

export const MinisterioMembrosTab = ({ 
  ministerioSlug, 
  ministerioTitle,
  idadeMinima = 0,
  idadeMaxima = 120,
  generoFiltro = null,
  estadoCivilFiltro = null,
}: MinisterioMembrosTabProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState("");
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "membro" | "visitante">("todos");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [shareDestinatarioId, setShareDestinatarioId] = useState<string>("");
  const [shareSending, setShareSending] = useState(false);

  // Buscar membros da tabela members
  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["membros-ministerio", ministerioSlug, generoFiltro, estadoCivilFiltro],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, full_name, birth_date, whatsapp, photo_url, genero, estado_civil");
      
      if (generoFiltro) {
        query = query.eq("genero", generoFiltro);
      }
      
      if (estadoCivilFiltro) {
        query = query.eq("estado_civil", estadoCivilFiltro);
      }
      
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      
      const hoje = new Date();
      
      return (data || [])
        .map((m) => {
          const idade = m.birth_date 
            ? differenceInYears(hoje, parseLocalDate(m.birth_date))
            : null;
          return {
            ...m,
            tipo: "membro" as const,
            idade,
          };
        })
        .filter((m) => {
          if (m.idade === null) return false;
          return m.idade >= idadeMinima && m.idade <= idadeMaxima;
        });
    },
  });

  // Buscar visitantes (novos_convertidos) do ministério
  const { data: visitantes = [], isLoading: loadingVisitantes } = useQuery({
    queryKey: ["visitantes-ministerio", ministerioSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, data_nascimento, whatsapp, photo_url, genero, observacoes")
        .eq("tornou_membro", false)
        .order("full_name");
      
      if (error) throw error;
      
      const hoje = new Date();
      const visitantesFiltrados = (data || []).filter((v: any) => 
        v.observacoes?.includes(`Visitante ${ministerioTitle}`)
      );
      
      return visitantesFiltrados
        .map((v: any) => {
          const idade = v.data_nascimento 
            ? differenceInYears(hoje, parseLocalDate(v.data_nascimento))
            : null;
          return {
            id: v.id,
            full_name: v.full_name,
            birth_date: v.data_nascimento,
            whatsapp: v.whatsapp,
            photo_url: v.photo_url,
            genero: v.genero,
            tipo: "visitante" as const,
            idade,
          };
        })
        .filter((v: any) => {
          if (v.idade === null) return true;
          return v.idade >= idadeMinima && v.idade <= idadeMaxima;
        });
    },
  });

  // Converter visitante em membro
  const converterMutation = useMutation({
    mutationFn: async (visitanteId: string) => {
      const visitante = visitantes.find((v) => v.id === visitanteId);
      if (!visitante) throw new Error("Visitante não encontrado");

      // Criar membro
      const { data: novoMembro, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: visitante.full_name,
          birth_date: visitante.birth_date,
          whatsapp: visitante.whatsapp,
          photo_url: visitante.photo_url,
          genero: visitante.genero,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Marcar como tornou_membro
      await supabase
        .from("novos_convertidos")
        .update({ tornou_membro: true, member_id: novoMembro.id })
        .eq("id", visitanteId);

      return novoMembro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-ministerio", ministerioSlug] });
      queryClient.invalidateQueries({ queryKey: ["visitantes-ministerio", ministerioSlug] });
      toast.success("Visitante convertido em membro!");
    },
    onError: (error) => {
      console.error("Erro ao converter:", error);
      toast.error("Erro ao converter visitante");
    },
  });

  // Combinar e filtrar membros + visitantes
  const todosMembros = useMemo(() => {
    const todos = [...membros, ...visitantes];
    
    return todos
      .filter((m) => {
        const matchSearch = includesNormalized(m.full_name, search);
        const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
        return matchSearch && matchTipo;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [membros, visitantes, search, filtroTipo]);

  // Enviar mensagem em lote
  const enviarMensagemLote = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Selecione pelo menos um membro");
      return;
    }
    if (!mensagem.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setIsSending(true);
    try {
      const membrosParaEnviar = todosMembros.filter(
        (m) => selectedMembers.includes(m.id) && m.whatsapp
      );

      if (membrosParaEnviar.length === 0) {
        toast.error("Nenhum membro selecionado possui WhatsApp");
        return;
      }

      const total = membrosParaEnviar.length;
      setSendProgress({ current: 0, total });
      let enviados = 0;
      for (let i = 0; i < membrosParaEnviar.length; i++) {
        const membro = membrosParaEnviar[i];
        const primeiroNome = (membro.full_name || "").trim().split(/\s+/)[0] || "";
        const mensagemPersonalizada = mensagem.replace(/\{nome\}/gi, primeiroNome);
        try {
          await supabase.functions.invoke("enviar-whatsapp", {
            body: {
              action: "mensagem_livre",
              telefone: membro.whatsapp,
              mensagem: mensagemPersonalizada,
            },
          });
          enviados++;
        } catch (err) {
          console.warn("Falha ao enviar para", membro.full_name, err);
        }
        setSendProgress({ current: i + 1, total });
        // Espaçamento aleatório 15-30s entre envios (anti-SPAM Evolution)
        if (i < membrosParaEnviar.length - 1) {
          const delay = Math.floor(Math.random() * 15000) + 15000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      toast.success(`Mensagem enviada para ${enviados} de ${total} pessoa(s)!`);
      setSelectedMembers([]);
      setMensagem("");
      setBulkDialogOpen(false);
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao enviar mensagens");
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedMembers.length === todosMembros.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(todosMembros.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isLoading = loadingMembros || loadingVisitantes;

  // Gera a lista formatada para WhatsApp
  const gerarListaTexto = () => {
    const linhas: string[] = [];
    linhas.push(`*Lista — ${ministerioTitle}*`);
    linhas.push(`Total: ${todosMembros.length} pessoa(s)`);
    linhas.push("");
    todosMembros.forEach((m, i) => {
      const idade = m.idade != null ? ` (${m.idade}a)` : "";
      const tipo = m.tipo === "visitante" ? " — visitante" : "";
      const wpp = m.whatsapp ? ` — ${m.whatsapp}` : "";
      linhas.push(`${i + 1}. ${m.full_name}${idade}${tipo}${wpp}`);
    });
    return linhas.join("\n");
  };

  const compartilharLista = async () => {
    const destinatario = todosMembros.find((m) => m.id === shareDestinatarioId);
    if (!destinatario || !destinatario.whatsapp) {
      toast.error("Selecione um contato com WhatsApp");
      return;
    }
    setShareSending(true);
    try {
      const { error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: {
          action: "mensagem_livre",
          telefone: destinatario.whatsapp,
          mensagem: gerarListaTexto(),
        },
      });
      if (error) throw error;
      toast.success(`Lista enviada para ${destinatario.full_name}`);
      setShareDialogOpen(false);
    } catch (err) {
      console.error("Erro ao compartilhar lista:", err);
      toast.error("Erro ao enviar lista");
    } finally {
      setShareSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Membros - {ministerioTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {membros.length} membros • {visitantes.length} visitantes
          </p>
        </div>
        
        <div className="flex gap-2">
          <ExportButton
            data={todosMembros}
            columns={[
              { header: "Nome", accessor: "full_name" },
              { header: "Idade", accessor: (r) => r.idade ? `${r.idade} anos` : "-" },
              { header: "Gênero", accessor: (r) => r.genero === "masculino" ? "Masculino" : r.genero === "feminino" ? "Feminino" : "-" },
              { header: "WhatsApp", accessor: "whatsapp" },
              { header: "Tipo", accessor: (r) => r.tipo === "membro" ? "Membro" : "Visitante" },
            ]}
            filename={`membros-${ministerioSlug}`}
            title={`Membros - ${ministerioTitle}`}
            sheetName="Membros"
          />
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              setBulkSearch("");
              setBulkDialogOpen(true);
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Mensagem em Lote
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              setShareSearch("");
              setShareDestinatarioId("");
              setShareDialogOpen(true);
            }}
          >
            <Share2 className="w-4 h-4" />
            Compartilhar Lista
          </Button>
          <VisitanteFormDialog 
            ministerioSlug={ministerioSlug} 
            ministerioTitle={ministerioTitle} 
          />
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          placeholder="Buscar por nome..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        
        <div className="flex gap-2">
          <Button
            variant={filtroTipo === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </Button>
          <Button
            variant={filtroTipo === "membro" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("membro")}
            className="gap-1"
          >
            <UserCheck className="w-4 h-4" />
            Membros
          </Button>
          <Button
            variant={filtroTipo === "visitante" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("visitante")}
            className="gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Visitantes
          </Button>
        </div>
      </div>

      {/* Lista de Membros */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : todosMembros.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum membro encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lista de Participantes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {todosMembros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={membro.photo_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(membro.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{membro.full_name}</span>
                      <Badge
                        variant={membro.tipo === "membro" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {membro.tipo === "membro" ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Membro
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            Visitante
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {membro.idade !== undefined && membro.idade !== null && (
                        <span>{membro.idade} anos</span>
                      )}
                      {membro.whatsapp && (
                        <span className="ml-2">• {membro.whatsapp}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {membro.tipo === "visitante" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => converterMutation.mutate(membro.id)}
                        disabled={converterMutation.isPending}
                        className="text-xs gap-1"
                      >
                        {converterMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        Converter
                      </Button>
                    )}
                    {membro.whatsapp && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const url = `https://wa.me/55${membro.whatsapp?.replace(/\D/g, "")}`;
                          window.open(url, "_blank");
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: seleção de destinatários e envio em lote */}
      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(v) => {
          if (isSending) return;
          setBulkDialogOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-secondary" />
              Enviar mensagem em lote
            </DialogTitle>
            <DialogDescription>
              Selecione os destinatários e escreva a mensagem. Use {"{nome}"} para
              personalizar com o primeiro nome. Envio espaçado de 15–30 segundos
              entre cada mensagem para evitar bloqueios (Evolution API).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <SearchInput
              placeholder="Buscar destinatários..."
              value={bulkSearch}
              onChange={setBulkSearch}
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedMembers.length} selecionado(s) • {todosMembros.filter((m) => m.whatsapp).length} com WhatsApp
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const elegiveis = todosMembros.filter((m) => m.whatsapp);
                  const todosIds = elegiveis.map((m) => m.id);
                  const allSelected = todosIds.every((id) => selectedMembers.includes(id));
                  if (allSelected) {
                    setSelectedMembers((prev) => prev.filter((id) => !todosIds.includes(id)));
                  } else {
                    setSelectedMembers((prev) => Array.from(new Set([...prev, ...todosIds])));
                  }
                }}
                className="text-xs"
              >
                Selecionar todos com WhatsApp
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {todosMembros
                .filter((m) => includesNormalized(m.full_name, bulkSearch))
                .map((membro) => {
                  const disabled = !membro.whatsapp;
                  return (
                    <label
                      key={membro.id}
                      className={`flex items-center gap-3 p-2 text-sm cursor-pointer hover:bg-muted/50 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(membro.id)}
                        disabled={disabled}
                        onCheckedChange={() => !disabled && toggleSelect(membro.id)}
                      />
                      <span className="flex-1 truncate">{membro.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {membro.whatsapp || "sem WhatsApp"}
                      </span>
                    </label>
                  );
                })}
            </div>

            <Textarea
              placeholder="Digite a mensagem... Use {nome} para personalizar"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={5}
            />

            {sendProgress && (
              <div className="text-sm text-muted-foreground">
                Enviando {sendProgress.current} de {sendProgress.total}...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarMensagemLote}
              disabled={isSending || selectedMembers.length === 0 || !mensagem.trim()}
              className="gap-1"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: compartilhar lista por WhatsApp */}
      <Dialog
        open={shareDialogOpen}
        onOpenChange={(v) => {
          if (shareSending) return;
          setShareDialogOpen(v);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-secondary" />
              Compartilhar lista por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Selecione um contato da equipe para receber a lista de {todosMembros.length} pessoa(s) de {ministerioTitle}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Prévia
              </p>
              <pre className="text-xs whitespace-pre-wrap font-mono">{gerarListaTexto()}</pre>
            </div>

            <SearchInput
              placeholder="Buscar contato..."
              value={shareSearch}
              onChange={setShareSearch}
            />

            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {todosMembros
                .filter((m) => m.whatsapp && includesNormalized(m.full_name, shareSearch))
                .map((membro) => (
                  <label
                    key={membro.id}
                    className="flex items-center gap-3 p-2 text-sm cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name="share-dest"
                      checked={shareDestinatarioId === membro.id}
                      onChange={() => setShareDestinatarioId(membro.id)}
                    />
                    <span className="flex-1 truncate">{membro.full_name}</span>
                    <span className="text-xs text-muted-foreground">{membro.whatsapp}</span>
                  </label>
                ))}
              {todosMembros.filter((m) => m.whatsapp).length === 0 && (
                <p className="p-3 text-sm text-muted-foreground text-center">
                  Nenhum contato com WhatsApp disponível.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              disabled={shareSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={compartilharLista}
              disabled={shareSending || !shareDestinatarioId}
              className="gap-1"
            >
              {shareSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
