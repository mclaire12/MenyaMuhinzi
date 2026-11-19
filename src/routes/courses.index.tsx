import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BackLink } from "@/components/back-link";
import { CourseCard } from "@/components/course-card";
import { CourseLoading, LearningFeedback } from "@/components/learning-ui";
import { BookOpen } from "lucide-react";
import { allLessons, coursesQuery, courseProgress, myLearningQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Amasomo — MenyaMuhinzi" },
      { name: "description", content: "Amasomo y'ubuhinzi bw'inyanya, amashu na karoti." },
      { property: "og:title", content: "Amasomo — MenyaMuhinzi" },
      { property: "og:description", content: "Hitamo isomo ry'imboga ushaka kwiga." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Courses,
});

function Courses() {
  const { user } = useAuth();
  const { data: courses, isLoading, isError, refetch } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(user?.id));
  const [query, setQuery] = useState("");
  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = new Set(mine?.enrollments.map((e) => e.course_id));
  const shown = (courses ?? []).filter((course) => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const minutes = allLessons(course).reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
    const length = minutes <= 40 ? "iminota nke" : minutes <= 70 ? "iminota hagati" : "iminota nyinshi";
    const haystack = [course.title, course.description, course.level, course.vegetables?.name_rw, course.vegetables?.name_en, length, `${minutes} iminota`, `ibyumweru ${course.duration_weeks}`].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  return (
    <div className="page-width pb-14"><BackLink />
      <div className="page-heading"><div><p className="eyebrow mb-3">KURA UBUMENYI BWAWE</p><h1>Amasomo y'imboga</h1><p className="mt-3 text-muted-foreground">Hitamo inyanya, amashu cyangwa karoti.</p></div><span className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" aria-hidden />{shown.length} amasomo</span></div>
      <label className="sr-only" htmlFor="course-search">Shakisha isomo</label>
      <input id="course-search" className="farmer-search" value={query} placeholder="Shakisha inyanya, urwego cyangwa iminota" onChange={(event) => setQuery(event.target.value)} />
      {isLoading ? <CourseLoading /> : isError ? <LearningFeedback error retry={() => refetch()} /> : !courses?.length ? <LearningFeedback /> : !shown.length ? <LearningFeedback title="Nta somo ribonetse" text="Hindura ibyo washakishije." /> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{shown.map(c => <CourseCard key={c.id} course={c} enrolled={enrolled.has(c.id)} pct={courseProgress(c, completed).pct} />)}</div>}
    </div>
  );
}
