import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, SquarePen, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LearningFeedback } from "@/components/learning-ui";
import { useAuth } from "@/hooks/use-auth";
import { askFarmer, rateAnswer } from "@/lib/mock/services/farmer";
import { enrollmentsFor, learnerIdFor } from "@/lib/mock/services/learners";
import { useMockResource } from "@/lib/mock/store";
import type { AIQuestion, FarmerChat } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/assistant")({
  validateSearch: (search: Record<string, unknown>): { course?: string; lesson?: string } => ({
    ...(typeof search["course"] === "string" ? { course: search["course"] } : {}),
    ...(typeof search["lesson"] === "string" ? { lesson: search["lesson"] } : {}),
  }),
  component: AssistantPage,
});

const samples = ["Nigute nahinga inyanya neza?", "Ni ryari nakwimurira ingemwe mu murima?", "Ni gute nakwirinda ibibazo mu buhinzi bw'amashu?"];

type Thread = { id: string; title: string; courseId: string; updatedAt: string; questions: AIQuestion[] };

function threadsFor(questions: AIQuestion[], chats: FarmerChat[]): Thread[] {
  const grouped = new Map<string, AIQuestion[]>();
  const alone: AIQuestion[] = [];
  questions.forEach((item) => {
    if (!item.chatId) { alone.push(item); return; }
    grouped.set(item.chatId, [...(grouped.get(item.chatId) ?? []), item]);
  });
  const rows: Thread[] = chats
    .filter((chat) => grouped.has(chat.id))
    .map((chat) => {
      const ordered = (grouped.get(chat.id) ?? []).sort((a, b) => a.at.localeCompare(b.at));
      return { id: chat.id, title: ordered[0]?.question ?? chat.title, courseId: chat.courseId, updatedAt: chat.updatedAt, questions: ordered };
    });
  alone.forEach((item) => rows.push({ id: `solo-${item.id}`, title: item.question, courseId: item.courseId, updatedAt: item.at, questions: [item] }));
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function AssistantPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const resource = useMockResource((state) => {
    const learnerId = user ? learnerIdFor(state, user.id) : "";
    const enrolled = user ? new Set(enrollmentsFor(state, learnerId).map((item) => item.course_id)) : new Set<string>();
    const courses = state.courses.filter((course) => course.status === "published" && enrolled.has(course.id));
    return {
      courses,
      threads: threadsFor(state.aiQuestions.filter((item) => item.learnerId === learnerId && item.channel === "web"), state.chats.filter((chat) => chat.learnerId === learnerId)),
      lessons: state.courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })))),
    };
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState(search.course ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const active = resource.data.threads.find((thread) => thread.id === activeId) ?? null;
  const chosen = active?.courseId || courseId || resource.data.courses[0]?.id || "";

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [active?.questions.length, busy]);

  async function send(question: string) {
    if (!user || !chosen || !question.trim() || busy) return;
    setBusy(true);
    try {
      const reply = active
        ? await askFarmer(user.id, chosen, null, question.trim(), active.id)
        : await askFarmer(user.id, chosen, search.lesson ?? null, question.trim());
      setActiveId(reply.chatId);
      setText("");
    } catch {
      toast.error("Ibibazo ntibyakunze. Ongera ugerageze.");
    } finally {
      setBusy(false);
    }
  }

  function onKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(text); }
  }

  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const { courses, threads, lessons } = resource.data;

  return (
    <div className="baza-shell">
      <aside className="baza-side" aria-label="Ibikiganiro">
        <button type="button" className={activeId ? "baza-new" : "baza-new is-on"} onClick={() => { setActiveId(null); setText(""); }}>
          <SquarePen aria-hidden /> Ikiganiro gishya
        </button>
        <div className="baza-list">
          {threads.length === 0 ? <p className="baza-empty-list">Nta kiganiro uraba ufite.</p> : threads.map((thread) => (
            <button key={thread.id} type="button" className={thread.id === activeId ? "is-on" : ""} onClick={() => setActiveId(thread.id)} title={thread.title}>{thread.title}</button>
          ))}
        </div>
      </aside>
      <section className="baza-main">
        {courses.length === 0 ? (
          <div className="baza-empty"><LearningFeedback title="Banza wiyandikishe" text="Hitamo isomo, wiyandikishe, hanyuma ubaze ikibazo kijyanye n'iryo somo." /></div>
        ) : active ? (
          <>
            <div className="baza-thread" aria-live="polite">
              {active.questions.map((item) => (
                <article key={item.id} className="baza-turn">
                  <p className="baza-user">{item.question}</p>
                  <div className="baza-bot">
                    <p className="whitespace-pre-line">{item.answer}</p>
                    {item.lessonId && <Link className="text-sm font-bold text-primary" to="/lessons/$lessonId" params={{ lessonId: item.lessonId }}>Fungura isomo: {lessons.find((lesson) => lesson.id === item.lessonId)?.title}</Link>}
                    <span className="chat-rate">{item.rating ? <span>Wabonye: {item.rating === "helpful" ? "Byamfashije" : "Ntibyamfashije"}</span> : <><Button size="sm" variant="outline" onClick={() => rateAnswer(item.id, "helpful")}><ThumbsUp aria-hidden />Byamfashije</Button><Button size="sm" variant="outline" onClick={() => rateAnswer(item.id, "not_helpful")}><ThumbsDown aria-hidden />Ntibyamfashije</Button></>}</span>
                  </div>
                </article>
              ))}
              {busy && <p className="baza-turn baza-bot">Ndagushakira igisubizo mu isomo…</p>}
              <div ref={bottom} />
            </div>
            <div className="baza-dock"><Composer value={text} busy={busy} onChange={setText} onKey={onKey} onSend={() => void send(text)} /></div>
          </>
        ) : (
          <div className="baza-empty">
            <h1>Ushaka kubaza iki uyu munsi?</h1>
            <p className="baza-note">Ibisubizo biva mu masomo wiyandikishijemo gusa. Ntabwo ari AI nyayo, kandi ntiguhaye umuti cyangwa ingano y'ifumbire.</p>
            <label className="baza-course">Isomo
              <select value={chosen} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
            </label>
            <Composer value={text} busy={busy} onChange={setText} onKey={onKey} onSend={() => void send(text)} />
            <div className="baza-suggestions">
              {samples.map((sample) => <button key={sample} type="button" onClick={() => void send(sample)}>{sample}</button>)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Composer({ value, busy, onChange, onKey, onSend }: { value: string; busy: boolean; onChange: (value: string) => void; onKey: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void; onSend: () => void }) {
  return (
    <form className="baza-composer" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <label className="sr-only" htmlFor="ask">Ikibazo cyawe</label>
      <textarea id="ask" rows={1} value={value} placeholder="Baza ikibazo ku isomo" onChange={(event) => onChange(event.target.value)} onKeyDown={onKey} />
      <Button type="submit" size="icon" disabled={busy || !value.trim()} aria-label="Ohereza">{busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowUp aria-hidden />}</Button>
    </form>
  );
}
