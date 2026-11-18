import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, LayoutDashboard, LogOut, Menu, Sprout, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { session, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut();
    setOpen(false); navigate({ to: "/auth", replace: true });
  }
  const navigation = <>
    <Button asChild variant="ghost"><Link to="/courses" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}><BookOpen aria-hidden />Amasomo</Link></Button>
    {session && <Button asChild variant="ghost"><Link to="/dashboard" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}><LayoutDashboard aria-hidden />Ibyanjye</Link></Button>}
    {session && isStaff && <Button asChild variant="ghost"><Link to="/studio" activeProps={{ className: "nav-active" }} onClick={() => setOpen(false)}>Ubuyobozi</Link></Button>}
  </>;
  return <header className="site-header">
    <div className="page-width flex h-20 items-center justify-between gap-3">
      <Link to="/" className="brand" aria-label="MenyaMuhinzi — Ahabanza"><span className="brand-mark"><Sprout aria-hidden /></span><span>Menya<span className="text-primary">Muhinzi</span></span></Link>
      <nav aria-label="Ibikubiyemo" className="hidden items-center gap-2 md:flex">{navigation}</nav>
      <div className="flex items-center gap-2">
        <span className="mr-3 hidden text-xs font-bold text-muted-foreground lg:inline">KINYARWANDA</span>
        {session ? <Button variant="outline" onClick={signOut} className="hidden md:inline-flex"><LogOut aria-hidden />Sohoka</Button> : <Button asChild><Link to="/auth">Injira <ArrowUpRight aria-hidden /></Link></Button>}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Funga ibikubiyemo" : "Fungura ibikubiyemo"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Ibikubiyemo bya telefoni" className="mobile-navigation">{navigation}{session && <Button variant="outline" onClick={signOut}><LogOut aria-hidden />Sohoka</Button>}</nav>}
  </header>;
}
