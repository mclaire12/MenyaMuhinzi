import { getAdminState } from "@/lib/admin/store";
import type { TargetGroup } from "@/lib/admin/types";
import type { Course, CourseAudience, Farmer, LearningState } from "@/lib/mock/types";

export const courseAudience = (course: Pick<Course, "audience">): CourseAudience => course.audience ?? { scope: "platform", groupIds: [] };

/** Targeting groups have no members: a farmer belongs to one when their registered location and crop interest match it. */
export function farmerMatchesGroup(farmer: Farmer, group: TargetGroup) {
  if (group.status !== "active" || farmer.province !== group.province) return false;
  if (group.district && farmer.district !== group.district) return false;
  if (group.sector && farmer.sector.toLowerCase() !== group.sector.toLowerCase()) return false;
  return group.crop === "mixed" || farmer.cropInterest.includes(group.crop);
}

export type Viewer = { staff: boolean; learner: Farmer | null };

export function courseAvailableTo(course: Course, viewer: Viewer, groups: TargetGroup[] = getAdminState().targetGroups) {
  if (course.status !== "published") return false;
  const audience = courseAudience(course);
  if (audience.scope === "platform" || viewer.staff) return true;
  const learner = viewer.learner;
  return !!learner && groups.some((group) => audience.groupIds.includes(group.id) && farmerMatchesGroup(learner, group));
}

export function availableCourses(state: LearningState, viewer: Viewer) {
  const groups = getAdminState().targetGroups;
  return state.courses.filter((course) => courseAvailableTo(course, viewer, groups));
}

export const learnerViewer = (state: LearningState, learnerId: string): Viewer => ({ staff: false, learner: state.farmers.find((farmer) => farmer.id === learnerId) ?? null });
