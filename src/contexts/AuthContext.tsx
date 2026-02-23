import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "ADMIN" | "SOCIO" | "BECARIO";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  usuarioId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  usuarioId: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (authId: string) => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("rol, usuario_id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.rol as AppRole);
      setUsuarioId(data.usuario_id);
    } else {
      setRole(null);
      setUsuarioId(null);
    }
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchRole(currentUser.id), 0);
        } else {
          setRole(null);
          setUsuarioId(null);
        }
        setLoading(false);
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchRole(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUsuarioId(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, usuarioId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
