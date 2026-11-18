import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BackLink } from "@/components/back-link";
import { CourseCard } from "@/components/course-card";
import { CourseLoading, LearningFeedback } from "@/components/learning-ui";
import { BookOpen } from "lucide-react";
import { coursesQuery, courseProgress, myLearningQuery } from "@/lib/learning";
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
  const { session } = useAuth();
  const { data: courses, isLoading, isError, refetch } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(session?.user.id));
  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = new Set(mine?.enrollments.map((e) => e.course_id));
  return (
    <div className="page-width pb-14"><BackLink />
      <div className="page-heading"><div><p className="eyebrow mb-3">KURA UBUMENYI BWAWE</p><h1>Amasomo y'imboga</h1><p className="mt-3 text-muted-foreground">Hitamo imboga ushaka kwiga guhinga.</p></div><span className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" aria-hidden />{courses?.length ?? "—"} amasomo</span></div>
      {isLoading ? <CourseLoading /> : isError ? <LearningFeedback error retry={() => refetch()} /> : !courses?.length ? <LearningFeedback /> : <div className="grid gap-6 md:grid-cols-3">{courses.map(c => <CourseCard key={c.id} course={c} enrolled={enrolled.has(c.id)} pct={courseProgress(c, completed).pct} />)}</div>}
    </div>
  );
}
