import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { readDemoUser, signOutDemo, type DemoRole, type DemoSession } from "@/lib/demo-auth";

type Role = DemoRole;
type AppUser = { id: string; email?: string; name?: string; demo: boolean };
type AuthState = { session: Session | null; user: AppUser | null; loading: boolean; roles: Role[]; isStaff: boolean; signOut: () => Promise<void> };

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, roles: [], isStaff: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbRoles, setDbRoles] = useState<Role[]>([]);

  useEffect(() => {
    const syncDemo = () => setDemo(readDemoUser());
    syncDemo();
    window.addEventListener("mm-demo-auth", syncDemo);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      window.removeEventListener("mm-demo-auth", syncDemo);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (demo || !session?.user) { setDbRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
      setDbRoles((data ?? []).map((row) => row.role as Role));
    });
  }, [demo, session?.user?.id]);

  const user: AppUser | null = demo
    ? { id: demo.id, email: demo.email, name: demo.name, demo: true }
    : session?.user
      ? { id: session.user.id, ...(session.user.email ? { email: session.user.email } : {}), demo: false }
      : null;
  const roles = demo ? [demo.role] : dbRoles;
  const isStaff = roles.includes("admin") || roles.includes("facilitator");

  async function signOut() {
    signOutDemo();
    setDemo(null);
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, user, loading, roles, isStaff, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
