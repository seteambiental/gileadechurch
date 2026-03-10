import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Edit2,
  Church,
  MessageCircle,
  Users,
  Baby,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPhone, formatCep, formatDateBR } from "@/lib/masks";
import logoGileade from "@/assets/logo-gileade.jpeg";
import MemberFormDialog from "@/components/cadastros/MemberFormDialog";

const functionTypeLabels: Record<string, string> = {
  lider_casa_refugio: "Líder de Casa Refúgio",
  lider_ministerio: "Líder de Ministério",
  pastor_geral: "Pastor Geral",
  pastor_auxiliar: "Pastor Auxiliar",
  supervisor_condominio: "Supervisor de Condomínio",
  sindico_condominio: "Síndico de Condomínio",
  integrante_ministerio: "Integrante de Ministério",
};

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
  member_since: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
  responsavel_id: string | null;
  member_functions?: MemberFunction[];
}

const MemberDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const bypass = isAuthBypassed();

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: member, isLoading, error } = useQuery({
    queryKey: ["member", id],
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
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!id && (bypass || !!user),
  });

  // Buscar responsável se existir
  const { data: responsavel } = useQuery({
    queryKey: ["member-responsavel", member?.responsavel_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp")
        .eq("id", member!.responsavel_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!member?.responsavel_id,
  });

  // Buscar crianças sob responsabilidade deste membro
  const { data: criancasResponsavel } = useQuery({
    queryKey: ["member-criancas-responsavel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select(`
          id,
          crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name),
          crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name)
        `)
        .eq("responsavel_member_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && (bypass || !!user),
  });

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

  const formatFullAddress = () => {
    if (!member) return null;
    const parts = [];
    
    if (member.address) {
      let addressLine = member.address;
      if (member.number) addressLine += `, ${member.number}`;
      if (member.complement) addressLine += ` - ${member.complement}`;
      parts.push(addressLine);
    }
    
    if (member.neighborhood) parts.push(member.neighborhood);
    
    if (member.city && member.state) {
      parts.push(`${member.city}/${member.state}`);
    }
    
    if (member.cep) parts.push(`CEP: ${formatCep(member.cep)}`);
    
    return parts.length > 0 ? parts : null;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) {
    return null;
  }


  if (error || !member) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoGileade} 
                alt="Gileade Church" 
                className="w-10 h-10 rounded-full object-cover shadow-red"
              />
              <h1 className="font-heading font-bold text-lg text-foreground">
                Membro não encontrado
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/cadastros")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">O membro solicitado não foi encontrado.</p>
          <Button onClick={() => navigate("/cadastros")} className="mt-4">
            Voltar para Cadastros
          </Button>
        </main>
      </div>
    );
  }

  const addressParts = formatFullAddress();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoGileade} 
              alt="Gileade Church" 
              className="w-10 h-10 rounded-full object-cover shadow-red"
            />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">
                Detalhes do Membro
              </h1>
              <p className="text-xs text-muted-foreground">Informações completas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cadastros")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-gradient-dark h-28" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end -mt-10">
              <Avatar className="w-24 h-24 border-4 border-card shadow-lg shrink-0">
                <AvatarImage 
                  src={member.photo_url || undefined} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl font-bold">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-4 sm:pt-2">
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  {member.full_name}
                </h2>
                {member.member_since && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Membro desde {formatDateBR(member.member_since)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(true)}
                className="shrink-0"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-secondary" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.whatsapp && (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                      <p className="text-foreground">{formatPhone(member.whatsapp)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={() => {
                      const phone = member.whatsapp?.replace(/\D/g, "");
                      const formattedPhone = phone?.startsWith("55") ? phone : `55${phone}`;
                      window.open(`https://wa.me/${formattedPhone}`, "_blank");
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Enviar
                  </Button>
                </div>
              )}
              {member.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">{member.email}</p>
                  </div>
                </div>
              )}
              {!member.whatsapp && !member.email && (
                <p className="text-sm text-muted-foreground">Nenhuma informação de contato cadastrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.birth_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                    <p className="text-foreground">{formatDateBR(member.birth_date)}</p>
                  </div>
                </div>
              )}
              {responsavel && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="text-foreground font-medium">{responsavel.full_name}</p>
                    {responsavel.whatsapp && (
                      <p className="text-sm text-muted-foreground">{formatPhone(responsavel.whatsapp)}</p>
                    )}
                  </div>
                </div>
              )}
              {criancasResponsavel && criancasResponsavel.length > 0 && (
                <div className="flex items-start gap-3">
                  <Baby className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Crianças sob responsabilidade (PG)</p>
                    <div className="space-y-1 mt-1">
                      {criancasResponsavel.map((cr) => {
                        const nome = cr.crianca_member?.full_name || cr.crianca_nc?.full_name || "—";
                        return (
                          <p key={cr.id} className="text-foreground font-medium">{nome}</p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Church className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Membro Desde</p>
                  <p className="text-foreground">
                    {member.member_since ? formatDateBR(member.member_since) : "Não informado"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              {addressParts ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="space-y-1">
                    {addressParts.map((part, index) => (
                      <p key={index} className="text-foreground">{part}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Functions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-secondary" />
                Funções na Igreja
              </CardTitle>
            </CardHeader>
            <CardContent>
              {member.member_functions && member.member_functions.length > 0 ? (
                <div className="space-y-3">
                  {member.member_functions.map((fn) => {
                    const { label, subdivision } = getFunctionDisplay(fn);
                    return (
                      <div key={fn.id} className="flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {label}
                        </Badge>
                        {subdivision && (
                          <span className="text-sm text-muted-foreground pt-0.5">
                            {subdivision}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma função atribuída.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <Card className="bg-muted/50 border-border">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
              <span>
                Cadastrado em: {new Date(member.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(member.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>
                Última atualização: {new Date(member.updated_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(member.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Form Dialog */}
      <MemberFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={member}
      />
    </div>
  );
};

export default MemberDetails;
