import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RotateCcw, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatDateBR } from "@/lib/masks";
import { includesNormalized } from "@/lib/text-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExcludedMember {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  excluido_em: string | null;
}

const MembrosExcluidosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: excludedMembers = [], isLoading } = useQuery({
    queryKey: ["members-excluded"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, email, whatsapp, photo_url, excluido_em")
        .eq("excluido", true)
        .order("excluido_em", { ascending: false });
      if (error) throw error;
      return data as ExcludedMember[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("members")
        .update({ 
          excluido: false, 
          excluido_em: null, 
          excluido_por: null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-excluded"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro restaurado com sucesso!" });
      setRestoreId(null);
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao restaurar membro", 
        description: err?.message,
        variant: "destructive" 
      });
    },
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all related records
      await supabase.from("member_functions").delete().eq("member_id", id);
      await supabase.from("member_face_indexes").delete().eq("member_id", id);
      await supabase.from("encontro_presencas").delete().eq("member_id", id);
      await supabase.from("kids_presencas").delete().eq("member_id", id);
      await supabase.from("member_requests").delete().eq("member_id", id);
      await supabase.from("impacto_inscricoes").delete().eq("member_id", id);
      await supabase.from("impacto_equipe_membros").delete().eq("member_id", id);
      
      // Then delete the member
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-excluded"] });
      toast({ title: "Membro excluído permanentemente!" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao excluir permanentemente", 
        description: err?.message,
        variant: "destructive" 
      });
    },
  });

  const filteredMembers = excludedMembers.filter((member) =>
    includesNormalized(member.full_name, searchTerm)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <SearchInput
          placeholder="Buscar membros excluídos..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {searchTerm 
              ? "Nenhum membro excluído encontrado" 
              : "Nenhum membro foi excluído ainda"}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Membro</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">WhatsApp</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Excluído em</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border opacity-60">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-muted-foreground">{member.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {member.whatsapp ? formatPhone(member.whatsapp) : "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {member.email || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {member.excluido_em 
                      ? formatDateBR(member.excluido_em.split("T")[0]) 
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreId(member.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Restore Dialog */}
      <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este membro será restaurado e voltará a aparecer na lista de membros ativos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => restoreId && restoreMutation.mutate(restoreId)}
              className="bg-green-600 hover:bg-green-700"
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Permanently Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              ⚠️ Esta ação é irreversível! O membro será removido permanentemente do sistema 
              junto com todos os seus registros (presenças, funções, etc).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deletePermanentlyMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembrosExcluidosTab;
