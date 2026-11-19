import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FarmerType, FollowUpPill, LearnerStatusPill } from "@/components/facilitator/progress-ui";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, Empty, formatDateTime, Loadable, Panel, Stat } from "@/components/facilitator/ui";
import { useMockResource } from "@/lib/mock/store";
import { facilitatorOverview, farmerProgress, followUpLabels, groupProgress, managedLearners, type FollowUp } from "@/lib/mock/services/group-progress";
import { managedGroup } from "@/lib/mock/services/groups";
import type { AccessChannel } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/progress/")({
  validateSearch: (search: Record<string, unknown>): { group?: string } => (typeof search["group"] === "string" ? { group: search["group"] } : {}),
  component: ProgressPage,
});

const followOrder: FollowUp[] = ["not_started", "not_recent", "needs_support", "doing_well", "completed", "on_track"];

function ProgressPage() {
  const { facilitator } = useFacilitator();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<AccessChannel | "all">("all");
  const [follow, setFollow] = useState<FollowUp | "all">("all");
  const groupId = search.group ?? "all";
  const resource = useMockResource((state) => {
    const group = groupId === "all" ? null : managedGroup(state, facilitator.id, groupId);
    return {
      overview: facilitatorOverview(state, facilitator.id),
      group: group ? groupProgress(state, group) : null,
      rows: managedLearners(state, facilitator.id, group ? group.id : "all").map((farmer) => farmerProgress(state, farmer)),
      unknownGroup: groupId !== "all" && !group,
    };
  });
  return <>
    <PageHead title="Group Learning Progress" text="Follow up on members of the groups you manage. Smartphone lessons and basic-phone USSD and voice lessons count in the same records." />
    <Loadable resource={resource}>{({ overview, group, rows, unknownGroup }) => {
      const text = query.trim().toLowerCase();
      const visible = rows.filter((row) => (channel === "all" || row.farmer.channel === channel) && (follow === "all" || row.followUp === follow) && (!text || `${row.farmer.name} ${row.farmer.phone}`.toLowerCase().includes(text)));
      const counts = followOrder.map((key) => ({ key, count: rows.filter((row) => row.followUp === key).length }));
      return <>
        <div className="admin-stats">
          <Stat label="Groups managed" value={overview.groups.length} />
          <Stat label="Farmers in groups" value={overview.farmers} />
          <Stat label="Active learners" value={overview.active} hint={`Learned in the last ${overview.inactiveDays} days`} />
          <Stat label="Not started" value={overview.notStarted} />
          <Stat label="Completed lessons" value={overview.completedLessons} />
          <Stat label="Published materials" value={overview.published} />
        </div>
        <div className="admin-filters">
          <label className="flex items-center gap-2">Group<select aria-label="Group" value={groupId} onChange={(event) => navigate({ search: event.target.value === "all" ? {} : { group: event.target.value } })}><option value="all">All my groups</option>{overview.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        {unknownGroup && <p className="fac-error mb-3" role="alert">That group is not one you manage. Showing all your groups instead.</p>}
        {group && <div className="fac-grid mb-4">
          <Panel title={group.group.name} action={<Link className="text-sm font-bold text-primary" to="/facilitator/groups/$groupId" params={{ groupId: group.group.id }}>Open group</Link>}>
            <dl className="group-facts">
              <div><dt>Members</dt><dd>{group.members}</dd></div>
              <div><dt>Enrolled</dt><dd>{group.enrolled}</dd></div>
              <div><dt>Active</dt><dd>{group.active}</dd></div>
              <div><dt>Not started</dt><dd>{group.notStarted}</dd></div>
              <div><dt>Lesson completion</dt><dd>{group.lessonCompletion}%</dd></div>
              <div><dt>Course completion</dt><dd>{group.courseCompletion}%</dd></div>
            </dl>
          </Panel>
          <Panel title="Course participation">
            {group.courses.length === 0 ? <Empty text="No member has enrolled in a course yet." /> : <ul className="fac-list">{group.courses.map((row) => <li key={row.course.id}><span><b>{row.course.title}</b><small className="block text-muted-foreground">{row.enrolled} of {group.members} enrolled · {row.completed} completed</small></span><span className="flex w-36 items-center gap-2"><Bar value={row.averagePct} /><small>{row.averagePct}%</small></span></li>)}</ul>}
          </Panel>
        </div>}
        <h2 className="mb-2 text-lg">Follow-up</h2>
        <div className="admin-filters" role="group" aria-label="Follow-up indicators">
          <button type="button" className="follow-pill" data-follow={follow === "all" ? "doing_well" : undefined} aria-pressed={follow === "all"} onClick={() => setFollow("all")}>Everyone · {rows.length}</button>
          {counts.map(({ key, count }) => <button key={key} type="button" className="follow-pill" data-follow={key} aria-pressed={follow === key} style={follow === key ? { outline: "2px solid currentColor" } : undefined} onClick={() => setFollow(follow === key ? "all" : key)}>{followUpLabels[key]} · {count}</button>)}
        </div>
        <div className="admin-filters">
          <input aria-label="Search farmers" placeholder="Search name or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select aria-label="Farmer type" value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}><option value="all">Smartphone and basic phone</option><option value="smartphone">Smartphone</option><option value="basic_phone">Basic phone</option></select>
        </div>
        {rows.length === 0 ? <Empty text="Your groups have no members yet. Add farmers in My Groups." /> : visible.length === 0 ? <Empty text="No farmers match these filters." /> : <div className="staff-table"><table className="w-full text-sm">
          <thead><tr><th>Farmer</th><th>Phone number</th><th>Farmer type</th><th>Enrolled courses</th><th>Completed lessons</th><th>Progress</th><th>Last activity</th><th>Status</th><th>Follow-up</th></tr></thead>
          <tbody>{visible.map((row) => <tr key={row.farmer.id}>
            <td><Link className="font-bold" to="/facilitator/progress/$farmerId" params={{ farmerId: row.farmer.id }}>{row.farmer.name}</Link></td>
            <td>{row.farmer.phone}</td>
            <td><FarmerType channel={row.farmer.channel} /></td>
            <td>{row.enrolled}</td>
            <td>{row.completedLessons}</td>
            <td><span className="flex w-32 items-center gap-2"><Bar value={row.progressPct} /><small>{row.progressPct}%</small></span></td>
            <td>{formatDateTime(row.lastActivity)}</td>
            <td><LearnerStatusPill status={row.status} /></td>
            <td><FollowUpPill value={row.followUp} /></td>
          </tr>)}</tbody>
        </table></div>}
      </>;
    }}</Loadable>
  </>;
}
