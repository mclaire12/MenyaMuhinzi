import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import hero from "@/assets/farm-editorial.jpg";
import { ArrowRight, LoaderCircle, Sprout } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Injira — MenyaMuhinzi" },
      { name: "description", content: "Injira cyangwa wiyandikishe kuri MenyaMuhinzi." },
      { property: "og:title", content: "Injira — MenyaMuhinzi" },
      { property: "og:description", content: "Injira cyangwa wiyandikishe kuri MenyaMuhinzi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: f.get("name"), phone: f.get("phone") } },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Reba email yawe kugira ngo wemeze konti.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) toast.error("Email cyangwa ijambo ry'ibanga si byo.");
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Ntibyakunze kwinjira na Google.");
  }

  return (
    <div className="auth-layout">
      <div className="auth-photo"><img src={hero} alt="Umuhinzikazi mu murima w’imboga" width={1920} height={1024} /><div className="auth-photo-caption"><Sprout className="mb-4 size-7" aria-hidden /><h2 className="text-3xl">Iga. Hinga. Usarure neza.</h2><p className="mt-3 text-sm opacity-90">Ubumenyi bushya, iminota 10 ku munsi.</p></div></div>
      <div className="auth-form-area"><div className="auth-form-inner">
      <p className="eyebrow mb-4">MURAKAZA NEZA KURI MENYAMUHINZI</p>
      <h1 className="mb-2 text-4xl font-semibold">{mode === "in" ? "Injira" : "Iyandikishe"}</h1>
      <p className="mb-8 text-muted-foreground">Komeza kwiga aho wari ugeze.</p>
      <form onSubmit={submit} className="space-y-5">
        {mode === "up" && (
          <>
            <div className="space-y-2"><Label htmlFor="name">Amazina</Label><Input id="name" name="name" required className="h-12" /></div>
            <div className="space-y-2"><Label htmlFor="phone">Nimero ya telefoni</Label><Input id="phone" name="phone" type="tel" placeholder="07..." className="h-12" /></div>
          </>
        )}
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="h-12" /></div>
        <div className="space-y-2"><Label htmlFor="password">Ijambo ry'ibanga</Label><Input id="password" name="password" type="password" minLength={6} required className="h-12" /></div>
        <Button type="submit" size="xl" className="w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" aria-hidden />}{mode === "in" ? "Injira" : "Fungura konti"}{!busy && <ArrowRight aria-hidden />}</Button>
        <Button type="button" variant="outline" size="xl" className="w-full" onClick={google}>
          <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Injira na Google
        </Button>
      </form>
      <Button variant="link" type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 w-full text-center font-bold text-primary underline-offset-4 hover:underline">
        {mode === "in" ? "Nta konti ufite? Iyandikishe" : "Usanzwe ufite konti? Injira"}
      </Button>
      </div></div>
    </div>
  );
}
