import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2, Image, Sun, Moon, CircleDot, Loader2 } from "lucide-react";

interface LogoUploadCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading: boolean;
}

const LogoUploadCard = ({ 
  title, 
  description, 
  icon, 
  currentUrl, 
  onUpload, 
  onRemove,
  isUploading 
}: LogoUploadCardProps) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
    e.target.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border flex items-center justify-center" style={{ background: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px' }}>
              <img 
                src={currentUrl} 
                alt={title}
                className="max-h-full max-w-full object-contain p-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '';
                  target.alt = 'Erro ao carregar imagem';
                  target.className = 'hidden';
                }}
              />
            </div>
            <div className="flex gap-2">
              <Label 
                htmlFor={`logo-${title}`}
                className="flex-1 cursor-pointer"
              >
                <Button variant="outline" className="w-full" asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Substituir
                  </span>
                </Button>
              </Label>
              <Button 
                variant="destructive" 
                size="icon"
                onClick={onRemove}
                disabled={isUploading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Label 
            htmlFor={`logo-${title}`}
            className="cursor-pointer block"
          >
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary transition-colors">
              {isUploading ? (
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-secondary animate-spin" />
              ) : (
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                Clique para fazer upload
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                PNG, JPG ou SVG até 2MB
              </p>
            </div>
          </Label>
        )}
        <input
          id={`logo-${title}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </CardContent>
    </Card>
  );
};

const HomepageLogosTab = () => {
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const { data: igrejaConfig, isLoading } = useQuery({
    queryKey: ["igreja-config-logos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("id, logo_url, logo_dark_url, logo_dark_url_2, logo_light_url, logo_light_url_2, logo_icon_url")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const uploadLogo = async (file: File, field: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${field}-${Date.now()}.${fileExt}`;
    const filePath = `church/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const updateLogoField = useMutation({
    mutationFn: async ({ field, url }: { field: string; url: string | null }) => {
      if (!igrejaConfig?.id) {
        throw new Error("Configuração da igreja não encontrada");
      }

      const { error } = await supabase
        .from("igreja_config")
        .update({ [field]: url })
        .eq("id", igrejaConfig.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["igreja-config-logos"] });
    },
  });

  const handleUpload = async (file: File, field: string) => {
    setUploadingField(field);
    try {
      const url = await uploadLogo(file, field);
      await updateLogoField.mutateAsync({ field, url });
      toast.success("Logo atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da logo");
    } finally {
      setUploadingField(null);
    }
  };

  const handleRemove = async (field: string) => {
    try {
      await updateLogoField.mutateAsync({ field, url: null });
      toast.success("Logo removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover logo:", error);
      toast.error("Erro ao remover logo");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!igrejaConfig) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Configure os dados da igreja primeiro para adicionar as logos.</p>
        </CardContent>
      </Card>
    );
  }

  const logos = [
    {
      field: "logo_url",
      title: "Logo Principal",
      description: "Logo padrão usada no header e documentos",
      icon: <Image className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_url,
    },
    {
      field: "logo_light_url",
      title: "Logo Clara (Versão 1)",
      description: "Versão clara da logo para uso em fundos escuros",
      icon: <Moon className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_light_url,
    },
    {
      field: "logo_light_url_2",
      title: "Logo Clara (Versão 2)",
      description: "Segunda versão clara da logo",
      icon: <Moon className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_light_url_2,
    },
    {
      field: "logo_dark_url",
      title: "Logo Escura (Versão 1)",
      description: "Versão escura da logo para uso em fundos claros",
      icon: <Sun className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_dark_url,
    },
    {
      field: "logo_dark_url_2",
      title: "Logo Escura (Versão 2)",
      description: "Segunda versão escura da logo",
      icon: <Sun className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_dark_url_2,
    },
    {
      field: "logo_icon_url",
      title: "Ícone / Favicon",
      description: "Versão compacta para ícones e favicon",
      icon: <CircleDot className="w-5 h-5" />,
      currentUrl: igrejaConfig.logo_icon_url,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Logos da Igreja</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as variações da logo para uso em todo o aplicativo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logos.map((logo) => (
          <LogoUploadCard
            key={logo.field}
            title={logo.title}
            description={logo.description}
            icon={logo.icon}
            currentUrl={logo.currentUrl}
            onUpload={(file) => handleUpload(file, logo.field)}
            onRemove={() => handleRemove(logo.field)}
            isUploading={uploadingField === logo.field}
          />
        ))}
      </div>
    </div>
  );
};

export default HomepageLogosTab;
