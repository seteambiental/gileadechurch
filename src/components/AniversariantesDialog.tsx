import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Cake, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Aniversariante {
  id: string;
  full_name: string;
  whatsapp: string | null;
  birth_date: string;
  photo_url?: string | null;
}

interface AniversariantesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Versículos de aniversário
const versiculosAniversario = [
  { versiculo: "O Senhor te abençoe e te guarde.", referencia: "Números 6:24" },
  { versiculo: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.", referencia: "Jeremias 29:11" },
  { versiculo: "Alegrem-se sempre no Senhor. Novamente direi: alegrem-se!", referencia: "Filipenses 4:4" },
  { versiculo: "Feliz és tu, e tudo te irá bem.", referencia: "Salmos 128:2" },
  { versiculo: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", referencia: "Salmos 37:5" },
  { versiculo: "Porque dele, e por ele, e para ele são todas as coisas. A ele seja a glória para sempre!", referencia: "Romanos 11:36" },
  { versiculo: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", referencia: "Eclesiastes 3:1" },
  { versiculo: "Deem graças ao Senhor porque ele é bom; o seu amor dura para sempre.", referencia: "Salmos 136:1" },
];

const AniversariantesDialog = ({ open, onOpenChange }: AniversariantesDialogProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Buscar configuração da mensagem
  const { data: homepageConfig } = useQuery({
    queryKey: ["homepage-config-msg"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_config")
        .select("mensagem_aniversario")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open,
  });

  // Buscar aniversariantes de hoje
  const { data: aniversariantes = [], isLoading } = useQuery({
    queryKey: ["aniversariantes-hoje"],
    queryFn: async () => {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;

      // Buscar membros
      const { data: membros, error: membrosError } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, birth_date, photo_url")
        .not("birth_date", "is", null);

      if (membrosError) throw membrosError;

      // Buscar novos convertidos
      const { data: novosConvertidos, error: ncError } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, whatsapp, data_nascimento, photo_url")
        .not("data_nascimento", "is", null);

      if (ncError) throw ncError;

      // Filtrar por dia e mês
      const aniversariantes: Aniversariante[] = [];

      membros?.forEach((m) => {
        if (m.birth_date) {
          const birthDate = new Date(m.birth_date + "T00:00:00");
          if (birthDate.getDate() === day && birthDate.getMonth() + 1 === month) {
            aniversariantes.push({
              id: `m-${m.id}`,
              full_name: m.full_name,
              whatsapp: m.whatsapp,
              birth_date: m.birth_date,
              photo_url: m.photo_url,
            });
          }
        }
      });

      novosConvertidos?.forEach((nc) => {
        if (nc.data_nascimento) {
          const birthDate = new Date(nc.data_nascimento + "T00:00:00");
          if (birthDate.getDate() === day && birthDate.getMonth() + 1 === month) {
            aniversariantes.push({
              id: `nc-${nc.id}`,
              full_name: nc.full_name,
              whatsapp: nc.whatsapp,
              birth_date: nc.data_nascimento,
              photo_url: nc.photo_url,
            });
          }
        }
      });

      return aniversariantes;
    },
    enabled: open,
  });

  const gerarMensagem = (aniversariante: Aniversariante) => {
    // Selecionar versículo aleatório
    const versiculoObj = versiculosAniversario[Math.floor(Math.random() * versiculosAniversario.length)];
    
    // Pegar primeiro nome
    const primeiroNome = aniversariante.full_name.split(" ")[0];

    // Usar template da config ou default
    const template = homepageConfig?.mensagem_aniversario || 
      `🎂🎉 *FELIZ ANIVERSÁRIO, {NOME}!* 🎉🎂

Que o Senhor continue abençoando sua vida abundantemente neste novo ciclo que se inicia!

📖 *"{VERSICULO}"*
— {REFERENCIA}

Que este dia seja repleto de alegria, paz e amor. Você é muito especial para nossa família!

Com carinho,
_Igreja Gileade_ 💙🙏`;

    return template
      .replace(/{NOME}/g, primeiroNome)
      .replace(/{VERSICULO}/g, versiculoObj.versiculo)
      .replace(/{REFERENCIA}/g, versiculoObj.referencia);
  };

  const handleCopiar = async (aniversariante: Aniversariante) => {
    const mensagem = gerarMensagem(aniversariante);
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiedId(aniversariante.id);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-secondary" />
            Aniversariantes de Hoje
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : aniversariantes.length === 0 ? (
          <div className="py-8 text-center">
            <Cake className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum aniversariante hoje</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {aniversariantes.map((aniv) => (
                <div
                  key={aniv.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border"
                >
                  {aniv.photo_url ? (
                    <img
                      src={aniv.photo_url}
                      alt={aniv.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Cake className="w-6 h-6 text-secondary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{aniv.full_name}</h4>
                    {aniv.whatsapp && (
                      <p className="text-sm text-muted-foreground">{aniv.whatsapp}</p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopiar(aniv)}
                    className="gap-2"
                  >
                    {copiedId === aniv.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Copie a mensagem e envie via WhatsApp
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AniversariantesDialog;
