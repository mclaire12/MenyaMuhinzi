import { courseLessons } from "@/lib/mock/builders";
import type { LearningState } from "@/lib/mock/types";
import { enrollmentsFor, lastActivity, learnerCourseProgress, progressFor } from "@/lib/mock/services/learners";

export const INACTIVE_DAYS = 14;

export const myFarmers = (state: LearningState, facilitatorId: string) => state.farmers.filter((farmer) => farmer.facilitatorId === facilitatorId);

export function farmerSummary(state: LearningState, farmerId: string) {
  const enrollments = enrollmentsFor(state, farmerId);
  const courses = enrollments.map((item) => ({ enrollment: item, course: state.courses.find((course) => course.id === item.course_id), progress: learnerCourseProgress(state, farmerId, item.course_id) })).filter((row) => row.course);
  const completedLessons = progressFor(state, farmerId).filter((item) => item.status === "completed").length;
  const totalLessons = courses.reduce((sum, row) => sum + row.progress.total, 0);
  const attempts = state.attempts.filter((item) => item.learnerId === farmerId);
  const last = lastActivity(state, farmerId);
  return {
    groups: state.groups.filter((group) => group.memberIds.includes(farmerId)),
    courses,
    completedLessons,
    progressPct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    averageScore: attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : null,
    attempts,
    lastActivity: last,
    active: !!last && Date.now() - new Date(last).getTime() <= INACTIVE_DAYS * 86400000,
  };
}

export function farmerHistory(state: LearningState, farmerId: string) {
  const lessonTitle = new Map(state.courses.flatMap((course) => courseLessons(course).map((lesson) => [lesson.id, { lesson: lesson.title, course: course.title }] as const)));
  const lessons = progressFor(state, farmerId).map((item) => ({ at: item.updatedAt, text: `${item.status === "completed" ? "Completed" : "Started"} “${lessonTitle.get(item.lessonId)?.lesson ?? item.lessonId}”`, detail: `${lessonTitle.get(item.lessonId)?.course ?? ""} · ${item.channel.toUpperCase()}` }));
  const scores = state.attempts.filter((item) => item.learnerId === farmerId).map((item) => ({ at: item.at, text: `Assessment score ${item.score}%`, detail: state.courses.find((course) => course.id === item.courseId)?.title ?? "" }));
  const questions = state.aiQuestions.filter((item) => item.learnerId === farmerId).map((item) => ({ at: item.at, text: `Asked the AI: “${item.question}”`, detail: item.status }));
  return [...lessons, ...scores, ...questions].sort((a, b) => b.at.localeCompare(a.at));
}
