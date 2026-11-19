import { adminId, updateAdmin } from "@/lib/admin/store";
import type { KnowledgeSource, KnowledgeStatus } from "@/lib/admin/types";
import { nowIso } from "@/lib/mock/store";

export type Approval = "awaiting_review" | "approved" | "rejected" | "failed" | "archived";

/** The older processing stages collapse into the four states an administrator acts on. */
export function approvalOf(status: KnowledgeStatus): Approval {
  if (status === "approved" || status === "indexed") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "archived") return "archived";
  if (status === "processing_failed") return "failed";
  return "awaiting_review";
}

export const approvalLabels: Record<Approval, string> = { awaiting_review: "Awaiting review", approved: "Approved", rejected: "Rejected", failed: "Upload failed", archived: "Archived" };

export const knowledgeCrops = ["Tomato", "Cabbage", "Carrot", "All"] as const;
export const knowledgeTopics = ["Land preparation", "Planting", "Pests and diseases", "Irrigation", "Harvest and storage", "Marketing", "General"] as const;
export const documentTypes: KnowledgeSource["kind"][] = ["PDF", "DOCX", "TXT"];

export type KnowledgeValues = { title: string; description: string; vegetable: string; topic: string; language: string; author: string; kind: KnowledgeSource["kind"]; fileName: string };

export const emptyKnowledge = (): KnowledgeValues => ({ title: "", description: "", vegetable: "Tomato", topic: "General", language: "rw", author: "", kind: "PDF", fileName: "" });

export function validateKnowledge(values: KnowledgeValues) {
  const errors: Partial<Record<keyof KnowledgeValues, string>> = {};
  if (values.title.trim().length < 4) errors.title = "Enter a title (at least 4 characters).";
  if (values.author.trim().length < 2) errors.author = "Name the source, for example RAB or FAO.";
  if (values.fileName && !new RegExp(`\\.${values.kind.toLowerCase()}$`, "i").test(values.fileName)) errors.fileName = `The file must be a .${values.kind.toLowerCase()} file.`;
  return errors;
}

const clean = (values: KnowledgeValues) => ({ ...values, title: values.title.trim(), description: values.description.trim(), author: values.author.trim() });

export function addKnowledge(actor: string, values: KnowledgeValues) {
  const id = adminId("k");
  const at = nowIso();
  updateAdmin(actor, "add-knowledge", id, values.title.trim(), (state) => ({ ...state, knowledge: [{ id, ...clean(values), status: "awaiting_review", updatedAt: at, addedAt: at }, ...state.knowledge] }));
  return id;
}

export function updateKnowledge(actor: string, id: string, values: KnowledgeValues) {
  updateAdmin(actor, "edit-knowledge", id, values.title.trim(), (state) => ({ ...state, knowledge: state.knowledge.map((item) => (item.id === id ? { ...item, ...clean(values), updatedAt: nowIso() } : item)) }));
}

export function setKnowledgeStatus(actor: string, id: string, status: KnowledgeStatus) {
  updateAdmin(actor, "knowledge-status", id, status, (state) => ({ ...state, knowledge: state.knowledge.map((item) => (item.id === id ? { ...item, status, updatedAt: nowIso() } : item)) }));
}

export function removeKnowledge(actor: string, id: string, title: string) {
  updateAdmin(actor, "remove-knowledge", id, title, (state) => ({ ...state, knowledge: state.knowledge.filter((item) => item.id !== id) }));
}
