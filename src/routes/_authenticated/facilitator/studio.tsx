import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { formatDateTime, lines, Panel } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { crops, languageNames, levels } from "@/lib/mock/crops";
import { generateCourse, lessonKey, recordGeneration, regenerateLesson, regenerateModule, saveGeneration, updateGeneration, validateInput } from "@/lib/mock/services/ai-generation";
import type { ContentLanguage, CropSlug, GeneratedCourse, GeneratedLesson, GenerationInput } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/studio")({
  validateSearch: (search: Record<string, unknown>): { generation?: string } => (typeof search["generation"] === "string" ? { generation: search["generation"] } : {}),
  component: Studio,
});

const emptyInput: GenerationInput = { topic: "", crop: "tomato", level: "Intangiriro", description: "", objectives: [], language: "rw", durationWeeks: 3, moduleCount: 3, instructions: "" };
const steps = ["Reading approved crop guidance", "Drafting modules and lessons", "Writing narration and basic-phone text", "Preparing assessment questions"];

function Studio() {
  const { facilitator, actor, state } = useFacilitator();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [input, setInput] = useState<GenerationInput>(emptyInput);
  const [objectivesText, setObjectivesText] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof GenerationInput, string>>>({});
  const [phase, setPhase] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<GeneratedCourse | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [validated, setValidated] = useState<Set<string>>(new Set());
  const history = state.generations.filter((item) => item.facilitatorId === facilitator.id);
  const saved = history.find((item) => item.id === generationId)?.courseId ?? null;

  useEffect(() => {
    const found = state.generations.find((item) => item.id === search.generation && item.facilitatorId === facilitator.id);
    if (!found) return;
    open(found.id);
  }, [search.generation]);

  function open(id: string) {
    const found = state.generations.find((item) => item.id === id);
    if (!found) return;
    setInput(found.input);
    setObjectivesText(found.input.objectives.join("\n"));
    setResult(found.result);
    setGenerationId(found.id);
    setValidated(new Set());
    setPhase("ready");
  }

  function set<K extends keyof GenerationInput>(key: K, value: GenerationInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function run(nextVariant: number) {
    const values = { ...input, objectives: lines(objectivesText) };
    const found = validateInput(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setPhase("generating");
    setStep(0);
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, steps.length - 1)), 350);
    try {
      const generated = await generateCourse(values, nextVariant);
      setResult(generated);
      setVariant(nextVariant);
      setValidated(new Set());
      setGenerationId(recordGeneration(facilitator.id, values, generated));
      setPhase("ready");
      toast.success("Draft generated. Review every lesson before saving.");
    } catch (error) {
      setPhase("error");
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      clearInterval(timer);
    }
  }

  function edit(change: (course: GeneratedCourse) => GeneratedCourse) {
    setResult((current) => {
      if (!current) return current;
      const next = change(current);
      if (generationId) updateGeneration(generationId, next);
      return next;
    });
  }

  const editLesson = (m: number, l: number, patch: Partial<GeneratedLesson>) =>
    edit((course) => ({ ...course, modules: course.modules.map((module, mi) => (mi === m ? { ...module, lessons: module.lessons.map((lesson, li) => (li === l ? { ...lesson, ...patch } : lesson)) } : module)) }));

  async function redoModule(m: number) {
    setBusy(`m${m}`);
    try {
      const module = await regenerateModule(input, m, variant + m + 1 + Math.floor(Math.random() * 5));
      edit((course) => ({ ...course, modules: course.modules.map((item, mi) => (mi === m ? module : item)) }));
      setValidated((current) => new Set([...current].filter((key) => !key.startsWith(`${m}-`))));
      toast.success(`Module ${m + 1} regenerated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Regeneration failed.");
    } finally { setBusy(null); }
  }

  async function redoLesson(m: number, l: number) {
    if (!result) return;
    setBusy(`l${m}-${l}`);
    try {
      const lesson = await regenerateLesson(input, result.modules[m]!.bankIndex, l, 1 + Math.floor(Math.random() * 3));
      editLesson(m, l, lesson);
      setValidated((current) => { const next = new Set(current); next.delete(lessonKey(m, l)); return next; });
      toast.success("Lesson regenerated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Regeneration failed.");
    } finally { setBusy(null); }
  }

  function save(submit: boolean) {
    if (!generationId) return;
    const outcome = saveGeneration(generationId, actor, submit, validated);
    if (outcome.error) toast.warning(outcome.error); else toast.success(submit ? "Saved and submitted for expert review." : "Saved as a draft course.");
    if (outcome.courseId) navigate({ to: "/facilitator/courses/$courseId", params: { courseId: outcome.courseId } });
  }

  const totalLessons = result?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;
  return <>
    <PageHead title="AI Course Studio" text="Describe the course and let the assistant draft it. Everything it writes is a draft that you must check against approved agricultural guidance." />
    <div className="studio-layout">
      <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); run(0); }} noValidate>
        <h2 className="text-lg">Course brief</h2>
        <label>Course title or topic<input value={input.topic} onChange={(event) => set("topic", event.target.value)} placeholder="Urugero: Kurwanya indwara z'inyanya" aria-invalid={!!errors.topic} /></label>
        {errors.topic && <p className="fac-field-error">{errors.topic}</p>}
        <div className="fac-row">
          <label>Crop<select value={input.crop} onChange={(event) => set("crop", event.target.value as CropSlug)}>{crops.map((crop) => <option key={crop.slug} value={crop.slug}>{crop.name_rw} ({crop.name_en})</option>)}</select></label>
          <label>Farmer level<select value={input.level} onChange={(event) => set("level", event.target.value)}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
        </div>
        <label>Course description<textarea rows={2} value={input.description} onChange={(event) => set("description", event.target.value)} placeholder="Optional — the assistant writes one if empty" /></label>
        <label>Learning objectives (one per line)<textarea rows={3} value={objectivesText} onChange={(event) => setObjectivesText(event.target.value)} /></label>
        <div className="fac-row">
          <label>Content language<select value={input.language} onChange={(event) => set("language", event.target.value as ContentLanguage)}>{(Object.keys(languageNames) as ContentLanguage[]).map((code) => <option key={code} value={code}>{languageNames[code]}{code === "rw" ? " (primary)" : ""}</option>)}</select></label>
          <label>Duration (weeks)<input type="number" min={1} max={26} value={input.durationWeeks} onChange={(event) => set("durationWeeks", Number(event.target.value))} aria-invalid={!!errors.durationWeeks} /></label>
          <label>Modules<input type="number" min={1} max={6} value={input.moduleCount} onChange={(event) => set("moduleCount", Number(event.target.value))} aria-invalid={!!errors.moduleCount} /></label>
        </div>
        {(errors.durationWeeks || errors.moduleCount) && <p className="fac-field-error">{errors.durationWeeks ?? errors.moduleCount}</p>}
        {input.language !== "rw" && <p className="text-xs text-muted-foreground">The demo generator writes Kinyarwanda. Translations into {languageNames[input.language]} must be added and reviewed by a facilitator.</p>}
        <label>Additional instructions for the AI<textarea rows={2} value={input.instructions} onChange={(event) => set("instructions", event.target.value)} placeholder="Urugero: Shyiramo ingero zo mu Majyaruguru" /></label>
        <Button type="submit" disabled={phase === "generating"}>{phase === "generating" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}Generate course</Button>
        {history.length > 0 && <div className="mt-2"><h3 className="mb-1 text-sm font-bold">Recent generations</h3><ul className="space-y-1 text-sm">{history.slice(0, 5).map((item) => <li key={item.id}><button type="button" className="text-left text-primary underline-offset-2 hover:underline" onClick={() => open(item.id)}>{item.result.title}</button><small className="block text-muted-foreground">{formatDateTime(item.createdAt)} · {item.status}</small></li>)}</ul></div>}
      </form>

      <div className="min-w-0">
        {phase === "idle" && <div className="admin-panel fac-empty-panel"><Sparkles aria-hidden /><p>Fill in the brief and choose Generate course. The draft appears here for review.</p></div>}
        {phase === "generating" && <div className="admin-panel" role="status"><h2 className="mb-3 text-lg">Generating a draft…</h2><ol className="space-y-2">{steps.map((label, index) => <li key={label} className="flex items-center gap-2 text-sm">{index < step ? <CheckCircle2 className="size-4 text-primary" aria-hidden /> : index === step ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <span className="size-4" />}{label}</li>)}</ol></div>}
        {phase === "error" && <div className="fac-error" role="alert"><span>The AI service did not respond. Nothing was saved.</span><Button size="sm" variant="outline" onClick={() => run(variant)}><RefreshCw aria-hidden />Try again</Button></div>}
        {phase === "ready" && result && <div className="space-y-3">
          <div className="ai-warning"><Sparkles aria-hidden /><p><b>AI-generated draft.</b> It must be validated by a qualified agronomist. It will not be published automatically: saving creates a draft and submitting sends it to expert review.</p></div>
          <div className="admin-panel space-y-2">
            <label className="admin-form">Course title<input value={result.title} onChange={(event) => edit((course) => ({ ...course, title: event.target.value }))} /></label>
            <label className="admin-form">Description<textarea rows={3} value={result.description} onChange={(event) => edit((course) => ({ ...course, description: event.target.value }))} /></label>
            <label className="admin-form">Learning objectives (one per line)<textarea rows={3} value={result.objectives.join("\n")} onChange={(event) => edit((course) => ({ ...course, objectives: lines(event.target.value) }))} /></label>
            <div><h3 className="text-sm font-bold">Course outline</h3><ol className="mt-1 list-inside text-sm text-muted-foreground">{result.outline.map((row) => <li key={row}>{row}</li>)}</ol></div>
            <div><h3 className="text-sm font-bold">Suggested illustrations and resources</h3><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{result.resources.map((row) => <li key={row}>{row}</li>)}</ul></div>
          </div>
          {result.modules.map((module, m) => <Panel key={`${m}-${module.title}`} title={`Module ${m + 1}: ${module.title}`} action={<Button size="sm" variant="outline" disabled={!!busy || !!saved} onClick={() => redoModule(m)}>{busy === `m${m}` ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}Regenerate module</Button>}>
            <p className="mb-2 text-sm text-muted-foreground">{module.description}</p>
            {module.lessons.map((lesson, l) => <details key={`${l}-${lesson.title}`} className="studio-lesson">
              <summary><span className="font-bold">{lesson.title}</span><span className="flex items-center gap-2">{validated.has(lessonKey(m, l)) ? <span className="status-pill" data-status="approved">Checked</span> : <span className="ai-tag">Needs validation</span>}<small>{lesson.durationMinutes} min</small></span></summary>
              <div className="admin-form mt-2">
                <label>Lesson title<input value={lesson.title} onChange={(event) => editLesson(m, l, { title: event.target.value })} /></label>
                <label>Explanation<textarea rows={4} value={lesson.body} onChange={(event) => editLesson(m, l, { body: event.target.value })} /></label>
                <label>Practical example<textarea rows={2} value={lesson.example} onChange={(event) => editLesson(m, l, { example: event.target.value })} /></label>
                <label>Key learning points (one per line)<textarea rows={3} value={lesson.keyPoints.join("\n")} onChange={(event) => editLesson(m, l, { keyPoints: lines(event.target.value) })} /></label>
                <label>Narration script<textarea rows={3} value={lesson.narration} onChange={(event) => editLesson(m, l, { narration: event.target.value })} /></label>
                <label>Basic-phone text ({lesson.ussdText.length}/160)<textarea rows={2} maxLength={160} value={lesson.ussdText} onChange={(event) => editLesson(m, l, { ussdText: event.target.value })} /></label>
                <label>Suggested illustration<input value={lesson.illustration} onChange={(event) => editLesson(m, l, { illustration: event.target.value })} /></label>
                <div><h4 className="text-sm font-bold">Suggested assessment questions</h4><ul className="mt-1 space-y-1 text-sm">{lesson.questions.map((question) => <li key={question.question}>{question.question}<span className="block text-muted-foreground">{question.options.map((option, index) => (index === question.answer ? `✓ ${option}` : option)).join(" · ")}</span></li>)}</ul></div>
                <div className="admin-actions">
                  <Button type="button" size="sm" variant="outline" disabled={!!busy || !!saved} onClick={() => redoLesson(m, l)}>{busy === `l${m}-${l}` ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}Regenerate lesson</Button>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={validated.has(lessonKey(m, l))} onChange={(event) => setValidated((current) => { const next = new Set(current); if (event.target.checked) next.add(lessonKey(m, l)); else next.delete(lessonKey(m, l)); return next; })} />I checked this lesson against approved guidance</label>
                </div>
              </div>
            </details>)}
          </Panel>)}
          <div className="admin-panel admin-actions">
            {saved ? <Button onClick={() => navigate({ to: "/facilitator/courses/$courseId", params: { courseId: saved } })}>Open saved course</Button> : <>
              <Button variant="outline" disabled={!!busy} onClick={() => run(variant + 1)}><RefreshCw aria-hidden />Regenerate entire course</Button>
              <Button variant="outline" onClick={() => save(false)}>Save as draft</Button>
              <Button onClick={() => save(true)} disabled={validated.size < totalLessons} title={validated.size < totalLessons ? "Check every lesson first" : undefined}>Submit for review</Button>
              <span className="text-sm text-muted-foreground">{validated.size} of {totalLessons} lessons checked</span>
            </>}
          </div>
        </div>}
      </div>
    </div>
  </>;
}
