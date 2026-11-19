import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, LayoutDashboard, LogOut, Menu, Smartphone, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, roles, signOut: endSession } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await endSession();
    setOpen(false); navigate({ to: "/auth", replace: true });
  }
  const basicPhone = roles.includes("basic_phone_farmer");
  const navigation = basicPhone ? <Button asChild variant="ghost"><Link to="/phone" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}><Smartphone aria-hidden />Telefoni y'igerageza</Link></Button> : <>
    <Button asChild variant="ghost"><Link to="/courses" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}><BookOpen aria-hidden />Amasomo</Link></Button>
    {user && !roles.includes("admin") && <Button asChild variant="ghost"><Link to="/dashboard" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}><LayoutDashboard aria-hidden />Ibyanjye</Link></Button>}
    {user && roles.includes("admin") && <Button asChild variant="ghost"><Link to="/admin" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}>Admin Portal</Link></Button>}
    {user && roles.includes("facilitator") && !roles.includes("admin") && <Button asChild variant="ghost"><Link to="/facilitator" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}>Facilitator Portal</Link></Button>}
  </>;
  return <header className="site-header">
    <div className="page-width flex h-20 items-center justify-between gap-3">
      <Link to="/" className="brand" aria-label="MenyaMuhinzi — Ahabanza"><span className="brand-mark"><Logo className="size-full" /></span><span>Menya<span className="text-logo">Muhinzi</span></span></Link>
      <nav aria-label="Ibikubiyemo" className="hidden items-center gap-2 md:flex">{navigation}</nav>
      <div className="flex items-center gap-2">
        <span className="mr-3 hidden text-xs font-bold text-muted-foreground lg:inline">KINYARWANDA</span>
        <ThemeToggle />
        {user ? <Button variant="outline" onClick={signOut} className="hidden md:inline-flex"><LogOut aria-hidden />Sohoka</Button> : <Button asChild><Link to="/auth">Injira <ArrowUpRight aria-hidden /></Link></Button>}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Funga ibikubiyemo" : "Fungura ibikubiyemo"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Ibikubiyemo bya telefoni" className="mobile-navigation">{navigation}{user && <Button variant="outline" onClick={signOut}><LogOut aria-hidden />Sohoka</Button>}</nav>}
  </header>;
}
