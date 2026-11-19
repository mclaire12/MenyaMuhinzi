import { createFileRoute, Link } from "@tanstack/react-router";
import { FarmerType, FollowUpPill, LearnerStatusPill } from "@/components/facilitator/progress-ui";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, CropTag, Empty, formatDate, formatDateTime, Panel, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { farmerHistory } from "@/lib/mock/services/farmers";
import { canViewLearner, farmerProgress } from "@/lib/mock/services/group-progress";
import { canManageGroup } from "@/lib/mock/services/groups";

export const Route = createFileRoute("/_authenticated/facilitator/progress/$farmerId")({ component: FarmerProgressPage });

function FarmerProgressPage() {
  const { farmerId } = Route.useParams();
  const { facilitator, state } = useFacilitator();
  const farmer = state.farmers.find((item) => item.id === farmerId);
  if (!farmer || !canViewLearner(state, facilitator.id, farmer.id)) return <PageHead title="Farmer not available" text="This farmer is not in one of your groups."><Button asChild variant="outline"><Link to="/facilitator/progress">Back to progress</Link></Button></PageHead>;
  const row = farmerProgress(state, farmer);
  const history = farmerHistory(state, farmer.id);
  const groups = row.groups.filter((group) => canManageGroup(group, facilitator.id));
  return <>
    <Link to="/facilitator/progress" className="text-sm font-bold text-primary">Back to Group Learning Progress</Link>
    <PageHead title={farmer.name} text={`${farmer.phone} · ${farmer.village}, ${farmer.cell}, ${farmer.sector}, ${farmer.district}`}>
      <FarmerType channel={farmer.channel} />
      <LearnerStatusPill status={row.status} />
      <FollowUpPill value={row.followUp} />
    </PageHead>
    {farmer.channel === "basic_phone" && <p className="admin-banner">Basic-phone farmer: learns by USSD and voice calls, with no web portal access. Lessons below include their USSD and IVR activity.</p>}
    <div className="admin-stats">
      <Stat label="Enrolled courses" value={row.enrolled} />
      <Stat label="Lessons completed" value={row.completedLessons} />
      <Stat label="Overall progress" value={`${row.progressPct}%`} />
      <Stat label="Assessment average" value={row.averageScore === null ? "—" : `${row.averageScore}%`} />
    </div>
    <div className="fac-grid">
      <Panel title="Courses">
        {row.courses.length === 0 ? <Empty text="Not enrolled in a course yet." /> : <ul className="fac-list">{row.courses.map(({ course, enrollment, progress }) => <li key={course!.id}><span><b>{course!.title}</b><small className="block text-muted-foreground">Since {formatDate(enrollment.enrolled_at)} · {progress.done}/{progress.total} lessons</small></span><span className="flex w-36 items-center gap-2"><Bar value={progress.pct} /><small>{progress.pct}%</small></span></li>)}</ul>}
      </Panel>
      <Panel title="Groups and interests">
        <p className="mb-2 flex flex-wrap gap-2">{farmer.cropInterest.map((crop) => <CropTag key={crop} crop={crop} />)}</p>
        {groups.length === 0 ? <Empty text="Not in one of your groups." /> : <ul className="fac-list">{groups.map((group) => <li key={group.id}><Link to="/facilitator/groups/$groupId" params={{ groupId: group.id }} className="font-bold">{group.name}</Link><small>{group.sector}</small></li>)}</ul>}
        <p className="mt-2 text-xs text-muted-foreground">Joined {formatDate(farmer.joinedAt)} · last activity {formatDateTime(row.lastActivity)}</p>
      </Panel>
      <Panel title="Assessment results">
        {row.attempts.length === 0 ? <Empty text="No assessments taken yet." /> : <ul className="fac-list">{row.attempts.map((item) => <li key={item.id}><span><b>{state.courses.find((course) => course.id === item.courseId)?.title}</b><small className="block text-muted-foreground">{item.missedTopics.length ? `Missed: ${item.missedTopics.join(", ")}` : "No missed topics"}</small></span><span>{item.score}% · {formatDate(item.at)}</span></li>)}</ul>}
      </Panel>
      <Panel title="Learning history">
        {history.length === 0 ? <Empty text="No learning activity yet." /> : <ul className="fac-list">{history.slice(0, 15).map((item, index) => <li key={index}><span>{item.text}<small className="block text-muted-foreground">{item.detail}</small></span><small>{formatDateTime(item.at)}</small></li>)}</ul>}
      </Panel>
    </div>
  </>;
}
