import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LearningFeedback, LearningStat, SectionHeading } from "@/components/learning-ui";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { courseProgress, toCatalogueCourse } from "@/lib/learning";
import { enrollmentsFor, learnerIdFor, progressFor } from "@/lib/mock/services/learners";
import { useMockResource } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/progress")({ component: ProgressPage });

function ProgressPage() {
  const { user } = useAuth();
  const resource = useMockResource((state) => {
    const learnerId = user ? learnerIdFor(state, user.id) : "";
    const enrolled = user ? enrollmentsFor(state, learnerId) : [];
    const progress = user ? progressFor(state, learnerId) : [];
    const doneIds = new Set(progress.filter((item) => item.status === "completed").map((item) => item.lessonId));
    const courses = state.courses.filter((course) => course.status === "published" && enrolled.some((item) => item.course_id === course.id)).map((course) => {
      const view = toCatalogueCourse(course);
      const row = courseProgress(view, doneIds);
      const modules = course.modules.filter((module) => module.lessons.length > 0 && module.lessons.every((lesson) => doneIds.has(lesson.id))).length;
      return { course, view, row, modules };
    });
    const lessons = courses.reduce((sum, item) => sum + item.row.total, 0);
    const done = courses.reduce((sum, item) => sum + item.row.done, 0);
    const scores = state.attempts.filter((item) => item.learnerId === learnerId);
    const history = [...progress].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8).map((item) => ({ ...item, title: state.courses.flatMap((course) => course.modules.flatMap((module) => module.lessons)).find((lesson) => lesson.id === item.lessonId)?.title ?? "Isomo" }));
    const next = courses.find((item) => item.row.next);
    return { courses, lessons, done, pct: lessons ? Math.round((done / lessons) * 100) : 0, finished: courses.filter((item) => item.row.total > 0 && item.row.done === item.row.total).length, active: courses.filter((item) => item.row.done > 0 && item.row.done < item.row.total).length, modules: courses.reduce((sum, item) => sum + item.modules, 0), scores, history, next };
  });
  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const data = resource.data;
  return <div className="page-width farmer-page">
    <p className="eyebrow mb-2">AHO UGEZE</p>
    <h1 className="text-3xl">Kwiga kwawe</h1>
    <div className="my-6 flex items-center gap-4"><Progress value={data.pct} aria-label="Aho ugeze" /><b className="text-2xl text-primary">{data.pct}%</b></div>
    <div className="dashboard-stats mb-8">
      <LearningStat label="Wiyandikishije" value={data.courses.length} />
      <LearningStat label="Ari gukomeza" value={data.active} />
      <LearningStat label="Yarangiye" value={data.finished} />
      <LearningStat label="Amasomo yarangiye" value={`${data.done}/${data.lessons}`} />
    </div>
    {data.next?.row.next && <Button asChild size="xl" className="mb-8"><Link to="/lessons/$lessonId" params={{ lessonId: data.next.row.next.id }}>Komeza: {data.next.row.next.title}<ArrowRight aria-hidden /></Link></Button>}
    <p className="mb-6 text-sm text-muted-foreground">Ibice byarangiye: {data.modules}</p>
    {data.courses.length === 0 ? <LearningFeedback title="Nta somo" text="Iyandikishe ku isomo kugira ngo ubone aho ugeze." /> : <ul className="lesson-list">{data.courses.map((item) => <li key={item.course.id} className="py-4"><Link to="/courses/$slug" params={{ slug: item.course.slug }} className="font-bold">{item.course.title}</Link><div className="mt-2 flex items-center gap-3"><Progress value={item.row.pct} aria-label={item.course.title} /><span className="text-sm font-bold text-primary">{item.row.pct}%</span></div><span className="text-sm text-muted-foreground">Ibice {item.modules}/{item.course.modules.length} · Amasomo {item.row.done}/{item.row.total}</span></li>)}</ul>}
    <SectionHeading title="Amanota" />
    {data.scores.length === 0 ? <p className="text-muted-foreground">Nta manota uragera. Gerageza isuzumabumenyi nyuma y'isomo.</p> : <ul className="lesson-list">{data.scores.map((item) => <li key={item.id} className="flex items-center justify-between py-3"><span>{data.courses.find((course) => course.course.id === item.courseId)?.course.title ?? "Isuzumabumenyi"}</span><b>{item.score}%</b></li>)}</ul>}
    <SectionHeading title="Ibyo waheruka gukora" />
    {data.history.length === 0 ? <p className="text-muted-foreground">Amasomo urangije azagaragara hano.</p> : <ul className="lesson-list">{data.history.map((item) => <li key={`${item.lessonId}-${item.updatedAt}`} className="flex items-center gap-3 py-3"><CheckCircle2 className="size-5 text-primary" aria-hidden /><span className="flex-1">{item.title}</span><span className="text-xs text-muted-foreground">{item.status === "completed" ? "Byarangiye" : "Waratangiye"}</span></li>)}</ul>}
  </div>;
}
