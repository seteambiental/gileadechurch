import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Clock, Bell, Calendar, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const diasSemana = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

const tipoNotificacaoLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  ausencia_domingo: { label: "Ausência - Domingo", icon: <Bell className="h-4 w-4" /> },
  ausencia_quarta: { label: "Ausência - Quarta", icon: <Bell className="h-4 w-4" /> },
  lembrete_domingo: { label: "Lembrete - Domingo", icon: <Clock className="h-4 w-4" /> },
  lembrete_quarta: { label: "Lembrete - Quarta", icon: <Clock className="h-4 w-4" /> },
  relatorio_mensal: { label: "Relatório Mensal", icon: <Calendar className="h-4 w-4" /> },
};

interface NotificacaoConfig {
  id: string;
  tipo_notificacao: string;
  ativo: boolean;
  dia_semana: number | null;
  hora: string;
  minutos_antes: number | null;
  descricao: string | null;
}

export function KidsConfigTab() {
  const queryClient = useQueryClient();
  const [editedConfigs, setEditedConfigs] = useState<Record<string, Partial<NotificacaoConfig>>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ["kids-notificacoes-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_notificacoes_config")
        .select("*")
        .order("tipo_notificacao");

      if (error) throw error;
      return data as NotificacaoConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: NotificacaoConfig) => {
      const { error } = await supabase
        .from("kids_notificacoes_config")
        .update({
          ativo: config.ativo,
          dia_semana: config.dia_semana,
          hora: config.hora,
        })
        .eq("id", config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-notificacoes-config"] });
      toast.success("Configuração salva com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configuração");
    },
  });

  const handleChange = (configId: string, field: keyof NotificacaoConfig, value: any) => {
    setEditedConfigs(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value,
      },
    }));
  };

  const getConfigValue = (config: NotificacaoConfig, field: keyof NotificacaoConfig) => {
    if (editedConfigs[config.id] && editedConfigs[config.id][field] !== undefined) {
      return editedConfigs[config.id][field];
    }
    return config[field];
  };

  const handleSave = (config: NotificacaoConfig) => {
    const updatedConfig = {
      ...config,
      ...editedConfigs[config.id],
    };
    updateMutation.mutate(updatedConfig);
    setEditedConfigs(prev => {
      const newState = { ...prev };
      delete newState[config.id];
      return newState;
    });
  };

  const hasChanges = (configId: string) => {
    return editedConfigs[configId] && Object.keys(editedConfigs[configId]).length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Configurações de Notificações</h2>
      </div>

      <p className="text-muted-foreground">
        Configure os horários e dias para envio automático das notificações do Kids.
      </p>

      <div className="grid gap-4">
        {configs?.map((config) => {
          const tipoInfo = tipoNotificacaoLabels[config.tipo_notificacao] || {
            label: config.tipo_notificacao,
            icon: <Bell className="h-4 w-4" />,
          };

          return (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tipoInfo.icon}
                    <CardTitle className="text-base">{tipoInfo.label}</CardTitle>
                  </div>
                  <Switch
                    checked={getConfigValue(config, "ativo") as boolean}
                    onCheckedChange={(checked) => handleChange(config.id, "ativo", checked)}
                  />
                </div>
                {config.descricao && (
                  <CardDescription>{config.descricao}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Dia da Semana</Label>
                    <Select
                      value={String(getConfigValue(config, "dia_semana"))}
                      onValueChange={(value) => handleChange(config.id, "dia_semana", parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasSemana.map((dia) => (
                          <SelectItem key={dia.value} value={dia.value}>
                            {dia.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={getConfigValue(config, "hora") as string}
                      onChange={(e) => handleChange(config.id, "hora", e.target.value)}
                      className="w-[140px]"
                    />
                  </div>

                  {hasChanges(config.id) && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(config)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
