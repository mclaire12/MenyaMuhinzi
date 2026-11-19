import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate, PageHead, Pill, RowMenu, useAdminActor } from "@/components/admin/shell";
import { TargetGroupForm } from "@/components/admin/target-group-form";
import { ConfirmButton, ConfirmDialog, CropTag, Stat, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { creatorName, assignCourseToGroup, removeCourseFromGroup } from "@/lib/admin/courses";
import { audienceLabels, coursesForGroup, groupLocation, groupPublishedAt, groupStatusCopy, groupStatusLabels, groupTone, matchingFarmers, setTargetGroupStatus, updateTargetGroup } from "@/lib/admin/groups";
import { useAdmin } from "@/lib/admin/store";
import type { TargetGroupStatus } from "@/lib/admin/types";
import { courseLessons } from "@/lib/mock/builders";
import { blockingIssues } from "@/lib/mock/quality";
import { courseAudience } from "@/lib/mock/services/availability";
import { useLearningState } from "@/lib/mock/store";
import type { Course } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/admin/groups/$groupId")({ component: GroupPage });

const cropPlural = { tomato: "tomatoes", cabbage: "cabbages", carrot: "carrots", mixed: "any of the three crops" } as const;

function GroupPage() {
  const { groupId } = Route.useParams();
  const data = useAdmin();
  const learning = useLearningState();
  const { name, actor } = useAdminActor();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<Course | null>(null);
  const group = data.targetGroups.find((item) => item.id === groupId);
  if (!group) return <><Link to="/admin/groups" className="text-sm font-bold text-primary">Back to groups</Link><PageHead title="Group not found" text="This group does not exist or was removed when demo data was restored." /></>;
  const current = group;
  const courses = coursesForGroup(learning, group.id);
  const published = courses.filter((course) => course.status === "published");
  const farmers = matchingFarmers(learning, group);

  function changeStatus(status: TargetGroupStatus) {
    setTargetGroupStatus(name, current.id, status);
    toast.success(`${current.name} is now ${groupStatusLabels[status].toLowerCase()}.`);
  }

  return <>
    <Link to="/admin/groups" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="size-4" aria-hidden />Back to groups</Link>
    <PageHead title={group.name} text={group.description}>
      <Pill tone={groupTone(group.status)}>{groupStatusLabels[group.status]}</Pill>
      <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
      {(["active", "inactive", "archived"] as const).filter((status) => status !== group.status && !(group.status === "archived" && status === "inactive")).map((status) => <ConfirmButton key={status} size="default" label={group.status === "archived" && status === "active" ? "Restore" : groupStatusCopy[status].label} title={groupStatusCopy[status].title} text={`${groupStatusCopy[status].text}${published.length && status !== "active" ? ` ${published.length} published course(s) currently reach farmers through this group.` : ""}`} onConfirm={() => changeStatus(status)} />)}
    </PageHead>
    {group.status !== "active" && <p className="fac-note mb-3">This group is {group.status}. Courses published to it are not shown to farmers through it until it is active again.</p>}
    <div className="admin-stats"><Stat label="Estimated farmers" value={group.estimatedFarmers.toLocaleString()} hint="Planning figure" /><Stat label="Registered farmers matching" value={farmers.length} hint="By location and crop" /><Stat label="Published courses" value={published.length} /><Stat label="Assigned courses" value={courses.length} /></div>
    <div className="admin-grid-2 mt-3">
      <article className="admin-panel"><h2 className="mb-2 font-bold">Details</h2><dl className="fac-facts">
        <div><dt>Audience</dt><dd>{audienceLabels[group.audience]}</dd></div>
        <div><dt>Location</dt><dd>{groupLocation(group)}</dd></div>
        <div><dt>Crop interest</dt><dd><CropTag crop={group.crop} /></dd></div>
        <div><dt>Language</dt><dd>{group.language === "en" ? "English" : "Kinyarwanda"}</dd></div>
        <div><dt>Created</dt><dd>{formatDate(group.createdAt)} by {group.createdBy}</dd></div>
        <div><dt>Updated</dt><dd>{formatDate(group.updatedAt)}</dd></div>
        {group.notes && <div><dt>Notes</dt><dd>{group.notes}</dd></div>}
      </dl></article>
      <article className="admin-panel"><h2 className="mb-2 font-bold">Who sees this group's courses</h2>
        <p className="text-sm">Farmers are not added to groups. A registered farmer sees a course published to this group when their {group.district ? (group.sector ? "sector" : "district") : "province"} is {group.sector || group.district || group.province} and they grow {cropPlural[group.crop]}.</p>
        <p className="mt-2 text-sm text-muted-foreground">{farmers.length ? `${farmers.length} registered farmer(s) match today.` : "No registered farmer matches today. Courses will appear for farmers who register later in this area."}</p>
      </article>
    </div>
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">Assigned courses</h2><Button onClick={() => setAssigning(true)} disabled={group.status !== "active"}><Plus aria-hidden />Publish a course to this group</Button></div>
      {!courses.length ? <p className="fac-empty">No courses target this group yet.</p> : <div className="staff-table"><table className="w-full text-sm">
        <thead><tr><th>Course</th><th>Crop</th><th>Creator</th><th>Status</th><th>Published to this group</th><th>Other groups</th><th className="col-actions">Actions</th></tr></thead>
        <tbody>{courses.map((course) => <tr key={course.id}>
          <td><Link className="font-bold" to="/admin/courses/$courseId" params={{ courseId: course.id }}>{course.title}</Link></td>
          <td><CropTag crop={course.crop} /></td>
          <td>{creatorName(learning, course.ownerId)}</td>
          <td><StatusPill status={course.status} /></td>
          <td>{formatDate(groupPublishedAt(course, group.id))}</td>
          <td>{courseAudience(course).groupIds.length - 1 || "—"}</td>
          <td className="col-actions"><RowMenu label={course.title}>
            <DropdownMenuItem asChild><Link to="/admin/courses/$courseId" params={{ courseId: course.id }}>Open course</Link></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRemoving(course)}>Remove from this group</DropdownMenuItem>
          </RowMenu></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {group.name}</DialogTitle><DialogDescription>Changes apply straight away to who can see the group's published courses.</DialogDescription></DialogHeader>
        <TargetGroupForm initial={group} groupId={group.id} submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={(values) => { updateTargetGroup(name, current.id, values); setEditing(false); toast.success("Group saved."); }} />
      </DialogContent>
    </Dialog>
    <AssignDialog open={assigning} onOpenChange={setAssigning} groupId={group.id} groupName={group.name} onAssign={(courseId) => { const error = assignCourseToGroup(courseId, current.id, actor); if (error) { toast.error(error); return false; } toast.success("Course published to this group."); return true; }} />
    <ConfirmDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }} title="Remove this course from the group?" text={removing ? `${removing.title}: farmers who only see it through ${group.name} lose access.${removing.status === "published" && courseAudience(removing).groupIds.length === 1 ? " It is the course's only group, so the course is unpublished." : ""}` : ""} confirmLabel="Remove" onConfirm={() => { if (!removing) return; const error = removeCourseFromGroup(removing.id, current.id, actor); if (error) toast.error(error); else toast.success("Course removed from the group."); setRemoving(null); }} />
  </>;
}

function AssignDialog({ open, onOpenChange, groupId, groupName, onAssign }: { open: boolean; onOpenChange: (open: boolean) => void; groupId: string; groupName: string; onAssign: (courseId: string) => boolean }) {
  const learning = useLearningState();
  const options = learning.courses.filter((course) => {
    const audience = courseAudience(course);
    if (course.status === "archived" || course.status === "rejected") return false;
    if (course.status === "published" && audience.scope === "platform") return false;
    return !(course.status === "published" && audience.groupIds.includes(groupId));
  });
  const [courseId, setCourseId] = useState("");
  const chosen = options.find((course) => course.id === courseId) ?? null;
  const issues = chosen ? blockingIssues(chosen) : [];
  const close = () => { setCourseId(""); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Publish a course to {groupName}</DialogTitle><DialogDescription>Matching farmers see the course as soon as you confirm. Courses already available to the entire platform are not listed.</DialogDescription></DialogHeader>
      {!options.length ? <p className="fac-empty">Every eligible course already reaches this group.</p> : <label className="admin-form">Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Choose a course</option>{options.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.status.replace("_", " ")}</option>)}</select></label>}
      {chosen && <p className="text-sm text-muted-foreground">{courseLessons(chosen).length} lessons · {chosen.status === "published" ? `already published to ${courseAudience(chosen).groupIds.length} other group(s); this group is added` : "not yet published; publishing starts now"}.</p>}
      {issues.length > 0 && <p className="fac-error">{issues.length} required item(s) are missing, for example: {issues[0]!.text}. Open the course to fix them first.</p>}
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={!chosen || issues.length > 0} onClick={() => { if (chosen && onAssign(chosen.id)) close(); }}>Publish to group</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
