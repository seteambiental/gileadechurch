import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Copy, Check, ExternalLink, Smartphone, Apple, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Card que exibe a URL do feed iCal público da agenda da igreja
 * para o usuário copiar e adicionar ao Google Calendar / Apple Calendar / Outlook.
 */
export const SincronizarGoogleCalendarCard = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cacheBuster, setCacheBuster] = useState<number | null>(null);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const baseIcalUrl = `https://${projectId}.functions.supabase.co/agenda-ical`;
  const icalUrl = cacheBuster
    ? `${baseIcalUrl}?v=${cacheBuster}`
    : baseIcalUrl;
  // URL alternativa via webcal:// que abre direto no app de calendário
  const webcalUrl = icalUrl.replace(/^https?:\/\//, "webcal://");

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleGenerateNewUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCacheBuster(Date.now());
    toast({
      title: "Nova URL gerada!",
      description: "Copie a URL e re-adicione no Google Calendar para forçar atualização.",
    });
  };

  return (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
      <CardContent className="p-3 md:p-4 space-y-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="p-2 rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-sm md:text-base">
              Sincronizar com seu calendário
            </h3>
            {!expanded && (
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">
                Google Calendar, Apple, Outlook — toque para ver a URL
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!expanded && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5 h-8"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar URL"}</span>
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <>
            <p className="text-xs md:text-sm text-muted-foreground">
              Adicione a agenda da igreja ao Google Calendar, Apple Calendar ou Outlook.
              A atualização é automática.
            </p>
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

        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            <strong>Não está vendo eventos novos?</strong> O Google Calendar atualiza o feed
            apenas a cada 6–24 horas. Para forçar atualização imediata, gere uma nova URL,
            <strong> remova a agenda atual</strong> no Google Calendar e adicione novamente
            com a URL nova.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleGenerateNewUrl}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Gerar nova URL (forçar atualização)
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
          </>
        )}
      </CardContent>
    </Card>
  );
};