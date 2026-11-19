import { mutate, newId, nowIso } from "@/lib/mock/store";
import type { AssignmentTarget, LearningState } from "@/lib/mock/types";
import { logGroupActivity } from "@/lib/mock/services/groups";
import { learnerCourseProgress } from "@/lib/mock/services/learners";

export const myAssignments = (state: LearningState, facilitatorId: string) =>
  state.assignments.filter((item) => item.assignedBy === facilitatorId).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));

export function targetLearners(state: LearningState, target: AssignmentTarget) {
  return target.kind === "farmer" ? [target.id] : state.groups.find((group) => group.id === target.id)?.memberIds ?? [];
}

export function targetName(state: LearningState, target: AssignmentTarget) {
  return target.kind === "farmer" ? state.farmers.find((farmer) => farmer.id === target.id)?.name ?? target.id : state.groups.find((group) => group.id === target.id)?.name ?? target.id;
}

export function assignmentProgress(state: LearningState, courseId: string, target: AssignmentTarget) {
  const learners = targetLearners(state, target);
  const rows = learners.map((id) => learnerCourseProgress(state, id, courseId));
  const pct = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.pct, 0) / rows.length) : 0;
  return { learners: learners.length, pct, completed: rows.filter((row) => row.total && row.done === row.total).length };
}

export function assignCourse(facilitatorId: string, values: { courseId: string; targets: AssignmentTarget[]; startAt: string; dueAt: string | null; note: string }): string | null {
  if (!values.targets.length) return "Choose at least one farmer or group.";
  if (values.dueAt && values.dueAt < values.startAt) return "The completion date must be after the start date.";
  mutate((state) => {
    const course = state.courses.find((item) => item.id === values.courseId);
    if (!course || course.status !== "published") return state;
    let next: LearningState = {
      ...state,
      assignments: [...values.targets.map((target) => ({ id: newId("as"), courseId: values.courseId, target, assignedBy: facilitatorId, assignedAt: nowIso(), startAt: values.startAt, dueAt: values.dueAt, note: values.note })), ...state.assignments],
    };
    values.targets.filter((target) => target.kind === "group").forEach((target) => { next = logGroupActivity(next, target.id, `${course.title} ryahawe itsinda`); });
    return next;
  });
  return null;
}

export const removeAssignment = (assignmentId: string, facilitatorId: string) =>
  mutate((state) => ({ ...state, assignments: state.assignments.filter((item) => !(item.id === assignmentId && item.assignedBy === facilitatorId)) }));
