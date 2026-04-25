import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, Check, ExternalLink, Smartphone, Apple } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Card que exibe a URL do feed iCal público da agenda da igreja
 * para o usuário copiar e adicionar ao Google Calendar / Apple Calendar / Outlook.
 */
export const SincronizarGoogleCalendarCard = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const icalUrl = `https://${projectId}.functions.supabase.co/agenda-ical`;
  // URL alternativa via webcal:// que abre direto no app de calendário
  const webcalUrl = icalUrl.replace(/^https?:\/\//, "webcal://");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      toast({
        title: "URL copiada!",
        description: "Cole a URL no seu Google Calendar.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
        description: "Selecione e copie a URL manualmente.",
      });
    }
  };

  return (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
      <CardContent className="p-4 md:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base md:text-lg">
              Sincronizar com seu calendário
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Adicione a agenda da igreja ao Google Calendar, Apple Calendar ou Outlook.
              A atualização é automática.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            readOnly
            value={icalUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="gap-2 flex-shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar URL"}
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            asChild
          >
            <a
              href={`https://calendar.google.com/calendar/u/0/r/settings/addbyurl`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google Calendar
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            asChild
          >
            <a href={webcalUrl}>
              <Apple className="w-3.5 h-3.5" />
              Apple / iPhone
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            asChild
          >
            <a href={webcalUrl}>
              <Smartphone className="w-3.5 h-3.5" />
              Outros apps
            </a>
          </Button>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium hover:text-foreground transition-colors">
            Como adicionar no Google Calendar?
          </summary>
          <ol className="mt-2 space-y-1 list-decimal list-inside pl-1">
            <li>Abra o Google Calendar no computador.</li>
            <li>
              Na barra lateral, clique em <strong>+</strong> ao lado de "Outras
              agendas" e selecione <strong>"Por URL"</strong>.
            </li>
            <li>Cole a URL acima e clique em <strong>"Adicionar agenda"</strong>.</li>
            <li>
              A agenda da igreja aparecerá automaticamente. O Google atualiza o
              feed periodicamente (algumas horas).
            </li>
          </ol>
        </details>
      </CardContent>
    </Card>
  );
};