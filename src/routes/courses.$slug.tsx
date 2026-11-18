import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CourseLoading, LearningFeedback } from "@/components/learning-ui";
import { Progress } from "@/components/ui/progress";
import { coursesQuery, courseProgress, myLearningQuery } from "@/lib/learning";
import { vegetableImages } from "@/lib/vegetables";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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

function CoursePage() {
  const { slug } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: courses, isLoading, isError, refetch } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(session?.user.id));
  const course = courses?.find((c) => c.slug === slug);

  if (isLoading) return <div className="page-width section-space"><CourseLoading /></div>;
  if (isError) return <div className="page-width section-space"><LearningFeedback error retry={() => refetch()} /></div>;
  if (!course) return <LearningFeedback title="Iri somo ntiribonetse" text="Subira ku masomo uhitemo irindi." />;

  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = !!mine?.enrollments.some((e) => e.course_id === course.id);
  const prog = courseProgress(course, completed);

  async function enroll() {
    if (!course) return;
    if (!session) { navigate({ to: "/auth" }); return; }
    const { error } = await supabase.from("enrollments").insert({ user_id: session.user.id, course_id: course.id });
    if (error) { toast.error("Ntibyakunze. Ongera ugerageze."); return; }
    toast.success("Wiyandikishije!");
    await qc.invalidateQueries({ queryKey: ["my-learning"] });
  }

  return <div className="page-width section-space">
    <Button asChild variant="link" className="mb-6 px-0"><Link to="/courses"><ArrowLeft aria-hidden />Amasomo yose</Link></Button>
    <div className="course-cover">
      <div><p className="eyebrow mb-4">{course.vegetables?.name_rw} · {course.level}</p><h1 className="text-4xl sm:text-5xl">{course.title}</h1><p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">{course.description}</p><div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Layers className="size-4" aria-hidden />Ibice {course.course_modules.length}</span><span className="flex items-center gap-2"><BookOpen className="size-4" aria-hidden />Amasomo {prog.total}</span><span className="flex items-center gap-2"><Clock className="size-4" aria-hidden />Iminota {course.course_modules.flatMap(m => m.lessons).reduce((sum, l) => sum + l.duration_minutes, 0)}</span></div></div>
      <img src={vegetableImages[course.vegetables?.slug ?? ""]} alt={course.vegetables?.name_rw ?? "Imboga"} width={944} height={704} className="course-cover-image" />
    </div>
    <div className="course-layout">
      <div className="space-y-8"><div><p className="eyebrow mb-2">INTAMBWE KU NTAMBWE</p><h2 className="text-3xl">Ibyo uziga</h2></div>
        {course.course_modules.map((m, i) => <section key={m.id}><h3 className="mb-4 flex items-center gap-3 text-xl"><span className="module-number">0{i + 1}</span>{m.title}</h3><ul className="lesson-list">{m.lessons.map(l => {
          const done = completed.has(l.id);
          const inner = <>{done ? <CheckCircle2 className="size-5 shrink-0 text-primary" aria-label="Byarangiye" /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}<span className="min-w-0 flex-1"><span className="block text-sm font-bold">{l.title}</span><span className="mt-1 block text-sm text-muted-foreground">{l.summary}</span></span><span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden />{l.duration_minutes}′</span>{enrolled && <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />}</>;
          return <li key={l.id}>{enrolled ? <Link to="/lessons/$lessonId" params={{ lessonId: l.id }} className="lesson-row">{inner}</Link> : <div className="lesson-row">{inner}</div>}</li>;
        })}</ul></section>)}
      </div>
      <aside className="enrollment-panel"><span className="icon-tile mb-5"><BookOpen aria-hidden /></span><h2 className="text-2xl">{enrolled ? "Aho ugeze" : "Tangira uyu munsi"}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{enrolled ? `Warangije amasomo ${prog.done} kuri ${prog.total}.` : "Iga mu Kinyarwanda, ku muvuduko wawe."}</p>{enrolled ? <div className="mt-5 space-y-4"><div className="flex items-center gap-3"><Progress value={prog.pct} aria-label="Aho ugeze" /><span className="text-sm font-bold text-primary">{prog.pct}%</span></div>{prog.next ? <Button asChild size="xl" className="w-full"><Link to="/lessons/$lessonId" params={{ lessonId: prog.next.id }}>Komeza kwiga<ArrowRight aria-hidden /></Link></Button> : <p className="flex items-center gap-2 font-bold text-primary"><CheckCircle2 aria-hidden />Amasomo yose yarangiye</p>}</div> : <Button size="xl" onClick={enroll} className="mt-5 w-full">{session ? "Iyandikishe" : "Injira wiyandikishe"}<ArrowRight aria-hidden /></Button>}<p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Soma · Reba · Umva</p></aside>
    </div>
  </div>;
}
