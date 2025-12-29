import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ScanFace, Check } from "lucide-react";

interface IndexarRostoButtonProps {
  memberId?: string;
  novoConvertidoId?: string;
  photoUrl: string | null;
  onSuccess?: () => void;
}

export const IndexarRostoButton = ({
  memberId,
  novoConvertidoId,
  photoUrl,
  onSuccess,
}: IndexarRostoButtonProps) => {
  const queryClient = useQueryClient();

  // Check if face is already indexed
  const { data: existingIndex, isLoading: checkingIndex } = useQuery({
    queryKey: ["face-index", memberId || novoConvertidoId],
    queryFn: async () => {
      let query = supabase.from("member_face_indexes").select("id, face_id");
      
      if (memberId) {
        query = query.eq("member_id", memberId);
      } else if (novoConvertidoId) {
        query = query.eq("novo_convertido_id", novoConvertidoId);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(memberId || novoConvertidoId),
  });

  const indexMutation = useMutation({
    mutationFn: async () => {
      if (!photoUrl) throw new Error("Sem foto cadastrada");

      const { data, error } = await supabase.functions.invoke("rekognition-faces", {
        body: {
          action: "index_face",
          imageUrl: photoUrl,
          memberId: memberId || undefined,
          novoConvertidoId: novoConvertidoId || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao indexar rosto");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["face-index"] });
      queryClient.invalidateQueries({ queryKey: ["face-indexes"] });
      toast({
        title: "Rosto indexado!",
        description: "O rosto foi cadastrado para reconhecimento facial.",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao indexar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!photoUrl) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <ScanFace className="w-3 h-3 mr-1" />
        Sem foto
      </Button>
    );
  }

  if (checkingIndex) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Button>
    );
  }

  if (existingIndex) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs text-green-600">
        <Check className="w-3 h-3 mr-1" />
        Indexado
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={() => indexMutation.mutate()}
      disabled={indexMutation.isPending}
    >
      {indexMutation.isPending ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <ScanFace className="w-3 h-3 mr-1" />
      )}
      Indexar Rosto
    </Button>
  );
};
