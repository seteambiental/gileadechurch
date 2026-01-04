import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Clock, CheckCircle, XCircle, MessageCircle, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PortalCandidaturaTabProps {
  memberId: string;
}

export const PortalCandidaturaTab = ({ memberId }: PortalCandidaturaTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [mensagem, setMensagem] = useState("");

  // Buscar ministérios que possuem escalas (kids, dança, louvor, etc.)
  const { data: ministries = [], isLoading: loadingMinistries } = useQuery({
    queryKey: ["ministries-for-candidatura-with-escalas"],
    queryFn: async () => {
      // Buscar ministérios que tem escalas de kids ou dança
      const { data: kidsMinistry } = await supabase
        .from("ministries")
        .select("id")
        .ilike("name", "%kids%")
        .single();
      
      const { data: dancaMinistry } = await supabase
        .from("ministries")
        .select("id")
        .ilike("name", "%dan%a%")
        .single();
      
      const { data: louvorMinistry } = await supabase
        .from("ministries")
        .select("id")
        .or("name.ilike.%louvor%,name.ilike.%m%sica%,name.ilike.%worship%")
        .single();

      const ministryIds: string[] = [];
      if (kidsMinistry) ministryIds.push(kidsMinistry.id);
      if (dancaMinistry) ministryIds.push(dancaMinistry.id);
      if (louvorMinistry) ministryIds.push(louvorMinistry.id);

      // Buscar todos os ministérios que têm escalas ou são conhecidos por terem
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name, lider_whatsapp")
        .or(`id.in.(${ministryIds.join(",")}),name.ilike.%kids%,name.ilike.%dan%a%,name.ilike.%louvor%,name.ilike.%m%sica%,name.ilike.%mídia%,name.ilike.%recep%,name.ilike.%teatro%,name.ilike.%intercess%`)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: candidaturas = [], isLoading: loadingCandidaturas } = useQuery({
    queryKey: ["minhas-candidaturas", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidaturas_ministerio")
        .select(`
          *,
          ministries (name)
        `)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  const candidatarMutation = useMutation({
    mutationFn: async () => {
      const ministry = ministries.find((m) => m.id === selectedMinistry);
      if (!ministry) throw new Error("Ministério não encontrado");

      // Inserir candidatura no banco
      const { error } = await supabase.from("candidaturas_ministerio").insert({
        member_id: memberId,
        ministry_id: selectedMinistry,
        mensagem,
        status: "pendente",
      });
      if (error) throw error;

      // Se o ministério tem WhatsApp do líder, abrir para enviar mensagem
      if (ministry.lider_whatsapp) {
        const texto = encodeURIComponent(
          `🙋 *Candidatura ao Ministério ${ministry.name}*\n\n${mensagem || "Gostaria de fazer parte deste ministério."}\n\n_Enviado pelo Portal do Membro - Igreja Gileade_`
        );
        const whatsapp = ministry.lider_whatsapp.replace(/\D/g, "");
        window.open(`https://wa.me/${whatsapp}?text=${texto}`, "_blank");
      }

      return ministry;
    },
    onSuccess: (ministry) => {
      queryClient.invalidateQueries({ queryKey: ["minhas-candidaturas"] });
      toast({
        title: "Candidatura enviada!",
        description: ministry.lider_whatsapp
          ? "Uma mensagem foi preparada para o líder do ministério."
          : "Sua candidatura foi registrada e será analisada.",
      });
      setSelectedMinistry("");
      setMensagem("");
    },
    onError: () => {
      toast({
        title: "Erro ao enviar candidatura",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        );
      case "aprovado":
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ministryHasExistingCandidatura = (ministryId: string) => {
    return candidaturas.some(
      (c) => c.ministry_id === ministryId && c.status === "pendente"
    );
  };

  const isLoading = loadingMinistries || loadingCandidaturas;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Heart className="w-6 h-6 text-secondary" />
          Quero Servir
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha um ministério para servir e faça parte da equipe
        </p>
      </div>

      {/* Formulário de Candidatura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escolha onde deseja servir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ministério</label>
            <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ministério" />
              </SelectTrigger>
              <SelectContent>
                {ministries.map((ministry) => {
                  const hasPending = ministryHasExistingCandidatura(ministry.id);
                  return (
                    <SelectItem
                      key={ministry.id}
                      value={ministry.id}
                      disabled={hasPending}
                    >
                      {ministry.name}
                      {hasPending && " (candidatura pendente)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Mensagem (opcional)
            </label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Conte um pouco sobre você e por que gostaria de fazer parte deste ministério..."
              rows={4}
            />
          </div>

          <Button
            onClick={() => candidatarMutation.mutate()}
            disabled={!selectedMinistry || candidatarMutation.isPending}
            className="w-full"
          >
            {candidatarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Candidatura
          </Button>

          {selectedMinistry && (
            <p className="text-xs text-muted-foreground text-center">
              {ministries.find((m) => m.id === selectedMinistry)?.lider_whatsapp ? (
                <>
                  <MessageCircle className="w-3 h-3 inline mr-1" />
                  Uma mensagem será enviada ao líder via WhatsApp
                </>
              ) : (
                "O líder do ministério receberá sua candidatura"
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Candidaturas */}
      <div>
        <h3 className="font-semibold mb-3">Minhas Candidaturas</h3>
        {candidaturas.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Send className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Você ainda não enviou nenhuma candidatura</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {candidaturas.map((candidatura) => (
              <Card key={candidatura.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">
                        {candidatura.ministries?.name || "Ministério"}
                      </h4>
                      {candidatura.mensagem && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {candidatura.mensagem}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Enviada em{" "}
                        {new Date(candidatura.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {getStatusBadge(candidatura.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
