import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalyticsFilters } from "@/components/facilitator/filters";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Empty, Loadable, Panel, Stat } from "@/components/facilitator/ui";
import { useMockResource } from "@/lib/mock/store";
import { courseAnalytics, cropAnalytics, farmerAnalytics, groupAnalytics, noFilter, type AnalyticsFilter } from "@/lib/mock/services/analytics";
import { myGroups } from "@/lib/mock/services/groups";

export const Route = createFileRoute("/_authenticated/facilitator/analytics")({ component: Analytics });

const colors = ["#055225", "#66a721", "#e99a3d", "#e56a4d"];
const short = (text: string, size = 18) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);

function Analytics() {
  const { facilitator, state } = useFacilitator();
  const [filter, setFilter] = useState<AnalyticsFilter>(noFilter);
  const resource = useMockResource((current) => ({
    courses: courseAnalytics(current, facilitator.id, filter),
    farmers: farmerAnalytics(current, facilitator.id, filter),
    groups: groupAnalytics(current, facilitator.id, filter),
    crops: cropAnalytics(current, facilitator.id, filter),
  }));
  return <>
    <PageHead title="Learning analytics" text="Calculated live from your farmers' progress, assessments and AI questions in the shared demo data." />
    <AnalyticsFilters value={filter} onChange={setFilter} courses={state.courses} groups={myGroups(state, facilitator.id)} />
    <Loadable resource={resource}>{(data) => {
      const active = data.farmers.filter((row) => row.active).length;
      const enrolled = data.courses.reduce((sum, row) => sum + row.enrolled, 0);
      const completions = data.courses.reduce((sum, row) => sum + row.lessonCompletions, 0);
      const scores = data.farmers.map((row) => row.averageScore).filter((value): value is number => value !== null);
      return <>
        <div className="admin-stats">
          <Stat label="Course enrollments" value={enrolled} />
          <Stat label="Lesson completions" value={completions} hint={filter.from || filter.to ? "In the chosen dates" : undefined} />
          <Stat label="Active / inactive learners" value={`${active} / ${data.farmers.length - active}`} hint="Active = learned in the last 14 days" />
          <Stat label="Average assessment" value={scores.length ? `${Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)}%` : "—"} />
        </div>
        <div className="fac-grid">
          <Panel title="Course completion and scores">
            {data.courses.length === 0 ? <Empty text="No published courses match." /> : <ResponsiveContainer width="100%" height={240}><BarChart data={data.courses.map((row) => ({ name: short(row.course.title), enrolled: row.enrolled, completion: row.completionRate, score: row.averageScore ?? 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="enrolled" name="Enrolled" fill="#66a721" /><Bar dataKey="completion" name="Completion %" fill="#055225" /><Bar dataKey="score" name="Avg score %" fill="#e99a3d" /></BarChart></ResponsiveContainer>}
          </Panel>
          <Panel title="Most and least completed lessons">
            {data.courses.length === 0 ? <Empty text="No data." /> : <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Course</th><th>Most completed</th><th>Least completed</th></tr></thead><tbody>{data.courses.map((row) => <tr key={row.course.id}><td>{row.course.title}</td><td>{row.mostCompleted ? `${row.mostCompleted.title} (${row.mostCompleted.completions})` : "—"}</td><td>{row.leastCompleted ? `${row.leastCompleted.title} (${row.leastCompleted.completions})` : "—"}</td></tr>)}</tbody></table></div>}
          </Panel>
          <Panel title="Active and inactive learners">
            {data.farmers.length === 0 ? <Empty text="No farmers match." /> : <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={[{ name: "Active", value: active }, { name: "Inactive", value: data.farmers.length - active }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{[0, 1].map((index) => <Cell key={index} fill={colors[index === 0 ? 0 : 3]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>}
          </Panel>
          <Panel title="Individual farmer progress">
            {data.farmers.length === 0 ? <Empty text="No farmers match." /> : <ResponsiveContainer width="100%" height={Math.max(200, data.farmers.length * 28)}><BarChart layout="vertical" data={data.farmers.map((row) => ({ name: short(row.farmer.name, 16), progress: row.progressPct, score: row.averageScore ?? 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip /><Legend /><Bar dataKey="progress" name="Progress %" fill="#055225" /><Bar dataKey="score" name="Assessment %" fill="#e99a3d" /></BarChart></ResponsiveContainer>}
          </Panel>
          <Panel title="Group comparison">
            {data.groups.length === 0 ? <Empty text="No groups match." /> : <ResponsiveContainer width="100%" height={240}><BarChart data={data.groups.map((row) => ({ name: short(row.group.name), participation: row.participation, completion: row.completionRate, progress: row.averageProgress }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar dataKey="participation" name="Participation %" fill="#66a721" /><Bar dataKey="progress" name="Average progress %" fill="#055225" /><Bar dataKey="completion" name="Completion %" fill="#e99a3d" /></BarChart></ResponsiveContainer>}
          </Panel>
          <Panel title="Engagement by crop">
            <ResponsiveContainer width="100%" height={240}><BarChart data={data.crops}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="learners" name="Learners" fill="#66a721" /><Bar dataKey="completions" name="Lesson completions" fill="#055225" /><Bar dataKey="questions" name="AI questions" fill="#e56a4d" /></BarChart></ResponsiveContainer>
          </Panel>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Need a file? <Link to="/facilitator/reports" className="font-bold text-primary">Open reports</Link> to export CSV or print to PDF.</p>
      </>;
    }}</Loadable>
  </>;
}
