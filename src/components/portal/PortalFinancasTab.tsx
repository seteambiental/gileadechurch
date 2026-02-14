import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Copy, Check, QrCode, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import qrcodePixImage from "@/assets/qrcode-pix.png";

export const PortalFinancasTab = () => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);

  const { data: pixConfigs = [], isLoading } = useQuery({
    queryKey: ["igreja-pix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_pix")
        .select("*")
        .eq("ativo", true)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("nome_fantasia, cnpj")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      toast({ title: "Chave copiada!", description: "A chave PIX foi copiada para a área de transferência." });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const tipoChaveLabels: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "E-mail",
    telefone: "Telefone",
    aleatoria: "Chave Aleatória",
  };

  const formatChave = (tipo: string, chave: string) => {
    if (tipo === "cpf" && chave.length === 11) {
      return `${chave.slice(0, 3)}.${chave.slice(3, 6)}.${chave.slice(6, 9)}-${chave.slice(9)}`;
    }
    if (tipo === "cnpj" && chave.length === 14) {
      return `${chave.slice(0, 2)}.${chave.slice(2, 5)}.${chave.slice(5, 8)}/${chave.slice(8, 12)}-${chave.slice(12)}`;
    }
    if (tipo === "telefone" && chave.length >= 10) {
      return `(${chave.slice(0, 2)}) ${chave.slice(2, 7)}-${chave.slice(7)}`;
    }
    return chave;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Finanças</h2>
          <p className="text-sm text-muted-foreground">
            Contribua com dízimos e ofertas
          </p>
        </div>
      </div>

      {/* Info da Igreja */}
      {igrejaConfig && (
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{igrejaConfig.nome_fantasia}</h3>
                {igrejaConfig.cnpj && (
                  <p className="text-sm text-muted-foreground">
                    CNPJ: {formatChave("cnpj", igrejaConfig.cnpj.replace(/\D/g, ""))}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chaves PIX */}
      {pixConfigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma chave PIX cadastrada</p>
            <p className="text-sm">
              Entre em contato com a secretaria da igreja
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pixConfigs.map((pix) => (
            <Card key={pix.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {tipoChaveLabels[pix.tipo_chave] || pix.tipo_chave}
                    </Badge>
                    <CardTitle className="text-lg">{pix.nome_beneficiario}</CardTitle>
                    {pix.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {pix.descricao}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQrCode(showQrCode === pix.id ? null : pix.id)}
                  >
                    <QrCode className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chave PIX */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {formatChave(pix.tipo_chave, pix.chave)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(pix.chave, pix.id)}
                    className="flex-shrink-0"
                  >
                    {copiedKey === pix.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* QR Code */}
                {showQrCode === pix.id && (
                  <div className="flex justify-center p-4 bg-background rounded-lg">
                    <img
                      src={qrcodePixImage}
                      alt="QR Code PIX"
                      className="w-[180px] h-[180px] object-contain"
                    />
                  </div>
                )}

                {pix.cidade && (
                  <p className="text-xs text-muted-foreground text-center">
                    {pix.cidade}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Informações Adicionais */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">Como contribuir</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Abra o app do seu banco e acesse a opção PIX</li>
            <li>Copie a chave PIX acima ou escaneie o QR Code</li>
            <li>Informe o valor da sua contribuição</li>
            <li>Confirme a transação</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            "Cada um dê conforme determinou em seu coração, não com pesar ou por
            obrigação, pois Deus ama quem dá com alegria." - 2 Coríntios 9:7
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
