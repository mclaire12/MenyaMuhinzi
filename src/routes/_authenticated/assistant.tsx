import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LoaderCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LearningFeedback } from "@/components/learning-ui";
import { useAuth } from "@/hooks/use-auth";
import { askFarmer, rateAnswer } from "@/lib/mock/services/farmer";
import { enrollmentsFor, learnerIdFor } from "@/lib/mock/services/learners";
import { useMockResource } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/assistant")({
  validateSearch: (search: Record<string, unknown>): { course?: string; lesson?: string } => ({
    ...(typeof search["course"] === "string" ? { course: search["course"] } : {}),
    ...(typeof search["lesson"] === "string" ? { lesson: search["lesson"] } : {}),
  }),
  component: AssistantPage,
});

const samples = ["Nigute nahinga inyanya neza?", "Ni ryari nakwimurira ingemwe mu murima?", "Ni gute nakwirinda ibibazo mu buhinzi bw'amashu?"];

function AssistantPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const resource = useMockResource((state) => {
    const learnerId = user ? learnerIdFor(state, user.id) : "";
    const enrolled = user ? new Set(enrollmentsFor(state, learnerId).map((item) => item.course_id)) : new Set<string>();
    const courses = state.courses.filter((course) => course.status === "published" && enrolled.has(course.id));
    return { courses, history: state.aiQuestions.filter((item) => item.learnerId === learnerId), lessons: state.courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, courseId: course.id })))) };
  });
  const [courseId, setCourseId] = useState(search.course ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = courseId || resource.data.courses[0]?.id || "";
  async function send(question: string) {
    if (!user || !chosen || !question.trim()) return;
    setBusy(true);
    try {
      await askFarmer(user.id, chosen, search.lesson ?? null, question.trim());
      setText("");
    } catch {
      toast.error("Ibibazo ntibyakunze. Ongera ugerageze.");
    } finally {
      setBusy(false);
    }
  }
  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const { courses, history, lessons } = resource.data;
  const mine = history.filter((item) => !chosen || item.courseId === chosen);
  return <div className="page-width farmer-page">
    <p className="eyebrow mb-2">BAZA MU MASOMO</p>
    <h1 className="text-3xl">Baza ikibazo</h1>
    <p className="ai-sim">Iki ni igisubizo cy'igerageza. Gisubiza gusa ibyo mu masomo yemewe. Ntabwo ari AI nyayo, kandi ntiguhaye umuti cyangwa ingano y'ifumbire.</p>
    {courses.length === 0 ? <LearningFeedback title="Banza wiyandikishe" text="Hitamo isomo, wiyandikishe, hanyuma ubaze ikibazo kijyanye n'iryo somo." /> : <>
      <label className="farmer-field">Isomo<select value={chosen} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <div className="farmer-chips">{samples.map((sample) => <button key={sample} type="button" onClick={() => send(sample)}>{sample}</button>)}</div>
      <ul className="chat-log">{mine.length === 0 ? <li className="chat-note">Nta kibazo urabaza. Andika ikibazo mu Kinyarwanda.</li> : [...mine].reverse().map((item) => <li key={item.id}><p className="chat-q">{item.question}</p><p className="chat-a whitespace-pre-line">{item.answer}</p>{item.lessonId && <Link className="text-sm font-bold text-primary" to="/lessons/$lessonId" params={{ lessonId: item.lessonId }}>Fungura isomo: {lessons.find((lesson) => lesson.id === item.lessonId)?.title}</Link>}<span className="chat-rate">{item.rating ? <span>Wabonye: {item.rating === "helpful" ? "Byamfashije" : "Ntibyamfashije"}</span> : <><Button size="sm" variant="outline" onClick={() => rateAnswer(item.id, "helpful")}><ThumbsUp aria-hidden />Byamfashije</Button><Button size="sm" variant="outline" onClick={() => rateAnswer(item.id, "not_helpful")}><ThumbsDown aria-hidden />Ntibyamfashije</Button></>}</span></li>)}</ul>
      <form className="farmer-ask" onSubmit={(event) => { event.preventDefault(); send(text); }}>
        <label className="sr-only" htmlFor="ask">Ikibazo cyawe</label>
        <textarea id="ask" rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Andika ikibazo cyawe hano" />
        <Button size="xl" disabled={busy || !text.trim()}>{busy ? <LoaderCircle className="animate-spin" aria-hidden /> : null}Ohereza</Button>
      </form>
    </>}
  </div>;
}
