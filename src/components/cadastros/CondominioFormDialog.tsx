import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  sindico_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Condominio {
  id: string;
  name: string;
  description: string | null;
  sindico_id: string | null;
}

interface CondominioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item?: Condominio | null;
  onSave: (data: { name: string; description: string; sindico_id: string | null }) => void;
  isSaving: boolean;
}

const CondominioFormDialog = ({
  open,
  onOpenChange,
  title,
  item,
  onSave,
  isSaving,
}: CondominioFormDialogProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sindico_id: "",
    },
  });

  // Buscar lista de membros para seleção do síndico
  const { data: members = [] } = useQuery({
    queryKey: ["members-for-sindico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          sindico_id: item.sindico_id || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          sindico_id: "",
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = (data: FormData) => {
    onSave({
      name: data.name,
      description: data.description || "",
      sindico_id: data.sindico_id && data.sindico_id !== "none" ? data.sindico_id : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sindico_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Síndico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o síndico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {item ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CondominioFormDialog;
