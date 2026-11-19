import { adminId, getAdminState, updateAdmin } from "@/lib/admin/store";
import type { TargetAudience, TargetGroup, TargetGroupStatus } from "@/lib/admin/types";
import { courseAudience, farmerMatchesGroup } from "@/lib/mock/services/availability";
import { nowIso } from "@/lib/mock/store";
import type { Course, CropSlug, LearningState } from "@/lib/mock/types";

export const audienceLabels: Record<TargetAudience, string> = {
  beginner: "Beginner farmers",
  intermediate: "Intermediate farmers",
  advanced: "Advanced farmers",
  all: "All farmers",
};

export const groupStatusLabels: Record<TargetGroupStatus, string> = { active: "Active", inactive: "Inactive", archived: "Archived" };

export const groupTone = (status: TargetGroupStatus) => (status === "active" ? "ok" : status === "inactive" ? "warn" : "muted");

export const groupStatusCopy: Record<TargetGroupStatus, { title: string; label: string; text: string }> = {
  active: { title: "Activate this group?", label: "Activate", text: "Courses published to this group become visible to matching farmers again." },
  inactive: { title: "Deactivate this group?", label: "Deactivate", text: "Farmers who only qualify through this group stop seeing its courses. The courses themselves stay published." },
  archived: { title: "Archive this group?", label: "Archive", text: "The group is hidden from publishing choices and its courses are no longer shown through it. You can restore it later." },
};

export type TargetGroupValues = Pick<TargetGroup, "name" | "description" | "audience" | "province" | "district" | "sector" | "crop" | "estimatedFarmers" | "language" | "notes">;

export const emptyTargetGroup = (language: "rw" | "en" = "rw"): TargetGroupValues => ({
  name: "", description: "", audience: "all", province: "Northern Province", district: "", sector: "", crop: "tomato", estimatedFarmers: 100, language, notes: "",
});

export type GroupErrors = Partial<Record<keyof TargetGroupValues, string>>;

export function validateTargetGroup(values: TargetGroupValues, ignoreId: string | null): GroupErrors {
  const errors: GroupErrors = {};
  if (values.name.trim().length < 3) errors.name = "Enter a group name (at least 3 characters).";
  else if (getAdminState().targetGroups.some((group) => group.id !== ignoreId && group.status !== "archived" && group.name.trim().toLowerCase() === values.name.trim().toLowerCase())) errors.name = "Another group already uses this name.";
  if (values.description.trim().length < 10) errors.description = "Describe who this group is for (at least 10 characters).";
  if (!values.province) errors.province = "Choose a province.";
  if (!Number.isInteger(values.estimatedFarmers) || values.estimatedFarmers < 1 || values.estimatedFarmers > 100000) errors.estimatedFarmers = "Enter an estimate between 1 and 100,000.";
  return errors;
}

const clean = (values: TargetGroupValues): TargetGroupValues => ({ ...values, name: values.name.trim(), description: values.description.trim(), sector: values.district ? values.sector.trim() : "", notes: values.notes.trim() });

export function createTargetGroup(actor: string, values: TargetGroupValues) {
  const id = adminId("tg");
  const at = nowIso();
  updateAdmin(actor, "create-group", id, values.name.trim(), (state) => ({ ...state, targetGroups: [{ id, ...clean(values), status: "active", createdAt: at, updatedAt: at, createdBy: actor }, ...state.targetGroups] }));
  return id;
}

export function updateTargetGroup(actor: string, id: string, values: TargetGroupValues) {
  updateAdmin(actor, "update-group", id, values.name.trim(), (state) => ({ ...state, targetGroups: state.targetGroups.map((group) => (group.id === id ? { ...group, ...clean(values), updatedAt: nowIso() } : group)) }));
}

export function setTargetGroupStatus(actor: string, id: string, status: TargetGroupStatus) {
  updateAdmin(actor, "group-status", id, groupStatusLabels[status], (state) => ({ ...state, targetGroups: state.targetGroups.map((group) => (group.id === id ? { ...group, status, updatedAt: nowIso() } : group)) }));
}

export const cropInterestOptions: { value: CropSlug | "mixed"; label: string }[] = [
  { value: "tomato", label: "Tomatoes (Inyanya)" },
  { value: "cabbage", label: "Cabbages (Amashu)" },
  { value: "carrot", label: "Carrots (Karoti)" },
  { value: "mixed", label: "Multiple crops" },
];

export const groupLocation = (group: Pick<TargetGroup, "province" | "district" | "sector">) => [group.sector, group.district, group.province].filter(Boolean).join(", ") || "—";

export const coursesForGroup = (learning: LearningState, groupId: string) => learning.courses.filter((course) => courseAudience(course).scope === "groups" && courseAudience(course).groupIds.includes(groupId));

/** When the course was last published or updated for this group. */
export function groupPublishedAt(course: Course, groupId: string) {
  return [...(course.publications ?? [])].filter((item) => item.action !== "unpublished" && item.groupIds.includes(groupId)).sort((a, b) => b.at.localeCompare(a.at))[0]?.at ?? null;
}

/** Registered farmers that currently match the group's location and crop; informational only. */
export const matchingFarmers = (learning: LearningState, group: TargetGroup) => learning.farmers.filter((farmer) => farmerMatchesGroup(farmer, { ...group, status: "active" }));
