import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TermsAndPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "terms" | "privacy";
}

export const TermsAndPrivacyDialog = ({
  open,
  onOpenChange,
  defaultTab = "terms",
}: TermsAndPrivacyDialogProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">
            Termos de Uso e Política de Privacidade
          </DialogTitle>
          <DialogDescription>
            Leia atentamente os documentos abaixo antes de prosseguir com seu cadastro.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "terms" | "privacy")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
            <TabsTrigger value="privacy">Política de Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <h2 className="text-lg font-semibold text-foreground">TERMOS DE USO - IGREJA GILEADE</h2>
                <p className="text-sm text-muted-foreground">Última atualização: Janeiro de 2025</p>

                <h3 className="text-base font-medium text-foreground mt-6">1. ACEITAÇÃO DOS TERMOS</h3>
                <p className="text-sm text-muted-foreground">
                  Ao utilizar os serviços e plataformas da Igreja Gileade, você concorda com estes Termos de Uso.
                  Se você não concordar com qualquer parte destes termos, solicitamos que não utilize nossos serviços.
                </p>

                <h3 className="text-base font-medium text-foreground mt-6">2. CADASTRO E INFORMAÇÕES PESSOAIS</h3>
                <p className="text-sm text-muted-foreground">
                  Ao se cadastrar em nossa plataforma, você declara que:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Todas as informações fornecidas são verdadeiras, precisas e atualizadas;</li>
                  <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso;</li>
                  <li>Você concorda em notificar imediatamente qualquer uso não autorizado de sua conta.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">3. USO DA PLATAFORMA</h3>
                <p className="text-sm text-muted-foreground">
                  Nossos serviços são destinados exclusivamente para fins relacionados às atividades da Igreja Gileade, incluindo:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Participação em cultos e eventos;</li>
                  <li>Integração em ministérios e Casas Refúgio;</li>
                  <li>Comunicação com líderes e membros;</li>
                  <li>Acompanhamento de atividades e escalas.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">4. CONDUTA DO USUÁRIO</h3>
                <p className="text-sm text-muted-foreground">
                  O usuário compromete-se a:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Utilizar a plataforma de forma ética e respeitosa;</li>
                  <li>Não compartilhar informações pessoais de outros membros sem autorização;</li>
                  <li>Não utilizar a plataforma para qualquer finalidade ilegal ou não autorizada;</li>
                  <li>Respeitar os valores e princípios cristãos que norteiam nossa comunidade.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">5. PROPRIEDADE INTELECTUAL</h3>
                <p className="text-sm text-muted-foreground">
                  Todo o conteúdo disponibilizado na plataforma, incluindo textos, imagens, logos e materiais,
                  é de propriedade da Igreja Gileade ou de seus respectivos autores, sendo protegido por leis
                  de propriedade intelectual.
                </p>

                <h3 className="text-base font-medium text-foreground mt-6">6. ALTERAÇÕES NOS TERMOS</h3>
                <p className="text-sm text-muted-foreground">
                  A Igreja Gileade reserva-se o direito de modificar estes Termos de Uso a qualquer momento.
                  As alterações entrarão em vigor imediatamente após sua publicação na plataforma.
                </p>

                <h3 className="text-base font-medium text-foreground mt-6">7. CONTATO</h3>
                <p className="text-sm text-muted-foreground">
                  Para dúvidas ou esclarecimentos sobre estes Termos de Uso, entre em contato através dos
                  canais oficiais da Igreja Gileade.
                </p>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="privacy" className="mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <h2 className="text-lg font-semibold text-foreground">POLÍTICA DE PRIVACIDADE - IGREJA GILEADE</h2>
                <p className="text-sm text-muted-foreground">Última atualização: Janeiro de 2025</p>

                <h3 className="text-base font-medium text-foreground mt-6">1. INTRODUÇÃO</h3>
                <p className="text-sm text-muted-foreground">
                  A Igreja Gileade está comprometida com a proteção da privacidade e dos dados pessoais de seus
                  membros e visitantes, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                </p>

                <h3 className="text-base font-medium text-foreground mt-6">2. DADOS COLETADOS</h3>
                <p className="text-sm text-muted-foreground">
                  Coletamos os seguintes tipos de dados pessoais:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li><strong>Dados de identificação:</strong> nome completo, CPF, RG, data de nascimento, gênero;</li>
                  <li><strong>Dados de contato:</strong> endereço, telefone, WhatsApp, e-mail;</li>
                  <li><strong>Dados de imagem:</strong> fotografias para identificação e registros de eventos;</li>
                  <li><strong>Dados de participação:</strong> presença em cultos, eventos, ministérios e Casas Refúgio.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">3. FINALIDADE DO TRATAMENTO</h3>
                <p className="text-sm text-muted-foreground">
                  Os dados pessoais são tratados para as seguintes finalidades:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Cadastro e identificação de membros e visitantes;</li>
                  <li>Comunicação sobre atividades, eventos e informações da igreja;</li>
                  <li>Gestão de ministérios e Casas Refúgio;</li>
                  <li>Controle de presença e acompanhamento pastoral;</li>
                  <li>Emissão de certificados e documentos;</li>
                  <li>Cumprimento de obrigações legais e regulatórias.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6 border-t border-border pt-6">4. AUTORIZAÇÃO PARA USO DE IMAGEM</h3>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="text-sm text-foreground font-medium mb-2">
                    Ao aceitar esta política, você AUTORIZA expressamente:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-2">
                    <li>
                      A captação, reprodução e divulgação de sua imagem (fotografias e vídeos) em materiais
                      institucionais da Igreja Gileade;
                    </li>
                    <li>
                      O uso de sua imagem em redes sociais oficiais, site, aplicativos e materiais promocionais
                      da igreja, sem qualquer ônus;
                    </li>
                    <li>
                      O registro fotográfico para identificação interna (carteirinha do Ministério Kids, credenciais, etc.);
                    </li>
                    <li>
                      A utilização de sistemas de reconhecimento facial para controle de presença em cultos e eventos,
                      quando disponível.
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    Esta autorização é concedida a título gratuito e por prazo indeterminado, podendo ser revogada
                    a qualquer momento mediante solicitação formal à secretaria da igreja.
                  </p>
                </div>

                <h3 className="text-base font-medium text-foreground mt-6">5. COMPARTILHAMENTO DE DADOS</h3>
                <p className="text-sm text-muted-foreground">
                  Seus dados pessoais podem ser compartilhados com:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Líderes de ministérios e Casas Refúgio, para fins de acompanhamento pastoral;</li>
                  <li>Prestadores de serviços essenciais (hospedagem de dados, comunicação);</li>
                  <li>Autoridades públicas, quando exigido por lei.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">6. SEGURANÇA DOS DADOS</h3>
                <p className="text-sm text-muted-foreground">
                  Adotamos medidas técnicas e organizacionais para proteger seus dados pessoais contra acessos
                  não autorizados, perda, alteração ou divulgação indevida, incluindo:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Criptografia de dados sensíveis;</li>
                  <li>Controle de acesso baseado em funções;</li>
                  <li>Políticas de senhas seguras;</li>
                  <li>Monitoramento e auditoria de acessos.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">7. DIREITOS DO TITULAR</h3>
                <p className="text-sm text-muted-foreground">
                  Você tem direito a:
                </p>
                <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                  <li>Confirmar a existência de tratamento de seus dados;</li>
                  <li>Acessar seus dados pessoais;</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                  <li>Solicitar a eliminação de dados desnecessários;</li>
                  <li>Revogar o consentimento a qualquer momento;</li>
                  <li>Obter informações sobre o compartilhamento de dados.</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-6">8. RETENÇÃO DE DADOS</h3>
                <p className="text-sm text-muted-foreground">
                  Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades para as quais
                  foram coletados, respeitando os períodos de retenção exigidos por lei.
                </p>

                <h3 className="text-base font-medium text-foreground mt-6">9. CONTATO</h3>
                <p className="text-sm text-muted-foreground">
                  Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato através
                  dos canais oficiais da Igreja Gileade.
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
