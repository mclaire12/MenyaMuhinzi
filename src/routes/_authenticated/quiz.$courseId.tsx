import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LearningFeedback } from "@/components/learning-ui";
import { useAuth } from "@/hooks/use-auth";
import { enrollmentsFor, learnerIdFor } from "@/lib/mock/services/learners";
import { questionsForCourse, submitAssessment, type ReviewedAnswer } from "@/lib/mock/services/farmer";
import { useMockResource } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/quiz/$courseId")({ component: QuizPage });

function QuizPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const resource = useMockResource((state) => {
    const course = state.courses.find((item) => item.id === courseId && item.status === "published") ?? null;
    const learnerId = user ? learnerIdFor(state, user.id) : "";
    const enrolled = user ? enrollmentsFor(state, learnerId).some((item) => item.course_id === courseId) : false;
    const questions = course ? questionsForCourse(state, courseId) : [];
    const last = state.attempts.find((item) => item.learnerId === learnerId && item.courseId === courseId) ?? null;
    return { course, enrolled, questions, last };
  });
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [review, setReview] = useState<ReviewedAnswer[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const { course, enrolled, questions, last } = resource.data;
  if (!course) return <LearningFeedback title="Isuzumabumenyi ntiribonetse" text="Subira ku masomo." />;
  function choose(id: string, value: string) { setAnswers((current) => ({ ...current, [id]: value })); }
  function finish() {
    if (!user) return;
    if (questions.some((question) => !answers[question.id]?.trim())) { toast.error("Saba ibibazo byose."); return; }
    const graded = submitAssessment(user.id, courseId, answers);
    setReview(graded.review);
    setScore(graded.score);
    toast.success("Ibisubizo byoherejwe.");
  }
  const current = questions[step];
  return <div className="page-width farmer-page">
    <Button asChild variant="link" className="px-0"><Link to="/courses/$slug" params={{ slug: course.slug }}><ArrowLeft aria-hidden />{course.title}</Link></Button>
    <p className="eyebrow mt-4">GERAGEZA UBWITONDO</p>
    <h1 className="text-3xl">Isuzumabumenyi</h1>
    <p className="mt-2 text-muted-foreground">Ibibazo biva mu masomo yemewe. Ntabwo ari ikizamini gikomeye.</p>
    {last && score === null && <p className="fac-note">Iheruka: {last.score}%. Ushobora kongera.</p>}
    {!enrolled ? <LearningFeedback title="Banza wiyandikishe" text="Iyandikishe kuri iri somo mbere yo gusubiza." /> : questions.length === 0 ? <LearningFeedback title="Nta bibazo" text="Iri somo ntirifite isuzumabumenyi." /> : review && score !== null ? <section className="quiz-result">
      <p className="text-5xl font-bold text-primary">{score}%</p>
      <p>{score >= 70 ? "Wakoze neza." : "Ongera usome amasomo, hanyuma wongere."}</p>
      <ul className="quiz-review">{review.map((item) => <li key={item.id} data-ok={item.ok}><b>{item.question}</b><span>Wavuze: {item.yours}</span><span>Igisubizo: {item.correct}</span><span>{item.explanation}</span></li>)}</ul>
      <Button size="xl" onClick={() => { setReview(null); setScore(null); setAnswers({}); setStep(0); }}>Ongera</Button>
    </section> : current && <section>
      <p className="eyebrow">Ikibazo {step + 1} kuri {questions.length}</p>
      <h2 className="mt-2 text-2xl">{current.question}</h2>
      {current.kind === "short" ? <label className="farmer-field mt-4">Andika igisubizo<input value={answers[current.id] ?? ""} onChange={(event) => choose(current.id, event.target.value)} /></label> : <div className="quiz-options">{current.options.map((option, index) => <button key={option} type="button" className={answers[current.id] === String(index) ? "is-on" : ""} onClick={() => choose(current.id, String(index))}>{current.kind === "true_false" ? option : `${index + 1}. ${option}`}</button>)}</div>}
      <div className="mt-6 flex flex-wrap gap-3">
        {step > 0 && <Button size="xl" variant="outline" onClick={() => setStep((value) => value - 1)}><ArrowLeft aria-hidden />Ibanze</Button>}
        {step < questions.length - 1 ? <Button size="xl" onClick={() => setStep((value) => value + 1)}>Ikurikira<ArrowRight aria-hidden /></Button> : <Button size="xl" onClick={finish}><CheckCircle2 aria-hidden />Ohereza</Button>}
      </div>
    </section>}
  </div>;
}
