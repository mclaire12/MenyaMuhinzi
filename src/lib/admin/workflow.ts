import type { KnowledgeStatus } from "@/lib/admin/types";

export { adminCourseStatuses as nextCourseStatuses } from "@/lib/mock/workflow";

export function nextKnowledgeStatus(status: KnowledgeStatus): KnowledgeStatus | null {
  if (status === "processing_failed") return "processing";
  if (status === "awaiting_review") return "approved";
  if (status === "approved") return "indexed";
  if (status === "needs_correction") return "awaiting_review";
  return null;
}
