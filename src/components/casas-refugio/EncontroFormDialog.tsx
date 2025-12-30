import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Package, DollarSign, Calendar, Camera, X, ScanFace, Check, AlertCircle, User } from "lucide-react";

const formSchema = z.object({
  data_encontro: z.string().min(1, "Data é obrigatória"),
  qtd_lideres: z.coerce.number().min(0, "Valor inválido"),
  qtd_membros: z.coerce.number().min(0, "Valor inválido"),
  qtd_criancas: z.coerce.number().min(0, "Valor inválido"),
  qtd_visitantes: z.coerce.number().min(0, "Valor inválido"),
  kilos_arrecadados: z.coerce.number().min(0, "Valor inválido"),
  ofertas: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CasaRefugio {
  id: string;
  name: string;
  anfitrioes: string | null;
  condominio: string | null;
  lideres: string | null;
  supervisores: string | null;
  dias: string | null;
  frequencia: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

interface RecognizedPerson {
  id: string;
  full_name: string;
  photo_url: string | null;
  confidence?: number;
}

interface RecognitionResult {
  success: boolean;
  totalFaces: number;
  totalMatched: number;
  presentMembers: RecognizedPerson[];
  presentNC: RecognizedPerson[];
  error?: string;
}

interface EncontroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casa: CasaRefugio | null;
}

export const EncontroFormDialog = ({
  open,
  onOpenChange,
  casa,
}: EncontroFormDialogProps) => {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch leaders linked to this casa
  const { data: lideres = [] } = useQuery({
    queryKey: ["casa-lideres", casa?.id],
    queryFn: async () => {
      if (!casa?.id) return [];
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, members(id, full_name, photo_url)")
        .eq("casa_refugio_id", casa.id)
        .eq("function_type", "lider_casa_refugio");
      if (error) throw error;
      return data.map(d => d.members).filter(Boolean);
    },
    enabled: !!casa?.id && open,
  });

  // Fetch members linked to this casa
  const { data: membrosVinculados = [] } = useQuery({
    queryKey: ["membros-casa", casa?.id],
    queryFn: async () => {
      if (!casa?.id) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, photo_url")
        .eq("casa_refugio_id", casa.id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!casa?.id && open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_encontro: new Date().toISOString().split("T")[0],
      qtd_lideres: 0,
      qtd_membros: 0,
      qtd_criancas: 0,
      qtd_visitantes: 0,
      kilos_arrecadados: 0,
      ofertas: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        data_encontro: new Date().toISOString().split("T")[0],
        qtd_lideres: 0,
        qtd_membros: 0,
        qtd_criancas: 0,
        qtd_visitantes: 0,
        kilos_arrecadados: 0,
        ofertas: "",
        observacoes: "",
      });
      setPhoto(null);
      setPhotoPreview(null);
      setRecognitionResult(null);
      setPresencas({});
    }
  }, [open, form]);

  // Update presencas when recognition result changes
  useEffect(() => {
    if (recognitionResult?.success && recognitionResult.presentMembers) {
      const recognizedIds: Record<string, boolean> = {};
      recognitionResult.presentMembers.forEach((m) => {
        recognizedIds[m.id] = true;
      });
      setPresencas((prev) => ({ ...prev, ...recognizedIds }));
    }
  }, [recognitionResult]);

  // Recalculate counts when presencas change
  useEffect(() => {
    if (membrosVinculados.length > 0) {
      const liderIds = lideres.map((l: any) => l?.id);
      const presenteIds = Object.entries(presencas)
        .filter(([_, presente]) => presente)
        .map(([id]) => id);
      
      const lideresPresentes = presenteIds.filter((id) => liderIds.includes(id)).length;
      const membrosPresentes = presenteIds.filter((id) => !liderIds.includes(id)).length;
      
      form.setValue("qtd_lideres", lideresPresentes);
      form.setValue("qtd_membros", membrosPresentes);
    }
  }, [presencas, membrosVinculados, lideres, form]);

  const togglePresenca = (memberId: string) => {
    setPresencas((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const analyzePhoto = async (photoFile: File) => {
    if (!casa?.id) return;
    
    setIsAnalyzing(true);
    try {
      // First upload to temp storage to get URL
      const fileExt = photoFile.name.split(".").pop();
      const tempFileName = `temp/${casa.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("encontros-fotos")
        .upload(tempFileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("encontros-fotos")
        .getPublicUrl(tempFileName);

      // Call recognition API
      const { data, error } = await supabase.functions.invoke("rekognition-faces", {
        body: {
          action: "analyze_photo",
          imageUrl: urlData.publicUrl,
          casaRefugioId: casa.id,
        },
      });

      if (error) throw error;
      
      if (data.success) {
        setRecognitionResult(data);
        
        // Calculate counts
        const recognizedMembers = data.presentMembers?.length || 0;
        const recognizedNC = data.presentNC?.length || 0;
        const totalRecognized = recognizedMembers + recognizedNC;
        const totalFaces = data.totalFaces || 0;
        const unrecognized = Math.max(0, totalFaces - totalRecognized);
        
        // Find leaders among recognized
        const liderIds = lideres.map((l: any) => l?.id);
        const recognizedLeaders = data.presentMembers?.filter((m: RecognizedPerson) => 
          liderIds.includes(m.id)
        )?.length || 0;
        
        // Members = recognized members that are NOT leaders
        const membersCount = recognizedMembers - recognizedLeaders + recognizedNC;
        
        // Update form values
        form.setValue("qtd_lideres", recognizedLeaders);
        form.setValue("qtd_membros", membersCount);
        form.setValue("qtd_visitantes", unrecognized); // Unrecognized = visitors/children
        
        toast({
          title: "Análise concluída!",
          description: `${totalRecognized} pessoa(s) reconhecida(s), ${unrecognized} não identificada(s).`,
        });
      } else {
        toast({
          title: "Análise inconclusiva",
          description: data.error || "Não foi possível analisar a foto",
          variant: "destructive",
        });
      }

      // Clean up temp file
      await supabase.storage.from("encontros-fotos").remove([tempFileName]);
    } catch (error: any) {
      console.error("Recognition error:", error);
      toast({
        title: "Erro na análise",
        description: error.message || "Erro ao processar reconhecimento facial",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!casa) throw new Error("Casa não selecionada");

      let photoUrl: string | null = null;

      // Upload photo if exists
      if (photo) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${casa.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("encontros-fotos")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("encontros-fotos")
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Parse ofertas from formatted string to number
      const ofertasValue = data.ofertas 
        ? parseFloat(data.ofertas.replace(/\./g, "").replace(",", ".")) 
        : 0;

      const { error } = await supabase.from("encontros_casa_refugio").insert({
        casa_refugio_id: casa.id,
        data_encontro: data.data_encontro,
        qtd_lideres: data.qtd_lideres,
        qtd_membros: data.qtd_membros,
        qtd_criancas: data.qtd_criancas,
        qtd_visitantes: data.qtd_visitantes,
        kilos_arrecadados: data.kilos_arrecadados,
        ofertas: ofertasValue,
        observacoes: data.observacoes || null,
        photo_url: photoUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-casa"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-supervisor"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-condominio"] });
      toast({
        title: "Encontro registrado!",
        description: "O relatório foi salvo com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: number) => void
  ) => {
    const value = e.target.value.replace(/^0+/, "") || "";
    onChange(value === "" ? 0 : parseInt(value, 10));
  };

  const handleOfertasInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    
    if (value === "") {
      onChange("");
      return;
    }

    while (value.length < 3) {
      value = "0" + value;
    }

    const intPart = value.slice(0, -2).replace(/^0+/, "") || "0";
    const decPart = value.slice(-2);
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    onChange(`${formattedInt},${decPart}`);
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Trigger recognition analysis
      await analyzePhoto(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setRecognitionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-destructive" />
            Registrar Encontro
          </DialogTitle>
          {casa && (
            <p className="text-sm text-muted-foreground">
              {casa.name} • {casa.condominio}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            {/* Data */}
            <FormField
              control={form.control}
              name="data_encontro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data do Encontro
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Foto - Moved to top for recognition */}
            <div className="space-y-2">
              <span className="text-xs font-medium flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Foto do Encontro
                <Badge variant="outline" className="ml-2 text-xs">
                  <ScanFace className="w-3 h-3 mr-1" />
                  Reconhecimento Facial
                </Badge>
              </span>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Foto do encontro"
                    className="w-full h-40 object-cover rounded-lg border border-border"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-destructive" />
                        <span className="text-sm text-muted-foreground">Analisando rostos...</span>
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removePhoto}
                    disabled={isAnalyzing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={handleTakePhoto}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tirar Foto (reconhecimento automático)</span>
                  </div>
                </Button>
              )}
            </div>

            {/* Recognition Results */}
            {recognitionResult && recognitionResult.success && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Check className="w-4 h-4 text-green-500" />
                  Reconhecimento Facial
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {recognitionResult.totalFaces} rosto(s) detectado(s), {recognitionResult.totalMatched} identificado(s)
                </div>
                
                {(recognitionResult.presentMembers?.length > 0 || recognitionResult.presentNC?.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recognitionResult.presentMembers?.map((person) => (
                      <div key={person.id} className="flex items-center gap-1 bg-background rounded-full pl-1 pr-2 py-0.5 border">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={person.photo_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(person.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-[80px]">{person.full_name.split(" ")[0]}</span>
                      </div>
                    ))}
                    {recognitionResult.presentNC?.map((person) => (
                      <div key={person.id} className="flex items-center gap-1 bg-amber-500/10 rounded-full pl-1 pr-2 py-0.5 border border-amber-500/20">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={person.photo_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(person.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-[80px]">{person.full_name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {recognitionResult.totalFaces > recognitionResult.totalMatched && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {recognitionResult.totalFaces - recognitionResult.totalMatched} pessoa(s) não identificada(s) (visitantes/crianças)
                  </div>
                )}
              </div>
            )}

            {/* Participantes */}
            <div className="space-y-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participantes
                {recognitionResult && (
                  <Badge variant="secondary" className="text-xs">
                    Preenchido automaticamente
                  </Badge>
                )}
              </span>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="qtd_lideres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Líderes</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder=""
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => handleNumericInput(e, field.onChange)}
                          className="[appearance:textfield]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_membros"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Membros</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder=""
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => handleNumericInput(e, field.onChange)}
                          className="[appearance:textfield]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_criancas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Crianças</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder=""
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => handleNumericInput(e, field.onChange)}
                          className="[appearance:textfield]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_visitantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Visitantes</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder=""
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => handleNumericInput(e, field.onChange)}
                          className="[appearance:textfield]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Arrecadação */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kilos_arrecadados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Kilos Arrecadados
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder=""
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => handleNumericInput(e, field.onChange)}
                        className="[appearance:textfield]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ofertas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Ofertas (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={field.value}
                        onChange={(e) => handleOfertasInput(e, field.onChange)}
                        className="[appearance:textfield]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lista de Presença dos Membros */}
            {membrosVinculados.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Presença dos Membros
                  {Object.values(presencas).filter(Boolean).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(presencas).filter(Boolean).length} presente(s)
                    </Badge>
                  )}
                </span>
                
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted/30">
                  {membrosVinculados.map((membro) => {
                    const isPresente = presencas[membro.id] || false;
                    const isLider = lideres.some((l: any) => l?.id === membro.id);
                    const wasRecognized = recognitionResult?.presentMembers?.some((m) => m.id === membro.id);
                    
                    return (
                      <div
                        key={membro.id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                          isPresente 
                            ? "bg-green-500/20 border border-green-500/50" 
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                        onClick={() => togglePresenca(membro.id)}
                      >
                        <div 
                          className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                            isPresente 
                              ? "bg-green-500 border-green-500" 
                              : "border-input"
                          }`}
                        >
                          {isPresente && <Check className="h-3 w-3 text-white" />}
                        </div>
                        
                        {membro.photo_url ? (
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={membro.photo_url} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(membro.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{membro.full_name}</p>
                          <div className="flex items-center gap-1">
                            {isLider && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                Líder
                              </Badge>
                            )}
                            {wasRecognized && (
                              <Badge className="text-[9px] px-1 py-0 h-4 bg-green-500/20 text-green-600 border-green-500/30">
                                <ScanFace className="w-2 h-2 mr-0.5" />
                                ID
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Alguma observação sobre o encontro..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-destructive hover:bg-destructive/90"
                disabled={mutation.isPending || isAnalyzing}
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};