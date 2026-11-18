import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const { data: courses, isLoading } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(session?.user.id));
  const course = courses?.find((c) => c.slug === slug);

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Birimo gufunguka…</p>;
  if (!course) return <p className="p-10 text-center">Iri somo ntiribonetse.</p>;

  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolled = !!mine?.enrollments.some((e) => e.course_id === course.id);
  const prog = courseProgress(course, completed);

  async function enroll() {
    if (!session) return navigate({ to: "/auth" });
    const { error } = await supabase.from("enrollments").insert({ user_id: session.user.id, course_id: course!.id });
    if (error) return toast.error("Ntibyakunze. Ongera ugerageze.");
    toast.success("Wiyandikishije!");
    await qc.invalidateQueries({ queryKey: ["my-learning"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <img src={vegetableImages[course.vegetables?.slug ?? ""]} alt="" width={944} height={704} className="mb-6 aspect-[3/1] w-full rounded-2xl object-cover" />
      <h1 className="text-4xl font-semibold">{course.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{course.description}</p>

      <div className="my-6 rounded-2xl border bg-card p-5">
        {enrolled ? (
          <div className="space-y-3">
            <Progress value={prog.pct} aria-label="Aho ugeze" />
            <p>Warangije amasomo {prog.done} kuri {prog.total}.</p>
            {prog.next && (
              <Button asChild size="xl"><Link to="/lessons/$lessonId" params={{ lessonId: prog.next.id }}>Komeza kwiga</Link></Button>
            )}
          </div>
        ) : (
          <Button size="xl" onClick={enroll}>{session ? "Iyandikishe" : "Injira wiyandikishe"}</Button>
        )}
      </div>

      <div className="space-y-6">
        {course.course_modules.map((m, i) => (
          <section key={m.id}>
            <h2 className="mb-3 text-2xl font-semibold">Igice cya {i + 1}: {m.title}</h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {m.lessons.map((l) => {
                const done = completed.has(l.id);
                const inner = (
                  <>
                    {done ? <CheckCircle2 className="size-6 text-primary" aria-label="Byarangiye" /> : <Circle className="size-6 text-muted-foreground" aria-hidden />}
                    <span className="flex-1">
                      <span className="block font-bold">{l.title}</span>
                      <span className="text-muted-foreground">{l.summary}</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="size-4" aria-hidden />{l.duration_minutes}′</span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {enrolled ? (
                      <Link to="/lessons/$lessonId" params={{ lessonId: l.id }} className="flex items-center gap-4 p-4 hover:bg-muted">{inner}</Link>
                    ) : (
                      <div className="flex items-center gap-4 p-4">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
