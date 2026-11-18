import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackLink({ to = "/", label = "Subira ahabanza" }: { to?: "/" | "/dashboard" | "/studio" | "/courses" | "/auth"; label?: string }) {
  return <Button asChild variant="link" className="mt-5 px-0"><Link to={to}><ArrowLeft aria-hidden />{label}</Link></Button>;
}