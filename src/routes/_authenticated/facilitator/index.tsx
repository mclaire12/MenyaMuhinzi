import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Loadable, Stat } from "@/components/facilitator/ui";
import { courseIssues } from "@/lib/mock/quality";
import { useMockResource } from "@/lib/mock/store";
import { dashboardSummary } from "@/lib/mock/services/analytics";
import { managedCourses } from "@/lib/mock/services/courses";
import { myFarmers } from "@/lib/mock/services/farmers";

export const Route = createFileRoute("/_authenticated/facilitator/")({ component: Dashboard });

const colors = ["#055225", "#66a721", "#e99a3d", "#e56a4d"];

function Dashboard() {
  const { facilitator } = useFacilitator();
  const [days, setDays] = useState(30);
  const resource = useMockResource((state) => {
    const courses = managedCourses(state, facilitator.id);
    const farmers = myFarmers(state, facilitator.id);
    const ids = new Set(farmers.map((farmer) => farmer.id));
    return {
      summary: dashboardSummary(state, facilitator.id),
      farmers,
      completions: state.progress.filter((item) => item.status === "completed" && ids.has(item.learnerId)),
      attention: courses.flatMap((course) => {
        if (course.status === "rejected") return [{ id: course.id, text: `${course.title} was sent back for changes` }];
        if (course.status === "approved") return [{ id: course.id, text: `${course.title} is approved and ready to publish` }];
        if (course.status === "pending_review") return [{ id: course.id, text: `${course.title} is waiting for review` }];
        if (course.status === "draft" && courseIssues(course).some((issue) => issue.blocking)) return [{ id: course.id, text: `${course.title} still needs items before review` }];
        return [];
      }),
    };
  });
  const view = useMemo(() => {
    if (resource.status !== "ready") return null;
    const { farmers, completions } = resource.data;
    const within = (iso: string) => Date.now() - new Date(iso).getTime() <= days * 86400000;
    const recent = completions.filter((item) => item.completedAt && within(item.completedAt));
    const span = Math.min(days, 14);
    const trend = Array.from({ length: span }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (span - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return { day: key.slice(5), count: recent.filter((item) => item.completedAt?.slice(0, 10) === key).length };
    });
    const channels = [
      { name: "Smartphone", value: farmers.filter((farmer) => farmer.channel === "smartphone").length },
      { name: "Basic phone", value: farmers.filter((farmer) => farmer.channel === "basic_phone").length },
    ];
    const places = [...new Set(farmers.map((farmer) => farmer.district))].map((district) => ({ district, farmers: farmers.filter((farmer) => farmer.district === district).length }));
    return { trend, channels, places, recent: recent.length };
  }, [resource, days]);
  const summary = resource.status === "ready" ? resource.data.summary : null;
  const stats = summary ? [
    ["Courses managed", summary.total],
    ["Published", summary.published],
    ["Drafts", summary.drafts],
    ["Awaiting review", summary.awaiting],
    ["Assigned farmers", summary.assignedFarmers],
    ["Active groups", summary.activeGroups],
    ["Lesson completions", view?.recent ?? summary.completions],
    ["Average assessment", summary.averageScore === null ? "—" : `${summary.averageScore}%`],
  ] : [];
  return <>
    <PageHead title="Dashboard" text="Counts below are calculated from your courses and farmers." />
    <label className="admin-filters">Range<select aria-label="Date range" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
    <Loadable resource={resource}>{(data) => view && <>
      <div className="admin-stats">{stats.map(([label, value]) => <Stat key={label} label={String(label)} value={value} />)}</div>
      <div className="admin-grid-2">
        <article className="admin-panel"><h2 className="mb-3 text-lg">Lesson completions</h2>{view.trend.every((row) => row.count === 0) ? <p>No lesson completions in this range.</p> : <ResponsiveContainer width="100%" height={220}><LineChart data={view.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="#055225" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}</article>
        <article className="admin-panel"><h2 className="mb-3 text-lg">Access channel</h2><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={view.channels} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{view.channels.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></article>
        <article className="admin-panel"><h2 className="mb-3 text-lg">Farmers by district</h2><ResponsiveContainer width="100%" height={220}><BarChart data={view.places}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="district" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="farmers" fill="#66a721" /></BarChart></ResponsiveContainer></article>
        <article className="admin-panel"><h2 className="mb-3 text-lg">Needs attention</h2>{data.attention.length === 0 ? <p>Nothing needs attention.</p> : <ul className="space-y-2 text-sm">{data.attention.map((item) => <li key={item.id}><Link to="/facilitator/courses/$courseId" params={{ courseId: item.id }}>{item.text}</Link></li>)}</ul>}</article>
      </div>
    </>}</Loadable>
  </>;
}
