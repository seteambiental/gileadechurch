import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import pgChurchKidsIcon from "@/assets/pg-church-kids.png";
import { Plus, Edit2, Trash2, Loader2, Filter, X, Download, FileSpreadsheet, FileText, Eye, Mail, MessageCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatDateBR } from "@/lib/masks";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { includesNormalized } from "@/lib/text-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MemberFormDialog from "./MemberFormDialog";
import WhatsappSegmentadoDialog from "./WhatsappSegmentadoDialog";
import WhatsappMensagemPreview from "./WhatsappMensagemPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MemberFunction {
  id: string;
  function_type: string;
  ministry_id: string | null;
  casa_refugio_id: string | null;
  condominio_id: string | null;
  ministries?: { name: string } | null;
  casas_refugio?: { name: string } | null;
  condominios?: { name: string } | null;
}

interface Member {
  id: string;
  full_name: string;
  birth_date: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  member_since: string | null;
  member_functions?: MemberFunction[];
  genero: string | null;
  estado_civil: string | null;
  cpf: string | null;
  rg: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cep: string | null;
  casa_refugio_id: string | null;
  kids_numero: number | null;
}

const functionTypeLabels: Record<string, string> = {
  lider_casa_refugio: "Líder de Casa Refúgio",
  anfitriao_casa_refugio: "Anfitrião(ã) de Casa Refúgio",
  secretario_casa_refugio: "Secretário(a) de Casa Refúgio",
  supervisor_casa_refugio: "Supervisor de Casa Refúgio",
  lider_ministerio: "Líder de Ministério",
  pastor_geral: "Pastor Geral",
  pastor_auxiliar: "Pastor Auxiliar",
  supervisor_condominio: "Supervisor de Condomínio",
  sindico_condominio: "Síndico de Condomínio",
  integrante_ministerio: "Integrante de Ministério",
  membro: "Membro",
};

const functionTypeOptions = Object.entries(functionTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const ITEMS_PER_PAGE = 20;

const MembrosTab = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFunction, setFilterFunction] = useState<string>("");
  const [filterMinistry, setFilterMinistry] = useState<string>("");
  const [filterCasaRefugio, setFilterCasaRefugio] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [whatsappMember, setWhatsappMember] = useState<Member | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [showWhatsappChoice, setShowWhatsappChoice] = useState(false);
  const [whatsappBulkMode, setWhatsappBulkMode] = useState(false);
  const [showSegmentado, setShowSegmentado] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0, current: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          member_functions (
            id,
            function_type,
            ministry_id,
            casa_refugio_id,
            condominio_id,
            ministries (name),
            casas_refugio (name),
            condominios (name)
          )
        `)
        .or("excluido.is.null,excluido.eq.false")
        .order("full_name");
      if (error) throw error;
      return data as Member[];
    },
  });

  const { data: faceIndexes = [] } = useQuery({
    queryKey: ["face-indexes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_face_indexes")
        .select("member_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas_refugio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Buscar IDs dos responsáveis que têm crianças vinculadas
  const { data: responsaveisComCriancas = [] } = useQuery({
    queryKey: ["responsaveis-com-criancas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select("responsavel_member_id");
      if (error) throw error;
      const ids = new Set(data?.map(r => r.responsavel_member_id).filter(Boolean));
      return [...ids] as string[];
    },
  });

  const responsavelSet = new Set(responsaveisComCriancas);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("excluir-membro", {
        body: { memberId: id },
      });
      if (error) throw new Error(error.message);
      if (!data?.deleted) {
        throw new Error("O backend não confirmou a exclusão deste membro.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro excluído com sucesso!" });
      setDeletingMemberId(null);
    },
    onError: (err: any) => {
      const message = err?.message || "Erro ao excluir membro";
      toast({ title: message, variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (member: Member) => {
      if (!member.email) throw new Error("Membro não possui email cadastrado");
      
      const { data, error } = await supabase.functions.invoke("enviar-email-boas-vindas", {
        body: { 
          email: member.email,
          nome: member.full_name,
        },
      });
      
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar email");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Email enviado com sucesso!" });
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao enviar email", 
        description: err?.message || "Erro desconhecido",
        variant: "destructive" 
      });
    },
  });

  const sendWhatsappMutation = useMutation({
    mutationFn: async ({ member, mensagem }: { member: Member; mensagem: string }) => {
      if (!member.whatsapp) throw new Error("Membro não possui WhatsApp cadastrado");
      if (!mensagem.trim()) throw new Error("Digite uma mensagem");
      
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { 
          action: 'mensagem_direta',
          telefone: member.whatsapp,
          mensagem,
          nome: member.full_name,
          memberId: member.id,
        },
      });
      
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar mensagem");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Mensagem WhatsApp enviada com sucesso!" });
      setWhatsappMember(null);
      setWhatsappMessage("");
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao enviar WhatsApp", 
        description: err?.message || "Erro desconhecido",
        variant: "destructive" 
      });
    },
  });

  const sendBulkWhatsapp = async (mensagem: string) => {
    const membersWithWhatsapp = filteredMembers.filter(m => m.whatsapp);
    if (membersWithWhatsapp.length === 0) {
      toast({ variant: "destructive", title: "Nenhum membro com WhatsApp na lista filtrada" });
      return;
    }
    setBulkSending(true);
    setBulkProgress({ sent: 0, total: membersWithWhatsapp.length, current: "" });
    let enviados = 0;
    let erros = 0;
    for (let i = 0; i < membersWithWhatsapp.length; i++) {
      const member = membersWithWhatsapp[i];
      const msgPersonalizada = mensagem.replace("{nome}", member.full_name.split(" ")[0]);
      setBulkProgress({ sent: i, total: membersWithWhatsapp.length, current: member.full_name });
      try {
        const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
          body: { action: "mensagem_direta", telefone: member.whatsapp, mensagem: msgPersonalizada, nome: member.full_name, memberId: member.id },
        });
        if (error || !data?.success) { erros++; } else { enviados++; }
      } catch { erros++; }
      // Intervalo de 30 segundos entre mensagens para evitar SPAM
      if (i < membersWithWhatsapp.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    setBulkSending(false);
    setBulkProgress({ sent: 0, total: 0, current: "" });
    setWhatsappBulkMode(false);
    setWhatsappMessage("");
    toast({
      title: `Envio concluído: ${enviados} enviadas, ${erros} erros`,
      description: `Total: ${membersWithWhatsapp.length} membros`,
    });
  };

  const filteredMembers = members.filter((member) => {
    // Filter by name search
    const matchesSearch = includesNormalized(member.full_name, searchTerm);
    
    // Filter by function type
    const matchesFunction = !filterFunction || 
      member.member_functions?.some(fn => fn.function_type === filterFunction);
    
    // Filter by ministry
    const matchesMinistry = !filterMinistry || 
      member.member_functions?.some(fn => fn.ministry_id === filterMinistry);
    
    // Filter by casa refúgio
    const matchesCasaRefugio = !filterCasaRefugio || 
      member.member_functions?.some(fn => fn.casa_refugio_id === filterCasaRefugio);

    return matchesSearch && matchesFunction && matchesMinistry && matchesCasaRefugio;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const hasActiveFilters = filterFunction || filterMinistry || filterCasaRefugio;

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterFunction("");
    setFilterMinistry("");
    setFilterCasaRefugio("");
    setCurrentPage(1);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getFunctionDisplay = (fn: MemberFunction) => {
    const label = functionTypeLabels[fn.function_type] || fn.function_type;
    let subdivision = "";
    
    if (fn.ministries?.name) {
      subdivision = fn.ministries.name;
    } else if (fn.casas_refugio?.name) {
      subdivision = fn.casas_refugio.name;
    } else if (fn.condominios?.name) {
      subdivision = fn.condominios.name;
    }

    return { label, subdivision };
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={currentPage === i}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <SearchInput
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1"
            />
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => setShowWhatsappChoice(true)}
              disabled={filteredMembers.length === 0 || bulkSending}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={filteredMembers.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={async () => await exportToExcel(filteredMembers, "membros", faceIndexes, casasRefugio)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF(filteredMembers, "membros", faceIndexes, casasRefugio)}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsFormOpen(true)} className="bg-secondary hover:bg-secondary/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={showFilters}>
          <CollapsibleContent>
            <Card className="bg-muted/50 border-border p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Função</label>
                  <Select 
                    value={filterFunction} 
                    onValueChange={(value) => {
                      setFilterFunction(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as funções" />
                    </SelectTrigger>
                    <SelectContent>
                      {functionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Ministério</label>
                  <Select 
                    value={filterMinistry} 
                    onValueChange={(value) => {
                      setFilterMinistry(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os ministérios" />
                    </SelectTrigger>
                    <SelectContent>
                      {ministries.map((ministry) => (
                        <SelectItem key={ministry.id} value={ministry.id}>
                          {ministry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Casa Refúgio</label>
                  <Select 
                    value={filterCasaRefugio} 
                    onValueChange={(value) => {
                      setFilterCasaRefugio(value);
                      handleFilterChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as casas" />
                    </SelectTrigger>
                    <SelectContent>
                      {casasRefugio.map((casa) => (
                        <SelectItem key={casa.id} value={casa.id}>
                          {casa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm ? "Nenhum membro encontrado" : "Nenhum membro cadastrado"}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground min-w-[200px]">Membro</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">WhatsApp</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Cidade/UF</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Membro Desde</TableHead>
                <TableHead className="text-muted-foreground hidden xl:table-cell">Funções</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedMembers.map((member) => (
                  <TableRow 
                    key={member.id} 
                    className="border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/membro/${member.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border shrink-0">
                          <AvatarImage 
                            src={member.photo_url || undefined} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-secondary/20 text-secondary text-sm font-semibold">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground">{member.full_name}</p>
                            {responsavelSet.has(member.id) && (
                              <img 
                                src={pgChurchKidsIcon} 
                                alt="Responsável PG Kids" 
                                className="h-4 w-auto" 
                                title="Responsável por criança(s) no PG"
                              />
                            )}
                          </div>
                          {member.email && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground hidden md:table-cell">
                      {member.whatsapp ? formatPhone(member.whatsapp) : "-"}
                    </TableCell>
                    <TableCell className="text-foreground hidden lg:table-cell">
                      {member.city && member.state 
                        ? `${member.city}/${member.state}` 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-foreground text-sm hidden lg:table-cell">
                      {formatDateBR(member.member_since)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {member.member_functions && member.member_functions.length > 0 ? (
                          member.member_functions.slice(0, 2).map((fn) => {
                            const { label, subdivision } = getFunctionDisplay(fn);
                            return (
                              <Badge 
                                key={fn.id} 
                                variant="secondary"
                                className="text-xs"
                              >
                                {label}
                                {subdivision && (
                                  <span className="ml-1 opacity-75">({subdivision})</span>
                                )}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                        {member.member_functions && member.member_functions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.member_functions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/membro/${member.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {member.whatsapp && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => {
                              setWhatsappMember(member);
                              setWhatsappMessage(`Olá ${member.full_name.split(' ')[0]}! 👋\n\nPaz do Senhor! `);
                            }}
                            title="Enviar WhatsApp via Evolution"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {member.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            onClick={() => sendEmailMutation.mutate(member)}
                            disabled={sendEmailMutation.isPending}
                            title="Enviar email de boas-vindas"
                          >
                            {sendEmailMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingMember(member);
                            setIsFormOpen(true);
                          }}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingMemberId(member.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Exibindo {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length)} de {filteredMembers.length} membro{filteredMembers.length !== 1 ? "s" : ""}
            </p>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <MemberFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingMember(null);
        }}
        member={editingMember}
      />


      {/* WhatsApp Message Dialog */}
      <AlertDialog open={!!whatsappMember} onOpenChange={(open) => {
        if (!open) {
          setWhatsappMember(null);
          setWhatsappMessage("");
        }
      }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Enviar WhatsApp para {whatsappMember?.full_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              WhatsApp: {whatsappMember?.whatsapp ? formatPhone(whatsappMember.whatsapp) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={5}
            />
            {whatsappMember && (
              <WhatsappMensagemPreview
                mensagem={whatsappMessage}
                membros={[{ full_name: whatsappMember.full_name, whatsapp: whatsappMember.whatsapp }]}
                amostras={1}
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!whatsappMessage.trim() || sendWhatsappMutation.isPending}
              onClick={() => {
                if (whatsappMember) {
                  sendWhatsappMutation.mutate({ member: whatsappMember, mensagem: whatsappMessage });
                }
              }}
            >
              {sendWhatsappMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WhatsApp Choice Dialog - Todos ou Individual */}
      <AlertDialog open={showWhatsappChoice} onOpenChange={setShowWhatsappChoice}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Enviar WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar a mensagem para todos os membros filtrados ({filteredMembers.filter(m => m.whatsapp).length} com WhatsApp) ou selecionar um membro específico?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setShowWhatsappChoice(false);
                setWhatsappBulkMode(true);
                setWhatsappMessage("Olá {nome}! 👋\n\nPaz do Senhor! ");
              }}
            >
              <Users className="w-5 h-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Enviar para todos</p>
                <p className="text-xs text-muted-foreground">
                  {filteredMembers.filter(m => m.whatsapp).length} membros com WhatsApp (intervalo de 30s entre envios)
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setShowWhatsappChoice(false);
                toast({ title: "Clique no ícone 💬 ao lado do membro desejado na tabela" });
              }}
            >
              <MessageCircle className="w-5 h-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Enviar para um membro</p>
                <p className="text-xs text-muted-foreground">Selecione o membro na tabela pelo ícone do WhatsApp</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => {
                setShowWhatsappChoice(false);
                setShowSegmentado(true);
              }}
            >
              <Users className="w-5 h-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Envio segmentado</p>
                <p className="text-xs text-muted-foreground">
                  Líderes, supervisores, síndicos, pastores ou integrantes de um ministério
                </p>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WhatsappSegmentadoDialog open={showSegmentado} onOpenChange={setShowSegmentado} />

      {/* WhatsApp Bulk Message Dialog */}
      <AlertDialog open={whatsappBulkMode} onOpenChange={(open) => {
        if (!open && !bulkSending) {
          setWhatsappBulkMode(false);
          setWhatsappMessage("");
        }
      }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Enviar para {filteredMembers.filter(m => m.whatsapp).length} membros
            </AlertDialogTitle>
            <AlertDialogDescription>
              Use {"{nome}"} para personalizar com o primeiro nome de cada membro. O envio será espaçado (30s entre cada mensagem).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkSending ? (
            <div className="space-y-3 py-2">
              <Progress value={(bulkProgress.sent / bulkProgress.total) * 100} />
              <p className="text-sm text-muted-foreground text-center">
                Enviando {bulkProgress.sent}/{bulkProgress.total} — {bulkProgress.current}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Intervalo de 30s entre mensagens. Não feche esta janela.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <Textarea
                placeholder="Digite sua mensagem... Use {nome} para personalizar"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={5}
              />
              <WhatsappMensagemPreview
                mensagem={whatsappMessage}
                membros={filteredMembers.filter((m) => m.whatsapp).map((m) => ({
                  full_name: m.full_name,
                  whatsapp: m.whatsapp,
                }))}
              />
            </div>
          )}
          <AlertDialogFooter>
            {!bulkSending && <AlertDialogCancel>Cancelar</AlertDialogCancel>}
            {!bulkSending && (
              <AlertDialogAction
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={!whatsappMessage.trim()}
                onClick={() => sendBulkWhatsapp(whatsappMessage)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar para todos
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={!!deletingMemberId} onOpenChange={() => setDeletingMemberId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este membro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingMemberId && deleteMutation.mutate(deletingMemberId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembrosTab;
