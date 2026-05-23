import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Save, Loader2 } from "lucide-react";

type Config = {
  id?: string;
  template_mensagem: string;
  lembretes_ativos: boolean;
  hora_envio: string;
};

const DEFAULT_TPL = `🙏 *Olá, {nome}!*

Lembramos com carinho que hoje é o seu dia de contribuição para a *Missão Moçambique* 🌍.

💰 Valor: *R$ {valor}*
📅 Forma: {forma}

Sua contribuição transforma vidas! 💙

_Igreja Gileade_`;

export function MissoesConfigTab() {
  const [cfg, setCfg] = useState<Config>({
    template_mensagem: DEFAULT_TPL,
    lembretes_ativos: true,
    hora_envio: "09:00",
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("missoes_mocambique_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setCfg({
          id: data.id,
          template_mensagem: data.template_mensagem,
          lembretes_ativos: data.lembretes_ativos,
          hora_envio: (data.hora_envio || "09:00").slice(0, 5),
        });
      }
      setLoading(false);
    })();
  }, []);

  async function salvar() {
    setSalvando(true);
    const payload = {
      template_mensagem: cfg.template_mensagem,
      lembretes_ativos: cfg.lembretes_ativos,
      hora_envio: cfg.hora_envio,
    };
    const { error } = cfg.id
      ? await supabase.from("missoes_mocambique_config").update(payload).eq("id", cfg.id)
      : await supabase.from("missoes_mocambique_config").insert(payload);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração salva!");
    }
  }

  async function dispararAgora(forcarTodos: boolean) {
    if (!confirm(
      forcarTodos
        ? "Disparar lembrete para TODOS os contribuintes ativos (ignorando dia de vencimento)?"
        : "Disparar lembrete agora para quem vence HOJE?",
    )) return;
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke(
      "missoes-mocambique-lembretes",
      { body: { manual: true, forcar_todos: forcarTodos } },
    );
    setEnviando(false);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(
      `${data?.enfileirados || 0} mensagem(ns) na fila — envio escalonado para evitar SPAM.` +
        (data?.sem_telefone ? ` ${data.sem_telefone} sem telefone.` : ""),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lembretes Automáticos no WhatsApp</CardTitle>
          <CardDescription>
            Toda manhã o sistema verifica quem tem vencimento no dia e envia a mensagem abaixo.
            O envio é escalonado (intervalo aleatório de 5 a 15 segundos entre mensagens) para evitar SPAM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Envios automáticos ativos</Label>
              <p className="text-sm text-muted-foreground">
                Quando desligado, nenhum lembrete é enviado automaticamente.
              </p>
            </div>
            <Switch
              checked={cfg.lembretes_ativos}
              onCheckedChange={(v) => setCfg({ ...cfg, lembretes_ativos: v })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="hora">Horário do disparo diário</Label>
              <Input
                id="hora"
                type="time"
                value={cfg.hora_envio}
                onChange={(e) => setCfg({ ...cfg, hora_envio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hora aproximada do envio (horário de Brasília).
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="tpl">Modelo da mensagem</Label>
            <Textarea
              id="tpl"
              rows={12}
              value={cfg.template_mensagem}
              onChange={(e) => setCfg({ ...cfg, template_mensagem: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Variáveis disponíveis: <code>{"{nome}"}</code> (primeiro nome),{" "}
              <code>{"{nome_completo}"}</code>, <code>{"{valor}"}</code> (R$),{" "}
              <code>{"{forma}"}</code> (PIX/DÉBITO/CRÉDITO), <code>{"{mes}"}</code> (YYYY-MM).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar configuração
            </Button>
            <Button variant="secondary" onClick={() => dispararAgora(false)} disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Disparar agora (vencimento hoje)
            </Button>
            <Button variant="outline" onClick={() => dispararAgora(true)} disabled={enviando}>
              <Send className="h-4 w-4 mr-2" />
              Disparar para TODOS (manual)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 whitespace-pre-wrap font-mono text-sm">
            {cfg.template_mensagem
              .replace(/\{nome\}/g, "Maria")
              .replace(/\{nome_completo\}/g, "Maria da Silva")
              .replace(/\{valor\}/g, "100,00")
              .replace(/\{forma\}/g, "PIX")
              .replace(/\{mes\}/g, "2026-05")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}