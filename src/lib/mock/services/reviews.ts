import { blockingIssues } from "@/lib/mock/quality";
import { getLearningState, mutate, newId, nowIso } from "@/lib/mock/store";
import type { LearningState } from "@/lib/mock/types";
import { canReviewCourse, type ActorPermissions } from "@/lib/mock/workflow";
import { setCourseStatusByReviewer, updateLesson, type Actor } from "@/lib/mock/services/courses";

export const courseReviews = (state: LearningState, courseId: string) => state.reviews.filter((item) => item.courseId === courseId);
export const courseRevisions = (state: LearningState, courseId: string) => state.revisions.filter((item) => item.courseId === courseId);
export const latestDecision = (state: LearningState, courseId: string) => courseReviews(state, courseId).find((item) => item.action === "approved" || item.action === "rejected") ?? null;

export function reviewQueue(state: LearningState, facilitatorId: string) {
  const pending = state.courses.filter((course) => course.status === "pending_review");
  return {
    mine: pending.filter((course) => course.ownerId === facilitatorId),
    peers: pending.filter((course) => course.ownerId !== facilitatorId),
    returned: state.courses.filter((course) => course.ownerId === facilitatorId && course.status === "rejected"),
  };
}

export function addReviewComment(courseId: string, actor: Actor, comment: string, target: { moduleId: string | null; lessonId: string | null }) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course || !comment.trim()) return false;
  mutate((state) => ({ ...state, reviews: [{ id: newId("r"), courseId, revision: course.revision, action: "comment", authorId: actor.id, authorName: actor.name, comment: comment.trim(), moduleId: target.moduleId, lessonId: target.lessonId, resolved: false, at: nowIso() }, ...state.reviews] }));
  return true;
}

export function setCommentResolved(reviewId: string, resolved: boolean) {
  mutate((state) => ({ ...state, reviews: state.reviews.map((item) => (item.id === reviewId ? { ...item, resolved } : item)) }));
}

export function decideCourse(courseId: string, decision: "approved" | "rejected", actor: Actor, permissions: ActorPermissions, comment: string): string | null {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return "Course not found.";
  if (!canReviewCourse(course, actor.id, permissions)) return "You cannot review this course.";
  if (decision === "rejected" && !comment.trim()) return "Explain what must change before rejecting.";
  if (decision === "approved" && blockingIssues(course).length) return "This course still has missing information.";
  setCourseStatusByReviewer(courseId, decision, actor, comment.trim());
  return null;
}

export function setLessonValidated(courseId: string, lessonId: string, actor: Actor, validated: boolean, permissions: ActorPermissions) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return false;
  if (course.status === "draft") return updateLesson(courseId, lessonId, actor, { validated }, validated ? "Lesson validated" : "Lesson validation removed");
  if (!canReviewCourse(course, actor.id, permissions)) return false;
  mutate((state) => ({
    ...state,
    courses: state.courses.map((item) => (item.id === courseId ? { ...item, modules: item.modules.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, validated } : lesson)) })) } : item)),
    revisions: [{ id: newId("rv"), courseId, revision: course.revision, by: actor.name, summary: validated ? "Reviewer validated a lesson" : "Reviewer removed a validation", at: nowIso() }, ...state.revisions],
  }));
  return true;
}
