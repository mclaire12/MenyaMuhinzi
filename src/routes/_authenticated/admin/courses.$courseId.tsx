import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PublishDialog } from "@/components/admin/publish-dialog";
import { formatDate, formatDateTime, PageHead, RowMenu, Tabs, useAdminActor } from "@/components/admin/shell";
import { CourseDetails, CourseEditorProvider, LessonEditor, LessonPreview, ModuleCard } from "@/components/course-editor";
import { ConfirmButton, ConfirmDialog, CropTag, Stat, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { addAssessmentQuestion, archiveCourse, availabilityLabel, courseAssessment, creatorName, removeAssessmentQuestion, restoreCourse, reviewCourse, setAssessmentStatus, unpublishCourse } from "@/lib/admin/courses";
import { useAdmin } from "@/lib/admin/store";
import { languageNames } from "@/lib/mock/crops";
import { courseIssues } from "@/lib/mock/quality";
import { courseAudience } from "@/lib/mock/services/availability";
import { addModule, addResource, canActorEdit, courseLearnerIds, duplicateCourse, lessonCount, removeResource, updateCourseDetails, updateLesson } from "@/lib/mock/services/courses";
import { learnerCourseProgress } from "@/lib/mock/services/learners";
import { courseRevisions, latestDecision } from "@/lib/mock/services/reviews";
import { useLearningState } from "@/lib/mock/store";
import type { ContentLanguage, Course, ResourceKind } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({ component: CoursePage });

type Tab = "structure" | "details" | "resources" | "assessment" | "preview" | "history";

function CoursePage() {
  const { courseId } = Route.useParams();
  const state = useLearningState();
  const navigate = useNavigate();
  const { actor } = useAdminActor();
  const [tab, setTab] = useState<Tab>("structure");
  const [selected, setSelected] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [confirm, setConfirm] = useState<"unpublish" | "archive" | null>(null);
  const course = state.courses.find((item) => item.id === courseId);
  if (!course) return <><Link to="/admin/courses" className="text-sm font-bold text-primary">Back to courses</Link><PageHead title="Course not found" text="This course does not exist or was removed when demo data was restored." /></>;
  const current = course;
  const editable = canActorEdit(course, actor);
  const issues = courseIssues(course);
  const blocking = issues.filter((issue) => issue.blocking);
  const lessons = course.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
  const active = lessons.find((row) => row.lesson.id === selected) ?? lessons[0] ?? null;
  const learners = courseLearnerIds(state, course.id);
  const finished = learners.filter((id) => { const row = learnerCourseProgress(state, id, current.id); return row.total > 0 && row.done === row.total; }).length;
  const decision = latestDecision(state, course.id);
  const guard = (ok: boolean, message: string) => (ok ? toast.success(message) : toast.error("Archived courses cannot be edited. Restore it first."));

  function run(kind: "unpublish" | "archive" | "restore") {
    const error = kind === "unpublish" ? unpublishCourse(current.id, actor) : kind === "archive" ? archiveCourse(current.id, actor) : restoreCourse(current.id, actor);
    if (error) toast.error(error); else toast.success(kind === "unpublish" ? "Course unpublished." : kind === "archive" ? "Course archived." : "Course restored as a draft.");
  }

  return <CourseEditorProvider value={{ actor, setValidated: (cId, lessonId, validated) => updateLesson(cId, lessonId, actor, { validated }, validated ? "Lesson validated by the administrator" : "Lesson validation removed") }}>
    <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="size-4" aria-hidden />Back to courses</Link>
    <PageHead title={course.title} text={`${course.level} · ${languageNames[course.language]} · ${course.durationWeeks} week(s) · created by ${creatorName(state, course.ownerId)} · revision ${course.revision}`}>
      <CropTag crop={course.crop} /><StatusPill status={course.status} />
    </PageHead>
    <div className="admin-actions mb-3">
      {course.status === "pending_review" && <><ConfirmButton variant="default" label="Approve" title="Approve this course?" text="The facilitator is told it was approved. You can then publish it." onConfirm={() => { const error = reviewCourse(current.id, actor, "approved", ""); if (error) toast.error(error); else toast.success("Course approved."); }} /><Button size="sm" variant="outline" onClick={() => setRejecting(true)}>Return with feedback</Button></>}
      {course.status !== "archived" && course.status !== "rejected" && <Button size="sm" disabled={blocking.length > 0} onClick={() => setPublishing(true)}>{course.status === "published" ? "Update publication" : "Publish"}</Button>}
      {course.status === "published" && <Button size="sm" variant="outline" onClick={() => setConfirm("unpublish")}>Unpublish</Button>}
      <Button size="sm" variant="outline" onClick={() => { const id = duplicateCourse(actor, current.id); if (id) { toast.success("Duplicated as a draft."); navigate({ to: "/admin/courses/$courseId", params: { courseId: id } }); } }}>Duplicate</Button>
      {course.status === "archived" ? <Button size="sm" variant="outline" onClick={() => run("restore")}>Restore</Button> : <Button size="sm" variant="outline" onClick={() => setConfirm("archive")}>Archive</Button>}
    </div>
    {course.status === "published" && <p className="fac-note">Published {formatDate(course.publishedAt)} · available to {courseAudience(course).scope === "platform" ? "the entire platform" : availabilityLabel(course)}. Edits you make go live straight away.</p>}
    {course.status === "archived" && <p className="fac-note">This course is archived. Restore it to edit or publish it again.</p>}
    {decision?.action === "rejected" && course.status === "rejected" && <p className="fac-error mb-3"><span><b>Returned by {decision.authorName}:</b> {decision.comment}</span></p>}
    {course.aiGenerated && <div className="ai-warning mb-3"><Sparkles aria-hidden /><p>Parts of this course were drafted by AI. Every AI lesson must be validated before the course can be published.</p></div>}
    {issues.length > 0 && <details className="admin-panel mb-3" open={blocking.length > 0 && editable}><summary className="font-bold">{blocking.length} item(s) required before publishing · {issues.length - blocking.length} suggestion(s)</summary><ul className="mt-2 space-y-1 text-sm">{issues.map((issue, index) => <li key={index} className={issue.blocking ? "text-destructive" : "text-muted-foreground"}>{issue.blocking ? "Required: " : "Suggestion: "}{issue.text}</li>)}</ul></details>}
    <div className="admin-stats"><Stat label="Learners" value={learners.length} /><Stat label="Completed" value={finished} /><Stat label="Lessons" value={lessonCount(course)} /><Stat label="Validated lessons" value={`${lessons.filter((row) => row.lesson.validated || !row.lesson.aiGenerated).length}/${lessons.length}`} /></div>

    <Tabs value={tab} onChange={setTab} options={[{ value: "structure", label: "Modules & lessons" }, { value: "details", label: "Course details" }, { value: "resources", label: "Resources" }, { value: "assessment", label: "Assessment" }, { value: "preview", label: "Farmer preview" }, { value: "history", label: "Publication history" }]} />

    {tab === "details" && <CourseDetails key={`${course.id}-${course.updatedAt}`} course={course} editable={editable} onSave={(patch) => guard(updateCourseDetails(course.id, actor, patch), "Course details saved.")} />}
    {tab === "structure" && <div className="editor-layout">
      <div className="space-y-3">
        {course.modules.map((module, index) => <ModuleCard key={module.id} course={course} module={module} index={index} editable={editable} selected={active?.lesson.id ?? null} onSelect={setSelected} />)}
        {editable && <Button variant="outline" onClick={() => { const id = addModule(course.id, actor); if (id) toast.success("Module added."); }}><Plus aria-hidden />Add module</Button>}
        {!course.modules.length && <p className="fac-empty">No modules yet.</p>}
      </div>
      <div className="min-w-0">{active ? <LessonEditor key={`${active.lesson.id}-${course.updatedAt}`} course={course} lesson={active.lesson} editable={editable} onPreview={() => { setSelected(active.lesson.id); setTab("preview"); }} /> : <p className="fac-empty">Add a lesson to a module to start writing.</p>}</div>
    </div>}
    {tab === "resources" && <Resources course={course} editable={editable} />}
    {tab === "assessment" && <AssessmentTab course={course} editable={editable} />}
    {tab === "preview" && (active ? <LessonPreview course={course} lesson={active.lesson} index={lessons.findIndex((row) => row.lesson.id === active.lesson.id)} total={lessons.length} onPick={setSelected} lessons={lessons.map((row) => row.lesson)} /> : <p className="fac-empty">Nothing to preview yet.</p>)}
    {tab === "history" && <History course={course} />}

    {publishing && <PublishDialog course={course} onClose={() => setPublishing(false)} />}
    <RejectCourse open={rejecting} onClose={() => setRejecting(false)} onReject={(comment) => { const error = reviewCourse(current.id, actor, "rejected", comment); if (error) { toast.error(error); return; } toast.success("Course returned to the facilitator."); setRejecting(false); }} />
    <ConfirmDialog open={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm === "unpublish" ? "Unpublish this course?" : "Archive this course?"} text={confirm === "unpublish" ? "Farmers stop seeing it straight away. Their progress is kept and you can publish it again." : "It is removed from every list farmers see and can no longer be edited until restored."} confirmLabel={confirm === "unpublish" ? "Unpublish" : "Archive"} onConfirm={() => { if (confirm) run(confirm); setConfirm(null); }} />
  </CourseEditorProvider>;
}

function RejectCourse({ open, onClose, onReject }: { open: boolean; onClose: () => void; onReject: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={(value) => { if (!value) { setComment(""); setError(""); onClose(); } }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Return this course with feedback</DialogTitle><DialogDescription>The facilitator sees your feedback and can submit a new revision.</DialogDescription></DialogHeader>
      <label className="admin-form">What must change<textarea rows={4} value={comment} onChange={(event) => { setComment(event.target.value); setError(""); }} aria-invalid={!!error} />{error && <span className="fac-field-error">{error}</span>}</label>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={() => { if (comment.trim().length < 10) { setError("Explain what must change (at least 10 characters)."); return; } onReject(comment.trim()); setComment(""); }}>Return course</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

const resourceKinds: { value: ResourceKind; label: string }[] = [{ value: "document", label: "Document" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }, { value: "audio", label: "Audio" }, { value: "subtitle", label: "Subtitles" }];

function Resources({ course, editable }: { course: Course; editable: boolean }) {
  const state = useLearningState();
  const { actor } = useAdminActor();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const rows = state.resources.filter((item) => item.courseId === course.id);
  const lessons = course.modules.flatMap((module) => module.lessons);
  return <section>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Files and links farmers can open from the course. Knowledge Base documents are managed separately.</p>{editable && <Button onClick={() => setAdding(true)}><Plus aria-hidden />Add resource</Button>}</div>
    {!rows.length ? <p className="fac-empty">No resources attached to this course.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Title</th><th>Type</th><th>Lesson</th><th>Language</th><th>Added</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{rows.map((item) => <tr key={item.id}><td><b>{item.title}</b>{item.note && <small className="block text-muted-foreground">{item.note}</small>}</td><td>{resourceKinds.find((kind) => kind.value === item.kind)?.label}</td><td>{lessons.find((lesson) => lesson.id === item.lessonId)?.title ?? "Whole course"}</td><td>{languageNames[item.language]}</td><td>{formatDate(item.createdAt)}</td>
        <td className="col-actions">{editable ? <RowMenu label={item.title}>{item.url && <DropdownMenuItem asChild><a href={item.url} target="_blank" rel="noreferrer">Open</a></DropdownMenuItem>}<DropdownMenuItem onSelect={() => setRemoving(item.id)}>Remove</DropdownMenuItem></RowMenu> : "—"}</td></tr>)}</tbody>
    </table></div>}
    <ResourceDialog open={adding} course={course} onClose={() => setAdding(false)} />
    <ConfirmDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }} title="Remove this resource?" text="Farmers can no longer open it from the course." confirmLabel="Remove" onConfirm={() => { if (removing && removeResource(actor, removing)) toast.success("Resource removed."); else toast.error("This course cannot be edited."); setRemoving(null); }} />
  </section>;
}

function ResourceDialog({ open, course, onClose }: { open: boolean; course: Course; onClose: () => void }) {
  const { actor } = useAdminActor();
  const blank = { title: "", kind: "document" as ResourceKind, lessonId: "", language: course.language as ContentLanguage, url: "", note: "" };
  const [values, setValues] = useState(blank);
  const [error, setError] = useState("");
  const close = () => { setValues(blank); setError(""); onClose(); };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Add a resource</DialogTitle><DialogDescription>Link a guide, picture, recording or video for this course.</DialogDescription></DialogHeader>
      <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); if (values.title.trim().length < 3) { setError("Enter a title (at least 3 characters)."); return; } if (values.url && !/^(https?:\/\/|\/)/.test(values.url.trim())) { setError("The link must start with https:// or /."); return; } if (addResource(actor, { courseId: course.id, lessonId: values.lessonId, kind: values.kind, title: values.title.trim(), note: values.note.trim(), language: values.language, url: values.url.trim() })) { toast.success("Resource added."); close(); } else setError("This course cannot be edited."); }}>
        <label>Title<input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
        <div className="fac-row">
          <label>Type<select value={values.kind} onChange={(event) => setValues({ ...values, kind: event.target.value as ResourceKind })}>{resourceKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
          <label>Lesson<select value={values.lessonId} onChange={(event) => setValues({ ...values, lessonId: event.target.value })}><option value="">Whole course</option>{course.modules.flatMap((module) => module.lessons).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
          <label>Language<select value={values.language} onChange={(event) => setValues({ ...values, language: event.target.value as ContentLanguage })}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
        </div>
        <label>Link (optional)<input value={values.url} onChange={(event) => setValues({ ...values, url: event.target.value })} placeholder="https://" /></label>
        <label>Note (optional)<input value={values.note} onChange={(event) => setValues({ ...values, note: event.target.value })} /></label>
        {error && <p className="fac-field-error" role="alert">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit">Add resource</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function AssessmentTab({ course, editable }: { course: Course; editable: boolean }) {
  const state = useLearningState();
  const assessment = courseAssessment(state, course.id);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [answer, setAnswer] = useState(0);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const choices = options.split("\n").map((line) => line.trim()).filter(Boolean);
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 8) { setError("Write the question (at least 8 characters)."); return; }
    if (choices.length < 2) { setError("Give at least two answer options, one per line."); return; }
    if (answer >= choices.length) { setError("Choose which option is correct."); return; }
    addAssessmentQuestion(course.id, course, { question: question.trim(), options: choices, answer, topic: topic.trim() || "Rusange", kind: "choice" });
    toast.success("Question added.");
    setAdding(false); setQuestion(""); setOptions(""); setAnswer(0); setTopic(""); setError("");
  }
  return <section>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{assessment ? `${assessment.questions.length} question(s) · ${assessment.status === "published" ? "visible to learners" : "draft, not shown to learners"}` : "No assessment yet."}</p>
      <div className="admin-actions">
        {assessment && editable && <Button variant="outline" onClick={() => { setAssessmentStatus(course.id, assessment.status === "published" ? "draft" : "published"); toast.success(assessment.status === "published" ? "Assessment hidden from learners." : "Assessment visible to learners."); }} disabled={!assessment.questions.length}>{assessment.status === "published" ? "Hide from learners" : "Show to learners"}</Button>}
        {editable && <Button onClick={() => setAdding(true)}><Plus aria-hidden />Add question</Button>}
      </div>
    </div>
    {!assessment?.questions.length ? <p className="fac-empty">No questions yet.</p> : <ol className="admin-panel fac-list">{assessment.questions.map((item, index) => <li key={item.id}><span><b>{index + 1}. {item.question}</b><small className="block text-muted-foreground">{item.options.map((option, optionIndex) => optionIndex === item.answer ? `✓ ${option}` : option).join(" · ")} · topic: {item.topic}</small></span>{editable && <ConfirmButton label="Remove" title="Remove this question?" text="Learners will no longer be asked it." onConfirm={() => { removeAssessmentQuestion(course.id, item.id); toast.success("Question removed."); }} />}</li>)}</ol>}
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Add an assessment question</DialogTitle><DialogDescription>Multiple-choice questions work on the web and on basic phones.</DialogDescription></DialogHeader>
        <form className="admin-form" noValidate onSubmit={save}>
          <label>Question<textarea rows={2} value={question} onChange={(event) => { setQuestion(event.target.value); setError(""); }} /></label>
          <label>Answer options (one per line)<textarea rows={4} value={options} onChange={(event) => { setOptions(event.target.value); setError(""); }} /></label>
          <div className="fac-row">
            <label>Correct answer<select value={answer} onChange={(event) => setAnswer(Number(event.target.value))}>{(choices.length ? choices : ["Add options first"]).map((option, index) => <option key={index} value={index}>{option}</option>)}</select></label>
            <label>Topic (optional)<input value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
          </div>
          {error && <p className="fac-field-error" role="alert">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit">Add question</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}

function History({ course }: { course: Course }) {
  const state = useLearningState();
  const admin = useAdmin();
  const groupName = (id: string) => admin.targetGroups.find((group) => group.id === id)?.name ?? "Removed group";
  const publications = course.publications ?? [];
  const reviews = state.reviews.filter((item) => item.courseId === course.id);
  return <div className="space-y-4">
    <section><h2 className="mb-2 text-xl">Publications</h2>{!publications.length ? <p className="fac-empty">{course.status === "published" ? `Published ${formatDate(course.publishedAt)} before publication history was recorded.` : "Never published."}</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Date</th><th>Action</th><th>Audience</th><th>By</th></tr></thead>
      <tbody>{publications.map((item) => <tr key={item.id}><td>{formatDateTime(item.at)}</td><td className="capitalize">{item.action}</td><td>{item.scope === "platform" ? "Entire platform" : item.groupIds.map(groupName).join(", ")}</td><td>{item.by}</td></tr>)}</tbody>
    </table></div>}</section>
    <section><h2 className="mb-2 text-xl">Review decisions</h2>{!reviews.length ? <p className="fac-empty">No review activity.</p> : <ul className="admin-panel fac-list">{reviews.map((item) => <li key={item.id}><span className="capitalize">{item.action}{item.comment && <small className="block normal-case text-muted-foreground">{item.comment}</small>}</span><small>{item.authorName} · {formatDateTime(item.at)}</small></li>)}</ul>}</section>
    <section><h2 className="mb-2 text-xl">Revisions</h2><ul className="admin-panel fac-list">{courseRevisions(state, course.id).map((item) => <li key={item.id}><span>{item.summary}<small className="block text-muted-foreground">Revision {item.revision} · {item.by}</small></span><small>{formatDateTime(item.at)}</small></li>)}</ul></section>
  </div>;
}
