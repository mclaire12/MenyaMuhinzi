import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { resetAdmin, updateAdmin, useAdmin } from "@/lib/admin/store";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/operations")({ component: Operations });

function Operations() {
  const data = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"alerts" | "integrations" | "audit">("alerts");
  function check(id: string) {
    updateAdmin(actor, "integration-check", id, "checked", (state) => ({ ...state, integrations: state.integrations.map((item) => item.id === id ? { ...item, note: `${item.status === "connected" ? item.note : "Still not connected."} Last check ${new Date().toISOString().slice(0, 16).replace("T", " ")}.` } : item) }));
    toast.success("Check recorded. A missing provider stays not connected.");
  }
  return <>
    <PageHead title="Operations" text="Alerts, connection status, and the audit list. Audit rows cannot be edited or deleted here." />
    <div className="admin-actions mb-4"><Button variant={tab === "alerts" ? "default" : "outline"} onClick={() => setTab("alerts")}>Alerts</Button><Button variant={tab === "integrations" ? "default" : "outline"} onClick={() => setTab("integrations")}>Integrations</Button><Button variant={tab === "audit" ? "default" : "outline"} onClick={() => setTab("audit")}>Audit</Button><Button variant="outline" onClick={() => { resetAdmin(); toast.success("Demo data restored."); }}>Restore demo data</Button></div>
    {tab === "alerts" && <ul className="space-y-2">{data.notices.map((notice) => <li key={notice.id} className="admin-panel flex flex-wrap items-center justify-between gap-3"><span><b>{notice.title}</b><span className="ml-2 text-sm text-muted-foreground">{notice.severity} · {notice.read ? "read" : "unread"} · {notice.acked ? "acknowledged" : "open"}</span></span><span className="admin-actions">{!notice.read && <Button size="sm" variant="outline" onClick={() => updateAdmin(actor, "read-alert", notice.id, notice.title, (state) => ({ ...state, notices: state.notices.map((item) => item.id === notice.id ? { ...item, read: true } : item) }))}>Mark read</Button>}{!notice.acked && <Button size="sm" onClick={() => updateAdmin(actor, "ack-alert", notice.id, notice.title, (state) => ({ ...state, notices: state.notices.map((item) => item.id === notice.id ? { ...item, read: true, acked: true } : item) }))}>Acknowledge</Button>}</span></li>)}</ul>}
    {tab === "integrations" && <ul className="space-y-2">{data.integrations.map((item) => <li key={item.id} className="admin-panel"><div className="flex items-center justify-between gap-3"><b>{item.name}</b><span>{item.status}</span></div><p className="my-2 text-sm text-muted-foreground">{item.note}</p><Button size="sm" variant="outline" onClick={() => check(item.id)}>Record a check</Button></li>)}</ul>}
    {tab === "audit" && <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th><th>Detail</th></tr></thead><tbody>{data.audit.map((event) => <tr key={event.id}><td>{event.at.slice(0, 16).replace("T", " ")}</td><td>{event.actor}</td><td>{event.action}</td><td>{event.resource}</td><td>{event.detail}</td></tr>)}</tbody></table></div>}
  </>;
}
