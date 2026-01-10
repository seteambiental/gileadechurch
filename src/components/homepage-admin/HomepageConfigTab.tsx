import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Settings, Building2, ExternalLink, Phone, Mail, MapPin, Globe, Clock, Cake, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const HomepageConfigTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mensagemAniversario, setMensagemAniversario] = useState("");
  const [mensagemCarregada, setMensagemCarregada] = useState(false);

  const { data: homepageConfig, isLoading: loadingHomepage } = useQuery({
    queryKey: ["homepage-config-mensagem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_config")
        .select("id, mensagem_aniversario")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data && !mensagemCarregada) {
        setMensagemAniversario(data.mensagem_aniversario || "");
        setMensagemCarregada(true);
      }
      return data;
    },
  });

  const { data: igrejaConfig, isLoading: loadingIgreja } = useQuery({
    queryKey: ["igreja-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: eventosRecorrentes, isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-recorrentes-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, hora_inicio, dia_semana, tipo_evento")
        .eq("ativo", true)
        .eq("recorrente", true)
        .in("tipo_evento", ["culto", "culto_jovens", "culto_teens"])
        .order("dia_semana", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const salvarMensagem = useMutation({
    mutationFn: async () => {
      if (homepageConfig?.id) {
        const { error } = await supabase
          .from("homepage_config")
          .update({ mensagem_aniversario: mensagemAniversario })
          .eq("id", homepageConfig.id);
        if (error) throw error;
      } else {
        // Criar registro se não existir
        const { error } = await supabase
          .from("homepage_config")
          .insert({ 
            hero_titulo: "Bem-vindo",
            lema: "",
            mensagem_aniversario: mensagemAniversario 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-config-mensagem"] });
      toast.success("Mensagem de aniversário salva com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar mensagem: " + error.message);
    },
  });

  if (loadingIgreja || loadingEventos || loadingHomepage) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Configurações Gerais</h2>
          <p className="text-sm text-muted-foreground">
            Dados da igreja e horários de culto exibidos no rodapé
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/cadastros?tab=igreja")}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Editar Dados da Igreja
        </Button>
      </div>

      {/* Dados da Igreja */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados da Igreja (Rodapé)
          </CardTitle>
          <CardDescription>
            Essas informações são exibidas na seção de contato do rodapé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {igrejaConfig ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Nome:</span>
                  <span>{igrejaConfig.nome_fantasia}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Telefone:</span>
                  <span>{igrejaConfig.telefone || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Celular:</span>
                  <span>{igrejaConfig.celular || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{igrejaConfig.email || "Não informado"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium">Endereço:</span>
                    <p className="text-muted-foreground">
                      {igrejaConfig.address}, {igrejaConfig.number}
                      {igrejaConfig.complement && ` - ${igrejaConfig.complement}`}
                      <br />
                      {igrejaConfig.neighborhood} - {igrejaConfig.city}/{igrejaConfig.state}
                      <br />
                      CEP: {igrejaConfig.cep}
                    </p>
                  </div>
                </div>
                {igrejaConfig.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Website:</span>
                    <a 
                      href={`https://${igrejaConfig.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline"
                    >
                      {igrejaConfig.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Dados da igreja não configurados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horários de Culto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horários de Culto (Rodapé)
          </CardTitle>
          <CardDescription>
            Os horários vêm dos eventos recorrentes do tipo "Culto" cadastrados na Agenda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventosRecorrentes && eventosRecorrentes.length > 0 ? (
            <div className="space-y-2">
              {eventosRecorrentes.map((evento) => (
                <div 
                  key={evento.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <Badge variant="outline">
                    {diasSemana[evento.dia_semana ?? 0]}
                  </Badge>
                  <span className="font-medium">{evento.hora_inicio || "—"}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{evento.titulo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhum culto recorrente cadastrado
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => navigate("/agenda")}
              >
                Cadastrar na Agenda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagem de Aniversário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="w-5 h-5" />
            Mensagem de Aniversário (WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure a mensagem que será enviada automaticamente às 08:00 para os aniversariantes do dia.
            <br />
            <span className="font-medium">Variáveis disponíveis:</span> {"{NOME}"} = primeiro nome, {"{VERSICULO}"} = versículo aleatório, {"{REFERENCIA}"} = referência bíblica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mensagem-aniversario">Mensagem</Label>
            <Textarea
              id="mensagem-aniversario"
              value={mensagemAniversario}
              onChange={(e) => setMensagemAniversario(e.target.value)}
              placeholder="Digite a mensagem de aniversário..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Use *texto* para <strong>negrito</strong> e _texto_ para <em>itálico</em> no WhatsApp
            </p>
            <Button 
              onClick={() => salvarMensagem.mutate()}
              disabled={salvarMensagem.isPending}
            >
              {salvarMensagem.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Mensagem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomepageConfigTab;
