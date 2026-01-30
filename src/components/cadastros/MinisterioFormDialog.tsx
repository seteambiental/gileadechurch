import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { formatNameField } from "@/lib/text-utils";
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
import { MemberSelect } from "@/components/ui/member-select";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  lider_id: z.string().optional(),
  lider_esposa_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Ministry {
  id: string;
  name: string;
  description: string | null;
  lider_id: string | null;
  lider_esposa_id: string | null;
}

interface MinisterioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item?: Ministry | null;
  onSave: (data: { 
    name: string; 
    description: string; 
    lider_id: string | null;
    lider_esposa_id: string | null;
  }) => void;
  isSaving: boolean;
}

const MinisterioFormDialog = ({
  open,
  onOpenChange,
  title,
  item,
  onSave,
  isSaving,
}: MinisterioFormDialogProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      lider_id: "",
      lider_esposa_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          lider_id: item.lider_id || "",
          lider_esposa_id: item.lider_esposa_id || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          lider_id: "",
          lider_esposa_id: "",
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = (data: FormData) => {
    onSave({
      name: formatNameField(data.name),
      description: data.description || "",
      lider_id: data.lider_id || null,
      lider_esposa_id: data.lider_esposa_id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lider_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líder</FormLabel>
                    <FormControl>
                      <MemberSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecionar líder..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lider_esposa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líder</FormLabel>
                    <FormControl>
                      <MemberSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecionar líder..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

export default MinisterioFormDialog;
