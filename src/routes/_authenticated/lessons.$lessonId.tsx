import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Headphones, LoaderCircle, PlayCircle, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LearningFeedback } from "@/components/learning-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allLessons, coursesQuery, myLearningQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Kwiga — MenyaMuhinzi" }, { name: "description", content: "Soma, reba cyangwa wumve isomo." }, { property: "og:title", content: "Kwiga — MenyaMuhinzi" }, { property: "og:description", content: "Iga ubuhinzi bw’imboga ku muvuduko wawe." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const coursesState = useQuery(coursesQuery);
  const { data: courses } = coursesState;
  const mineState = useQuery(myLearningQuery(uid));
  const { data: mine } = mineState;
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);

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

  if (coursesState.isLoading || mineState.isLoading) return <div className="lesson-page space-y-6" role="status" aria-label="Birimo gufunguka"><Skeleton className="h-5 w-40" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-64 w-full" /></div>;
  if (coursesState.isError || mineState.isError) return <LearningFeedback error retry={() => { coursesState.refetch(); mineState.refetch(); }} />;
  if (!lesson || !course) return <LearningFeedback title="Isomo ntiribonetse" text="Subira ku masomo uhitemo irindi." />;

  async function complete() {
    if (!uid) return;
    setSaving(true);
    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: uid, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
    setSaving(false);
    if (error) { toast.error("Ntibyakunze kubika."); return; }
    toast.success("Isomo rirangiye!");
    qc.invalidateQueries({ queryKey: ["my-learning"] });
  }

  function toggleSpeak() {
    const s = window.speechSynthesis;
    if (!s || !lesson) { toast.error("Telefoni yawe ntishobora gusoma mu ijwi."); return; }
    if (speaking) { s.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(`${lesson.title}. ${lesson.body}`);
    u.lang = "rw-RW";
    u.onend = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
  }

  return (
    <div className="lesson-page">
      <Button asChild variant="link" className="px-0"><Link to="/courses/$slug" params={{ slug: course.slug }}><ArrowLeft aria-hidden />{course.title}</Link></Button>
      <p className="eyebrow mt-6">Isomo {idx + 1} kuri {lessons.length} · Iminota {lesson.duration_minutes}</p>
      <h1 className="mt-3 text-3xl sm:text-4xl">{lesson.title}</h1>

      <div className="lesson-layout"><div>
      <Tabs defaultValue="read">
        <TabsList className="grid h-14 w-full grid-cols-3">
          <TabsTrigger value="read" className="h-12 text-base"><BookOpen className="mr-2 size-5" aria-hidden />Soma</TabsTrigger>
          <TabsTrigger value="watch" className="h-12 text-base"><PlayCircle className="mr-2 size-5" aria-hidden />Reba</TabsTrigger>
          <TabsTrigger value="listen" className="h-12 text-base"><Headphones className="mr-2 size-5" aria-hidden />Umva</TabsTrigger>
        </TabsList>
        <TabsContent value="read" className="space-y-7 pt-6">
          <p className="text-xl leading-relaxed">{lesson.body}</p>
          <div className="key-points">
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
            <video src={lesson.video_url} controls preload="none" className="w-full rounded-lg" />
          ) : (
            <div className="media-empty"><PlayCircle className="size-12 text-primary" aria-hidden /><h2 className="text-2xl">Amashusho azaza vuba</h2><p className="text-sm text-muted-foreground">Amashusho y’iri somo ntarashyirwaho.</p></div>
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
          <Button size="xl" disabled={saving} onClick={complete}>{saving ? <LoaderCircle className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}Narangije isomo</Button>
        )}
        {next && (
          <Button asChild size="xl" variant="outline"><Link to="/lessons/$lessonId" params={{ lessonId: next.id }}>Isomo rikurikira <ArrowRight aria-hidden /></Link></Button>
        )}
      </div>
      </div><aside className="lesson-aside"><p className="eyebrow mb-4">AMASOMO MURI IKI GICE</p><h2 className="mb-5 text-xl">{course.title}</h2><ul className="space-y-2">{lessons.map((l, i) => <li key={l.id}><Link to="/lessons/$lessonId" params={{ lessonId: l.id }} aria-current={l.id === lessonId ? "page" : undefined} className={`flex items-start gap-3 rounded-md p-3 text-sm transition-colors hover:bg-secondary ${l.id === lessonId ? "bg-secondary font-bold text-primary" : "text-muted-foreground"}`}>{mine?.progress.some(p => p.lesson_id === l.id && p.status === "completed") ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0" aria-hidden />}<span><span className="mb-1 block text-xs">Isomo {i + 1}</span>{l.title}</span></Link></li>)}</ul></aside></div>
    </div>
  );
}
