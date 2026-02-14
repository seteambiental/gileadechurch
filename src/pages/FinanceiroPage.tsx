import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { PortalFinancasTab } from "@/components/portal/PortalFinancasTab";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const FinanceiroPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserAccess(user?.id);
  const bypassed = isAuthBypassed();

  useEffect(() => {
    if (!loading && !user && !bypassed) {
      navigate("/auth");
    }
  }, [user, loading, navigate, bypassed]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surfaceInverse text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading font-bold text-lg">Financeiro</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <PortalFinancasTab />
      </main>
    </div>
  );
};

export default FinanceiroPage;
