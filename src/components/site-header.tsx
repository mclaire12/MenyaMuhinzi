import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { session, isStaff } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <Sprout className="size-6" aria-hidden /> MenyaMuhinzi
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost"><Link to="/courses">Amasomo</Link></Button>
          {session ? (
            <>
              <Button asChild variant="ghost"><Link to="/dashboard">Ibyanjye</Link></Button>
              {isStaff && <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/studio">Ubuyobozi</Link></Button>}
              <Button variant="outline" onClick={signOut}>Sohoka</Button>
            </>
          ) : (
            <Button asChild><Link to="/auth">Injira</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
