import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PrayerRequestForm = () => {
  const [name, setName] = useState("");
  const [request, setRequest] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request.trim()) {
      toast.error("Por favor, escreva seu pedido de oração.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("pedidos_oracao").insert({
        nome: isAnonymous ? null : name || null,
        pedido: request,
        anonimo: isAnonymous,
      });
      
      if (error) throw error;
      
      toast.success("Pedido enviado! Nossa equipe de intercessão estará orando por você.");
      setName("");
      setRequest("");
      setIsAnonymous(false);
    } catch (error) {
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border shadow-elegant">
      <h3 className="font-heading font-bold text-xl text-foreground mb-4">
        Pedido de Oração
      </h3>
      
      <div className="space-y-4">
        {!isAnonymous && (
          <Input
            placeholder="Seu nome (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background"
          />
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
          />
          <label htmlFor="anonymous" className="text-sm text-muted-foreground">
            Enviar de forma anônima
          </label>
        </div>
        
        <Textarea
          placeholder="Compartilhe seu pedido de oração..."
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          className="min-h-[120px] bg-background resize-none"
        />
        
        <Button type="submit" variant="secondary" className="w-full font-heading font-semibold shadow-gold" disabled={isSubmitting}>
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? "Enviando..." : "Enviar Pedido"}
        </Button>
      </div>
      
      <p className="mt-4 text-xs text-muted-foreground text-center">
        Sua privacidade é respeitada. Os pedidos são tratados com confidencialidade.
      </p>
    </form>
  );
};

export default PrayerRequestForm;
