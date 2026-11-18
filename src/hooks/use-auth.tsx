import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "farmer" | "facilitator" | "admin";
type AuthState = { session: Session | null; loading: boolean; roles: Role[]; isStaff: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true, roles: [], isStaff: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role as Role));
    });
  }, [session?.user?.id]);

  const isStaff = roles.includes("admin") || roles.includes("facilitator");
  return <AuthContext.Provider value={{ session, loading, roles, isStaff }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
