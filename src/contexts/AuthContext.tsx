import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error, data: data ? { user: data.user } : null };
  };

  const signOut = async () => {
    try {
      // Limpa o estado local PRIMEIRO para garantir que a UI atualize
      setUser(null);
      setSession(null);

      // Logout via SDK (principal)
      await supabase.auth.signOut({ scope: "local" });

      // Fallback: limpar qualquer token persistido no storage (evita “sessão presa”)
      // A chave pode variar entre ambientes/versões, então removemos por padrão conhecido.
      const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID || "jwjmseeyjemfwgyizumk";

      const clearStorage = (storage: Storage) => {
        const keys = Object.keys(storage);
        for (const key of keys) {
          const isSupabaseAuthKey = key.startsWith("sb-") && key.endsWith("-auth-token");
          const isProjectKey = key.includes(projectRef);

          if (isSupabaseAuthKey || isProjectKey) {
            storage.removeItem(key);
          }
        }
      };

      try {
        clearStorage(localStorage);
      } catch {
        // ignore
      }
      try {
        clearStorage(sessionStorage);
      } catch {
        // ignore
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
