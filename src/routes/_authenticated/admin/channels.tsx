import { createFileRoute } from "@tanstack/react-router";
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
  const [tab, setTab] = useState<"ussd" | "ivr" | "simulator">("ussd");
  const [nodeId, setNodeId] = useState("root");
  const [log, setLog] = useState<string[]>(["Simulated session started"]);
  const node = data.menus.find((item) => item.id === nodeId) ?? data.menus[0];
  function rename(id: string, title: string) {
    updateAdmin(actor, "ussd-menu", id, title, (state) => ({ ...state, menus: state.menus.map((item) => item.id === id ? { ...item, title } : item) }));
  }
  function finish(result: "completed" | "failed", detail: string) {
    updateAdmin(actor, "simulated-session", "simulator", detail, (state) => ({ ...state, sessions: [{ id: `sim-${Date.now()}`, at: new Date().toISOString(), kind: tab === "ivr" ? "ivr" : "ussd", who: "simulator", result, simulated: true, detail }, ...state.sessions] }));
    setLog((lines) => [...lines, detail]);
    toast.success("Simulated session saved. It is marked simulated.");
  }
  return <>
    <PageHead title="USSD and IVR" text="No telecom provider is connected. Sessions you run here are marked simulated." />
    <div className="admin-actions mb-4"><Button variant={tab === "ussd" ? "default" : "outline"} onClick={() => setTab("ussd")}>USSD menus</Button><Button variant={tab === "ivr" ? "default" : "outline"} onClick={() => setTab("ivr")}>IVR</Button><Button variant={tab === "simulator" ? "default" : "outline"} onClick={() => { setTab("simulator"); setNodeId("root"); setLog(["Simulated session started"]); }}>Simulator</Button></div>
    {tab === "ussd" && <div className="grid gap-3 md:grid-cols-2">{data.menus.map((menu) => <article key={menu.id} className="admin-panel"><label className="text-sm">Screen {menu.id}<input aria-label={`Title ${menu.id}`} defaultValue={menu.title} onBlur={(event) => rename(menu.id, event.target.value)} /></label><ul className="mt-2 text-sm">{menu.options.map((option) => <li key={option.key}>{option.key}. {option.label}</li>)}{menu.options.length === 0 && <li>End of flow</li>}</ul></article>)}</div>}
    {tab === "ivr" && <article className="admin-panel space-y-2 text-sm"><p>Key 8 pauses the lesson so the farmer can ask a question.</p><p>Key 9 starts an optional assessment.</p><p>Key 0 repeats the current prompt.</p><p>Audio files are not uploaded in this demo. Call records below are the sample calls.</p><Button onClick={() => finish("completed", "IVR simulator · key 8 question")}>Run a simulated call</Button></article>}
    {tab === "simulator" && node && <article className="admin-panel"><h2 className="text-xl">{node.title}</h2><div className="admin-actions mt-3">{node.options.map((option) => <Button key={option.key} variant="outline" onClick={() => { setLog((lines) => [...lines, `${option.key} ${option.label}`]); setNodeId(option.next); }}>{option.key}. {option.label}</Button>)}{node.options.length === 0 && <Button onClick={() => finish("completed", log.join(" → "))}>Save simulated session</Button>}<Button variant="outline" onClick={() => setNodeId("root")}>Restart</Button></div><ol className="mt-4 text-sm">{log.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ol></article>}
    <h2 className="mb-2 mt-6 font-bold">Recent sessions</h2>
    <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>When</th><th>Kind</th><th>Who</th><th>Result</th><th>Detail</th></tr></thead><tbody>{data.sessions.map((session) => <tr key={session.id}><td>{session.at.slice(0, 10)}</td><td>{session.kind}{session.simulated ? " · simulated" : ""}</td><td>{session.who}</td><td>{session.result}</td><td>{session.detail}</td></tr>)}</tbody></table></div>
  </>;
}
