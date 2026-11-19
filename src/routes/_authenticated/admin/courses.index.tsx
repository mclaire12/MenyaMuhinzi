import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PublishDialog } from "@/components/admin/publish-dialog";
import { formatDate, PageHead, RowMenu, useAdminActor, withinDays } from "@/components/admin/shell";
import { ConfirmDialog, CropTag, lines, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { archiveCourse, availabilityLabel, createAdminCourse, creatorName, restoreCourse, unpublishCourse, validateNewCourse, type NewCourseValues } from "@/lib/admin/courses";
import { crops, levels, statusLabels } from "@/lib/mock/crops";
import { ADMIN_ACTOR_ID, duplicateCourse, lessonCount } from "@/lib/mock/services/courses";
import { useLearningState } from "@/lib/mock/store";
import type { ContentLanguage, Course, CourseStatus, CropSlug } from "@/lib/mock/types";

type Search = { status?: CourseStatus; create?: boolean };

export const Route = createFileRoute("/_authenticated/admin/courses/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["status"] === "string" && search["status"] in statusLabels ? { status: search["status"] as CourseStatus } : {}),
    ...(search["create"] === true || search["create"] === "true" ? { create: true } : {}),
  }),
  component: Courses,
});

type Pending = { course: Course; kind: "unpublish" | "archive" } | null;

function Courses() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/courses/" });
  const state = useLearningState();
  const { actor } = useAdminActor();
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState<CropSlug | "all">("all");
  const [creator, setCreator] = useState("all");
  const [level, setLevel] = useState("all");
  const [published, setPublished] = useState(0);
  const [creating, setCreating] = useState(!!search.create);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const status = search.status ?? "all";
  const creators = [{ id: ADMIN_ACTOR_ID, name: "Administrator" }, ...state.facilitators.map((person) => ({ id: person.id, name: person.name }))];
  const rows = useMemo(() => state.courses.filter((course) => {
    if (status !== "all" && course.status !== status) return false;
    if (crop !== "all" && course.crop !== crop) return false;
    if (creator !== "all" && course.ownerId !== creator) return false;
    if (level !== "all" && course.level !== level) return false;
    if (published && (course.status !== "published" || !withinDays(course.publishedAt, published))) return false;
    return !query.trim() || `${course.title} ${course.description}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [state.courses, status, crop, creator, level, published, query]);
  const course = publishing ? state.courses.find((item) => item.id === publishing) ?? null : null;

  function run(kind: "unpublish" | "archive" | "restore", target: Course) {
    const error = kind === "unpublish" ? unpublishCourse(target.id, actor) : kind === "archive" ? archiveCourse(target.id, actor) : restoreCourse(target.id, actor);
    if (error) toast.error(error);
    else toast.success(kind === "unpublish" ? "Course unpublished. Farmers no longer see it." : kind === "archive" ? "Course archived." : "Course restored as a draft.");
  }
  function duplicate(target: Course) {
    const id = duplicateCourse(actor, target.id);
    if (!id) { toast.error("Course not found."); return; }
    toast.success("Copy created as a draft.");
    navigate({ to: "/admin/courses/$courseId", params: { courseId: id } });
  }

  return <>
    <PageHead title="Courses" text="Every course on the platform, created by administrators or facilitators. Publish to the entire platform or to selected groups.">
      <Button variant="outline" onClick={() => setCreating(true)}><Plus aria-hidden />Create course</Button>
      <Button asChild><Link to="/admin/courses/generate"><Sparkles aria-hidden />Generate with AI</Link></Button>
    </PageHead>
    <div className="admin-filters">
      <input aria-label="Search courses" placeholder="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Status" value={status} onChange={(event) => navigate({ search: event.target.value === "all" ? {} : { status: event.target.value as CourseStatus } })}><option value="all">All statuses</option>{(Object.keys(statusLabels) as CourseStatus[]).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
      <select aria-label="Crop" value={crop} onChange={(event) => setCrop(event.target.value as CropSlug | "all")}><option value="all">All crops</option>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_en}</option>)}</select>
      <select aria-label="Creator" value={creator} onChange={(event) => setCreator(event.target.value)}><option value="all">All creators</option>{creators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="Audience level" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option>{levels.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Publication date" value={published} onChange={(event) => setPublished(Number(event.target.value))}><option value={0}>Published any time</option><option value={7}>Published in the last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
    </div>
    {!rows.length ? <p className="fac-empty">No courses match these filters.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Course</th><th>Crop</th><th>Level</th><th>Content</th><th>Creator</th><th>Status</th><th>Available to</th><th>Published</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{rows.map((item) => <tr key={item.id}>
        <td><Link className="font-bold" to="/admin/courses/$courseId" params={{ courseId: item.id }}>{item.title}</Link>{item.aiGenerated && <span className="ai-tag ml-2">AI</span>}</td>
        <td><CropTag crop={item.crop} /></td>
        <td>{item.level}</td>
        <td>{item.modules.length} module{item.modules.length === 1 ? "" : "s"} · {lessonCount(item)} lesson{lessonCount(item) === 1 ? "" : "s"}</td>
        <td>{creatorName(state, item.ownerId)}</td>
        <td><StatusPill status={item.status} /></td>
        <td>{availabilityLabel(item)}</td>
        <td>{item.status === "published" ? formatDate(item.publishedAt) : "—"}</td>
        <td className="col-actions"><RowMenu label={item.title}>
          <DropdownMenuItem asChild><Link to="/admin/courses/$courseId" params={{ courseId: item.id }}>{item.status === "archived" ? "View" : "Open and edit"}</Link></DropdownMenuItem>
          {item.status !== "archived" && item.status !== "rejected" && <DropdownMenuItem onSelect={() => setPublishing(item.id)}>{item.status === "published" ? "Update publication" : "Publish"}</DropdownMenuItem>}
          {item.status === "published" && <DropdownMenuItem onSelect={() => setPending({ course: item, kind: "unpublish" })}>Unpublish</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => duplicate(item)}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          {item.status === "archived" ? <DropdownMenuItem onSelect={() => run("restore", item)}>Restore</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setPending({ course: item, kind: "archive" })}>Archive</DropdownMenuItem>}
        </RowMenu></td>
      </tr>)}</tbody>
    </table></div>}
    <Dialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open && search.create) navigate({ search: {} }); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Create a course</DialogTitle><DialogDescription>Start with the essentials. You add lesson content, resources and the assessment on the next page. It stays a draft until you publish it.</DialogDescription></DialogHeader>
        <NewCourseForm onCancel={() => setCreating(false)} onCreate={(values) => { const id = createAdminCourse(actor, values); setCreating(false); toast.success("Draft course created."); navigate({ to: "/admin/courses/$courseId", params: { courseId: id } }); }} />
      </DialogContent>
    </Dialog>
    <PublishDialog course={course} onClose={() => setPublishing(null)} />
    <ConfirmDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}
      title={pending?.kind === "unpublish" ? "Unpublish this course?" : "Archive this course?"}
      text={pending ? `${pending.course.title}: ${pending.kind === "unpublish" ? "farmers stop seeing it straight away. Their progress is kept and you can publish it again." : "it is removed from every list farmers see and can no longer be edited until restored."}` : ""}
      confirmLabel={pending?.kind === "unpublish" ? "Unpublish" : "Archive"}
      onConfirm={() => { if (pending) run(pending.kind, pending.course); setPending(null); }} />
  </>;
}

function NewCourseForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (values: NewCourseValues) => void }) {
  const [values, setValues] = useState<NewCourseValues>({ title: "", crop: "tomato", level: levels[0]!, description: "", objectives: [], language: "rw", durationWeeks: 4, moduleCount: 3 });
  const [objectives, setObjectives] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateNewCourse>>({});
  const set = <K extends keyof NewCourseValues>(key: K, value: NewCourseValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const error = (key: keyof NewCourseValues) => errors[key] && <span className="fac-field-error">{errors[key]}</span>;
  return <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); const next = { ...values, objectives: lines(objectives) }; const found = validateNewCourse(next); setErrors(found); if (!Object.keys(found).length) onCreate(next); }}>
    <label>Course title<input value={values.title} onChange={(event) => set("title", event.target.value)} aria-invalid={!!errors.title} />{error("title")}</label>
    <div className="fac-row">
      <label>Crop<select value={values.crop} onChange={(event) => set("crop", event.target.value as CropSlug)}>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_en} ({item.name_rw})</option>)}</select></label>
      <label>Target audience<select value={values.level} onChange={(event) => set("level", event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Language<select value={values.language} onChange={(event) => set("language", event.target.value as ContentLanguage)}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
    </div>
    <label>Description<textarea rows={3} value={values.description} onChange={(event) => set("description", event.target.value)} aria-invalid={!!errors.description} />{error("description")}</label>
    <label>Learning objectives (one per line)<textarea rows={3} value={objectives} onChange={(event) => setObjectives(event.target.value)} aria-invalid={!!errors.objectives} />{error("objectives")}</label>
    <div className="fac-row">
      <label>Duration (weeks)<input type="number" min={1} max={26} value={values.durationWeeks} onChange={(event) => set("durationWeeks", event.target.valueAsNumber)} />{error("durationWeeks")}</label>
      <label>Number of modules<input type="number" min={1} max={6} value={values.moduleCount} onChange={(event) => set("moduleCount", event.target.valueAsNumber)} />{error("moduleCount")}</label>
    </div>
    <p className="fac-note">You add lessons to each module on the next page. Lessons support reading text, video and audio.</p>
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Create draft</Button></DialogFooter>
  </form>;
}
