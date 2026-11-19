import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead } from "@/components/admin/shell";
import { useAdmin } from "@/lib/admin/store";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

const colors = ["#055225", "#66a721", "#e99a3d", "#e56a4d"];

function within(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

function Overview() {
  const data = useAdmin();
  const learning = useLearningState();
  const [days, setDays] = useState(30);
  const view = useMemo(() => {
    const users = data.users.filter((user) => within(user.registeredAt, days));
    const sessions = data.sessions.filter((session) => within(session.at, days));
    const ai = data.aiEvents.filter((event) => within(event.at, days));
    const byDay = (items: { at: string }[]) => Array.from({ length: Math.min(days, 14) }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (Math.min(days, 14) - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return { day: key.slice(5), count: items.filter((item) => item.at.slice(0, 10) === key).length };
    });
    return { users, sessions, ai, registrations: byDay(users.map((user) => ({ at: user.registeredAt }))), aiTrend: byDay(ai), ussd: byDay(sessions.filter((session) => session.kind === "ussd")) };
  }, [data, days]);
  const farmers = data.users.filter((user) => user.role.endsWith("FARMER"));
  const stats = [
    ["Users", data.users.length],
    ["Farmers", farmers.length],
    ["Smartphone", farmers.filter((user) => user.channel === "smartphone").length],
    ["Basic phone", farmers.filter((user) => user.channel === "basic_phone").length],
    ["Facilitators", data.users.filter((user) => user.role === "FACILITATOR").length],
    ["Suspended", data.users.filter((user) => user.status !== "active").length],
    ["Courses", learning.courses.length],
    ["Published", learning.courses.filter((course) => course.status === "published").length],
    ["In review", learning.courses.filter((course) => course.status === "pending_review").length],
    ["Enrollments", data.users.reduce((sum, user) => sum + user.enrollments.length, 0)],
    ["AI requests", view.ai.length],
    ["USSD / IVR", view.sessions.length],
  ];
  const channels = [
    { name: "Smartphone", value: farmers.filter((user) => user.channel === "smartphone").length },
    { name: "Basic phone", value: farmers.filter((user) => user.channel === "basic_phone").length },
  ];
  const places = [...new Set(farmers.map((user) => user.district))].map((district) => ({ district, farmers: farmers.filter((user) => user.district === district).length }));
  return <>
    <PageHead title="Overview" text="Counts below are calculated from the demo records, not typed in by hand." />
    <label className="admin-filters">Range<select aria-label="Date range" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
    <div className="admin-stats">{stats.map(([label, value]) => <article key={label} className="admin-stat"><span>{label}</span><b>{value}</b></article>)}</div>
    <div className="admin-grid-2">
      <article className="admin-panel"><h2 className="mb-3 text-lg">Registrations</h2>{view.registrations.every((row) => row.count === 0) ? <p>No registrations in this range.</p> : <ResponsiveContainer width="100%" height={220}><LineChart data={view.registrations}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="#055225" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</article>
      <article className="admin-panel"><h2 className="mb-3 text-lg">Access channel</h2><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={channels} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{channels.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></article>
      <article className="admin-panel"><h2 className="mb-3 text-lg">Farmers by district</h2><ResponsiveContainer width="100%" height={220}><BarChart data={places}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="district" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="farmers" fill="#66a721" /></BarChart></ResponsiveContainer></article>
      <article className="admin-panel"><h2 className="mb-3 text-lg">Needs attention</h2><ul className="space-y-2 text-sm">{data.notices.map((notice) => <li key={notice.id}><Link to="/admin/operations">{notice.title}</Link></li>)}{learning.courses.filter((course) => course.status === "pending_review" || course.status === "approved").map((course) => <li key={course.id}><Link to="/admin/courses/$courseId" params={{ courseId: course.id }}>{course.title} {course.status === "approved" ? "is approved and ready to publish" : "is waiting for review"}</Link></li>)}</ul></article>
    </div>
  </>;
}
