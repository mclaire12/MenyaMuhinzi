import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CourseCard } from "@/components/course-card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data: courses, isLoading } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(session?.user.id));
  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = new Set(mine?.enrollments.map((e) => e.course_id));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-4xl font-semibold">Amasomo y'imboga</h1>
      <p className="mb-8 text-lg text-muted-foreground">Hitamo imboga ushaka kwiga guhinga.</p>
      <div className="grid gap-6 md:grid-cols-3">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
        {courses?.map((c) => (
          <CourseCard key={c.id} course={c} enrolled={enrolled.has(c.id)} pct={courseProgress(c, completed).pct} />
        ))}
      </div>
    </div>
  );
}
