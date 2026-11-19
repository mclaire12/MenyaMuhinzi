import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { Bar, ConfirmButton, Empty, formatDate, Loadable } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { useMockResource } from "@/lib/mock/store";
import { assignCourse, assignmentProgress, myAssignments, removeAssignment, targetName } from "@/lib/mock/services/assignments";
import { myFarmers } from "@/lib/mock/services/farmers";
import { myGroups } from "@/lib/mock/services/groups";

export const Route = createFileRoute("/_authenticated/facilitator/assignments")({
  validateSearch: (search: Record<string, unknown>): { farmer?: string } => (typeof search["farmer"] === "string" ? { farmer: search["farmer"] } : {}),
  component: Assignments,
});

const today = () => new Date().toISOString().slice(0, 10);

function Assignments() {
  const { facilitator, state } = useFacilitator();
  const search = Route.useSearch();
  const [courseId, setCourseId] = useState("");
  const [kind, setKind] = useState<"farmer" | "group">(search.farmer ? "farmer" : "group");
  const [targets, setTargets] = useState<string[]>(search.farmer ? [search.farmer] : []);
  const [startAt, setStartAt] = useState(today());
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const resource = useMockResource((current) => myAssignments(current, facilitator.id).map((item) => ({ item, course: current.courses.find((course) => course.id === item.courseId), name: targetName(current, item.target), progress: assignmentProgress(current, item.courseId, item.target) })));
  const published = state.courses.filter((course) => course.status === "published");
  const farmers = myFarmers(state, facilitator.id);
  const groups = myGroups(state, facilitator.id);
  const options = kind === "farmer" ? farmers.map((farmer) => ({ id: farmer.id, label: `${farmer.name} · ${farmer.sector}` })) : groups.map((group) => ({ id: group.id, label: `${group.name} · ${group.memberIds.length} members` }));

  function submit() {
    if (!courseId) { toast.error("Choose a course."); return; }
    const error = assignCourse(facilitator.id, { courseId, targets: targets.map((id) => ({ kind, id })), startAt, dueAt: dueAt || null, note: note.trim() });
    if (error) { toast.error(error); return; }
    toast.success(`Course assigned to ${targets.length} ${kind === "farmer" ? "farmer(s)" : "group(s)"}. It now appears in their learning area.`);
    setTargets([]); setNote(""); setDueAt("");
  }

  return <>
    <PageHead title="Course assignment" text="Assign published courses to farmers or whole groups. Assigned courses appear on the farmer's “Ibyanjye” page." />
    <div className="fac-grid">
      <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <h2 className="text-lg">New assignment</h2>
        <label>Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choose a published course</option>{published.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <fieldset className="fac-formats"><legend>Assign to</legend><label><input type="radio" checked={kind === "group"} onChange={() => { setKind("group"); setTargets([]); }} />Farmer groups</label><label><input type="radio" checked={kind === "farmer"} onChange={() => { setKind("farmer"); setTargets([]); }} />Individual farmers</label></fieldset>
        {options.length === 0 ? <Empty text={kind === "farmer" ? "No farmers assigned to you." : "You have no groups yet."} /> : <div className="checkbox-list">{options.map((option) => <label key={option.id}><input type="checkbox" checked={targets.includes(option.id)} onChange={(event) => setTargets(event.target.checked ? [...targets, option.id] : targets.filter((id) => id !== option.id))} />{option.label}</label>)}</div>}
        <div className="fac-row"><label>Start date<input type="date" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><label>Complete by (optional)<input type="date" min={startAt} value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>
        <label>Note for farmers (optional)<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div><Button type="submit">Assign course</Button></div>
      </form>
      <section className="admin-panel min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">Assignment history</h2><select aria-label="Filter by course" className="rounded-md border px-2 py-1 text-sm" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">All courses</option>{published.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></div>
        <Loadable resource={resource} empty={(rows) => (rows.length ? null : "You have not assigned any course yet.")}>{(rows) => <div className="staff-table"><table className="w-full text-sm">
          <thead><tr><th>Course</th><th>Assigned to</th><th>Dates</th><th>Learners</th><th>Progress</th><th /></tr></thead>
          <tbody>{rows.filter((row) => courseFilter === "all" || row.item.courseId === courseFilter).map(({ item, course, name, progress }) => <tr key={item.id}>
            <td className="font-bold">{course?.title ?? item.courseId}</td>
            <td>{name}<small className="block text-muted-foreground">{item.target.kind === "group" ? "Group" : "Farmer"}</small></td>
            <td>{formatDate(item.startAt)}{item.dueAt ? ` → ${formatDate(item.dueAt)}` : ""}<small className="block text-muted-foreground">Assigned {formatDate(item.assignedAt)}</small></td>
            <td>{progress.completed}/{progress.learners} done</td>
            <td><span className="flex w-28 items-center gap-2"><Bar value={progress.pct} /><small>{progress.pct}%</small></span></td>
            <td><ConfirmButton label="Remove" title="Remove this assignment?" text="The course disappears from the farmer's assigned list. Progress already made is kept." onConfirm={() => { removeAssignment(item.id, facilitator.id); toast.success("Assignment removed."); }} variant="ghost" /></td>
          </tr>)}</tbody>
        </table></div>}</Loadable>
      </section>
    </div>
  </>;
}
