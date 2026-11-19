import { Link, Outlet } from "@tanstack/react-router";
import { Bell, BookOpen, Bot, LayoutDashboard, LineChart, Menu, Phone, ScrollText, Settings2, Users, Library } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/lib/admin/store";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "People", icon: Users, exact: false },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, exact: false },
  { to: "/admin/knowledge", label: "Knowledge", icon: Library, exact: false },
  { to: "/admin/ai", label: "AI engine", icon: Bot, exact: false },
  { to: "/admin/channels", label: "USSD & IVR", icon: Phone, exact: false },
  { to: "/admin/learning", label: "Learning", icon: LineChart, exact: false },
  { to: "/admin/reports", label: "Reports", icon: ScrollText, exact: false },
  { to: "/admin/operations", label: "Operations", icon: Settings2, exact: false },
] as const;

export function AdminLayout() {
  const { roles } = useAuth();
  const data = useAdmin();
  const [open, setOpen] = useState(false);
  const unread = data.notices.filter((notice) => !notice.read).length;
  if (!roles.includes("admin")) {
    return <div className="page-width py-16"><h1 className="text-3xl">Administrators only</h1><p className="mt-2 text-muted-foreground">Sign in with admin@menyamuhinzi.rw to open the Admin Portal.</p></div>;
  }
  return <div className="admin-shell">
    <aside className={open ? "admin-side open" : "admin-side"}>
      <p className="admin-side-label">Administrator</p>
      <nav aria-label="Admin Portal">
        {links.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.exact }} activeProps={{ className: "admin-nav-active" }} onClick={() => setOpen(false)}><item.icon aria-hidden />{item.label}</Link>)}
      </nav>
    </aside>
    <div className="admin-main">
      <div className="admin-top">
        <button type="button" className="admin-menu" onClick={() => setOpen((value) => !value)}><Menu aria-hidden />Menu</button>
        <Link to="/admin/operations" className="admin-alerts"><Bell aria-hidden />Alerts{unread ? ` (${unread})` : ""}</Link>
      </div>
      <p className="admin-banner">Demo data saved in this browser. A later phase will connect the database and providers. Live USSD, IVR, and SMS are not connected.</p>
      <Outlet />
    </div>
  </div>;
}

export function PageHead({ title, text }: { title: string; text: string }) {
  return <header className="admin-page-head"><h1>{title}</h1><p>{text}</p></header>;
}
