import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";

export const Route = createFileRoute("/_authenticated/admin/ai")({ component: AiPage });

function AiPage() {
  const data = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"settings" | "prompts" | "monitor">("monitor");
  const ok = data.aiEvents.filter((event) => event.ok).length;
  const days = [...new Set(data.aiEvents.map((event) => event.at.slice(0, 10)))].sort().map((day) => ({ day: day.slice(5), count: data.aiEvents.filter((event) => event.at.startsWith(day)).length }));
  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const timeoutSec = Number(form.get("timeout"));
    const retries = Number(form.get("retries"));
    const dailyLimit = Number(form.get("limit"));
    if (timeoutSec < 5 || retries < 0 || dailyLimit < 1) { toast.error("Check the numbers."); return; }
    updateAdmin(actor, "ai-settings", "ai", "updated", (state) => ({ ...state, ai: { ...state.ai, model: String(form.get("model")), timeoutSec, retries, dailyLimit, fallback: String(form.get("fallback")), active: form.get("active") === "on" } }));
    toast.success("AI settings saved in this browser. No API key is stored.");
  }
  return <>
    <PageHead title="AI engine" text="Answers stay drafts until a facilitator approves them. This screen does not call a model." />
    <div className="admin-actions mb-4"><Button variant={tab === "monitor" ? "default" : "outline"} onClick={() => setTab("monitor")}>Monitoring</Button><Button variant={tab === "prompts" ? "default" : "outline"} onClick={() => setTab("prompts")}>Prompts</Button><Button variant={tab === "settings" ? "default" : "outline"} onClick={() => setTab("settings")}>Settings</Button></div>
    {tab === "monitor" && <>
      <div className="admin-stats"><article className="admin-stat"><span>Requests</span><b>{data.aiEvents.length}</b></article><article className="admin-stat"><span>Successful</span><b>{ok}</b></article><article className="admin-stat"><span>Failed</span><b>{data.aiEvents.length - ok}</b></article><article className="admin-stat"><span>Flagged</span><b>{data.aiEvents.filter((event) => event.flagged).length}</b></article></div>
      <article className="admin-panel mb-3"><ResponsiveContainer width="100%" height={200}><BarChart data={days}><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#055225" /></BarChart></ResponsiveContainer></article>
      <ul className="space-y-2">{data.aiEvents.slice(0, 8).map((event) => <li key={event.id} className="admin-panel flex items-center justify-between gap-3 text-sm"><span>{event.question}<br /><span className="text-muted-foreground">{event.ok ? "ok" : "failed"} · {event.latencyMs} ms · {event.confidence}</span></span>{event.flagged && <b>Needs review</b>}</li>)}</ul>
    </>}
    {tab === "prompts" && <ul className="space-y-3">{data.prompts.map((prompt) => <li key={prompt.id} className="admin-panel"><div className="flex items-center justify-between gap-3"><b>{prompt.name}</b><span>v{prompt.version} {prompt.active ? "· active" : ""}</span></div><p className="my-2 text-sm text-muted-foreground">{prompt.body}</p>{!prompt.active && <Button size="sm" onClick={() => updateAdmin(actor, "activate-prompt", prompt.id, prompt.name, (state) => ({ ...state, prompts: state.prompts.map((item) => ({ ...item, active: item.id === prompt.id })) }))}>Activate</Button>}</li>)}</ul>}
    {tab === "settings" && <form className="admin-form admin-panel max-w-lg" onSubmit={saveSettings}><label>Model<input name="model" defaultValue={data.ai.model} aria-label="Model" /></label><label>Timeout seconds<input name="timeout" type="number" min={5} defaultValue={data.ai.timeoutSec} aria-label="Timeout" /></label><label>Retries<input name="retries" type="number" min={0} defaultValue={data.ai.retries} aria-label="Retries" /></label><label>Daily limit<input name="limit" type="number" min={1} defaultValue={data.ai.dailyLimit} aria-label="Daily limit" /></label><label>Fallback<input name="fallback" defaultValue={data.ai.fallback} aria-label="Fallback" /></label><label className="flex items-center gap-2"><input name="active" type="checkbox" defaultChecked={data.ai.active} /> Active</label><Button type="submit">Save settings</Button></form>}
  </>;
}
