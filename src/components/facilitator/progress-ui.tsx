import { followUpLabels, statusLabels, type FollowUp, type LearnerStatus } from "@/lib/mock/services/group-progress";
import type { AccessChannel } from "@/lib/mock/types";

export function FarmerType({ channel }: { channel: AccessChannel }) {
  return <span className="type-pill" data-type={channel}>{channel === "smartphone" ? "Smartphone" : "Basic phone"}</span>;
}

export function LearnerStatusPill({ status }: { status: LearnerStatus }) {
  return <span className="status-pill" data-status={status === "completed" ? "approved" : status === "active" ? "published" : "archived"}>{statusLabels[status]}</span>;
}

export function FollowUpPill({ value }: { value: FollowUp }) {
  return <span className="follow-pill" data-follow={value}>{followUpLabels[value]}</span>;
}
