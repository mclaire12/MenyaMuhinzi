import { courseLessons } from "@/lib/mock/builders";
import { crops } from "@/lib/mock/crops";
import type { CropSlug, LearningState } from "@/lib/mock/types";
import { courseLearnerIds, managedCourses } from "@/lib/mock/services/courses";
import { farmerSummary, myFarmers } from "@/lib/mock/services/farmers";
import { myGroups } from "@/lib/mock/services/groups";
import { learnerCourseProgress } from "@/lib/mock/services/learners";

export type AnalyticsFilter = { from: string | null; to: string | null; crop: CropSlug | "all"; courseId: string | "all"; groupId: string | "all" };
export const noFilter: AnalyticsFilter = { from: null, to: null, crop: "all", courseId: "all", groupId: "all" };

const inRange = (iso: string | null, filter: AnalyticsFilter) => !!iso && (!filter.from || iso.slice(0, 10) >= filter.from) && (!filter.to || iso.slice(0, 10) <= filter.to);
const average = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);

function scope(state: LearningState, facilitatorId: string, filter: AnalyticsFilter) {
  const farmers = myFarmers(state, facilitatorId);
  const group = filter.groupId === "all" ? null : myGroups(state, facilitatorId).find((item) => item.id === filter.groupId) ?? null;
  const learnerIds = new Set(farmers.filter((farmer) => !group || group.memberIds.includes(farmer.id)).map((farmer) => farmer.id));
  const courses = state.courses.filter((course) => course.status === "published" && (filter.crop === "all" || course.crop === filter.crop) && (filter.courseId === "all" || course.id === filter.courseId));
  return { farmers: farmers.filter((farmer) => learnerIds.has(farmer.id)), learnerIds, courses };
}

export function courseAnalytics(state: LearningState, facilitatorId: string, filter: AnalyticsFilter = noFilter) {
  const { learnerIds, courses } = scope(state, facilitatorId, filter);
  return courses.map((course) => {
    const learners = courseLearnerIds(state, course.id).filter((id) => learnerIds.has(id));
    const completions = state.progress.filter((item) => item.courseId === course.id && item.status === "completed" && learnerIds.has(item.learnerId) && (!filter.from && !filter.to ? true : inRange(item.completedAt, filter)));
    const finished = learners.filter((id) => { const row = learnerCourseProgress(state, id, course.id); return row.total > 0 && row.done === row.total; });
    const scores = state.attempts.filter((item) => item.courseId === course.id && learnerIds.has(item.learnerId)).map((item) => item.score);
    const lessons = courseLessons(course).map((lesson) => ({ id: lesson.id, title: lesson.title, completions: completions.filter((item) => item.lessonId === lesson.id).length }));
    const sorted = [...lessons].sort((a, b) => b.completions - a.completions);
    return {
      course,
      enrolled: learners.length,
      lessonCompletions: completions.length,
      completionRate: learners.length ? Math.round((finished.length / learners.length) * 100) : 0,
      averageScore: average(scores),
      mostCompleted: sorted[0] ?? null,
      leastCompleted: sorted.at(-1) ?? null,
      lessons,
    };
  });
}

export function farmerAnalytics(state: LearningState, facilitatorId: string, filter: AnalyticsFilter = noFilter) {
  const { farmers } = scope(state, facilitatorId, filter);
  return farmers.map((farmer) => ({ farmer, ...farmerSummary(state, farmer.id) }));
}

export function groupAnalytics(state: LearningState, facilitatorId: string, filter: AnalyticsFilter = noFilter) {
  return myGroups(state, facilitatorId).filter((group) => filter.groupId === "all" || group.id === filter.groupId).map((group) => {
    const courseIds = state.assignments.filter((item) => item.target.kind === "group" && item.target.id === group.id).map((item) => item.courseId).filter((id) => filter.courseId === "all" || id === filter.courseId);
    const rows = group.memberIds.flatMap((id) => courseIds.map((courseId) => learnerCourseProgress(state, id, courseId)));
    const participating = group.memberIds.filter((id) => state.progress.some((item) => item.learnerId === id && courseIds.includes(item.courseId)));
    return {
      group,
      members: group.memberIds.length,
      courses: courseIds.length,
      participation: group.memberIds.length ? Math.round((participating.length / group.memberIds.length) * 100) : 0,
      completionRate: rows.length ? Math.round((rows.filter((row) => row.total && row.done === row.total).length / rows.length) * 100) : 0,
      averageProgress: average(rows.map((row) => row.pct)) ?? 0,
    };
  });
}

export function cropAnalytics(state: LearningState, facilitatorId: string, filter: AnalyticsFilter = noFilter) {
  const courses = courseAnalytics(state, facilitatorId, { ...filter, crop: "all", courseId: "all" });
  return crops.map((crop) => {
    const rows = courses.filter((row) => row.course.crop === crop.slug);
    return {
      crop: crop.slug,
      name: crop.name_rw,
      learners: rows.reduce((sum, row) => sum + row.enrolled, 0),
      completions: rows.reduce((sum, row) => sum + row.lessonCompletions, 0),
      questions: state.aiQuestions.filter((item) => item.crop === crop.slug).length,
    };
  });
}

export function misunderstoodTopics(state: LearningState, facilitatorId: string) {
  const learnerIds = new Set(myFarmers(state, facilitatorId).map((farmer) => farmer.id));
  const counts = new Map<string, { topic: string; missed: number; questions: number }>();
  const bump = (topic: string, key: "missed" | "questions") => { const row = counts.get(topic) ?? { topic, missed: 0, questions: 0 }; row[key] += 1; counts.set(topic, row); };
  state.attempts.filter((item) => learnerIds.has(item.learnerId)).forEach((item) => item.missedTopics.forEach((topic) => bump(topic, "missed")));
  state.aiQuestions.filter((item) => learnerIds.has(item.learnerId) && item.status !== "answered").forEach((item) => bump(item.topic, "questions"));
  return [...counts.values()].sort((a, b) => b.missed + b.questions - (a.missed + a.questions));
}

export function dashboardSummary(state: LearningState, facilitatorId: string) {
  const courses = managedCourses(state, facilitatorId);
  const farmers = myFarmers(state, facilitatorId);
  const learnerIds = new Set(farmers.map((farmer) => farmer.id));
  const assignedIds = new Set(state.assignments.filter((item) => item.assignedBy === facilitatorId).flatMap((item) => (item.target.kind === "farmer" ? [item.target.id] : state.groups.find((group) => group.id === item.target.id)?.memberIds ?? [])));
  const groups = myGroups(state, facilitatorId);
  const scores = state.attempts.filter((item) => learnerIds.has(item.learnerId)).map((item) => item.score);
  return {
    total: courses.length,
    published: courses.filter((course) => course.status === "published").length,
    drafts: courses.filter((course) => course.status === "draft").length,
    awaiting: courses.filter((course) => course.status === "pending_review").length,
    assignedFarmers: assignedIds.size,
    activeGroups: groups.filter((group) => group.memberIds.length && state.assignments.some((item) => item.target.kind === "group" && item.target.id === group.id)).length,
    completions: state.progress.filter((item) => item.status === "completed" && learnerIds.has(item.learnerId)).length,
    averageScore: average(scores),
  };
}
