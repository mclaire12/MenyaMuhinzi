import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { managedCourses } from "@/lib/mock/services/courses";
import { facilitatorOverview } from "@/lib/mock/services/group-progress";

export const Route = createFileRoute("/_authenticated/facilitator/")({ component: Dashboard });

const colors = ["#055225", "#66a721", "#e99a3d", "#e56a4d"];

function within(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

function Dashboard() {
  const { facilitator, state } = useFacilitator();
  const [days, setDays] = useState(30);
  const view = useMemo(() => {
    const overview = facilitatorOverview(state, facilitator.id);
    const ids = new Set(overview.rows.map((row) => row.farmer.id));
    const completions = state.progress.filter((item) => item.status === "completed" && item.completedAt && ids.has(item.learnerId) && within(item.completedAt, days));
    const span = Math.min(days, 14);
    const trend = Array.from({ length: span }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (span - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return { day: key.slice(5), count: completions.filter((item) => item.completedAt?.slice(0, 10) === key).length };
    });
    const channels = [
      { name: "Smartphone", value: overview.rows.filter((row) => row.farmer.channel === "smartphone").length },
      { name: "Basic phone", value: overview.rows.filter((row) => row.farmer.channel === "basic_phone").length },
    ];
    const places = [...new Set(overview.rows.map((row) => row.farmer.district))].map((district) => ({ district, farmers: overview.rows.filter((row) => row.farmer.district === district).length }));
    return { overview, completions: completions.length, trend, channels, places, courses: managedCourses(state, facilitator.id).length };
  }, [state, facilitator.id, days]);
  const { overview } = view;
  const stats = [
    ["Groups", overview.groups.length],
    ["Farmers", overview.farmers],
    ["Smartphone", overview.rows.filter((row) => row.farmer.channel === "smartphone").length],
    ["Basic phone", overview.rows.filter((row) => row.farmer.channel === "basic_phone").length],
    ["Materials", overview.materials.length],
    ["Drafts", overview.drafts],
    ["Published materials", overview.published],
    ["Active learners", overview.active],
    ["Not started", overview.notStarted],
    ["Need follow-up", overview.needsFollowUp.length],
    ["Lessons completed", view.completions],
    ["Courses", view.courses],
  ];
  return <>
    <PageHead title="Dashboard" text="Counts below are calculated from your groups, teaching materials and the farmers in those groups." />
    <label className="admin-filters">Range<select aria-label="Date range" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
    <div className="admin-stats">{stats.map(([label, value]) => <article key={label} className="admin-stat"><span>{label}</span><b>{value}</b></article>)}</div>
    <div className="admin-grid-2">
      <article className="admin-panel"><h2 className="mb-3 text-lg">Lesson completions</h2>{view.trend.every((row) => row.count === 0) ? <p>No lesson completions in this range.</p> : <ResponsiveContainer width="100%" height={220}><LineChart data={view.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="#055225" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</article>
      <article className="admin-panel"><h2 className="mb-3 text-lg">Access channel</h2>{view.channels.every((row) => row.value === 0) ? <p>No farmers in your groups yet.</p> : <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={view.channels} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{view.channels.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}</article>
      <article className="admin-panel"><h2 className="mb-3 text-lg">Farmers by district</h2>{view.places.length === 0 ? <p>No farmers in your groups yet.</p> : <ResponsiveContainer width="100%" height={220}><BarChart data={view.places}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="district" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="farmers" fill="#66a721" /></BarChart></ResponsiveContainer>}</article>
    </div>
  </>;
}
