import type { Course, CourseStatus } from "@/lib/mock/types";

export type CourseAction = "submit" | "withdraw" | "publish" | "archive" | "restore" | "revise";

export type ActorPermissions = { approve: boolean; publish: boolean };

export function facilitatorActions(status: CourseStatus, permissions: ActorPermissions): CourseAction[] {
  switch (status) {
    case "draft": return ["submit", "archive"];
    case "pending_review": return ["withdraw"];
    case "approved": return permissions.publish ? ["publish", "archive"] : ["archive"];
    case "published": return ["archive"];
    case "rejected": return ["revise", "archive"];
    case "archived": return ["restore"];
  }
}

export const canEditCourse = (course: Pick<Course, "status">) => course.status === "draft";

export function canReviewCourse(course: Pick<Course, "status" | "ownerId">, reviewerId: string, permissions: ActorPermissions) {
  return course.status === "pending_review" && permissions.approve && course.ownerId !== reviewerId;
}

export function adminCourseStatuses(status: CourseStatus): CourseStatus[] {
  switch (status) {
    case "pending_review": return ["approved", "rejected"];
    case "approved": return ["published"];
    case "published": return ["archived"];
    case "archived": return ["draft"];
    default: return [];
  }
}

export const actionLabels: Record<CourseAction, string> = {
  submit: "Submit for review",
  withdraw: "Withdraw from review",
  publish: "Publish",
  archive: "Archive",
  restore: "Restore as draft",
  revise: "Revise",
};
