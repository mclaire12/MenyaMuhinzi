import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";

export const Route = createFileRoute("/_authenticated/admin/channels")({ component: Channels });

function Channels() {
  const data = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"ussd" | "ivr">("ussd");
  function rename(id: string, title: string) {
    updateAdmin(actor, "ussd-menu", id, title, (state) => ({ ...state, menus: state.menus.map((item) => item.id === id ? { ...item, title } : item) }));
    toast.success("Reference copy saved.");
  }
  return <>
    <PageHead title="USSD and IVR" text="No telecom provider is connected. Sessions you run here are marked simulated." />
    <div className="admin-actions mb-4"><Button variant={tab === "ussd" ? "default" : "outline"} onClick={() => setTab("ussd")}>USSD menus</Button><Button variant={tab === "ivr" ? "default" : "outline"} onClick={() => setTab("ivr")}>IVR</Button><Button asChild><Link to="/phone">Open phone simulator (*675#)</Link></Button></div>
    <p className="mb-4 text-sm text-muted-foreground">The live USSD menu is built from published courses and the farmer's shared progress. The screens below are reference copy only.</p>
    {tab === "ussd" && <div className="grid gap-3 md:grid-cols-2">{data.menus.map((menu) => <article key={menu.id} className="admin-panel"><label className="text-sm">Screen {menu.id}<input aria-label={`Title ${menu.id}`} defaultValue={menu.title} onBlur={(event) => rename(menu.id, event.target.value)} /></label><ul className="mt-2 text-sm">{menu.options.map((option) => <li key={option.key}>{option.key}. {option.label}</li>)}{menu.options.length === 0 && <li>End of flow</li>}</ul></article>)}</div>}
    {tab === "ivr" && <article className="admin-panel space-y-2 text-sm"><p>1 pauses or resumes. 2 and 3 move to the previous or next lesson. # ends the call.</p><p>Key 8 pauses the lesson so the farmer can ask a question about it.</p><p>Key 9 starts an optional assessment.</p><p>Key 0 depends on the step: replay the lesson, continue to the next lesson, repeat the answer, or repeat the question.</p><p>A lesson counts as completed after 90% of its audio. No approved audio files are uploaded, so the simulator uses a labelled mock voice from the approved narration.</p><Button asChild><Link to="/phone">Test a call in the phone simulator</Link></Button></article>}    <h2 className="mb-2 mt-6 font-bold">Recent sessions</h2>
    <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>When</th><th>Kind</th><th>Who</th><th>Result</th><th>Detail</th></tr></thead><tbody>{data.sessions.map((session) => <tr key={session.id}><td>{session.at.slice(0, 10)}</td><td>{session.kind}{session.simulated ? " · simulated" : ""}</td><td>{session.who}</td><td>{session.result}</td><td>{session.detail}</td></tr>)}</tbody></table></div>
  </>;
}
