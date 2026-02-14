import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacidadePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">POLÍTICA DE PRIVACIDADE - IGREJA GILEADE</h1>
            <p className="text-sm text-muted-foreground">Última atualização: Janeiro de 2025</p>

            <h2 className="text-lg font-medium text-foreground mt-6">1. INTRODUÇÃO</h2>
            <p className="text-sm text-muted-foreground">
              A Igreja Gileade está comprometida com a proteção da privacidade e dos dados pessoais de seus
              membros e visitantes, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>

            <h2 className="text-lg font-medium text-foreground mt-6">2. DADOS COLETADOS</h2>
            <p className="text-sm text-muted-foreground">
              Coletamos os seguintes tipos de dados pessoais:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li><strong>Dados de identificação:</strong> nome completo, CPF, RG, data de nascimento, gênero;</li>
              <li><strong>Dados de contato:</strong> endereço, telefone, WhatsApp, e-mail;</li>
              <li><strong>Dados de imagem:</strong> fotografias para identificação e registros de eventos;</li>
              <li><strong>Dados de participação:</strong> presença em cultos, eventos, ministérios e Casas Refúgio.</li>
            </ul>

            <h2 className="text-lg font-medium text-foreground mt-6">3. FINALIDADE DO TRATAMENTO</h2>
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

            <h2 className="text-lg font-medium text-foreground mt-6 border-t border-border pt-6">4. AUTORIZAÇÃO PARA USO DE IMAGEM</h2>
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

            <h2 className="text-lg font-medium text-foreground mt-6">5. COMPARTILHAMENTO DE DADOS</h2>
            <p className="text-sm text-muted-foreground">
              Seus dados pessoais podem ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Líderes de ministérios e Casas Refúgio, para fins de acompanhamento pastoral;</li>
              <li>Prestadores de serviços essenciais (hospedagem de dados, comunicação);</li>
              <li>Autoridades públicas, quando exigido por lei.</li>
            </ul>

            <h2 className="text-lg font-medium text-foreground mt-6">6. SEGURANÇA DOS DADOS</h2>
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

            <h2 className="text-lg font-medium text-foreground mt-6">7. DIREITOS DO TITULAR</h2>
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

            <h2 className="text-lg font-medium text-foreground mt-6">8. RETENÇÃO DE DADOS</h2>
            <p className="text-sm text-muted-foreground">
              Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades para as quais
              foram coletados, respeitando os períodos de retenção exigidos por lei.
            </p>

            <h2 className="text-lg font-medium text-foreground mt-6">9. CONTATO</h2>
            <p className="text-sm text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato através
              dos canais oficiais da Igreja Gileade.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacidadePage;
