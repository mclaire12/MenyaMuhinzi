import { getAdminState, updateAdmin } from "@/lib/admin/store";
import type { AdminState, AiSettings, ChannelConfig, PlatformLanguage, PlatformSettings } from "@/lib/admin/types";
import type { LearningState } from "@/lib/mock/types";

export function saveChannels(actor: string, patch: Partial<ChannelConfig>) {
  updateAdmin(actor, "channel-config", "ussd-ivr", Object.keys(patch).join(", "), (state) => ({ ...state, channels: { ...state.channels, ...patch } }));
}

export function savePlatform(actor: string, patch: Partial<PlatformSettings>) {
  updateAdmin(actor, "platform-settings", "platform", Object.keys(patch).join(", "), (state) => ({ ...state, platform: { ...state.platform, ...patch } }));
}

export function saveAiLimits(actor: string, patch: Pick<AiSettings, "timeoutSec" | "retries" | "dailyLimit">) {
  updateAdmin(actor, "ai-limits", "ai", `${patch.timeoutSec}s · ${patch.retries} retries · ${patch.dailyLimit}/day`, (state) => ({ ...state, ai: { ...state.ai, ...patch } }));
}

export function setLanguageEnabled(actor: string, code: PlatformLanguage, enabled: boolean): string | null {
  const state = getAdminState();
  if (!enabled && (code === "rw" || state.platform.defaultLanguage === code)) return "Kinyarwanda and the default language must stay enabled.";
  updateAdmin(actor, "language", code, enabled ? "enabled" : "disabled", (current) => ({ ...current, languages: current.languages.map((row) => (row.code === code ? { ...row, enabled } : row)) }));
  return null;
}

export function setDefaultLanguage(actor: string, code: PlatformLanguage) {
  updateAdmin(actor, "default-language", code, code, (state) => ({
    ...state,
    platform: { ...state.platform, defaultLanguage: code },
    languages: state.languages.map((row) => ({ ...row, default: row.code === code, enabled: row.code === code ? true : row.enabled ?? true })),
  }));
}

export const enabledLanguages = (admin: AdminState) => admin.languages.filter((row) => row.enabled !== false);

export type SystemAlert = { id: string; severity: "info" | "warning" | "critical"; text: string; to: "/admin/users" | "/admin/courses" | "/admin/ai" | "/admin/operations" | "/admin/knowledge" | "/admin/groups" | "/admin/settings"; search?: Record<string, string> };

/** Alerts are derived from the records so they disappear once the cause is fixed. */
export function systemAlerts(admin: AdminState, learning: LearningState): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const pending = admin.users.filter((user) => user.status === "pending").length;
  if (pending) alerts.push({ id: "pending", severity: "warning", text: `${pending} account request(s) are waiting for approval.`, to: "/admin/users", search: { tab: "approvals" } });
  admin.models.filter((model) => model.status === "inactive" || model.status === "unavailable").forEach((model) => {
    const bots = admin.chatbots.filter((bot) => bot.modelId === model.id && bot.status === "active");
    alerts.push({ id: `model-${model.id}`, severity: bots.length ? "critical" : "info", text: bots.length ? `${model.name} is ${model.status} but ${bots.map((bot) => bot.name).join(", ")} still use it.` : `${model.name} is ${model.status}.`, to: "/admin/ai", search: { tab: "models" } });
  });
  const review = learning.courses.filter((course) => course.status === "pending_review").length;
  if (review) alerts.push({ id: "review", severity: "warning", text: `${review} facilitator course(s) are waiting for review.`, to: "/admin/courses", search: { status: "pending_review" } });
  const drafts = learning.courses.filter((course) => course.status === "draft").length;
  if (drafts) alerts.push({ id: "drafts", severity: "info", text: `${drafts} course draft(s) are not published.`, to: "/admin/courses", search: { status: "draft" } });
  const failedTests = admin.aiEvents.filter((event) => !event.ok && Date.now() - new Date(event.at).getTime() < 7 * 86400000).length;
  if (failedTests) alerts.push({ id: "ai-failed", severity: "warning", text: `${failedTests} AI request(s) failed in the last 7 days.`, to: "/admin/ai", search: { tab: "testing" } });
  if (admin.channels.ussdStatus === "disabled") alerts.push({ id: "ussd", severity: "warning", text: "The simulated USSD service is switched off. Basic-phone farmers cannot dial in the simulator.", to: "/admin/operations", search: { tab: "channels" } });
  if (admin.channels.ivrStatus === "disabled") alerts.push({ id: "ivr", severity: "warning", text: "The simulated IVR service is switched off. Lesson calls are refused in the simulator.", to: "/admin/operations", search: { tab: "channels" } });
  const failedKnowledge = admin.knowledge.filter((item) => item.status === "processing_failed").length;
  if (failedKnowledge) alerts.push({ id: "knowledge", severity: "warning", text: `${failedKnowledge} knowledge upload(s) failed and need to be replaced.`, to: "/admin/knowledge" });
  if (!admin.platform.supportEmail.trim()) alerts.push({ id: "support", severity: "info", text: "No support email is configured.", to: "/admin/settings" });
  return alerts;
}
