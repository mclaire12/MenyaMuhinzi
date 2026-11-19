import { mutate, newId, nowIso } from "@/lib/mock/store";
import type { FarmerGroup, LearningState } from "@/lib/mock/types";

export const myGroups = (state: LearningState, facilitatorId: string) => state.groups.filter((group) => group.facilitatorId === facilitatorId);

export type GroupValues = Pick<FarmerGroup, "name" | "province" | "district" | "sector" | "cell" | "village" | "crop" | "programme">;

function note(group: FarmerGroup, text: string): FarmerGroup {
  return { ...group, activity: [{ at: nowIso(), text }, ...group.activity].slice(0, 30) };
}

function change(state: LearningState, groupId: string, facilitatorId: string, update: (group: FarmerGroup) => FarmerGroup) {
  return { ...state, groups: state.groups.map((group) => (group.id === groupId && group.facilitatorId === facilitatorId ? update(group) : group)) };
}

export function createGroup(facilitatorId: string, values: GroupValues) {
  const id = newId("g");
  mutate((state) => ({ ...state, groups: [{ ...values, id, facilitatorId, memberIds: [], createdAt: nowIso(), activity: [{ at: nowIso(), text: "Itsinda ryashyizweho" }] }, ...state.groups] }));
  return id;
}

export const updateGroup = (groupId: string, facilitatorId: string, values: GroupValues) =>
  mutate((state) => change(state, groupId, facilitatorId, (group) => note({ ...group, ...values }, "Amakuru y'itsinda yahinduwe")));

export function addMembers(groupId: string, facilitatorId: string, farmerIds: string[]) {
  mutate((state) => {
    const allowed = farmerIds.filter((id) => state.farmers.some((farmer) => farmer.id === id && farmer.facilitatorId === facilitatorId));
    const names = state.farmers.filter((farmer) => allowed.includes(farmer.id)).map((farmer) => farmer.name).join(", ");
    return change(state, groupId, facilitatorId, (group) => note({ ...group, memberIds: [...new Set([...group.memberIds, ...allowed])] }, `Abanyamuryango bongewemo: ${names}`));
  });
}

export function removeMember(groupId: string, facilitatorId: string, farmerId: string) {
  mutate((state) => {
    const name = state.farmers.find((farmer) => farmer.id === farmerId)?.name ?? farmerId;
    return change(state, groupId, facilitatorId, (group) => note({ ...group, memberIds: group.memberIds.filter((id) => id !== farmerId) }, `${name} yavuye mu itsinda`));
  });
}

export function logGroupActivity(state: LearningState, groupId: string, text: string): LearningState {
  return { ...state, groups: state.groups.map((group) => (group.id === groupId ? note(group, text) : group)) };
}
