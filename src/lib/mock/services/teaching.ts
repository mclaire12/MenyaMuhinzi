import { featureFallback } from "@/lib/admin/chatbot-routing";
import { composeSections, composeTitle } from "@/lib/mock/teaching-compose";
import { canManageGroup, logGroupActivity } from "@/lib/mock/services/groups";
import { MockServiceError, mutate, newId, nowIso, takeSimulatedFailure, wait } from "@/lib/mock/store";
import type { LearningState, TeachingInput, TeachingMaterial, TeachingSection } from "@/lib/mock/types";

export type TeachingDraft = Pick<TeachingMaterial, "input" | "title" | "sections" | "variant">;

const GENERATION_MS = 1100;

export const myMaterials = (state: LearningState, facilitatorId: string) =>
  state.materials.filter((item) => item.facilitatorId === facilitatorId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const materialGroupIds = (material: TeachingMaterial) => [...new Set(material.publications.flatMap((item) => item.groupIds))];

export const groupMaterials = (state: LearningState, groupId: string) =>
  state.materials.filter((item) => item.status === "published" && materialGroupIds(item).includes(groupId));

export function validateInput(input: TeachingInput) {
  if (input.topic.trim().length < 5) return "Describe the teaching topic in at least 5 characters.";
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 30 || input.durationMinutes > 480) return "Training duration must be between 30 and 480 minutes.";
  return null;
}

async function simulate() {
  await wait(GENERATION_MS);
  if (takeSimulatedFailure()) throw new MockServiceError("The demo generator failed. Try again.");
}

export async function generateTeaching(input: TeachingInput, variant = 0): Promise<TeachingDraft> {
  const error = validateInput(input);
  if (error) throw new MockServiceError(error);
  const unavailable = featureFallback("teaching_generation");
  if (unavailable) throw new MockServiceError(`The teaching material assistant is switched off by the administrator. ${unavailable}`);
  await simulate();
  return { input, title: composeTitle(input), sections: composeSections(input, variant), variant };
}

/** Returns a fresh version of one generated section; custom sections cannot be regenerated. */
export async function regenerateSection(input: TeachingInput, section: TeachingSection, variant: number): Promise<TeachingSection | null> {
  await simulate();
  const match = composeSections(input, variant).find((item) => item.id === section.id);
  return match ? { ...match, id: section.id } : null;
}

export function saveMaterial(facilitatorId: string, draft: TeachingDraft, materialId?: string) {
  const id = materialId ?? newId("tm");
  const at = nowIso();
  mutate((state) => {
    const existing = state.materials.find((item) => item.id === id);
    if (existing && existing.facilitatorId !== facilitatorId) return state;
    const next: TeachingMaterial = existing
      ? { ...existing, ...draft, title: draft.title.trim(), updatedAt: at }
      : { id, facilitatorId, ...draft, title: draft.title.trim(), status: "draft", publications: [], createdAt: at, updatedAt: at };
    return { ...state, materials: existing ? state.materials.map((item) => (item.id === id ? next : item)) : [next, ...state.materials] };
  });
  return id;
}

export function publishMaterial(materialId: string, facilitatorId: string, groupIds: string[]) {
  let error: string | null = null;
  mutate((state) => {
    const material = state.materials.find((item) => item.id === materialId && item.facilitatorId === facilitatorId);
    if (!material) { error = "Material not found."; return state; }
    if (material.status === "archived") { error = "Restore this material before publishing it."; return state; }
    const allowed = groupIds.filter((id) => state.groups.some((group) => group.id === id && canManageGroup(group, facilitatorId)));
    if (!allowed.length) { error = "Choose at least one of your groups."; return state; }
    const by = state.facilitators.find((person) => person.id === facilitatorId)?.name ?? facilitatorId;
    const at = nowIso();
    const updated: TeachingMaterial = { ...material, status: "published", updatedAt: at, publications: [{ id: newId("pub"), groupIds: allowed, at, by }, ...material.publications] };
    const withMaterial = { ...state, materials: state.materials.map((item) => (item.id === materialId ? updated : item)) };
    return allowed.reduce((current, groupId) => logGroupActivity(current, groupId, `Inyigisho yatangajwe: ${material.title}`), withMaterial);
  });
  return error;
}

export function archiveMaterial(materialId: string, facilitatorId: string) {
  mutate((state) => ({ ...state, materials: state.materials.map((item) => (item.id === materialId && item.facilitatorId === facilitatorId ? { ...item, status: "archived", updatedAt: nowIso() } : item)) }));
}

export function restoreMaterial(materialId: string, facilitatorId: string) {
  mutate((state) => ({ ...state, materials: state.materials.map((item) => (item.id === materialId && item.facilitatorId === facilitatorId ? { ...item, status: item.publications.length ? "published" : "draft", updatedAt: nowIso() } : item)) }));
}

/** A farmer can read a material once it is published to one of their groups. */
export function materialForLearner(state: LearningState, learnerId: string, materialId: string) {
  const material = state.materials.find((item) => item.id === materialId && item.status === "published");
  if (!material) return null;
  const groups = state.groups.filter((group) => group.memberIds.includes(learnerId) && materialGroupIds(material).includes(group.id));
  return groups.length ? { material, groups } : null;
}
