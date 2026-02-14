import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermosPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">TERMOS DE USO - IGREJA GILEADE</h1>
            <p className="text-sm text-muted-foreground">Última atualização: Janeiro de 2025</p>

            <h2 className="text-lg font-medium text-foreground mt-6">1. ACEITAÇÃO DOS TERMOS</h2>
            <p className="text-sm text-muted-foreground">
              Ao utilizar os serviços e plataformas da Igreja Gileade, você concorda com estes Termos de Uso.
              Se você não concordar com qualquer parte destes termos, solicitamos que não utilize nossos serviços.
            </p>

            <h2 className="text-lg font-medium text-foreground mt-6">2. CADASTRO E INFORMAÇÕES PESSOAIS</h2>
            <p className="text-sm text-muted-foreground">
              Ao se cadastrar em nossa plataforma, você declara que:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Todas as informações fornecidas são verdadeiras, precisas e atualizadas;</li>
              <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso;</li>
              <li>Você concorda em notificar imediatamente qualquer uso não autorizado de sua conta.</li>
            </ul>

            <h2 className="text-lg font-medium text-foreground mt-6">3. USO DA PLATAFORMA</h2>
            <p className="text-sm text-muted-foreground">
              Nossos serviços são destinados exclusivamente para fins relacionados às atividades da Igreja Gileade, incluindo:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Participação em cultos e eventos;</li>
              <li>Integração em ministérios e Casas Refúgio;</li>
              <li>Comunicação com líderes e membros;</li>
              <li>Acompanhamento de atividades e escalas.</li>
            </ul>

            <h2 className="text-lg font-medium text-foreground mt-6">4. CONDUTA DO USUÁRIO</h2>
            <p className="text-sm text-muted-foreground">
              O usuário compromete-se a:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Utilizar a plataforma de forma ética e respeitosa;</li>
              <li>Não compartilhar informações pessoais de outros membros sem autorização;</li>
              <li>Não utilizar a plataforma para qualquer finalidade ilegal ou não autorizada;</li>
              <li>Respeitar os valores e princípios cristãos que norteiam nossa comunidade.</li>
            </ul>

            <h2 className="text-lg font-medium text-foreground mt-6">5. PROPRIEDADE INTELECTUAL</h2>
            <p className="text-sm text-muted-foreground">
              Todo o conteúdo disponibilizado na plataforma, incluindo textos, imagens, logos e materiais,
              é de propriedade da Igreja Gileade ou de seus respectivos autores, sendo protegido por leis
              de propriedade intelectual.
            </p>

            <h2 className="text-lg font-medium text-foreground mt-6">6. ALTERAÇÕES NOS TERMOS</h2>
            <p className="text-sm text-muted-foreground">
              A Igreja Gileade reserva-se o direito de modificar estes Termos de Uso a qualquer momento.
              As alterações entrarão em vigor imediatamente após sua publicação na plataforma.
            </p>

            <h2 className="text-lg font-medium text-foreground mt-6">7. CONTATO</h2>
            <p className="text-sm text-muted-foreground">
              Para dúvidas ou esclarecimentos sobre estes Termos de Uso, entre em contato através dos
              canais oficiais da Igreja Gileade.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermosPage;
