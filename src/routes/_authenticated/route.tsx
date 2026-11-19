import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { readDemoUser } from "@/lib/demo-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const demo = readDemoUser();
    if (demo?.role === "basic_phone_farmer" && location.pathname !== "/phone") throw redirect({ to: "/phone" });
    if (demo) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
