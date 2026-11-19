import { enrollLearner, enrollmentsFor, saveLessonProgress, saveListeningPosition } from "@/lib/mock/services/learners";
import { getLearningState } from "@/lib/mock/store";
import type { Course, LearningState, Lesson } from "@/lib/mock/types";

/** A lesson counts as completed once this share of its audio has been heard. */
export const COMPLETION_THRESHOLD = 0.9;

export type LessonRef = { courseId: string; moduleId: string; lessonId: string };

export function publishedCourses(state: LearningState) {
  return state.courses.filter((course) => course.status === "published");
}

export function lessonRefs(course: Course): (LessonRef & { lesson: Lesson; moduleTitle: string })[] {
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({ courseId: course.id, moduleId: module.id, lessonId: lesson.id, lesson, moduleTitle: module.title })));
}

export function findLesson(state: LearningState, ref: LessonRef) {
  const course = state.courses.find((item) => item.id === ref.courseId) ?? null;
  const module = course?.modules.find((item) => item.id === ref.moduleId) ?? null;
  const lesson = module?.lessons.find((item) => item.id === ref.lessonId) ?? null;
  return { course, module, lesson };
}

export function lessonRecord(state: LearningState, learnerId: string, lessonId: string) {
  return state.progress.find((item) => item.learnerId === learnerId && item.lessonId === lessonId) ?? null;
}

export function courseStanding(state: LearningState, learnerId: string, course: Course) {
  const refs = lessonRefs(course);
  const done = refs.filter((ref) => lessonRecord(state, learnerId, ref.lessonId)?.status === "completed").length;
  const unfinished = refs.find((ref) => lessonRecord(state, learnerId, ref.lessonId)?.status === "in_progress");
  const next = unfinished ?? refs.find((ref) => lessonRecord(state, learnerId, ref.lessonId)?.status !== "completed") ?? null;
  const attempts = state.attempts.filter((item) => item.learnerId === learnerId && item.courseId === course.id);
  return { total: refs.length, done, remaining: refs.length - done, next, lastScore: attempts[0]?.score ?? null, attempts: attempts.length };
}

export function enrolledCourses(state: LearningState, learnerId: string) {
  const ids = enrollmentsFor(state, learnerId).map((item) => item.course_id);
  return publishedCourses(state).filter((course) => ids.includes(course.id));
}

export function neighbourLesson(state: LearningState, ref: LessonRef, step: 1 | -1): LessonRef | null {
  const course = state.courses.find((item) => item.id === ref.courseId);
  if (!course) return null;
  const refs = lessonRefs(course);
  const index = refs.findIndex((item) => item.lessonId === ref.lessonId);
  const target = refs[index + step];
  return target ? { courseId: target.courseId, moduleId: target.moduleId, lessonId: target.lessonId } : null;
}

/** Starting to listen enrols the farmer; requesting a call alone changes nothing. */
export function startListening(learnerId: string, ref: LessonRef, positionSec: number, durationSec: number) {
  enrollLearner(learnerId, ref.courseId);
  saveListeningPosition(learnerId, ref.lessonId, positionSec, durationSec, "ivr");
}

export function recordListening(learnerId: string, ref: LessonRef, positionSec: number, durationSec: number) {
  saveListeningPosition(learnerId, ref.lessonId, positionSec, durationSec, "ivr");
  const reached = durationSec > 0 && positionSec / durationSec >= COMPLETION_THRESHOLD;
  const completed = lessonRecord(getLearningState(), learnerId, ref.lessonId)?.status === "completed";
  if (reached && !completed) saveLessonProgress(learnerId, ref.lessonId, "completed", "ivr");
  return reached && !completed;
}
