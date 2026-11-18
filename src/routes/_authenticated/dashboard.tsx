import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { allLessons, coursesQuery, courseProgress, myLearningQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Ibyanjye — MenyaMuhinzi" }, { name: "description", content: "Aho ugeze wiga." }] }),
  component: Dashboard,
});

const channelLabel: Record<string, string> = { web: "Telefoni igezweho", ussd: "USSD", ivr: "Guhamagara" };

function Dashboard() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const { data: courses } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(uid));
  const { data: profile } = useQuery({
    queryKey: ["profile", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("profiles").select("full_name, district").eq("id", uid!).maybeSingle()).data,
  });

  const completed = new Set(mine?.progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const enrolledIds = new Set(mine?.enrollments.map((e) => e.course_id));
  const enrolled = courses?.filter((c) => enrolledIds.has(c.id)) ?? [];
  const others = courses?.filter((c) => !enrolledIds.has(c.id)) ?? [];
  const current = enrolled.map((c) => ({ c, p: courseProgress(c, completed) })).find((x) => x.p.next);
  const lessonIndex = new Map(courses?.flatMap((c) => allLessons(c).map((l) => [l.id, { l, c }] as const)));
  const recent = [...(mine?.progress ?? [])].filter((p) => p.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-4xl font-semibold">Muraho{profile?.full_name ? `, ${profile.full_name}` : ""}!</h1>
        <p className="mt-2 text-lg text-muted-foreground">Warangije amasomo {completed.size}. Komereza aho!</p>
      </div>

      {current?.p.next ? (
        <section className="rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="font-bold uppercase tracking-wide opacity-80">Komeza kwiga · {current.c.title}</p>
          <h2 className="mt-2 text-3xl font-semibold">{current.p.next.title}</h2>
          <p className="mt-1 opacity-90">{current.p.next.summary} · Iminota {current.p.next.duration_minutes}</p>
          <Button asChild size="xl" variant="harvest" className="mt-5">
            <Link to="/lessons/$lessonId" params={{ lessonId: current.p.next.id }}>Fungura isomo</Link>
          </Button>
        </section>
      ) : enrolled.length === 0 ? (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-2xl font-semibold">Tangira isomo rya mbere</h2>
          <p className="mt-1 text-muted-foreground">Hitamo imboga hepfo hanyuma wiyandikishe.</p>
        </section>
      ) : null}

      {enrolled.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Amasomo nanditsemo</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {enrolled.map((c) => <CourseCard key={c.id} course={c} enrolled pct={courseProgress(c, completed).pct} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Andi masomo</h2>
          <div className="grid gap-6 md:grid-cols-3">{others.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Ibyo naherukaga kwiga</h2>
        {recent.length === 0 ? (
          <p className="text-muted-foreground">Nta somo urarangiza.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {recent.map((p) => {
              const x = lessonIndex.get(p.lesson_id);
              return (
                <li key={p.lesson_id} className="flex items-center gap-3 p-4">
                  <CheckCircle2 className="size-5 text-primary" aria-hidden />
                  <span className="flex-1"><b>{x?.l.title}</b> <span className="text-muted-foreground">· {x?.c.title}</span></span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="size-4" aria-hidden />{channelLabel[p.channel]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
