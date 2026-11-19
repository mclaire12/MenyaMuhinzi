import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDateTime, PageHead, Pill, Tabs, useAdminActor } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { featureFallback } from "@/lib/admin/chatbot-routing";
import { roleLabels, accountStatusLabels } from "@/lib/admin/people";
import { saveChannels, systemAlerts } from "@/lib/admin/platform";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import type { ChannelConfig } from "@/lib/admin/types";
import { USSD_CODE } from "@/lib/basic-phone/ussd";
import { useLearningState } from "@/lib/mock/store";

type Tab = "status" | "channels" | "simulator" | "activity";
const tabs: Tab[] = ["status", "channels", "simulator", "activity"];

export const Route = createFileRoute("/_authenticated/admin/operations")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => (tabs.includes(search["tab"] as Tab) ? { tab: search["tab"] as Tab } : {}),
  component: Operations,
});

const integrationTone = { connected: "ok", simulated: "info", not_connected: "muted" } as const;
const integrationLabel = { connected: "Connected", simulated: "Simulated", not_connected: "Not connected" } as const;

function Operations() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/operations" });
  const tab = search.tab ?? "status";
  return <>
    <PageHead title="System Operations" text="Platform health, the simulated USSD and IVR channels, the phone simulator for testing, and recent administrator activity." />
    <Tabs value={tab} onChange={(value) => navigate({ search: { tab: value } })} options={[{ value: "status", label: "Platform status" }, { value: "channels", label: "USSD & IVR" }, { value: "simulator", label: "Phone simulator" }, { value: "activity", label: "Admin activity" }]} />
    {tab === "status" && <Status />}
    {tab === "channels" && <Channels />}
    {tab === "simulator" && <Simulator />}
    {tab === "activity" && <Activity />}
  </>;
}

function Status() {
  const data = useAdmin();
  const learning = useLearningState();
  const { name } = useAdminActor();
  const alerts = systemAlerts(data, learning);
  const assistant = featureFallback("farmer_assistant");
  const services = [
    { name: "Web app", status: "Operational", tone: "ok" as const, note: "Demo build. Data is saved in this browser." },
    { name: "Farmer assistant (Baza, IVR key 8)", status: assistant ? "Unavailable" : "Simulated", tone: assistant ? "bad" as const : "info" as const, note: assistant ? "No active chatbot with an active model. Farmers see the fallback message." : "Answers come from approved lessons; no AI provider is called." },
    { name: "USSD", status: data.channels.ussdStatus === "simulated" ? "Simulated" : "Switched off", tone: data.channels.ussdStatus === "simulated" ? "info" as const : "warn" as const, note: "No telecom operator is connected." },
    { name: "IVR lesson calls", status: data.channels.ivrStatus === "simulated" ? "Simulated" : "Switched off", tone: data.channels.ivrStatus === "simulated" ? "info" as const : "warn" as const, note: "Calls play recorded or browser voice in the simulator only." },
    { name: "SMS", status: "Not connected", tone: "muted" as const, note: "No SMS is sent by this demo." },
  ];
  function check(id: string) {
    updateAdmin(name, "integration-check", id, "checked", (state) => ({ ...state, integrations: state.integrations.map((item) => (item.id === id ? { ...item, note: `${item.status === "connected" ? item.note.replace(/ Last check.*$/, "") : "Still not connected."} Last check ${new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` } : item)) }));
    toast.success("Check recorded. A missing provider stays not connected.");
  }
  function acknowledge(id: string, title: string) {
    updateAdmin(name, "ack-alert", id, title, (state) => ({ ...state, notices: state.notices.map((item) => (item.id === id ? { ...item, read: true, acked: true } : item)) }));
    toast.success("Notice acknowledged.");
  }
  const notices = data.notices.filter((notice) => !notice.acked);
  return <>
    <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Service</th><th>Status</th><th>Note</th></tr></thead>
      <tbody>{services.map((service) => <tr key={service.name}><td><b>{service.name}</b></td><td><Pill tone={service.tone}>{service.status}</Pill></td><td>{service.note}</td></tr>)}</tbody>
    </table></div>
    <section className="mt-6"><h2 className="mb-2 text-xl">Warnings</h2>{!alerts.length && !notices.length ? <p className="fac-empty">No warnings.</p> : <ul className="admin-panel fac-list">
      {alerts.map((alert) => <li key={alert.id}><span><Pill tone={alert.severity === "critical" ? "bad" : alert.severity === "warning" ? "warn" : "muted"}>{alert.severity}</Pill> {alert.text}</span><Button asChild size="sm" variant="outline"><Link to={alert.to} search={alert.search as never}>Open</Link></Button></li>)}
      {notices.map((notice) => <li key={notice.id}><span><Pill tone={notice.severity === "critical" ? "bad" : notice.severity === "warning" ? "warn" : "muted"}>{notice.severity}</Pill> {notice.title}<small className="block text-muted-foreground">{formatDateTime(notice.at)}</small></span><Button size="sm" variant="outline" onClick={() => acknowledge(notice.id, notice.title)}>Acknowledge</Button></li>)}
    </ul>}</section>
    <section className="mt-6"><h2 className="mb-2 text-xl">Integrations</h2><div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Integration</th><th>Status</th><th>Note</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{data.integrations.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td><Pill tone={integrationTone[item.status]}>{integrationLabel[item.status]}</Pill></td><td>{item.note}</td><td className="col-actions"><Button size="sm" variant="outline" onClick={() => check(item.id)}>Record a check</Button></td></tr>)}</tbody>
    </table></div></section>
  </>;
}

function Channels() {
  const data = useAdmin();
  const { name } = useAdminActor();
  const [values, setValues] = useState<ChannelConfig>(data.channels);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(data.channels);
  const set = <K extends keyof ChannelConfig>(key: K, value: ChannelConfig[K]) => { setValues((current) => ({ ...current, [key]: value })); setError(""); };
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(values.completionPercent) || values.completionPercent < 50 || values.completionPercent > 100) { setError("Completion must be between 50% and 100%."); return; }
    if (!Number.isInteger(values.sessionTimeoutSec) || values.sessionTimeoutSec < 30 || values.sessionTimeoutSec > 600) { setError("The session timeout must be between 30 and 600 seconds."); return; }
    saveChannels(name, values);
    toast.success("Channel settings saved. The phone simulator uses them straight away.");
  }
  return <>
    <div className="admin-grid-2">
      <form className="admin-panel admin-form" noValidate onSubmit={save}>
        <h2 className="font-bold">Configuration</h2>
        <div><p className="text-sm font-bold">USSD short code</p><p className="text-xl">{USSD_CODE}</p><p className="fac-note">Illustrative test code used in the simulator. It is not approved or assigned by any telecom operator and does not work on real phones.</p></div>
        <div className="fac-row">
          <label>USSD service<select value={values.ussdStatus} onChange={(event) => set("ussdStatus", event.target.value as ChannelConfig["ussdStatus"])}><option value="simulated">On (simulated)</option><option value="disabled">Switched off</option></select></label>
          <label>IVR lesson calls<select value={values.ivrStatus} onChange={(event) => set("ivrStatus", event.target.value as ChannelConfig["ivrStatus"])}><option value="simulated">On (simulated)</option><option value="disabled">Switched off</option></select></label>
        </div>
        <fieldset className="fac-formats"><legend>USSD languages</legend><label><input type="checkbox" checked disabled />Kinyarwanda (always on)</label><label><input type="checkbox" checked={values.ussdLanguages.includes("en")} onChange={(event) => set("ussdLanguages", event.target.checked ? ["rw", "en"] : ["rw"])} />English</label></fieldset>
        <div className="fac-row">
          <label>Lesson counts as completed after (% of audio)<input type="number" min={50} max={100} value={values.completionPercent} onChange={(event) => set("completionPercent", event.target.valueAsNumber)} /></label>
          <label>USSD session timeout (seconds)<input type="number" min={30} max={600} value={values.sessionTimeoutSec} onChange={(event) => set("sessionTimeoutSec", event.target.valueAsNumber)} /></label>
        </div>
        {error && <p className="fac-field-error" role="alert">{error}</p>}
        <div className="admin-actions"><Button type="submit" disabled={!dirty}>Save settings</Button><Button type="button" variant="outline" disabled={!dirty} onClick={() => setValues(data.channels)}>Discard</Button></div>
      </form>
      <article className="admin-panel space-y-3 text-sm"><h2 className="font-bold">How the flow works</h2>
        <p>The USSD menu is built from published courses the caller can see, and from the farmer's shared progress record. Callers choose a language, then Farming courses, My courses, My progress, Change language or Help.</p>
        <p>Choosing a lesson requests an IVR call. In the call: 1 pauses or resumes, 2 and 3 move to the previous or next lesson, 8 asks a question about the lesson, 9 starts the assessment, 0 replays, # ends the call.</p>
        <p>Only active basic-phone accounts can use the service. Pending, suspended, inactive and rejected accounts are refused.</p>
        <ul className="list-disc pl-5">{data.menus.map((menu) => <li key={menu.id}><b>{menu.title}</b>{menu.options.length ? `: ${menu.options.map((option) => `${option.key}. ${option.label}`).join(" · ")}` : ""}</li>)}</ul>
      </article>
    </div>
    <section className="mt-6"><h2 className="mb-2 text-xl">Recent sessions</h2>{!data.sessions.length ? <p className="fac-empty">No sessions yet.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>When</th><th>Channel</th><th>Caller</th><th>Result</th><th>Detail</th></tr></thead>
      <tbody>{[...data.sessions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20).map((session) => <tr key={session.id}><td>{formatDateTime(session.at)}</td><td>{session.kind.toUpperCase()}{session.simulated ? " · simulated" : ""}</td><td>{session.who}</td><td><Pill tone={session.result === "completed" ? "ok" : session.result === "timeout" ? "warn" : "bad"}>{session.result}</Pill></td><td>{session.detail}</td></tr>)}</tbody>
    </table></div>}</section>
  </>;
}

function Simulator() {
  const data = useAdmin();
  const farmers = data.users.filter((user) => user.role === "BASIC_PHONE_FARMER");
  return <>
    <article className="admin-panel mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">The phone simulator is a testing tool for administrators. Dial {USSD_CODE} as any basic-phone farmer to check menus, lesson calls, questions and assessments. Nothing reaches a real phone.</p><Button asChild><Link to="/phone"><Smartphone aria-hidden />Open phone simulator</Link></Button></article>
    {!farmers.length ? <p className="fac-empty">No basic-phone farmers registered.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Farmer</th><th>Phone</th><th>Account</th><th className="col-actions">Test</th></tr></thead>
      <tbody>{farmers.map((user) => <tr key={user.id}><td><Link className="font-bold" to="/admin/users/$userId" params={{ userId: user.id }}>{user.name}</Link><small className="block text-muted-foreground">{roleLabels[user.role]}</small></td><td>{user.phone}</td><td><Pill tone={user.status === "active" ? "ok" : user.status === "pending" ? "warn" : "bad"}>{accountStatusLabels[user.status]}</Pill></td><td className="col-actions"><Button asChild size="sm" variant="outline"><Link to="/phone" search={{ phone: user.phone }}>Dial as this farmer</Link></Button></td></tr>)}</tbody>
    </table></div>}
  </>;
}

function Activity() {
  const data = useAdmin();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const rows = data.audit.filter((event) => !query.trim() || `${event.actor} ${event.action} ${event.resource} ${event.detail}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="admin-filters"><input aria-label="Search activity" placeholder="Search actor, action or detail" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <p className="mb-2 text-sm text-muted-foreground">Every administrator change is recorded here. Entries cannot be edited or deleted.</p>
    {!rows.length ? <p className="fac-empty">No activity matches.</p> : <><div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
      <tbody>{rows.slice(0, limit).map((event) => <tr key={event.id}><td>{formatDateTime(event.at)}</td><td>{event.actor}</td><td>{event.action.replace(/-/g, " ")}</td><td>{event.detail}</td></tr>)}</tbody>
    </table></div>{rows.length > limit && <Button className="mt-3" variant="outline" onClick={() => setLimit(limit + 30)}>Show more</Button>}</>}
  </>;
}
