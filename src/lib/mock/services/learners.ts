import { courseLessons } from "@/lib/mock/builders";
import { getLearningState, MockServiceError, mutate, nowIso, takeSimulatedFailure, wait } from "@/lib/mock/store";
import type { CourseAssignment, LearningChannel, LearningState } from "@/lib/mock/types";

export function learnerIdFor(state: LearningState, accountId: string) {
  return state.farmers.find((farmer) => farmer.accountId === accountId)?.id ?? accountId;
}

export function assignmentsFor(state: LearningState, learnerId: string): CourseAssignment[] {
  const groupIds = state.groups.filter((group) => group.memberIds.includes(learnerId)).map((group) => group.id);
  return state.assignments.filter((item) => (item.target.kind === "farmer" ? item.target.id === learnerId : groupIds.includes(item.target.id)));
}

export type LearnerEnrollment = { course_id: string; enrolled_at: string; source: "self" | "assignment"; due_at: string | null; assigned_by: string | null };

export function enrollmentsFor(state: LearningState, learnerId: string): LearnerEnrollment[] {
  const rows = new Map<string, LearnerEnrollment>();
  state.enrollments.filter((item) => item.learnerId === learnerId).forEach((item) => rows.set(item.courseId, { course_id: item.courseId, enrolled_at: item.enrolledAt, source: "self", due_at: null, assigned_by: null }));
  assignmentsFor(state, learnerId).forEach((item) => {
    const by = state.facilitators.find((person) => person.id === item.assignedBy)?.name ?? null;
    rows.set(item.courseId, { course_id: item.courseId, enrolled_at: item.startAt, source: "assignment", due_at: item.dueAt, assigned_by: by });
  });
  return [...rows.values()];
}

export function progressFor(state: LearningState, learnerId: string) {
  return state.progress.filter((item) => item.learnerId === learnerId);
}

export function learnerCourseProgress(state: LearningState, learnerId: string, courseId: string) {
  const course = state.courses.find((item) => item.id === courseId);
  const lessons = course ? courseLessons(course) : [];
  const done = state.progress.filter((item) => item.learnerId === learnerId && item.courseId === courseId && item.status === "completed").length;
  return { total: lessons.length, done, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

export function lastActivity(state: LearningState, learnerId: string) {
  return progressFor(state, learnerId).map((item) => item.updatedAt).sort().at(-1) ?? null;
}

export async function fetchLearnerRecord(accountId: string) {
  await wait();
  if (takeSimulatedFailure()) throw new MockServiceError("Simulated failure");
  const state = getLearningState();
  const learnerId = learnerIdFor(state, accountId);
  return {
    enrollments: enrollmentsFor(state, learnerId),
    progress: progressFor(state, learnerId).map((item) => ({ lesson_id: item.lessonId, status: item.status, completed_at: item.completedAt, updated_at: item.updatedAt, channel: item.channel })),
  };
}

export function enrollLearner(accountId: string, courseId: string) {
  mutate((state) => {
    const learnerId = learnerIdFor(state, accountId);
    if (state.enrollments.some((item) => item.learnerId === learnerId && item.courseId === courseId)) return state;
    return { ...state, enrollments: [...state.enrollments, { learnerId, courseId, enrolledAt: nowIso() }] };
  });
}

export function saveLessonProgress(accountId: string, lessonId: string, status: "in_progress" | "completed", channel: LearningChannel = "web") {
  mutate((state) => {
    const learnerId = learnerIdFor(state, accountId);
    const course = state.courses.find((item) => courseLessons(item).some((lesson) => lesson.id === lessonId));
    if (!course) return state;
    const at = nowIso();
    const current = state.progress.find((item) => item.learnerId === learnerId && item.lessonId === lessonId);
    if (current?.status === "completed" && status === "in_progress") return state;
    const next = { learnerId, courseId: course.id, lessonId, status, channel, updatedAt: at, completedAt: status === "completed" ? at : current?.completedAt ?? null };
    const progress = current ? state.progress.map((item) => (item === current ? next : item)) : [...state.progress, next];
    return { ...state, progress };
  });
}
