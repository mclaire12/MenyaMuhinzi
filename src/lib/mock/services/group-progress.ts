import { farmerSummary, INACTIVE_DAYS } from "@/lib/mock/services/farmers";
import { canManageGroup, myGroups } from "@/lib/mock/services/groups";
import { groupMaterials, myMaterials } from "@/lib/mock/services/teaching";
import { learnerCourseProgress } from "@/lib/mock/services/learners";
import type { Farmer, FarmerGroup, LearningState } from "@/lib/mock/types";

export type LearnerStatus = "active" | "inactive" | "completed";
export type FollowUp = "not_started" | "not_recent" | "needs_support" | "doing_well" | "completed" | "on_track";

export const followUpLabels: Record<FollowUp, string> = {
  not_started: "Not started",
  not_recent: "No recent activity",
  needs_support: "Needs physical support",
  doing_well: "Progressing well",
  completed: "Completed",
  on_track: "On track",
};

export const statusLabels: Record<LearnerStatus, string> = { active: "Active", inactive: "Inactive", completed: "Completed" };

export type FarmerProgressRow = ReturnType<typeof farmerProgress>;

export function farmerProgress(state: LearningState, farmer: Farmer) {
  const summary = farmerSummary(state, farmer.id);
  const enrolled = summary.courses.length;
  const allDone = enrolled > 0 && summary.courses.every((row) => row.progress.total > 0 && row.progress.done === row.progress.total);
  const started = summary.completedLessons > 0 || state.progress.some((item) => item.learnerId === farmer.id);
  const status: LearnerStatus = allDone ? "completed" : summary.active ? "active" : "inactive";
  const lowScore = summary.averageScore !== null && summary.averageScore < 60;
  const followUp: FollowUp = allDone ? "completed"
    : !started ? "not_started"
    : lowScore || (!summary.active && summary.progressPct < 50) ? "needs_support"
    : !summary.active ? "not_recent"
    : summary.progressPct >= 50 ? "doing_well"
    : "on_track";
  return { farmer, ...summary, enrolled, status, followUp, started };
}

/** Farmers the facilitator may follow up: members of the groups they manage. */
export function managedLearners(state: LearningState, facilitatorId: string, groupId: string | "all" = "all") {
  const groups = myGroups(state, facilitatorId).filter((group) => groupId === "all" || group.id === groupId);
  const ids = new Set(groups.flatMap((group) => group.memberIds));
  return state.farmers.filter((farmer) => ids.has(farmer.id));
}

export function canViewLearner(state: LearningState, facilitatorId: string, farmerId: string) {
  return state.groups.some((group) => canManageGroup(group, facilitatorId) && group.memberIds.includes(farmerId))
    || state.farmers.some((farmer) => farmer.id === farmerId && farmer.facilitatorId === facilitatorId);
}

export function groupProgress(state: LearningState, group: FarmerGroup) {
  const rows = state.farmers.filter((farmer) => group.memberIds.includes(farmer.id)).map((farmer) => farmerProgress(state, farmer));
  const courseIds = [...new Set(rows.flatMap((row) => row.courses.map((item) => item.course!.id)))];
  const courses = courseIds.map((courseId) => {
    const learners = rows.filter((row) => row.courses.some((item) => item.course!.id === courseId));
    const progress = learners.map((row) => learnerCourseProgress(state, row.farmer.id, courseId));
    return {
      course: state.courses.find((course) => course.id === courseId)!,
      enrolled: learners.length,
      averagePct: progress.length ? Math.round(progress.reduce((sum, item) => sum + item.pct, 0) / progress.length) : 0,
      completed: progress.filter((item) => item.total > 0 && item.done === item.total).length,
    };
  });
  const pairs = courses.reduce((sum, row) => sum + row.enrolled, 0);
  const finished = courses.reduce((sum, row) => sum + row.completed, 0);
  return {
    group,
    rows,
    members: rows.length,
    enrolled: rows.filter((row) => row.enrolled > 0).length,
    active: rows.filter((row) => row.status === "active").length,
    notStarted: rows.filter((row) => row.followUp === "not_started").length,
    needsFollowUp: rows.filter((row) => row.followUp === "needs_support" || row.followUp === "not_recent").length,
    completedLessons: rows.reduce((sum, row) => sum + row.completedLessons, 0),
    lessonCompletion: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progressPct, 0) / rows.length) : 0,
    courseCompletion: pairs ? Math.round((finished / pairs) * 100) : 0,
    courses,
    materials: groupMaterials(state, group.id),
  };
}

export function facilitatorOverview(state: LearningState, facilitatorId: string) {
  const groups = myGroups(state, facilitatorId);
  const rows = managedLearners(state, facilitatorId).map((farmer) => farmerProgress(state, farmer));
  const materials = myMaterials(state, facilitatorId);
  return {
    groups,
    rows,
    farmers: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    notStarted: rows.filter((row) => row.followUp === "not_started").length,
    needsFollowUp: rows.filter((row) => row.followUp === "needs_support" || row.followUp === "not_recent"),
    completedLessons: rows.reduce((sum, row) => sum + row.completedLessons, 0),
    materials,
    drafts: materials.filter((item) => item.status === "draft").length,
    published: materials.filter((item) => item.status === "published").length,
    inactiveDays: INACTIVE_DAYS,
  };
}

/** Farmers and draft materials a facilitator should look at. Shown from the portal header. */
export function facilitatorAttention(state: LearningState, facilitatorId: string) {
  const overview = facilitatorOverview(state, facilitatorId);
  const farmers = overview.rows
    .filter((row) => row.followUp === "not_started" || row.followUp === "needs_support" || row.followUp === "not_recent")
    .slice(0, 6)
    .map((row) => ({
      key: row.farmer.id,
      to: "/facilitator/progress/$farmerId" as const,
      params: { farmerId: row.farmer.id },
      text: `${row.farmer.name} ${row.followUp === "not_started" ? "has not started learning" : row.followUp === "needs_support" ? "may need a visit" : "has not learned recently"}`,
    }));
  const drafts = overview.materials
    .filter((item) => item.status === "draft")
    .slice(0, 3)
    .map((item) => ({
      key: item.id,
      to: "/facilitator/teaching/$materialId" as const,
      params: { materialId: item.id },
      text: `${item.title} is still a draft`,
    }));
  return [...farmers, ...drafts];
}
