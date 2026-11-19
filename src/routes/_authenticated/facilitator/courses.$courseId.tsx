import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CourseDetails, CourseEditorProvider, LessonEditor, LessonPreview, ModuleCard } from "@/components/course-editor";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { ConfirmButton, CropTag, formatDateTime, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { languageNames } from "@/lib/mock/crops";
import { courseIssues } from "@/lib/mock/quality";
import { addModule, duplicateCourse, runCourseAction, updateCourseDetails } from "@/lib/mock/services/courses";
import { courseRevisions, latestDecision, setLessonValidated } from "@/lib/mock/services/reviews";
import { actionLabels, canEditCourse, facilitatorActions } from "@/lib/mock/workflow";

export const Route = createFileRoute("/_authenticated/facilitator/courses/$courseId")({ component: CourseEditor });

function CourseEditor() {
  const { courseId } = Route.useParams();
  const { facilitator, actor, permissions, state } = useFacilitator();
  const navigate = useNavigate();
  const course = state.courses.find((item) => item.id === courseId && item.ownerId === facilitator.id);
  const [tab, setTab] = useState<"structure" | "details" | "preview" | "history">("structure");
  const [selected, setSelected] = useState<string | null>(null);
  if (!course) return <PageHead title="Course not found" text="This course does not exist or is managed by another facilitator."><Button asChild variant="outline"><Link to="/facilitator/courses">Back to courses</Link></Button></PageHead>;
  const current = course;
  const editable = canEditCourse(course);
  const issues = courseIssues(course);
  const blocking = issues.filter((issue) => issue.blocking);
  const lessons = course.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
  const active = lessons.find((row) => row.lesson.id === selected) ?? lessons[0] ?? null;
  const decision = latestDecision(state, course.id);

  function act(action: Parameters<typeof runCourseAction>[1]) {
    const error = runCourseAction(current.id, action, actor, permissions);
    if (error) toast.error(error); else toast.success(`${actionLabels[action]} done.`);
  }
  const guard = (ok: boolean, message: string) => (ok ? toast.success(message) : toast.error("Only draft courses can be edited."));

  return <CourseEditorProvider value={{ actor, setValidated: (courseId, lessonId, validated) => setLessonValidated(courseId, lessonId, actor, validated, permissions) }}>
    <Link to="/facilitator/courses" className="text-sm font-bold text-primary">Back to courses</Link>
    <PageHead title={course.title} text={`${course.level} · ${languageNames[course.language]} · ${course.durationWeeks} week(s) · revision ${course.revision}`}>
      <CropTag crop={course.crop} /><StatusPill status={course.status} />
    </PageHead>
    <div className="admin-actions mb-3">
      {facilitatorActions(course.status, permissions).map((action) => action === "archive"
        ? <ConfirmButton key={action} label="Archive" title="Archive this course?" text="Archived courses leave the farmer catalogue. You can restore them as drafts." onConfirm={() => act("archive")} />
        : <Button key={action} size="sm" variant={action === "submit" || action === "publish" ? "default" : "outline"} disabled={action === "submit" && blocking.length > 0} onClick={() => act(action)}>{actionLabels[action]}</Button>)}
      <Button size="sm" variant="outline" onClick={() => { const id = duplicateCourse(actor, current.id); if (id) { toast.success("Duplicated as a draft."); navigate({ to: "/facilitator/courses/$courseId", params: { courseId: id } }); } }}>Duplicate</Button>    </div>
    {course.status === "approved" && !permissions.publish && <p className="fac-note">Approved by an agricultural expert. Your role cannot publish, so an administrator will publish it from the Admin Portal.</p>}
    {!editable && <p className="fac-note">This course is {course.status.replace("_", " ")}. Only drafts can be edited{course.status === "rejected" ? " — choose Revise to start a new revision." : course.status === "published" ? " — duplicate it to prepare changes." : "."}</p>}
    {decision?.action === "rejected" && course.status !== "pending_review" && <p className="fac-error mb-3"><span><b>Reviewer feedback ({decision.authorName}):</b> {decision.comment}</span></p>}
    {course.aiGenerated && <div className="ai-warning mb-3"><Sparkles aria-hidden /><p>Parts of this course were drafted by AI. Each AI lesson must be validated before the course can be submitted.</p></div>}
    {issues.length > 0 && <details className="admin-panel mb-3" open={blocking.length > 0 && editable}><summary className="font-bold">{blocking.length} item(s) required before review · {issues.length - blocking.length} suggestion(s)</summary><ul className="mt-2 space-y-1 text-sm">{issues.map((issue, index) => <li key={index} className={issue.blocking ? "text-destructive" : "text-muted-foreground"}>{issue.blocking ? "Required: " : "Suggestion: "}{issue.text}</li>)}</ul></details>}

    <div className="admin-actions mb-3" role="tablist">{(["structure", "details", "preview", "history"] as const).map((item) => <Button key={item} role="tab" aria-selected={tab === item} size="sm" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>{item === "structure" ? "Modules & lessons" : item === "details" ? "Course details" : item === "preview" ? "Farmer preview" : "Revision history"}</Button>)}</div>

    {tab === "details" && <CourseDetails key={`${course.id}-${course.updatedAt}`} course={course} editable={editable} onSave={(patch) => guard(updateCourseDetails(course.id, actor, patch), "Course details saved.")} />}

    {tab === "structure" && <div className="editor-layout">
      <div className="space-y-3">
        {course.modules.map((module, index) => <ModuleCard key={module.id} course={course} module={module} index={index} editable={editable} selected={active?.lesson.id ?? null} onSelect={setSelected} />)}
        {editable && <Button variant="outline" onClick={() => { const id = addModule(course.id, actor); if (id) toast.success("Module added."); }}><Plus aria-hidden />Add module</Button>}
        {!course.modules.length && <p className="fac-empty">No modules yet.</p>}
      </div>
      <div className="min-w-0">
        {active ? <LessonEditor key={`${active.lesson.id}-${course.updatedAt}`} course={course} lesson={active.lesson} editable={editable} onPreview={() => { setSelected(active.lesson.id); setTab("preview"); }} /> : <p className="fac-empty">Add a lesson to a module to start writing.</p>}
      </div>
    </div>}

    {tab === "preview" && (active ? <LessonPreview course={course} lesson={active.lesson} index={lessons.findIndex((row) => row.lesson.id === active.lesson.id)} total={lessons.length} onPick={setSelected} lessons={lessons.map((row) => row.lesson)} /> : <p className="fac-empty">Nothing to preview yet.</p>)}

    {tab === "history" && <ul className="admin-panel fac-list">{courseRevisions(state, course.id).map((item) => <li key={item.id}><span>{item.summary}<small className="block text-muted-foreground">Revision {item.revision} · {item.by}</small></span><small>{formatDateTime(item.at)}</small></li>)}</ul>}
  </CourseEditorProvider>;
}

