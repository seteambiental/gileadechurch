import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AppDashboard from "./pages/AppDashboard";
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
import KidsPage from "./pages/KidsPage";
import NotFound from "./pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<AppDashboard />} />
            <Route path="/cadastros" element={<Cadastros />} />
            <Route path="/membro/:id" element={<MemberDetails />} />
            <Route path="/ministerio/casas-refugio" element={<CasasRefugioPage />} />
            <Route path="/ministerio/consolidacao" element={<ConsolidacaoPage />} />
            <Route path="/ministerio/kids" element={<KidsPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/inscricao/:eventoId" element={<InscricaoEvento />} />
            <Route path="/ministerio/:slug" element={<MinistryPage />} />
            <Route path="/casa-refugio/:id" element={<CasaRefugioDetalhes />} />
            <Route path="/supervisor/:nome" element={<SupervisorDetalhes />} />
            <Route path="/condominio/:nome" element={<CondominioDetalhes />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
