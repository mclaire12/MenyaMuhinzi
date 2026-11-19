import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function HeaderAlerts({ count, children }: { count: number; children: ReactNode }) {
  return <DropdownMenu>
    <DropdownMenuTrigger className="admin-alerts" aria-label={count ? `Alerts, ${count} need attention` : "Alerts, nothing needs attention"}><Bell aria-hidden />Alerts{count ? ` (${count})` : ""}</DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">{count === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">Nothing needs attention.</p> : children}</DropdownMenuContent>
  </DropdownMenu>;
}
