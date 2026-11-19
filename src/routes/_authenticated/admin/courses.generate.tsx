import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHead, useAdminActor } from "@/components/admin/shell";
import { ConfirmButton, CropTag, lines } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { usable } from "@/lib/admin/ai";
import { useAdmin } from "@/lib/admin/store";
import { crops, levels } from "@/lib/mock/crops";
import { generateCourse, lessonKey, recordGeneration, regenerateLesson, regenerateModule, saveGeneration, updateGeneration, validateInput } from "@/lib/mock/services/ai-generation";
import type { ContentLanguage, CropSlug, GeneratedCourse, GeneratedLesson, GeneratedModule, GenerationInput } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/admin/courses/generate")({ component: GeneratePage });

const blankInput = (): GenerationInput => ({ topic: "", crop: "tomato", level: levels[0]!, description: "", objectives: [], language: "rw", durationWeeks: 4, moduleCount: 3, instructions: "" });
const errorText = (error: unknown) => (error instanceof Error ? error.message : "The AI service did not respond. Try again.");

function GeneratePage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { actor } = useAdminActor();
  const [input, setInput] = useState<GenerationInput>(blankInput);
  const [objectives, setObjectives] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof GenerationInput, string>>>({});
  const [result, setResult] = useState<GeneratedCourse | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [variant, setVariant] = useState(0);
  const lessonVariants = useRef<Record<string, number>>({});
  const moduleVariants = useRef<Record<number, number>>({});
  const bot = admin.chatbots.find((item) => item.feature === "course_generation");
  const model = admin.models.find((item) => item.id === bot?.modelId);
  const blocked = !bot ? "No course generation assistant is configured." : bot.status !== "active" ? `${bot.name} is inactive. Activate it in AI Management to generate courses.` : !usable(model) ? `${bot.name} uses ${model?.name ?? "a missing model"}, which is ${model?.status ?? "not in the registry"}. Assign an active model in AI Management.` : !bot.languages.includes(input.language) ? `${bot.name} is not configured for ${input.language === "en" ? "English" : "Kinyarwanda"}.` : "";
  const set = <K extends keyof GenerationInput>(key: K, value: GenerationInput[K]) => setInput((current) => ({ ...current, [key]: value }));

  async function generate(nextVariant: number) {
    const values = { ...input, objectives: lines(objectives) };
    const found = validateInput(values);
    setErrors(found);
    if (Object.keys(found).length || blocked) return;
    setBusy("course"); setFailure("");
    try {
      const generated = await generateCourse(values, nextVariant);
      setInput(values); setResult(generated); setVariant(nextVariant); setReviewed(new Set());
      setGenerationId(recordGeneration("admin", values, generated));
      toast.success("Draft generated. Review every lesson before saving.");
    } catch (error) { setFailure(errorText(error)); }
    finally { setBusy(null); }
  }

  function updateModule(m: number, patch: Partial<GeneratedModule>) {
    setResult((current) => current && { ...current, modules: current.modules.map((module, index) => (index === m ? { ...module, ...patch } : module)) });
  }
  function updateLesson(m: number, l: number, patch: Partial<GeneratedLesson>) {
    setResult((current) => current && { ...current, modules: current.modules.map((module, index) => (index === m ? { ...module, lessons: module.lessons.map((lesson, li) => (li === l ? { ...lesson, ...patch } : lesson)) } : module)) });
  }
  function markReviewed(key: string, on: boolean) {
    setReviewed((current) => { const next = new Set(current); if (on) next.add(key); else next.delete(key); return next; });
  }

  async function redoModule(m: number) {
    if (!result) return;
    setBusy(`m${m}`);
    try {
      const next = (moduleVariants.current[m] ?? 0) + 1;
      moduleVariants.current[m] = next;
      const module = await regenerateModule(input, m, next);
      updateModule(m, module);
      setReviewed((current) => new Set([...current].filter((key) => !key.startsWith(`${m}-`))));
      toast.success(`Module ${m + 1} regenerated.`);
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(null); }
  }

  async function redoLesson(m: number, l: number) {
    if (!result) return;
    setBusy(`m${m}l${l}`);
    try {
      const key = lessonKey(m, l);
      const next = (lessonVariants.current[key] ?? 0) + 1;
      lessonVariants.current[key] = next;
      const lesson = await regenerateLesson(input, result.modules[m]!.bankIndex, l, next);
      updateLesson(m, l, lesson);
      markReviewed(lessonKey(m, l), false);
      toast.success("Lesson regenerated.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(null); }
  }

  function save() {
    if (!result || !generationId) return;
    if (result.title.trim().length < 5) { toast.error("The course title needs at least 5 characters."); return; }
    updateGeneration(generationId, result);
    const saved = saveGeneration(generationId, actor, false, reviewed);
    if (!saved.courseId) { toast.error(saved.error ?? "Could not save the draft."); return; }
    toast.success("Saved as a draft. It is not published.");
    navigate({ to: "/admin/courses/$courseId", params: { courseId: saved.courseId } });
  }

  const total = result?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;
  const questions = result?.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.questions)) ?? [];

  return <>
    <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="size-4" aria-hidden />Back to courses</Link>
    <PageHead title="Generate a course" text={`Simulated AI drafts a full course from your brief. ${bot ? `Uses ${bot.name} with ${model?.name ?? "no model"}.` : ""} Nothing is published automatically.`}>
      {result && <><ConfirmButton size="default" label="Regenerate course" title="Regenerate the whole course?" text="Your edits and review ticks on this draft are replaced by a new version." onConfirm={() => void generate(variant + 1)} /><Button onClick={save} disabled={!!busy}>Save as draft</Button></>}
    </PageHead>
    {blocked && <p className="fac-error mb-3">{blocked}</p>}
    {!result ? <form className="admin-form admin-panel max-w-3xl" noValidate onSubmit={(event) => { event.preventDefault(); void generate(0); }}>
      <label>Course topic<input value={input.topic} onChange={(event) => set("topic", event.target.value)} placeholder="For example: Kurwanya indwara z'inyanya" aria-invalid={!!errors.topic} />{errors.topic && <span className="fac-field-error">{errors.topic}</span>}</label>
      <div className="fac-row">
        <label>Crop<select value={input.crop} onChange={(event) => set("crop", event.target.value as CropSlug)}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_en} ({crop.name_rw})</option>)}</select></label>
        <label>Target audience<select value={input.level} onChange={(event) => set("level", event.target.value)}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
        <label>Language<select value={input.language} onChange={(event) => set("language", event.target.value as ContentLanguage)}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
      </div>
      <div className="fac-row">
        <label>Duration (weeks)<input type="number" min={1} max={26} value={input.durationWeeks} onChange={(event) => set("durationWeeks", event.target.valueAsNumber)} aria-invalid={!!errors.durationWeeks} />{errors.durationWeeks && <span className="fac-field-error">{errors.durationWeeks}</span>}</label>
        <label>Number of modules<input type="number" min={1} max={6} value={input.moduleCount} onChange={(event) => set("moduleCount", event.target.valueAsNumber)} aria-invalid={!!errors.moduleCount} />{errors.moduleCount && <span className="fac-field-error">{errors.moduleCount}</span>}</label>
      </div>
      <label>Short description (optional)<textarea rows={2} value={input.description} onChange={(event) => set("description", event.target.value)} /></label>
      <label>Learning objectives (one per line, optional)<textarea rows={3} value={objectives} onChange={(event) => setObjectives(event.target.value)} /></label>
      <label>Additional instructions (optional)<textarea rows={2} value={input.instructions} onChange={(event) => set("instructions", event.target.value)} placeholder="For example: focus on low-cost practices" /></label>
      {failure && <p className="fac-error" role="alert">{failure}</p>}
      <div className="admin-actions"><Button type="submit" disabled={!!busy || !!blocked}><Sparkles aria-hidden />{busy ? "Generating…" : "Generate course"}</Button></div>
    </form> : <>
      <article className="admin-panel admin-form">
        <div className="admin-actions items-center"><CropTag crop={input.crop} /><span className="text-sm text-muted-foreground">{input.level} · {input.durationWeeks} weeks · {input.language === "en" ? "English" : "Kinyarwanda"} · {reviewed.size}/{total} lessons reviewed · {questions.length} assessment questions</span></div>
        <label>Title<input value={result.title} onChange={(event) => setResult({ ...result, title: event.target.value })} /></label>
        <label>Description<textarea rows={2} value={result.description} onChange={(event) => setResult({ ...result, description: event.target.value })} /></label>
        <label>Learning objectives (one per line)<textarea rows={3} value={result.objectives.join("\n")} onChange={(event) => setResult({ ...result, objectives: event.target.value.split("\n") })} onBlur={() => setResult({ ...result, objectives: lines(result.objectives.join("\n")) })} /></label>
        <p className="fac-note">Lessons you do not tick as reviewed stay marked unvalidated, and the course cannot be published until every lesson is validated.</p>
      </article>
      {result.modules.map((module, m) => <section key={m} className="admin-panel mt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">Module {m + 1}</h2><Button size="sm" variant="outline" disabled={!!busy} onClick={() => void redoModule(m)}><RefreshCw aria-hidden />{busy === `m${m}` ? "Regenerating…" : "Regenerate module"}</Button></div>
        <div className="admin-form"><label>Module title<input value={module.title} onChange={(event) => updateModule(m, { title: event.target.value })} /></label><label>Module description<textarea rows={2} value={module.description} onChange={(event) => updateModule(m, { description: event.target.value })} /></label></div>
        {module.lessons.map((lesson, l) => { const key = lessonKey(m, l); return <details key={l} className="mt-3 rounded-md border p-3">
          <summary className="cursor-pointer font-bold">Lesson {m + 1}.{l + 1}: {lesson.title}{reviewed.has(key) ? " · reviewed" : ""}</summary>
          <div className="admin-form mt-3">
            <label>Lesson title<input value={lesson.title} onChange={(event) => updateLesson(m, l, { title: event.target.value })} /></label>
            <label>Summary<textarea rows={2} value={lesson.summary} onChange={(event) => updateLesson(m, l, { summary: event.target.value })} /></label>
            <label>Lesson content<textarea rows={6} value={lesson.body} onChange={(event) => updateLesson(m, l, { body: event.target.value })} /></label>
            <label>Example from the field<textarea rows={2} value={lesson.example} onChange={(event) => updateLesson(m, l, { example: event.target.value })} /></label>
            <label>Key points (one per line)<textarea rows={3} value={lesson.keyPoints.join("\n")} onChange={(event) => updateLesson(m, l, { keyPoints: event.target.value.split("\n") })} /></label>
            <label>USSD text<textarea rows={2} value={lesson.ussdText} onChange={(event) => updateLesson(m, l, { ussdText: event.target.value })} /></label>
            {lesson.questions.length > 0 && <div><p className="font-bold">Assessment questions</p><ul className="list-disc pl-5 text-sm">{lesson.questions.map((question, index) => <li key={index}>{question.question}</li>)}</ul></div>}
            <div className="admin-actions items-center"><label className="flex items-center gap-2"><input type="checkbox" checked={reviewed.has(key)} onChange={(event) => markReviewed(key, event.target.checked)} />I reviewed this lesson</label><Button size="sm" variant="outline" disabled={!!busy} onClick={() => void redoLesson(m, l)}><RefreshCw aria-hidden />{busy === `m${m}l${l}` ? "Regenerating…" : "Regenerate lesson"}</Button></div>
          </div>
        </details>; })}
      </section>)}
      <div className="admin-grid-2 mt-3">
        <article className="admin-panel"><h2 className="mb-2 font-bold">Course summary</h2><ul className="list-disc pl-5 text-sm">{result.outline.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="admin-panel"><h2 className="mb-2 font-bold">Suggested resources</h2>{result.resources.length ? <ul className="list-disc pl-5 text-sm">{result.resources.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">None suggested.</p>}</article>
      </div>
      <div className="admin-actions mt-4"><Button onClick={save} disabled={!!busy}>Save as draft</Button><ConfirmButton size="default" label="Discard draft" title="Discard this generated draft?" text="Nothing is saved to the course list." onConfirm={() => { setResult(null); setGenerationId(null); }} /></div>
    </>}
  </>;
}
