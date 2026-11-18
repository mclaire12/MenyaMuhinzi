import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Headphones, PlayCircle, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allLessons, coursesQuery, myLearningQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Isomo — MenyaMuhinzi" }, { name: "description", content: "Soma, reba cyangwa wumve isomo." }] }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const { data: courses } = useQuery(coursesQuery);
  const { data: mine } = useQuery(myLearningQuery(uid));
  const [speaking, setSpeaking] = useState(false);

  const course = courses?.find((c) => allLessons(c).some((l) => l.id === lessonId));
  const lessons = course ? allLessons(course) : [];
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[idx];
  const next = lessons[idx + 1];
  const done = mine?.progress.some((p) => p.lesson_id === lessonId && p.status === "completed");

  useEffect(() => {
    if (!uid || !lesson || mine === undefined) return;
    if (mine.progress.some((p) => p.lesson_id === lessonId)) return;
    supabase.from("lesson_progress").upsert({ user_id: uid, lesson_id: lessonId, status: "in_progress" }, { onConflict: "user_id,lesson_id" })
      .then(() => qc.invalidateQueries({ queryKey: ["my-learning"] }));
  }, [uid, lessonId, lesson, mine, qc]);

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, [lessonId]);

  if (!lesson || !course) return <p className="p-10 text-center text-muted-foreground">Birimo gufunguka…</p>;

  async function complete() {
    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: uid!, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) return toast.error("Ntibyakunze kubika.");
    toast.success("Isomo rirangiye!");
    qc.invalidateQueries({ queryKey: ["my-learning"] });
  }

  function toggleSpeak() {
    const s = window.speechSynthesis;
    if (!s) return toast.error("Telefoni yawe ntishobora gusoma mu ijwi.");
    if (speaking) { s.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(`${lesson.title}. ${lesson.body}`);
    u.lang = "rw-RW";
    u.onend = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/courses/$slug" params={{ slug: course.slug }} className="font-bold text-primary">← {course.title}</Link>
      <p className="mt-4 text-sm text-muted-foreground">Isomo {idx + 1} kuri {lessons.length} · Iminota {lesson.duration_minutes}</p>
      <h1 className="mt-1 text-4xl font-semibold">{lesson.title}</h1>

      <Tabs defaultValue="read" className="mt-6">
        <TabsList className="grid h-14 w-full grid-cols-3">
          <TabsTrigger value="read" className="h-12 text-base"><BookOpen className="mr-2 size-5" aria-hidden />Soma</TabsTrigger>
          <TabsTrigger value="watch" className="h-12 text-base"><PlayCircle className="mr-2 size-5" aria-hidden />Reba</TabsTrigger>
          <TabsTrigger value="listen" className="h-12 text-base"><Headphones className="mr-2 size-5" aria-hidden />Umva</TabsTrigger>
        </TabsList>
        <TabsContent value="read" className="space-y-6 pt-4">
          <p className="text-xl leading-relaxed">{lesson.body}</p>
          <div className="rounded-2xl bg-secondary p-5">
            <h2 className="mb-3 text-xl font-semibold text-secondary-foreground">Ibyo kwibuka</h2>
            <ul className="space-y-2">
              {lesson.key_points.map((k) => (
                <li key={k} className="flex gap-2"><CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" aria-hidden />{k}</li>
              ))}
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="watch" className="pt-4">
          {lesson.video_url ? (
            <video src={lesson.video_url} controls preload="none" className="w-full rounded-2xl" />
          ) : (
            <p className="rounded-2xl border bg-card p-6 text-muted-foreground">Amashusho y'iri somo azaza vuba.</p>
          )}
        </TabsContent>
        <TabsContent value="listen" className="space-y-4 pt-4">
          {lesson.audio_url ? (
            <audio src={lesson.audio_url} controls preload="none" className="w-full" />
          ) : (
            <Button size="xl" variant="outline" onClick={toggleSpeak}>
              {speaking ? <Square aria-hidden /> : <Headphones aria-hidden />}{speaking ? "Hagarika" : "Umva isomo"}
            </Button>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-10 flex flex-wrap gap-3 border-t pt-6">
        {done ? (
          <p className="flex items-center gap-2 font-bold text-primary"><CheckCircle2 aria-hidden /> Warangije iri somo</p>
        ) : (
          <Button size="xl" onClick={complete}>Narangije isomo</Button>
        )}
        {next && (
          <Button asChild size="xl" variant="outline"><Link to="/lessons/$lessonId" params={{ lessonId: next.id }}>Isomo rikurikira →</Link></Button>
        )}
      </div>
    </div>
  );
}
