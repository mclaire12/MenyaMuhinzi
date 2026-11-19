import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, Headphones, Phone, PlayCircle, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { ConfirmButton, CropTag, formatDateTime, lines, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { crops, formatLabels, languageNames, levels } from "@/lib/mock/crops";
import { courseIssues } from "@/lib/mock/quality";
import { addLesson, addModule, deleteLesson, deleteModule, duplicateCourse, moveLesson, moveModule, runCourseAction, updateCourseDetails, updateLesson, updateModule } from "@/lib/mock/services/courses";
import { courseRevisions, latestDecision, setLessonValidated } from "@/lib/mock/services/reviews";
import type { ContentLanguage, Course, CourseModule, CropSlug, Lesson, LessonFormat } from "@/lib/mock/types";
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

  return <>
    <Link to="/facilitator/courses" className="text-sm font-bold text-primary">Back to courses</Link>
    <PageHead title={course.title} text={`${course.level} · ${languageNames[course.language]} · ${course.durationWeeks} week(s) · revision ${course.revision}`}>
      <CropTag crop={course.crop} /><StatusPill status={course.status} />
    </PageHead>
    <div className="admin-actions mb-3">
      {facilitatorActions(course.status, permissions).map((action) => action === "archive"
        ? <ConfirmButton key={action} label="Archive" title="Archive this course?" text="Archived courses leave the farmer catalogue. You can restore them as drafts." onConfirm={() => act("archive")} />
        : <Button key={action} size="sm" variant={action === "submit" || action === "publish" ? "default" : "outline"} disabled={action === "submit" && blocking.length > 0} onClick={() => act(action)}>{actionLabels[action]}</Button>)}
      <Button size="sm" variant="outline" onClick={() => { const id = duplicateCourse(actor, current.id); if (id) { toast.success("Duplicated as a draft."); navigate({ to: "/facilitator/courses/$courseId", params: { courseId: id } }); } }}>Duplicate</Button>
      <Button asChild size="sm" variant="outline"><Link to="/facilitator/reviews" search={{ course: course.id }}>Review feedback</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/facilitator/materials" search={{ course: course.id }}>Learning materials</Link></Button>
    </div>
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
  </>;
}

function CourseDetails({ course, editable, onSave }: { course: Course; editable: boolean; onSave: (patch: Partial<Course>) => void }) {
  const [values, setValues] = useState({ title: course.title, crop: course.crop, level: course.level, description: course.description, objectives: course.objectives.join("\n"), language: course.language, durationWeeks: course.durationWeeks });
  return <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); if (values.title.trim().length < 5) { toast.error("The title needs at least 5 characters."); return; } onSave({ ...values, title: values.title.trim(), objectives: lines(values.objectives) }); }}>
    <fieldset disabled={!editable} className="admin-form">
      <label>Title<input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
      <div className="fac-row">
        <label>Crop<select value={values.crop} onChange={(event) => setValues({ ...values, crop: event.target.value as CropSlug })}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_rw}</option>)}</select></label>
        <label>Level<select value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value })}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
        <label>Language<select value={values.language} onChange={(event) => setValues({ ...values, language: event.target.value as ContentLanguage })}>{(Object.keys(languageNames) as ContentLanguage[]).map((code) => <option key={code} value={code}>{languageNames[code]}</option>)}</select></label>
        <label>Weeks<input type="number" min={1} max={26} value={values.durationWeeks} onChange={(event) => setValues({ ...values, durationWeeks: Number(event.target.value) })} /></label>
      </div>
      <label>Description<textarea rows={3} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
      <label>Learning objectives (one per line)<textarea rows={4} value={values.objectives} onChange={(event) => setValues({ ...values, objectives: event.target.value })} /></label>
      <div><Button type="submit">Save details</Button></div>
    </fieldset>
  </form>;
}

function ModuleCard({ course, module, index, editable, selected, onSelect }: { course: Course; module: CourseModule; index: number; editable: boolean; selected: string | null; onSelect: (id: string) => void }) {
  const { actor } = useFacilitator();
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description);
  const dirty = title !== module.title || description !== module.description;
  return <section className="admin-panel module-editor">
    <div className="flex items-start gap-2">
      <span className="module-number">0{index + 1}</span>
      <div className="admin-form min-w-0 flex-1">
        <input aria-label={`Module ${index + 1} title`} value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} />
        <textarea aria-label={`Module ${index + 1} description`} rows={2} placeholder="Module description" value={description} disabled={!editable} onChange={(event) => setDescription(event.target.value)} />
      </div>
    </div>
    {editable && <div className="admin-actions mt-2">
      {dirty && <Button size="sm" onClick={() => { if (!title.trim()) { toast.error("Module title is required."); return; } updateModule(course.id, module.id, actor, { title: title.trim(), description: description.trim() }); toast.success("Module saved."); }}>Save module</Button>}
      <Button size="icon" variant="ghost" aria-label="Move module up" disabled={index === 0} onClick={() => moveModule(course.id, module.id, -1, actor)}><ArrowUp aria-hidden /></Button>
      <Button size="icon" variant="ghost" aria-label="Move module down" disabled={index === course.modules.length - 1} onClick={() => moveModule(course.id, module.id, 1, actor)}><ArrowDown aria-hidden /></Button>
      <ConfirmButton label="Delete module" title={`Delete “${module.title}”?`} text={`Its ${module.lessons.length} lesson(s) will be deleted too.`} onConfirm={() => { deleteModule(course.id, module.id, actor); toast.success("Module deleted."); }} variant="ghost" />
    </div>}
    <ol className="mt-2 space-y-1">{module.lessons.map((lesson, lessonIndex) => <li key={lesson.id} className={lesson.id === selected ? "lesson-pick is-active" : "lesson-pick"}>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(lesson.id)}><span className="block truncate font-bold">{lessonIndex + 1}. {lesson.title}</span><small className="text-muted-foreground">{formatLabels[lesson.format]} · {lesson.durationMinutes} min{lesson.aiGenerated ? lesson.validated ? " · AI, validated" : " · AI, not validated" : ""}</small></button>
      {editable && <span className="flex shrink-0">
        <Button size="icon" variant="ghost" aria-label="Move lesson up" disabled={lessonIndex === 0} onClick={() => moveLesson(course.id, module.id, lesson.id, -1, actor)}><ArrowUp aria-hidden /></Button>
        <Button size="icon" variant="ghost" aria-label="Move lesson down" disabled={lessonIndex === module.lessons.length - 1} onClick={() => moveLesson(course.id, module.id, lesson.id, 1, actor)}><ArrowDown aria-hidden /></Button>
        <ConfirmButton label="Delete" title={`Delete “${lesson.title}”?`} text="This lesson and its content will be removed from the draft." onConfirm={() => { deleteLesson(course.id, lesson.id, actor); toast.success("Lesson deleted."); }} variant="ghost" />
      </span>}
    </li>)}</ol>
    {editable && <Button size="sm" variant="outline" className="mt-2" onClick={() => { const id = addLesson(course.id, module.id, actor); if (id) { onSelect(id); toast.success("Lesson added."); } }}><Plus aria-hidden />Add lesson</Button>}
  </section>;
}

function LessonEditor({ course, lesson, editable, onPreview }: { course: Course; lesson: Lesson; editable: boolean; onPreview: () => void }) {
  const { actor, permissions } = useFacilitator();
  const [values, setValues] = useState({ ...lesson, objectivesText: lesson.objectives.join("\n"), keyPointsText: lesson.keyPoints.join("\n") });
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((current) => ({ ...current, [key]: value }));
  function save() {
    if (!values.title.trim()) { toast.error("Lesson title is required."); return; }
    if (values.durationMinutes < 1) { toast.error("Duration must be at least 1 minute."); return; }
    const { objectivesText, keyPointsText, id, ...rest } = values;
    const ok = updateLesson(course.id, lesson.id, actor, { ...rest, title: values.title.trim(), objectives: lines(objectivesText), keyPoints: lines(keyPointsText) });
    if (ok) toast.success("Lesson saved."); else toast.error("Only draft courses can be edited.");
  }
  return <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">Lesson editor</h2><Button type="button" size="sm" variant="outline" onClick={onPreview}>Preview as farmer</Button></div>
    {lesson.aiGenerated && <label className="fac-validate"><input type="checkbox" checked={lesson.validated} disabled={!editable} onChange={(event) => { const ok = setLessonValidated(course.id, lesson.id, actor, event.target.checked, permissions); if (ok) toast.success(event.target.checked ? "Lesson marked as validated." : "Validation removed."); }} />AI-generated lesson — I have checked it against approved agricultural guidance</label>}
    <fieldset disabled={!editable} className="admin-form">
      <label>Title<input value={values.title} onChange={(event) => set("title", event.target.value)} /></label>
      <label>Description<input value={values.summary} onChange={(event) => set("summary", event.target.value)} placeholder="One-line summary farmers see in the list" /></label>
      <div className="fac-row">
        <fieldset className="fac-formats"><legend>Learning format</legend>{(["reading", "video", "audio"] as LessonFormat[]).map((format) => <label key={format}><input type="radio" name="format" checked={values.format === format} onChange={() => set("format", format)} />{formatLabels[format]}</label>)}</fieldset>
        <label>Duration (minutes)<input type="number" min={1} max={120} value={values.durationMinutes} onChange={(event) => set("durationMinutes", Number(event.target.value))} /></label>
      </div>
      <label>Learning objectives (one per line)<textarea rows={2} value={values.objectivesText} onChange={(event) => set("objectivesText", event.target.value)} /></label>
      <label>Educational text<textarea rows={6} value={values.body} onChange={(event) => set("body", event.target.value)} /></label>
      <label>Practical example<textarea rows={2} value={values.example} onChange={(event) => set("example", event.target.value)} /></label>
      <label>Key learning points (one per line)<textarea rows={3} value={values.keyPointsText} onChange={(event) => set("keyPointsText", event.target.value)} /></label>
      <h3 className="mt-2 text-sm font-bold">Basic-phone farmers</h3>
      <label>USSD / SMS text ({values.ussdText.length}/160)<textarea rows={2} maxLength={160} value={values.ussdText} onChange={(event) => set("ussdText", event.target.value)} /></label>
      <label>Narration script for voice calls (IVR) and audio<textarea rows={3} value={values.narration} onChange={(event) => set("narration", event.target.value)} /></label>
      <label>Supporting illustration<input value={values.illustration} onChange={(event) => set("illustration", event.target.value)} placeholder="Describe the image or diagram" /></label>
      <p className="text-xs text-muted-foreground">Attach images, documents, video scenes and audio in <Link to="/facilitator/materials" search={{ course: course.id, lesson: lesson.id }} className="font-bold text-primary">Learning materials</Link>.</p>
      <div><Button type="submit">Save lesson</Button></div>
    </fieldset>
  </form>;
}

function LessonPreview({ course, lesson, index, total, lessons, onPick }: { course: Course; lesson: Lesson; index: number; total: number; lessons: Lesson[]; onPick: (id: string) => void }) {
  return <div className="preview-layout">
    <div className="admin-panel">
      <label className="admin-form mb-3">Lesson<select value={lesson.id} onChange={(event) => onPick(event.target.value)}>{lessons.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.title}</option>)}</select></label>
      <p className="eyebrow">Isomo {index + 1} kuri {total} · Iminota {lesson.durationMinutes}</p>
      <h2 className="mt-2 text-2xl">{lesson.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
      <div className="mt-3 flex gap-2 text-sm"><span className={lesson.format === "reading" ? "preview-tab is-on" : "preview-tab"}><BookOpen aria-hidden />Soma</span><span className={lesson.format === "video" ? "preview-tab is-on" : "preview-tab"}><PlayCircle aria-hidden />Reba</span><span className={lesson.format === "audio" ? "preview-tab is-on" : "preview-tab"}><Headphones aria-hidden />Umva</span></div>
      <p className="mt-4 whitespace-pre-line leading-relaxed">{lesson.body || "Nta nyandiko irashyirwamo."}</p>
      {lesson.example && <p className="mt-3 text-sm"><b>Urugero:</b> {lesson.example}</p>}
      <div className="key-points mt-4"><h3 className="mb-2 font-semibold">Ibyo kwibuka</h3><ul className="space-y-1">{lesson.keyPoints.map((point) => <li key={point} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden />{point}</li>)}</ul></div>
    </div>
    <div className="phone-preview" aria-label="Basic phone preview">
      <p className="phone-title"><Phone aria-hidden />Basic phone</p>
      <div className="phone-screen"><b>MenyaMuhinzi</b><p>{lesson.ussdText || "Nta butumwa bwa USSD burashyirwaho."}</p><p>1. Komeza<br />0. Subira</p></div>
      <p className="mt-3 text-xs font-bold">Voice call (IVR)</p>
      <p className="text-xs">{lesson.narration || "Nta nyandiko y'ijwi irashyirwaho."}</p>
      <p className="mt-2 text-xs text-muted-foreground">Keys: 0 repeat · 8 ask a question · 9 assessment</p>
    </div>
  </div>;
}
