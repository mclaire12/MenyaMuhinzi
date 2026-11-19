import { Link, Outlet } from "@tanstack/react-router";
import { BarChart3, BookOpen, ClipboardCheck, FileText, FolderOpen, LayoutDashboard, Menu, MessageCircleQuestion, Send, Sparkles, UserCircle, Users, UsersRound } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/lib/admin/store";
import { useLearningState } from "@/lib/mock/store";
import { facilitatorForAccount } from "@/lib/mock/services/facilitators";
import type { Actor } from "@/lib/mock/services/courses";
import type { Facilitator, LearningState } from "@/lib/mock/types";
import type { ActorPermissions } from "@/lib/mock/workflow";

const links = [
  { to: "/facilitator", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/facilitator/studio", label: "AI Course Studio", icon: Sparkles, exact: false },
  { to: "/facilitator/courses", label: "Courses", icon: BookOpen, exact: false },
  { to: "/facilitator/materials", label: "Learning materials", icon: FolderOpen, exact: false },
  { to: "/facilitator/reviews", label: "Content review", icon: ClipboardCheck, exact: false },
  { to: "/facilitator/groups", label: "Farmer groups", icon: UsersRound, exact: false },
  { to: "/facilitator/farmers", label: "Farmers", icon: Users, exact: false },
  { to: "/facilitator/assignments", label: "Assignments", icon: Send, exact: false },
  { to: "/facilitator/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/facilitator/ai-feedback", label: "AI learning feedback", icon: MessageCircleQuestion, exact: false },
  { to: "/facilitator/reports", label: "Reports", icon: FileText, exact: false },
  { to: "/facilitator/profile", label: "Profile & settings", icon: UserCircle, exact: false },
] as const;

type FacilitatorContextValue = { facilitator: Facilitator; actor: Actor; permissions: ActorPermissions; state: LearningState };
const FacilitatorContext = createContext<FacilitatorContextValue | null>(null);

export function useFacilitator() {
  const value = useContext(FacilitatorContext);
  if (!value) throw new Error("useFacilitator must be used inside the facilitator portal");
  return value;
}

export function FacilitatorLayout() {
  const { roles, user } = useAuth();
  const state = useLearningState();
  const admin = useAdmin();
  const [open, setOpen] = useState(false);
  if (!roles.includes("facilitator")) {
    return <div className="page-width py-16"><h1 className="text-3xl">Facilitators only</h1><p className="mt-2 text-muted-foreground">Sign in with facilitator@menyamuhinzi.rw to open the Facilitator Portal.</p></div>;
  }
  const facilitator = facilitatorForAccount(state, user?.id);
  if (!facilitator) {
    return <div className="page-width py-16"><h1 className="text-3xl">No facilitator profile</h1><p className="mt-2 text-muted-foreground">This account has the facilitator role but no profile in the demo data yet.</p></div>;
  }
  const permissions = { approve: !!admin.permissions.FACILITATOR.approve, publish: !!admin.permissions.FACILITATOR.publish };
  const value = { facilitator, actor: { id: facilitator.id, name: facilitator.name }, permissions, state };
  return <FacilitatorContext.Provider value={value}>
    <div className="admin-shell">
      <aside className={open ? "admin-side open" : "admin-side"}>
        <p className="admin-side-label">Facilitator</p>
        <nav aria-label="Facilitator Portal">
          {links.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.exact }} activeProps={{ className: "admin-nav-active" }} onClick={() => setOpen(false)}><item.icon aria-hidden />{item.label}</Link>)}
        </nav>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <button type="button" className="admin-menu" onClick={() => setOpen((current) => !current)}><Menu aria-hidden />Menu</button>
          <span className="text-sm text-muted-foreground">{facilitator.name} · {facilitator.title}</span>
        </div>
        <p className="admin-banner">Demo data saved in this browser and shared with the farmer pages. AI content is simulated and must be validated by an agricultural expert before publication.</p>
        <Outlet />
      </div>
    </div>
  </FacilitatorContext.Provider>;
}

export function PageHead({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return <header className="admin-page-head fac-head"><div><h1>{title}</h1><p>{text}</p></div>{children && <div className="admin-actions">{children}</div>}</header>;
}
