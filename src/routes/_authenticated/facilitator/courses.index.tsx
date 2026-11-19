import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { ConfirmButton, CropTag, formatDate, Loadable, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { crops, levels, statusLabels } from "@/lib/mock/crops";
import { useMockResource } from "@/lib/mock/store";
import { courseLearnerIds, createCourse, duplicateCourse, lessonCount, managedCourses, runCourseAction } from "@/lib/mock/services/courses";
import type { CourseStatus, CropSlug } from "@/lib/mock/types";
import { actionLabels, facilitatorActions } from "@/lib/mock/workflow";

export const Route = createFileRoute("/_authenticated/facilitator/courses/")({ component: Courses });

const PAGE = 8;

function Courses() {
  const { facilitator, actor, permissions } = useFacilitator();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState<CropSlug | "all">("all");
  const [status, setStatus] = useState<CourseStatus | "all">("all");
  const [sort, setSort] = useState<"updated" | "title" | "lessons" | "farmers">("updated");
  const [page, setPage] = useState(0);
  const resource = useMockResource((state) => managedCourses(state, facilitator.id).map((course) => ({ course, farmers: courseLearnerIds(state, course.id).length, lessons: lessonCount(course) })));

  function duplicate(courseId: string) {
    const id = duplicateCourse(actor, courseId);
    if (id) { toast.success("Course duplicated as a draft."); navigate({ to: "/facilitator/courses/$courseId", params: { courseId: id } }); }
  }

  function act(courseId: string, action: Parameters<typeof runCourseAction>[1]) {
    const error = runCourseAction(courseId, action, actor, permissions);
    if (error) toast.error(error); else toast.success(`${actionLabels[action]} done.`);
  }

  return <>
    <PageHead title="Courses" text="Courses you manage. Only published courses appear in the farmer catalogue.">
      <Button asChild variant="outline"><Link to="/facilitator/studio"><Sparkles aria-hidden />Generate with AI</Link></Button>
      <CreateCourse onCreate={(id) => navigate({ to: "/facilitator/courses/$courseId", params: { courseId: id } })} />
    </PageHead>
    <div className="admin-filters">
      <input aria-label="Search courses" placeholder="Search title or description" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
      <select aria-label="Crop" value={crop} onChange={(event) => { setCrop(event.target.value as CropSlug | "all"); setPage(0); }}><option value="all">All crops</option>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_rw}</option>)}</select>
      <select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value as CourseStatus | "all"); setPage(0); }}><option value="all">All statuses</option>{(Object.keys(statusLabels) as CourseStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
      <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="updated">Last updated</option><option value="title">Title A–Z</option><option value="lessons">Most lessons</option><option value="farmers">Most assigned farmers</option></select>
    </div>
    <Loadable resource={resource} empty={(rows) => (rows.length ? null : "You have no courses yet. Create one or generate a draft with AI.")}>{(rows) => {
      const text = query.trim().toLowerCase();
      const filtered = rows
        .filter(({ course }) => (crop === "all" || course.crop === crop) && (status === "all" || course.status === status) && (!text || `${course.title} ${course.description}`.toLowerCase().includes(text)))
        .sort((a, b) => sort === "title" ? a.course.title.localeCompare(b.course.title) : sort === "lessons" ? b.lessons - a.lessons : sort === "farmers" ? b.farmers - a.farmers : b.course.updatedAt.localeCompare(a.course.updatedAt));
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
      const visible = filtered.slice(page * PAGE, page * PAGE + PAGE);
      if (!filtered.length) return <p className="fac-empty">No courses match these filters.</p>;
      return <>
        <div className="staff-table"><table className="w-full text-sm">
          <thead><tr><th>Course</th><th>Crop</th><th>Modules</th><th>Lessons</th><th>Assigned farmers</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{visible.map(({ course, farmers, lessons }) => <tr key={course.id}>
            <td className="max-w-xs"><Link className="font-bold" to="/facilitator/courses/$courseId" params={{ courseId: course.id }}>{course.title}</Link>{course.aiGenerated && <span className="ai-tag ml-2">AI</span>}<small className="line-clamp-2 block text-muted-foreground">{course.description}</small></td>
            <td><CropTag crop={course.crop} /></td>
            <td>{course.modules.length}</td>
            <td>{lessons}</td>
            <td>{farmers}</td>
            <td><StatusPill status={course.status} /></td>
            <td>{formatDate(course.updatedAt)}</td>
            <td><div className="admin-actions">
              <Button asChild size="sm" variant="outline"><Link to="/facilitator/courses/$courseId" params={{ courseId: course.id }}>{course.status === "draft" ? "Edit" : "View"}</Link></Button>
              <Button size="sm" variant="ghost" onClick={() => duplicate(course.id)}>Duplicate</Button>
              {course.status === "rejected" && <Button asChild size="sm" variant="ghost"><Link to="/facilitator/reviews" search={{ course: course.id }}>Feedback</Link></Button>}
              {facilitatorActions(course.status, permissions).filter((action) => action !== "archive").map((action) => <Button key={action} size="sm" variant="ghost" onClick={() => act(course.id, action)}>{actionLabels[action]}</Button>)}
              {facilitatorActions(course.status, permissions).includes("archive") && <ConfirmButton label="Archive" title="Archive this course?" text={course.status === "published" ? "It will be removed from the farmer catalogue. Farmer progress is kept." : "You can restore it as a draft later."} onConfirm={() => act(course.id, "archive")} variant="ghost" />}
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {pages > 1 && <div className="admin-actions mt-3"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page + 1} of {pages}</span><Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></div>}
      </>;
    }}</Loadable>
  </>;
}

function CreateCourse({ onCreate }: { onCreate: (id: string) => void }) {
  const { actor } = useFacilitator();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ title: "", crop: "tomato" as CropSlug, level: "Intangiriro", description: "" });
  const [error, setError] = useState("");
  function submit() {
    if (values.title.trim().length < 5) { setError("The title needs at least 5 characters."); return; }
    const id = createCourse(actor, { ...values, title: values.title.trim(), description: values.description.trim() });
    toast.success("Draft course created.");
    setOpen(false);
    setValues({ title: "", crop: "tomato", level: "Intangiriro", description: "" });
    onCreate(id);
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button><Plus aria-hidden />Create course</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Create a course</DialogTitle><DialogDescription>The course starts as a draft with one empty module.</DialogDescription></DialogHeader>
      <div className="admin-form">
        <label>Title<input value={values.title} onChange={(event) => { setValues({ ...values, title: event.target.value }); setError(""); }} placeholder="Urugero: Gutera inyanya mu nzu" /></label>
        {error && <p className="fac-field-error">{error}</p>}
        <label>Crop<select value={values.crop} onChange={(event) => setValues({ ...values, crop: event.target.value as CropSlug })}>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_rw}</option>)}</select></label>
        <label>Level<select value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value })}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
        <label>Description<textarea rows={3} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create draft</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
