import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, CropTag, Empty, formatDate, formatDateTime, Panel, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { farmerHistory, farmerSummary } from "@/lib/mock/services/farmers";

export const Route = createFileRoute("/_authenticated/facilitator/farmers/$farmerId")({ component: FarmerPage });

function FarmerPage() {
  const { farmerId } = Route.useParams();
  const { facilitator, state } = useFacilitator();
  const farmer = state.farmers.find((item) => item.id === farmerId && item.facilitatorId === facilitator.id);
  if (!farmer) return <PageHead title="Farmer not found" text="This farmer is not assigned to you."><Button asChild variant="outline"><Link to="/facilitator/farmers">Back to farmers</Link></Button></PageHead>;
  const summary = farmerSummary(state, farmer.id);
  const history = farmerHistory(state, farmer.id);
  return <>
    <Link to="/facilitator/farmers" className="text-sm font-bold text-primary">Back to farmers</Link>
    <PageHead title={farmer.name} text={`${farmer.phone} · ${farmer.village}, ${farmer.cell}, ${farmer.sector}, ${farmer.district} · ${farmer.province}`}>
      <span className="status-pill" data-status={summary.active ? "published" : "archived"}>{summary.active ? "Active" : "Inactive"}</span>
      <Button asChild size="sm"><Link to="/facilitator/assignments" search={{ farmer: farmer.id }}>Assign a course</Link></Button>
    </PageHead>
    <div className="admin-stats">
      <Stat label="Access channel" value={farmer.channel === "smartphone" ? "Smartphone" : "Basic phone"} />
      <Stat label="Lessons completed" value={summary.completedLessons} />
      <Stat label="Overall progress" value={`${summary.progressPct}%`} />
      <Stat label="Assessment average" value={summary.averageScore === null ? "—" : `${summary.averageScore}%`} />
    </div>
    <div className="fac-grid">
      <Panel title="Enrolled and assigned courses">
        {summary.courses.length === 0 ? <Empty text="No courses yet." /> : <ul className="fac-list">{summary.courses.map(({ course, enrollment, progress }) => <li key={course!.id}><span><b>{course!.title}</b><small className="block text-muted-foreground">{enrollment.source === "assignment" ? `Assigned${enrollment.assigned_by ? ` by ${enrollment.assigned_by}` : ""}` : "Self-enrolled"} · {formatDate(enrollment.enrolled_at)}{enrollment.due_at ? ` · due ${formatDate(enrollment.due_at)}` : ""} · {progress.done}/{progress.total} lessons</small></span><span className="flex w-36 items-center gap-2"><Bar value={progress.pct} /><small>{progress.pct}%</small></span></li>)}</ul>}
      </Panel>
      <Panel title="Groups and interests">
        <p className="mb-2 flex flex-wrap gap-2">{farmer.cropInterest.map((crop) => <CropTag key={crop} crop={crop} />)}</p>
        {summary.groups.length === 0 ? <Empty text="Not in a group." /> : <ul className="fac-list">{summary.groups.map((group) => <li key={group.id}><Link to="/facilitator/groups/$groupId" params={{ groupId: group.id }} className="font-bold">{group.name}</Link><small>{group.programme}</small></li>)}</ul>}
        <p className="mt-2 text-xs text-muted-foreground">Joined {formatDate(farmer.joinedAt)} · last activity {formatDateTime(summary.lastActivity)}</p>
      </Panel>
      <Panel title="Assessment results">
        {summary.attempts.length === 0 ? <Empty text="No assessments taken yet." /> : <ul className="fac-list">{summary.attempts.map((item) => <li key={item.id}><span><b>{state.courses.find((course) => course.id === item.courseId)?.title}</b><small className="block text-muted-foreground">{item.missedTopics.length ? `Missed: ${item.missedTopics.join(", ")}` : "No missed topics"}</small></span><span>{item.score}% · {formatDate(item.at)}</span></li>)}</ul>}
      </Panel>
      <Panel title="Learning history">
        {history.length === 0 ? <Empty text="No learning activity yet." /> : <ul className="fac-list">{history.slice(0, 15).map((item, index) => <li key={index}><span>{item.text}<small className="block text-muted-foreground">{item.detail}</small></span><small>{formatDateTime(item.at)}</small></li>)}</ul>}
      </Panel>
    </div>
  </>;
}
