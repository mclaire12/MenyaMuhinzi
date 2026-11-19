import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GroupForm, groupValues } from "@/components/facilitator/group-form";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, ConfirmButton, CropTag, Empty, formatDate, formatDateTime, Panel, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { groupAnalytics } from "@/lib/mock/services/analytics";
import { assignCourse } from "@/lib/mock/services/assignments";
import { myFarmers } from "@/lib/mock/services/farmers";
import { addMembers, removeMember, updateGroup } from "@/lib/mock/services/groups";
import { learnerCourseProgress } from "@/lib/mock/services/learners";

export const Route = createFileRoute("/_authenticated/facilitator/groups/$groupId")({ component: GroupPage });

function GroupPage() {
  const { groupId } = Route.useParams();
  const { facilitator, state } = useFacilitator();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<string[]>([]);
  const [courseId, setCourseId] = useState("");
  const group = state.groups.find((item) => item.id === groupId && item.facilitatorId === facilitator.id);
  if (!group) return <PageHead title="Group not found" text="This group does not exist or is facilitated by someone else."><Button asChild variant="outline"><Link to="/facilitator/groups">Back to groups</Link></Button></PageHead>;
  const current = group;
  const stats = groupAnalytics(state, facilitator.id).find((row) => row.group.id === group.id)!;
  const members = state.farmers.filter((farmer) => group.memberIds.includes(farmer.id));
  const candidates = myFarmers(state, facilitator.id).filter((farmer) => !group.memberIds.includes(farmer.id));
  const assignments = state.assignments.filter((item) => item.target.kind === "group" && item.target.id === group.id);
  const published = state.courses.filter((course) => course.status === "published" && !assignments.some((item) => item.courseId === course.id));

  function assign() {
    if (!courseId) { toast.error("Choose a course."); return; }
    const error = assignCourse(facilitator.id, { courseId, targets: [{ kind: "group", id: current.id }], startAt: new Date().toISOString().slice(0, 10), dueAt: null, note: "" });
    if (error) toast.error(error); else { toast.success("Course assigned to every member of the group."); setCourseId(""); }
  }

  return <>
    <Link to="/facilitator/groups" className="text-sm font-bold text-primary">Back to groups</Link>
    <PageHead title={group.name} text={`${group.village}, ${group.cell}, ${group.sector}, ${group.district} · ${group.province}${group.programme ? ` · ${group.programme}` : ""}`}>
      <CropTag crop={group.crop} />
      {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit group</Button>}
    </PageHead>
    {editing && <section className="admin-panel mb-3"><GroupForm initial={groupValues(group)} submitLabel="Save group" onCancel={() => setEditing(false)} onSubmit={(values) => { updateGroup(current.id, facilitator.id, values); toast.success("Group updated."); setEditing(false); }} /></section>}
    <div className="admin-stats"><Stat label="Members" value={stats.members} /><Stat label="Assigned courses" value={stats.courses} /><Stat label="Participation" value={`${stats.participation}%`} /><Stat label="Course completion" value={`${stats.completionRate}%`} /></div>
    <div className="fac-grid">
      <Panel title="Members">
        {members.length === 0 ? <Empty text="No members yet." /> : <ul className="fac-list">{members.map((farmer) => <li key={farmer.id}><span><Link to="/facilitator/farmers/$farmerId" params={{ farmerId: farmer.id }} className="font-bold">{farmer.name}</Link><small className="block text-muted-foreground">{farmer.phone} · {farmer.channel === "smartphone" ? "Smartphone" : "Basic phone"}</small></span><ConfirmButton label="Remove" title={`Remove ${farmer.name}?`} text="Courses assigned to the group will no longer be assigned to this farmer. Their progress is kept." onConfirm={() => { removeMember(current.id, facilitator.id, farmer.id); toast.success("Member removed."); }} variant="ghost" /></li>)}</ul>}
        {candidates.length > 0 && <div className="admin-form mt-3"><label>Add farmers<select multiple size={Math.min(5, candidates.length)} value={adding} onChange={(event) => setAdding([...event.target.selectedOptions].map((option) => option.value))}>{candidates.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name} · {farmer.sector}</option>)}</select></label><div><Button size="sm" disabled={!adding.length} onClick={() => { addMembers(current.id, facilitator.id, adding); toast.success(`${adding.length} farmer(s) added.`); setAdding([]); }}>Add selected</Button></div></div>}
      </Panel>
      <Panel title="Assigned courses">
        {assignments.length === 0 ? <Empty text="No courses assigned yet." /> : <ul className="fac-list">{assignments.map((item) => { const course = state.courses.find((c) => c.id === item.courseId); const rows = group.memberIds.map((id) => learnerCourseProgress(state, id, item.courseId)); const pct = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0; const done = rows.filter((r) => r.total && r.done === r.total).length; return <li key={item.id}><span><b>{course?.title}</b><small className="block text-muted-foreground">From {formatDate(item.startAt)}{item.dueAt ? ` · due ${formatDate(item.dueAt)}` : ""} · {done}/{rows.length} completed</small></span><span className="flex w-36 items-center gap-2"><Bar value={pct} /><small>{pct}%</small></span></li>; })}</ul>}
        <div className="admin-filters mt-3"><select aria-label="Course to assign" value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choose a published course</option>{published.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><Button size="sm" onClick={assign}>Assign to group</Button></div>
      </Panel>
      <Panel title="Member progress">
        {members.length === 0 || assignments.length === 0 ? <Empty text="Progress appears once members have assigned courses." /> : <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Farmer</th>{assignments.map((item) => <th key={item.id}>{state.courses.find((c) => c.id === item.courseId)?.title}</th>)}</tr></thead><tbody>{members.map((farmer) => <tr key={farmer.id}><td>{farmer.name}</td>{assignments.map((item) => { const row = learnerCourseProgress(state, farmer.id, item.courseId); return <td key={item.id}>{row.done}/{row.total} · {row.pct}%</td>; })}</tr>)}</tbody></table></div>}
      </Panel>
      <Panel title="Recent activity">
        {group.activity.length === 0 ? <Empty text="No activity yet." /> : <ul className="fac-list">{group.activity.slice(0, 8).map((item, index) => <li key={index}><span>{item.text}</span><small>{formatDateTime(item.at)}</small></li>)}</ul>}
      </Panel>
    </div>
  </>;
}
