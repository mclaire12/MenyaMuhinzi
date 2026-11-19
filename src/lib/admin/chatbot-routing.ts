import { getAdminState } from "@/lib/admin/store";
import type { ChatbotFeature } from "@/lib/admin/types";

/** Null when an active chatbot with an active or testing model serves the feature; otherwise the message users should see. */
export function featureFallback(feature: ChatbotFeature): string | null {
  const admin = getAdminState();
  const bots = admin.chatbots.filter((bot) => bot.feature === feature);
  const served = bots.some((bot) => {
    const model = admin.models.find((item) => item.id === bot.modelId);
    return bot.status === "active" && !!model && (model.status === "active" || model.status === "testing");
  });
  if (served) return null;
  return bots[0]?.behavior.fallback.trim() || "Serivisi y'ibibazo ntiboneka ubu. Baza umufashamyumvire wawe.";
}
