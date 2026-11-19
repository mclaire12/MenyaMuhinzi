import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Home, MessageCircle, UserRound, Waypoints } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/dashboard", label: "Ahabanza", icon: Home },
  { to: "/courses", label: "Amasomo", icon: BookOpen },
  { to: "/assistant", label: "Baza", icon: MessageCircle },
  { to: "/progress", label: "Aho ngeze", icon: Waypoints },
  { to: "/me", label: "Jyewe", icon: UserRound },
] as const;

export function FarmerDock() {
  const { roles } = useAuth();
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (!roles.includes("farmer") || roles.includes("admin") || roles.includes("facilitator")) return null;
  return <nav className="farmer-dock" aria-label="Aho ujya">
    {links.map((item) => {
      const on = item.to === "/courses" ? path.startsWith("/courses") || path.startsWith("/lessons") || path.startsWith("/quiz") : path === item.to || path.startsWith(`${item.to}/`);
      return <Link key={item.to} to={item.to} className={on ? "is-on" : ""}><item.icon aria-hidden /><span>{item.label}</span></Link>;
    })}
  </nav>;
}
