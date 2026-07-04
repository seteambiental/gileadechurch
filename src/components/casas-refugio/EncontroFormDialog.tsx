import { useEffect, useState, useRef } from "react";
import { todayDateStr } from "@/lib/date-utils";
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
import { Loader2, Users, Package, DollarSign, Calendar, Camera, Upload, X, Check, User, RotateCcw } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { fileToJpeg } from "@/lib/meeting-photo";

const formSchema = z.object({
  data_encontro: z.string().min(1, "Data é obrigatória"),
  qtd_lideres: z.coerce.number().min(0, "Valor inválido"),
  qtd_membros: z.coerce.number().min(0, "Valor inválido"),
  qtd_criancas: z.coerce.number().min(0, "Valor inválido"),
  qtd_visitantes: z.coerce.number().min(0, "Valor inválido"),
  kilos_arrecadados: z.coerce.number().min(0, "Valor inválido"),
  ofertas_dinheiro: z.string().optional(),
  ofertas_pix: z.string().optional(),
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
  lider_id?: string | null;
  lider_esposa_id?: string | null;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
}

// Função para obter primeiro e último nome
const getFirstLastName = (fullName: string): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};


interface Encontro {
  id: string;
  data_encontro: string;
  data_esperada?: string | null;
  qtd_lideres: number;
  qtd_membros: number;
  qtd_criancas: number;
  qtd_visitantes: number;
  kilos_arrecadados: number | null;
  ofertas: number | null;
  ofertas_dinheiro: number | null;
  ofertas_pix: number | null;
  observacoes: string | null;
  photo_url: string | null;
  justificativa?: string | null;
}

interface EncontroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casa: CasaRefugio | null;
  editingEncontro?: Encontro | null;
}

export const EncontroFormDialog = ({
  open,
  onOpenChange,
  casa,
  editingEncontro,
}: EncontroFormDialogProps) => {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [kilosText, setKilosText] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Camera state removed - now using native file input with capture attribute

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

  // Fetch existing presencas when editing
  const { data: existingPresencas } = useQuery({
    queryKey: ["encontro-presencas", editingEncontro?.id],
    queryFn: async () => {
      if (!editingEncontro?.id) return [];
      const { data, error } = await supabase
        .from("encontro_presencas")
        .select("member_id, novo_convertido_id, presente, confidence")
        .eq("encontro_id", editingEncontro.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editingEncontro?.id && open && !(editingEncontro as any)?.isNew,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_encontro: todayDateStr(),
      qtd_lideres: 0,
      qtd_membros: 0,
      qtd_criancas: 0,
      qtd_visitantes: 0,
      kilos_arrecadados: 0,
      ofertas_dinheiro: "",
      ofertas_pix: "",
      observacoes: "",
    },
  });

  const isNewFromBlank = editingEncontro && (editingEncontro as any).isNew;
  const isEditing = editingEncontro && !isNewFromBlank;

  useEffect(() => {
    if (open) {
      if (isEditing) {
        // Load existing data for editing
        const ofertasDinheiroValue = editingEncontro.ofertas_dinheiro 
          ? Number(editingEncontro.ofertas_dinheiro).toFixed(2).replace(".", ",")
          : "";
        const ofertasPixValue = editingEncontro.ofertas_pix 
          ? Number(editingEncontro.ofertas_pix).toFixed(2).replace(".", ",")
          : "";
        form.reset({
          data_encontro: editingEncontro.data_encontro,
          qtd_lideres: editingEncontro.qtd_lideres || 0,
          qtd_membros: editingEncontro.qtd_membros || 0,
          qtd_criancas: editingEncontro.qtd_criancas || 0,
          qtd_visitantes: editingEncontro.qtd_visitantes || 0,
          kilos_arrecadados: editingEncontro.kilos_arrecadados || 0,
          ofertas_dinheiro: ofertasDinheiroValue,
          ofertas_pix: ofertasPixValue,
          observacoes: editingEncontro.observacoes || "",
        });
        setKilosText(
          editingEncontro.kilos_arrecadados
            ? String(editingEncontro.kilos_arrecadados).replace(".", ",")
            : ""
        );
        if (editingEncontro.photo_url) {
          setPhotoPreview(editingEncontro.photo_url);
        }
      } else {
        // New encontro (or from blank row with pre-filled date)
        form.reset({
          data_encontro: isNewFromBlank ? editingEncontro.data_encontro : todayDateStr(),
          qtd_lideres: 0,
          qtd_membros: 0,
          qtd_criancas: 0,
          qtd_visitantes: 0,
          kilos_arrecadados: 0,
          ofertas_dinheiro: "",
          ofertas_pix: "",
          observacoes: "",
        });
        setPhoto(null);
        setPhotoPreview(null);
        setKilosText("");
      }
      if (!isEditing) {
        setPresencas({});
      }
    }
  }, [open, form, editingEncontro, isEditing, isNewFromBlank]);

  // Load existing presencas when editing
  useEffect(() => {
    if (isEditing && existingPresencas && existingPresencas.length > 0) {
      const loaded: Record<string, boolean> = {};
      existingPresencas.forEach((p) => {
        const id = p.member_id || p.novo_convertido_id;
        if (id) {
          loaded[id] = p.presente;
        }
      });
      setPresencas(loaded);
    }
  }, [existingPresencas, isEditing]);

  const togglePresenca = (memberId: string) => {
    setPresencas((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!casa) throw new Error("Casa não selecionada");

      let photoUrl: string | null = isEditing ? editingEncontro?.photo_url || null : null;

      // Upload photo if exists (new photo)
      if (photo) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${casa.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("encontros-fotos")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("encontros-fotos")
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Parse ofertas from formatted string to number
      const ofertasDinheiroValue = data.ofertas_dinheiro 
        ? parseFloat(data.ofertas_dinheiro.replace(/\./g, "").replace(",", ".")) 
        : 0;
      const ofertasPixValue = data.ofertas_pix 
        ? parseFloat(data.ofertas_pix.replace(/\./g, "").replace(",", ".")) 
        : 0;
      const ofertasTotalValue = ofertasDinheiroValue + ofertasPixValue;

      // data_esperada: if creating from blank row, use the original expected date
      const dataEsperada = isNewFromBlank 
        ? (editingEncontro as any).data_esperada || editingEncontro.data_encontro 
        : isEditing 
          ? editingEncontro?.data_esperada || editingEncontro?.data_encontro
          : data.data_encontro;

      const payload = {
        data_encontro: data.data_encontro,
        data_esperada: dataEsperada,
        qtd_lideres: data.qtd_lideres,
        qtd_membros: data.qtd_membros,
        qtd_criancas: data.qtd_criancas,
        qtd_visitantes: data.qtd_visitantes,
        kilos_arrecadados: data.kilos_arrecadados,
        ofertas: ofertasTotalValue,
        ofertas_dinheiro: ofertasDinheiroValue,
        ofertas_pix: ofertasPixValue,
        observacoes: data.observacoes || null,
        photo_url: photoUrl,
        reuniao_realizada: true,
        justificativa: isNewFromBlank && editingEncontro?.justificativa ? editingEncontro.justificativa : null,
      };

      let encontroId: string;

      if (isEditing && editingEncontro) {
        // Update existing
        const { error } = await supabase
          .from("encontros_casa_refugio")
          .update(payload)
          .eq("id", editingEncontro.id);
        if (error) throw error;
        encontroId = editingEncontro.id;
      } else {
        // Insert new (upsert evita duplicatas para a mesma casa + data;
        // se já existir relatório nesse dia, ele é atualizado)
        const { data: insertedData, error } = await supabase
          .from("encontros_casa_refugio")
          .upsert(
            { ...payload, casa_refugio_id: casa.id },
            { onConflict: "casa_refugio_id,data_encontro" }
          )
          .select("id")
          .single();
        if (error) throw error;
        encontroId = insertedData.id;
      }

      // Save presencas
      if (Object.keys(presencas).length > 0) {
        // Clear existing
        await supabase.from("encontro_presencas").delete().eq("encontro_id", encontroId);
        
        // Insert all
        const presencaRecords = Object.entries(presencas).map(([id, presente]) => {
          const isMember = membrosVinculados.some(m => m.id === id);
          return {
            encontro_id: encontroId,
            member_id: isMember ? id : null,
            novo_convertido_id: !isMember ? id : null,
            presente,
            confidence: null,
          };
        });
        
        if (presencaRecords.length > 0) {
          const { error: presError } = await supabase
            .from("encontro_presencas")
            .insert(presencaRecords);
          if (presError) console.error("Error saving presencas:", presError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-casa"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-supervisor"] });
      queryClient.invalidateQueries({ queryKey: ["encontros-condominio"] });
      toast({
        title: isEditing ? "Encontro atualizado!" : "Encontro registrado!",
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
    const rawValue = e.target.value;
    if (rawValue === "" || rawValue === "0") {
      onChange(0);
      return;
    }
    const value = rawValue.replace(/^0+/, "");
    onChange(parseInt(value, 10) || 0);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const jpegFile = await fileToJpeg(file);
        setPhoto(jpegFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(jpegFile);
      } catch (err) {
        console.error("Error converting image:", err);
        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const rotatePhoto = async () => {
    if (!photoPreview) return;
    setIsRotating(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = photoPreview;
      });

      const canvas = document.createElement("canvas");
      // Swap width/height for 90° rotation
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPhotoPreview(dataUrl);

      // Convert to File to update the actual upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const rotatedFile = new File([blob], `photo_rotated_${Date.now()}.jpg`, { type: "image/jpeg" });
      setPhoto(rotatedFile);
    } finally {
      setIsRotating(false);
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
            {editingEncontro ? "Editar Encontro" : "Registrar Encontro"}
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
                    <DateInput 
                      value={field.value} 
                      onChange={field.onChange}
                      maxDate={undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Justificativa de mudança de data (from pre-screen) */}
            {isNewFromBlank && editingEncontro?.justificativa && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <span className="text-sm font-medium text-amber-700 flex items-center gap-2 mb-1">
                  ⚠️ Reunião em data diferente da agendada
                </span>
                <p className="text-sm text-muted-foreground">
                  {editingEncontro.justificativa}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-medium flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Foto do Encontro
              </span>
              
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Foto do encontro"
                    className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted/30"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removePhoto}
                    disabled={isRotating}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 gap-1"
                    onClick={rotatePhoto}
                    disabled={isRotating}
                  >
                    {isRotating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Girar foto
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    id="camera-input-encontro"
                  />
                  <label
                    htmlFor="camera-input-encontro"
                    className="flex-1 h-24 border-2 border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tirar Foto</span>
                    </div>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-24 border-dashed"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload</span>
                    </div>
                  </Button>
                </div>
              )}
            </div>


            {/* Líderes da Casa Refúgio - do cadastro */}
            {(casa?.lider || casa?.lider_esposa) && (
              <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                <span className="text-sm font-medium text-secondary flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" />
                  Líderes da Casa Refúgio
                </span>
                <p className="text-sm text-muted-foreground">
                  {[
                    casa.lider?.full_name ? getFirstLastName(casa.lider.full_name) : null,
                    casa.lider_esposa?.full_name ? getFirstLastName(casa.lider_esposa.full_name) : null
                  ].filter(Boolean).join(" e ")}
                </p>
              </div>
            )}

            {/* Participantes */}
            <div className="space-y-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participantes
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
            <div className="space-y-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Arrecadação
              </span>
              
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
                        inputMode="decimal"
                        placeholder=""
                        value={kilosText}
                        onChange={(e) => {
                          const input = e.target.value;
                          // Permite apenas dígitos e um único separador (, ou .)
                          if (!/^\d*[.,]?\d*$/.test(input)) return;
                          setKilosText(input);
                          const normalized = input.replace(",", ".");
                          const parsed = parseFloat(normalized);
                          field.onChange(isNaN(parsed) ? 0 : parsed);
                        }}
                        className="[appearance:textfield]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="ofertas_dinheiro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Dinheiro (R$)</FormLabel>
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

                <FormField
                  control={form.control}
                  name="ofertas_pix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Pix (R$)</FormLabel>
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

                <div className="space-y-2">
                  <label className="text-xs font-medium">Total (R$)</label>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 flex items-center text-sm font-medium">
                    {(() => {
                      const dinheiro = form.watch("ofertas_dinheiro") || "";
                      const pix = form.watch("ofertas_pix") || "";
                      const dinheiroValue = dinheiro ? parseFloat(dinheiro.replace(/\./g, "").replace(",", ".")) : 0;
                      const pixValue = pix ? parseFloat(pix.replace(/\./g, "").replace(",", ".")) : 0;
                      const total = dinheiroValue + pixValue;
                      return total > 0 ? total.toFixed(2).replace(".", ",") : "0,00";
                    })()}
                  </div>
                </div>
              </div>
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
                          <p className="text-xs font-medium truncate">{getFirstLastName(membro.full_name)}</p>
                          <div className="flex items-center gap-1">
                            {isLider && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                Líder
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
                disabled={mutation.isPending}
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
