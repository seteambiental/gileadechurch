import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AppDashboard from "./pages/AppDashboard";
import HomepageAdmin from "./pages/HomepageAdmin";
import PortalMembro from "./pages/PortalMembro";
import Cadastros from "./pages/Cadastros";
import MemberDetails from "./pages/MemberDetails";
import MinistryPage from "./pages/MinistryPage";
import CasasRefugioPage from "./pages/CasasRefugioPage";
import CasaRefugioDetalhes from "./pages/CasaRefugioDetalhes";
import SupervisorDetalhes from "./pages/SupervisorDetalhes";
import CondominioDetalhes from "./pages/CondominioDetalhes";
import ConsolidacaoPage from "./pages/ConsolidacaoPage";
import AgendaPage from "./pages/AgendaPage";
import InscricaoEvento from "./pages/InscricaoEvento";
import InscricaoCasais from "./pages/InscricaoCasais";
import KidsPage from "./pages/KidsPage";
import KidsCheckinPage from "./pages/KidsCheckinPage";
import KidsCheckMePage from "./pages/KidsCheckMePage";
import KidsCheckinScanPage from "./pages/KidsCheckinScanPage";
import AcaoSocialPage from "./pages/AcaoSocialPage";
import CadastroPublico from "./pages/CadastroPublico";
import PortalLideres from "./pages/PortalLideres";
import PortalKids from "./pages/PortalKids";
import NotFound from "./pages/NotFound";
import FinanceiroPage from "./pages/FinanceiroPage";
import TermosPage from "./pages/TermosPage";
import PrivacidadePage from "./pages/PrivacidadePage";
import JiuJitsuPage from "./pages/JiuJitsuPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<CadastroPublico />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<AppDashboard />} />
            <Route path="/app/homepage" element={<HomepageAdmin />} />
            <Route path="/portal" element={<PortalMembro />} />
            <Route path="/portal/kids" element={<PortalKids />} />
            <Route path="/lideres" element={<PortalLideres />} />
            <Route path="/cadastros" element={<Cadastros />} />
            <Route path="/membro/:id" element={<MemberDetails />} />
            <Route path="/ministerio/casas-refugio" element={<CasasRefugioPage />} />
            <Route path="/ministerio/consolidacao" element={<ConsolidacaoPage />} />
            <Route path="/ministerio/kids" element={<KidsPage />} />
            <Route path="/kids/checkme" element={<KidsCheckMePage />} />
            <Route path="/kids/checkin/:turma" element={<KidsCheckinPage />} />
            <Route path="/kids/scan/:token" element={<KidsCheckinScanPage />} />
            <Route path="/ministerio/acao-social" element={<AcaoSocialPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/inscricao/:eventoId" element={<InscricaoEvento />} />
            <Route path="/inscricao-casais" element={<InscricaoCasais />} />
            <Route path="/ministerio/:slug" element={<MinistryPage />} />
            <Route path="/casa-refugio/:id" element={<CasaRefugioDetalhes />} />
            <Route path="/supervisor/:nome" element={<SupervisorDetalhes />} />
            <Route path="/condominio/:nome" element={<CondominioDetalhes />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
