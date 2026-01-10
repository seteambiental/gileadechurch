import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Instagram, Facebook, Youtube, Twitter, Image as ImageIcon } from "lucide-react";

const HomepageHeroTab = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["homepage-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    hero_titulo: "",
    hero_subtitulo: "",
    hero_image_url: "",
    lema: "",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
    twitter: "",
  });

  // Update form when data loads
  useState(() => {
    if (config) {
      setFormData({
        hero_titulo: config.hero_titulo || "",
        hero_subtitulo: config.hero_subtitulo || "",
        hero_image_url: config.hero_image_url || "",
        lema: config.lema || "",
        instagram: config.instagram || "",
        facebook: config.facebook || "",
        youtube: config.youtube || "",
        tiktok: config.tiktok || "",
        twitter: config.twitter || "",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("homepage_config")
        .update(data)
        .eq("id", config?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["homepage-config"] });
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `hero-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("member-photos")
      .upload(fileName, file);

    if (error) {
      toast.error("Erro ao fazer upload da imagem");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("member-photos")
      .getPublicUrl(fileName);

    setFormData(prev => ({ ...prev, hero_image_url: urlData.publicUrl }));
    toast.success("Imagem carregada com sucesso!");
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  // Sync form data when config loads
  if (config && !formData.hero_titulo && config.hero_titulo) {
    setFormData({
      hero_titulo: config.hero_titulo || "",
      hero_subtitulo: config.hero_subtitulo || "",
      hero_image_url: config.hero_image_url || "",
      lema: config.lema || "",
      instagram: config.instagram || "",
      facebook: config.facebook || "",
      youtube: config.youtube || "",
      tiktok: config.tiktok || "",
      twitter: config.twitter || "",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Seção Hero
          </CardTitle>
          <CardDescription>
            Configure o título, subtítulo e imagem de fundo da seção principal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_titulo">Título Principal</Label>
            <Input
              id="hero_titulo"
              value={formData.hero_titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, hero_titulo: e.target.value }))}
              placeholder="Ex: Um Lugar de Cura e Restauração"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_subtitulo">Subtítulo</Label>
            <Textarea
              id="hero_subtitulo"
              value={formData.hero_subtitulo}
              onChange={(e) => setFormData(prev => ({ ...prev, hero_subtitulo: e.target.value }))}
              placeholder="Texto descritivo abaixo do título"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_image">Imagem de Fundo do Hero</Label>
            <div className="flex gap-4 items-start">
              {formData.hero_image_url && (
                <img
                  src={formData.hero_image_url}
                  alt="Hero preview"
                  className="w-32 h-20 object-cover rounded-lg"
                />
              )}
              <Input
                id="hero_image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: Imagem de alta qualidade com pelo menos 1920x1080 pixels
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lema">Lema (rodapé)</Label>
            <Input
              id="lema"
              value={formData.lema}
              onChange={(e) => setFormData(prev => ({ ...prev, lema: e.target.value }))}
              placeholder="Ex: Um lugar de cura e restauração"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redes Sociais</CardTitle>
          <CardDescription>
            Configure os links das redes sociais exibidos no rodapé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Facebook
              </Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube" className="flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                YouTube
              </Label>
              <Input
                id="youtube"
                value={formData.youtube}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                Twitter / X
              </Label>
              <Input
                id="twitter"
                value={formData.twitter}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                placeholder="https://twitter.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={formData.tiktok}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktok: e.target.value }))}
                placeholder="https://tiktok.com/@..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          size="lg" 
          onClick={() => updateMutation.mutate(formData)}
          disabled={updateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default HomepageHeroTab;
