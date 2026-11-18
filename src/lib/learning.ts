import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lesson = {
  id: string; title: string; summary: string; body: string; key_points: string[];
  duration_minutes: number; sort_order: number; audio_url: string | null; video_url: string | null;
};
export type Module = { id: string; title: string; sort_order: number; lessons: Lesson[] };
export type Course = {
  id: string; slug: string; title: string; description: string; level: string;
  vegetables: { slug: string; name_rw: string; name_en: string; sort_order: number } | null;
  course_modules: Module[];
};

export function sortCourse(c: Course): Course {
  return {
    ...c,
    course_modules: [...c.course_modules]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.sort_order - b.sort_order) })),
  };
}

export const allLessons = (c: Course) => c.course_modules.flatMap((m) => m.lessons);

const COURSE_SELECT =
  "id, slug, title, description, level, vegetables(slug, name_rw, name_en, sort_order), course_modules(id, title, sort_order, lessons(id, title, summary, body, key_points, duration_minutes, sort_order, audio_url, video_url))";

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: async () => {
    const { data, error } = await supabase.from("courses").select(COURSE_SELECT).eq("status", "published");
    if (error) throw error;
    return (data as unknown as Course[])
      .map(sortCourse)
      .sort((a, b) => (a.vegetables?.sort_order ?? 0) - (b.vegetables?.sort_order ?? 0));
  },
});

export const myLearningQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-learning", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [e, p] = await Promise.all([
        supabase.from("enrollments").select("course_id, enrolled_at").eq("user_id", userId!),
        supabase.from("lesson_progress").select("lesson_id, status, completed_at, updated_at, channel").eq("user_id", userId!),
      ]);
      if (e.error) throw e.error;
      if (p.error) throw p.error;
      return { enrollments: e.data, progress: p.data };
    },
  });

export function courseProgress(course: Course, completed: Set<string>) {
  const lessons = allLessons(course);
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const next = lessons.find((l) => !completed.has(l.id)) ?? null;
  return { total: lessons.length, done, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0, next };
}
