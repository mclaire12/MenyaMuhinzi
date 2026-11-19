import { queryOptions } from "@tanstack/react-query";
import { cropOf } from "@/lib/mock/crops";
import { getLearningState, MockServiceError, takeSimulatedFailure, wait } from "@/lib/mock/store";
import { fetchLearnerRecord } from "@/lib/mock/services/learners";
import type { Course as MockCourse } from "@/lib/mock/types";

export type LessonScene = { id: string; title: string; narration: string; visual: string; subtitle: string; seconds: number };
export type Lesson = {
  id: string; title: string; summary: string; body: string; example: string; key_points: string[];
  objectives: string[]; narration: string; illustration: string; scenes: LessonScene[];
  duration_minutes: number; sort_order: number; audio_url: string | null; video_url: string | null;
};
export type Module = { id: string; title: string; sort_order: number; lessons: Lesson[] };
export type Course = {
  id: string; slug: string; title: string; description: string; level: string;
  objectives: string[]; duration_weeks: number;
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

export function toCatalogueCourse(course: MockCourse): Course {
  return {
    id: course.id, slug: course.slug, title: course.title, description: course.description, level: course.level,
    objectives: course.objectives, duration_weeks: course.durationWeeks, vegetables: cropOf(course.crop),
    course_modules: course.modules.map((module, m) => ({
      id: module.id, title: module.title, sort_order: m + 1,
      lessons: module.lessons.map((lesson, l) => ({
        id: lesson.id, title: lesson.title, summary: lesson.summary,
        body: lesson.body, example: lesson.example, objectives: lesson.objectives, narration: lesson.narration, illustration: lesson.illustration,
        scenes: lesson.videoScenes, key_points: lesson.keyPoints, duration_minutes: lesson.durationMinutes, sort_order: l + 1, audio_url: null, video_url: null,
      })),
    })),
  };
}

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: async () => {
    await wait();
    if (takeSimulatedFailure()) throw new MockServiceError("Simulated failure");
    return getLearningState().courses
      .filter((course) => course.status === "published")
      .map(toCatalogueCourse)
      .sort((a, b) => (a.vegetables?.sort_order ?? 0) - (b.vegetables?.sort_order ?? 0));
  },
});

export const myLearningQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-learning", userId],
    enabled: !!userId,
    queryFn: () => fetchLearnerRecord(userId!),
  });

export function courseProgress(course: Course, completed: Set<string>) {
  const lessons = allLessons(course);
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const next = lessons.find((l) => !completed.has(l.id)) ?? null;
  return { total: lessons.length, done, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0, next };
}
