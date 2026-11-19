import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CourseLoading, LearningFeedback } from "@/components/learning-ui";
import { Progress } from "@/components/ui/progress";
import { coursesQuery, courseProgress, myLearningQuery } from "@/lib/learning";
import { vegetableImages } from "@/lib/vegetables";
import { useAuth } from "@/hooks/use-auth";
import { questionsForCourse } from "@/lib/mock/services/farmer";
import { enrollLearner } from "@/lib/mock/services/learners";
import { useLearningState } from "@/lib/mock/store";

export const Route = createFileRoute("/courses/$slug")({
  head: () => ({
    meta: [
      { title: "Isomo — MenyaMuhinzi" },
      { name: "description", content: "Ibice n'amasomo y'iri somo ry'ubuhinzi." },
      { property: "og:title", content: "Isomo — MenyaMuhinzi" },
      { property: "og:description", content: "Ibice n'amasomo y'iri somo ry'ubuhinzi." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursePage,
});

function ModuleCards({ modules, completed, enrolled, onEnroll }: { modules: { id: string; title: string; lessons: { id: string; title: string; summary: string; duration_minutes: number }[] }[]; completed: Set<string>; enrolled: boolean; onEnroll: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = modules.find((m) => m.id === openId);
  const openIndex = modules.findIndex((m) => m.id === openId);
  return <>
    <div className="module-cards">
      {modules.map((m, i) => <button key={m.id} type="button" className={m.id === openId ? "module-card is-open" : "module-card"} aria-expanded={m.id === openId} onClick={() => setOpenId(m.id === openId ? null : m.id)}><span className="module-number">0{i + 1}</span><span className="module-card-title">{m.title}</span></button>)}
    </div>
    {open && <section key={open.id} className="module-open" aria-label={open.title}>
      <h3 className="flex items-center gap-3 text-xl"><span className="module-number">0{openIndex + 1}</span>{open.title}</h3>
      {!enrolled && <div className="module-enroll"><p>Iyandikishe kuri iri somo kugira ngo ufungure aya masomo.</p><Button size="lg" onClick={onEnroll}>Iyandikishe<ArrowRight aria-hidden /></Button></div>}
      <ul className="lesson-list">{open.lessons.map((l) => {
        const done = completed.has(l.id);
        const inner = <>{done ? <CheckCircle2 className="size-5 shrink-0 text-primary" aria-label="Byarangiye" /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}<span className="min-w-0 flex-1"><span className="block text-sm font-bold">{l.title}</span><span className="mt-1 block text-sm text-muted-foreground">{l.summary}</span></span><span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden />{l.duration_minutes}′</span>{enrolled && <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />}</>;
        return <li key={l.id}>{enrolled ? <Link to="/lessons/$lessonId" params={{ lessonId: l.id }} className="lesson-row">{inner}</Link> : <div className="lesson-row">{inner}</div>}</li>;
      })}</ul>
    </section>}
  </>;
}

function CoursePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const learning = useLearningState();
  const { data: courses, isLoading, isError, refetch } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(user?.id));
  const course = courses?.find((c) => c.slug === slug);

  if (isLoading) return <div className="page-width section-space"><CourseLoading /></div>;
  if (isError) return <div className="page-width section-space"><LearningFeedback error retry={() => refetch()} /></div>;
  if (!course) return <LearningFeedback title="Iri somo ntiribonetse" text="Subira ku masomo uhitemo irindi." />;

  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = !!mine?.enrollments.some((e) => e.course_id === course.id);
  const prog = courseProgress(course, completed);

  async function enroll() {
    if (!course) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    enrollLearner(user.id, course.id);
    toast.success("Wiyandikishije!");
    await qc.invalidateQueries({ queryKey: ["my-learning"] });
  }

  return <div className="page-width course-page">
    <Button asChild variant="link" className="mb-2 px-0"><Link to="/courses"><ArrowLeft aria-hidden />Amasomo yose</Link></Button>
    <div className="course-cover">
      <div className="course-intro">
        <p className="eyebrow mb-1">{course.vegetables?.name_rw} · {course.level}</p>
        <h1>{course.title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-snug text-muted-foreground">{course.description}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Layers className="size-4" aria-hidden />Ibice {course.course_modules.length}</span><span className="flex items-center gap-2"><BookOpen className="size-4" aria-hidden />Amasomo {prog.total}</span><span className="flex items-center gap-2"><Clock className="size-4" aria-hidden />Ibyumweru {course.duration_weeks}</span><span>Soma{course.course_modules.some((module) => module.lessons.some((lesson) => lesson.scenes.length)) ? " · Reba" : ""}{course.course_modules.some((module) => module.lessons.some((lesson) => lesson.narration.trim())) ? " · Umva" : ""}</span></div>
        {course.objectives.length > 0 && <ul className="mt-3 space-y-1 text-sm">{course.objectives.map((item) => <li key={item}>• {item}</li>)}</ul>}
      </div>
      <aside className="enrollment-panel"><span className="icon-tile mb-2"><BookOpen className="size-4" aria-hidden /></span><h2 className="text-xl">{enrolled ? "Aho ugeze" : "Tangira uyu munsi"}</h2><p className="mt-1 text-sm leading-snug text-muted-foreground">{enrolled ? `Warangije amasomo ${prog.done} kuri ${prog.total}.` : "Iga mu Kinyarwanda, ku muvuduko wawe."}</p>{enrolled ? <div className="mt-3 space-y-3"><div className="flex items-center gap-3"><Progress value={prog.pct} aria-label="Aho ugeze" /><span className="text-sm font-bold text-primary">{prog.pct}%</span></div>{prog.next ? <Button asChild size="lg" className="w-full"><Link to="/lessons/$lessonId" params={{ lessonId: prog.next.id }}>{prog.done ? "Komeza kwiga" : "Tangira kwiga"}<ArrowRight aria-hidden /></Link></Button> : <p className="flex items-center gap-2 font-bold text-primary"><CheckCircle2 aria-hidden />Amasomo yose yarangiye</p>}{questionsForCourse(learning, course.id).length > 0 && <Button asChild size="lg" variant="outline" className="w-full"><Link to="/quiz/$courseId" params={{ courseId: course.id }}>Gerageza ubumenyi</Link></Button>}<Button asChild size="lg" variant="outline" className="w-full"><Link to="/assistant" search={{ course: course.id }}>Baza ikibazo</Link></Button></div> : <Button size="lg" onClick={enroll} className="mt-3 w-full">{user ? "Iyandikishe" : "Injira wiyandikishe"}<ArrowRight aria-hidden /></Button>}<p className="enrollment-foot">Soma · Reba · Umva</p></aside>
      <img src={vegetableImages[course.vegetables?.slug ?? ""]} alt={course.vegetables?.name_rw ?? "Imboga"} width={944} height={704} className="course-cover-image" />
    </div>
    <div className="course-layout">
      <div><p className="eyebrow mb-2">INTAMBWE KU NTAMBWE</p><h2 className="text-3xl">Ibyo uziga</h2></div>
      <ModuleCards modules={course.course_modules} completed={completed} enrolled={enrolled} onEnroll={enroll} />
    </div>
  </div>;
}
