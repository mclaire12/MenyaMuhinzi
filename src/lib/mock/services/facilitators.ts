import { getAdminState } from "@/lib/admin/store";
import { mutate } from "@/lib/mock/store";
import type { Facilitator, LearningState } from "@/lib/mock/types";
import type { ActorPermissions } from "@/lib/mock/workflow";

export function facilitatorForAccount(state: LearningState, accountId: string | undefined) {
  return accountId ? state.facilitators.find((person) => person.accountId === accountId) ?? null : null;
}

export function facilitatorPermissions(): ActorPermissions {
  const permissions = getAdminState().permissions.FACILITATOR;
  return { approve: !!permissions.approve, publish: !!permissions.publish };
}

export function updateFacilitatorProfile(id: string, change: Partial<Omit<Facilitator, "id" | "accountId" | "responsibilities">>) {
  mutate((state) => ({ ...state, facilitators: state.facilitators.map((person) => (person.id === id ? { ...person, ...change } : person)) }));
}

export function setMockConfig(change: Partial<LearningState["config"]>) {
  mutate((state) => ({ ...state, config: { ...state.config, ...change } }));
}
