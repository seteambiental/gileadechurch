import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Upload, Building2, MapPin, Navigation, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF, formatCNPJ } from "@/lib/masks";

const formSchema = z.object({
  nome_fantasia: z.string().min(1, "Nome fantasia é obrigatório"),
  razao_social: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().min(14, "CNPJ é obrigatório"),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  responsavel_legal: z.string().min(1, "Responsável legal é obrigatório"),
  cpf_responsavel: z.string().optional(),
  cargo_responsavel: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  website: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const IgrejaTab = () => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_fantasia: "",
      razao_social: "",
      cnpj: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      responsavel_legal: "",
      cpf_responsavel: "",
      cargo_responsavel: "",
      email: "",
      telefone: "",
      celular: "",
      website: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const { data: igrejaConfig, isLoading } = useQuery({
    queryKey: ["igreja_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (igrejaConfig) {
      form.reset({
        nome_fantasia: igrejaConfig.nome_fantasia,
        razao_social: igrejaConfig.razao_social,
        cnpj: formatCNPJ(igrejaConfig.cnpj),
        inscricao_estadual: igrejaConfig.inscricao_estadual || "",
        inscricao_municipal: igrejaConfig.inscricao_municipal || "",
        responsavel_legal: igrejaConfig.responsavel_legal,
        cpf_responsavel: igrejaConfig.cpf_responsavel ? formatCPF(igrejaConfig.cpf_responsavel) : "",
        cargo_responsavel: igrejaConfig.cargo_responsavel || "",
        email: igrejaConfig.email || "",
        telefone: igrejaConfig.telefone ? formatPhone(igrejaConfig.telefone) : "",
        celular: igrejaConfig.celular ? formatPhone(igrejaConfig.celular) : "",
        website: igrejaConfig.website || "",
        cep: igrejaConfig.cep ? formatCep(igrejaConfig.cep) : "",
        address: igrejaConfig.address || "",
        number: igrejaConfig.number || "",
        complement: igrejaConfig.complement || "",
        neighborhood: igrejaConfig.neighborhood || "",
        city: igrejaConfig.city || "",
        state: igrejaConfig.state || "",
      });
      setLogoPreview(igrejaConfig.logo_url);
      // @ts-ignore - latitude e longitude são campos novos
      setCoordinates({ lat: igrejaConfig.latitude || null, lng: igrejaConfig.longitude || null });
    }
  }, [igrejaConfig, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let logoUrl = igrejaConfig?.logo_url || null;

      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `igreja-logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      const configData = {
        nome_fantasia: data.nome_fantasia,
        razao_social: data.razao_social,
        cnpj: data.cnpj.replace(/\D/g, ""),
        inscricao_estadual: data.inscricao_estadual || null,
        inscricao_municipal: data.inscricao_municipal || null,
        responsavel_legal: data.responsavel_legal,
        cpf_responsavel: data.cpf_responsavel ? data.cpf_responsavel.replace(/\D/g, "") : null,
        cargo_responsavel: data.cargo_responsavel || null,
        email: data.email || null,
        telefone: data.telefone ? unformatPhone(data.telefone) : null,
        celular: data.celular ? unformatPhone(data.celular) : null,
        website: data.website || null,
        cep: data.cep ? unformatCep(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        logo_url: logoUrl,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      };

      if (igrejaConfig?.id) {
        const { error } = await supabase
          .from("igreja_config")
          .update(configData)
          .eq("id", igrejaConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("igreja_config")
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["igreja_config"] });
      toast({ title: "Dados da igreja salvos com sucesso!" });
      setLogoFile(null);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar dados", 
        description: String(error), 
        variant: "destructive" 
      });
    },
  });

  const handleCepBlur = async () => {
    const cepValue = form.getValues("cep");
    const cep = cepValue ? unformatCep(cepValue) : "";
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue("address", data.logradouro || "");
        form.setValue("neighborhood", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeocode = async () => {
    const address = form.getValues("address");
    const number = form.getValues("number");
    const neighborhood = form.getValues("neighborhood");
    const city = form.getValues("city");
    const state = form.getValues("state");
    const cep = form.getValues("cep");

    if (!address || !city) {
      toast({
        title: "Endereço incompleto",
        description: "Preencha pelo menos o logradouro e a cidade para geocodificar.",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocoding", {
        body: {
          action: "geocode_igreja",
          address,
          number,
          neighborhood,
          city,
          state,
          cep: cep ? unformatCep(cep) : undefined,
        },
      });

      if (error) throw error;

      if (data?.success && data?.coordinates) {
        // Salvar as coordenadas no banco
        if (igrejaConfig?.id) {
          const { error: updateError } = await supabase
            .from("igreja_config")
            .update({ latitude: data.coordinates.lat, longitude: data.coordinates.lng })
            .eq("id", igrejaConfig.id);

          if (updateError) throw updateError;
        }

        setCoordinates({ lat: data.coordinates.lat, lng: data.coordinates.lng });
        queryClient.invalidateQueries({ queryKey: ["igreja_config"] });
        
        toast({
          title: "Coordenadas encontradas!",
          description: `Latitude: ${data.coordinates.lat.toFixed(6)}, Longitude: ${data.coordinates.lng.toFixed(6)}`,
        });
      } else {
        toast({
          title: "Endereço não encontrado",
          description: data?.error || "Verifique o endereço e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao geocodificar:", error);
      toast({
        title: "Erro ao geocodificar",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-secondary" />
          Dados da Igreja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Avatar className="w-24 h-24 border-2 border-secondary/30 shrink-0">
                <AvatarImage src={logoPreview || undefined} className="object-cover" />
                <AvatarFallback className="bg-secondary/20 text-secondary text-2xl">
                  <Building2 className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Dados da Empresa</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nome_fantasia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00.000.000/0000-00"
                          onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                          maxLength={18}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inscricao_estadual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Estadual</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inscricao_municipal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Municipal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Responsável Legal */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Responsável Legal</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="responsavel_legal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf_responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="000.000.000-00"
                          onChange={(e) => field.onChange(formatCPF(e.target.value))}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cargo_responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Pastor Presidente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Contato</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="(00) 0000-0000"
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="(00) 00000-0000"
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          maxLength={16}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Endereço</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="00000-000"
                            onChange={(e) => field.onChange(formatCep(e.target.value))}
                            onBlur={handleCepBlur}
                            maxLength={9}
                          />
                          {isLoadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Geolocalização */}
              <div className="pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span className="font-medium text-sm">Geolocalização</span>
                      {coordinates.lat && coordinates.lng ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Check className="w-3 h-3 mr-1" />
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <X className="w-3 h-3 mr-1" />
                          Não configurado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure as coordenadas automaticamente ou insira manualmente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeocode}
                    disabled={isGeocoding}
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2" />
                    )}
                    {coordinates.lat ? "Atualizar" : "Obter"} Automático
                  </Button>
                </div>

                {/* Campos de coordenadas editáveis */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-sm text-muted-foreground">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="-25.451234"
                      value={coordinates.lat ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setCoordinates((prev) => ({ ...prev, lat: val }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-sm text-muted-foreground">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-49.270123"
                      value={coordinates.lng ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        setCoordinates((prev) => ({ ...prev, lng: val }));
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dica: Você pode encontrar as coordenadas no Google Maps clicando com o botão direito no local desejado.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                className="bg-secondary hover:bg-secondary/90" 
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default IgrejaTab;
