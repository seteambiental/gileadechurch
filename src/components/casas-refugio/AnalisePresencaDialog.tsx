import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserCheck, UserX, MessageSquare, ScanFace, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AnalisePresencaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encontroId: string;
  casaRefugioId: string;
  photoUrl: string;
  dataEncontro: string;
}

interface AnalysisResult {
  totalFaces: number;
  totalMatched: number;
  presentMembers: Array<{ id: string; full_name: string; whatsapp: string | null; photo_url: string | null; confidence: number }>;
  presentNC: Array<{ id: string; full_name: string; whatsapp: string | null; photo_url: string | null; confidence: number }>;
  absentMembers: Array<{ id: string; full_name: string; whatsapp: string | null; photo_url: string | null }>;
  absentNC: Array<{ id: string; full_name: string; whatsapp: string | null; photo_url: string | null }>;
}

export const AnalisePresencaDialog = ({
  open,
  onOpenChange,
  encontroId,
  casaRefugioId,
  photoUrl,
  dataEncontro,
}: AnalisePresencaDialogProps) => {
  const queryClient = useQueryClient();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if members have indexed faces
  const { data: faceIndexes } = useQuery({
    queryKey: ["face-indexes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_face_indexes")
        .select("member_id, novo_convertido_id");
      if (error) throw error;
      return data;
    },
  });

  // Get members linked to this casa refugio
  const { data: membrosVinculados } = useQuery({
    queryKey: ["membros-vinculados", casaRefugioId],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, full_name, photo_url")
        .eq("casa_refugio_id", casaRefugioId);
      
      if (membersError) throw membersError;
      
      const { data: ncs, error: ncsError } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, photo_url")
        .or(`casa_refugio_id.eq.${casaRefugioId},casa_refugio_frequenta_id.eq.${casaRefugioId}`);
      
      if (ncsError) throw ncsError;
      
      return { members: members || [], ncs: ncs || [] };
    },
    enabled: open,
  });

  const membersWithoutFace = membrosVinculados?.members.filter(
    m => !faceIndexes?.some(fi => fi.member_id === m.id)
  ) || [];

  const ncsWithoutFace = membrosVinculados?.ncs.filter(
    nc => !faceIndexes?.some(fi => fi.novo_convertido_id === nc.id)
  ) || [];

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke("rekognition-faces", {
        body: {
          action: "analyze_photo",
          imageUrl: photoUrl,
          casaRefugioId,
          encontroId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro na análise");
      
      return data as AnalysisResult;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setIsAnalyzing(false);
      queryClient.invalidateQueries({ queryKey: ["encontro-presencas"] });
      toast({
        title: "Análise concluída!",
        description: `${data.totalFaces} pessoas detectadas, ${data.totalMatched} identificadas.`,
      });
    },
    onError: (error: Error) => {
      setIsAnalyzing(false);
      setError(error.message);
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(
      `Olá ${name}! 💛\n\nSentimos sua falta no encontro da Casa Refúgio! Esperamos você no próximo encontro. Deus abençoe! 🙏`
    );
    return `https://wa.me/${formattedPhone}?text=${message}`;
  };

  const PersonCard = ({ 
    person, 
    type, 
    showConfidence = false, 
    confidence,
    showWhatsApp = false 
  }: { 
    person: { id: string; full_name: string; whatsapp?: string | null; photo_url?: string | null };
    type: "present" | "absent";
    showConfidence?: boolean;
    confidence?: number;
    showWhatsApp?: boolean;
  }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      type === "present" ? "bg-green-500/10" : "bg-red-500/10"
    }`}>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={person.photo_url || undefined} />
          <AvatarFallback className={type === "present" ? "bg-green-500/20" : "bg-red-500/20"}>
            {person.full_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground text-sm">{person.full_name}</p>
          {showConfidence && confidence && (
            <p className="text-xs text-muted-foreground">{confidence.toFixed(1)}% de certeza</p>
          )}
        </div>
      </div>
      {showWhatsApp && person.whatsapp && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => window.open(generateWhatsAppLink(person.whatsapp!, person.full_name), "_blank")}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Enviar
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-destructive" />
            Análise de Presença
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Encontro de {new Date(dataEncontro).toLocaleDateString("pt-BR")}
          </p>
        </DialogHeader>

        {/* Photo preview */}
        <div className="relative">
          <img
            src={photoUrl}
            alt="Foto do encontro"
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        {/* Warning about missing faces */}
        {(membersWithoutFace.length > 0 || ncsWithoutFace.length > 0) && !analysisResult && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400 text-sm">
                  Alguns membros não têm foto cadastrada para reconhecimento
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {membersWithoutFace.length + ncsWithoutFace.length} pessoa(s) sem foto indexada.
                  Cadastre fotos deles para melhor identificação.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis button */}
        {!analysisResult && (
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={isAnalyzing}
            className="w-full bg-destructive hover:bg-destructive/90"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando foto...
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4 mr-2" />
                Analisar Presença
              </>
            )}
          </Button>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError(null);
                analyzeMutation.mutate();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{analysisResult.totalFaces}</p>
                <p className="text-xs text-muted-foreground">Total Detectado</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <UserCheck className="w-6 h-6 mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-600">
                  {analysisResult.presentMembers.length + analysisResult.presentNC.length}
                </p>
                <p className="text-xs text-muted-foreground">Identificados</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4 text-center">
                <UserX className="w-6 h-6 mx-auto text-red-600 mb-1" />
                <p className="text-2xl font-bold text-red-600">
                  {analysisResult.absentMembers.length + analysisResult.absentNC.length}
                </p>
                <p className="text-xs text-muted-foreground">Ausentes</p>
              </div>
            </div>

            {/* Present members */}
            {(analysisResult.presentMembers.length > 0 || analysisResult.presentNC.length > 0) && (
              <div>
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  Presentes
                  <Badge variant="secondary" className="ml-auto">
                    {analysisResult.presentMembers.length + analysisResult.presentNC.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {analysisResult.presentMembers.map(member => (
                    <PersonCard
                      key={member.id}
                      person={member}
                      type="present"
                      showConfidence
                      confidence={member.confidence}
                    />
                  ))}
                  {analysisResult.presentNC.map(nc => (
                    <PersonCard
                      key={nc.id}
                      person={nc}
                      type="present"
                      showConfidence
                      confidence={nc.confidence}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Absent members */}
            {(analysisResult.absentMembers.length > 0 || analysisResult.absentNC.length > 0) && (
              <div>
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-600" />
                  Ausentes
                  <Badge variant="secondary" className="ml-auto">
                    {analysisResult.absentMembers.length + analysisResult.absentNC.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {analysisResult.absentMembers.map(member => (
                    <PersonCard
                      key={member.id}
                      person={member}
                      type="absent"
                      showWhatsApp
                    />
                  ))}
                  {analysisResult.absentNC.map(nc => (
                    <PersonCard
                      key={nc.id}
                      person={nc}
                      type="absent"
                      showWhatsApp
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAnalysisResult(null);
                  onOpenChange(false);
                }}
              >
                Fechar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setAnalysisResult(null);
                  analyzeMutation.mutate();
                }}
              >
                Analisar Novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
