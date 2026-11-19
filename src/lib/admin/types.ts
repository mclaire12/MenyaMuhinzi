import type { CropSlug, Location } from "@/lib/mock/types";

export type AccountStatus = "active" | "pending" | "suspended" | "deactivated" | "rejected";
export type AccessChannel = "smartphone" | "basic_phone";
export type PortalRole = "ADMIN" | "FACILITATOR" | "SMARTPHONE_FARMER" | "BASIC_PHONE_FARMER";
export type KnowledgeStatus = "uploaded" | "processing" | "awaiting_review" | "approved" | "indexed" | "processing_failed" | "rejected" | "needs_correction" | "archived";
export type PermissionAction = "view" | "create" | "update" | "delete" | "approve" | "publish" | "export" | "manage";
export type PlatformLanguage = "rw" | "en" | "fr";

export type PortalUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  district: string;
  language: PlatformLanguage;
  channel: AccessChannel;
  role: PortalRole;
  status: AccountStatus;
  registeredAt: string;
  lastActiveAt: string;
  qualification: string;
  verified: boolean;
  groupId: string;
  enrollments: { courseId: string; progress: number }[];
  notes: { at: string; text: string }[];
  /** Staff and pending accounts; farmers keep their location on the shared learner profile. */
  location?: Location;
  approvedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type KnowledgeSource = {
  id: string;
  title: string;
  kind: "PDF" | "DOCX" | "TXT";
  vegetable: string;
  language: string;
  author: string;
  status: KnowledgeStatus;
  updatedAt: string;
  description?: string;
  topic?: string;
  fileName?: string;
  addedAt?: string;
};

export type GlossaryTerm = { id: string; rw: string; en: string; fr: string; definition: string; status: "draft" | "reviewed" };
export type PromptItem = { id: string; name: string; purpose: string; version: number; active: boolean; body: string };
export type AiSettings = { model: string; timeoutSec: number; retries: number; dailyLimit: number; fallback: string; active: boolean };
export type AiEvent = { id: string; at: string; question: string; ok: boolean; latencyMs: number; confidence: "high" | "low"; flagged: boolean; source?: "farmer" | "test"; chatbotId?: string; modelId?: string };
export type MenuNode = { id: string; title: string; options: { key: string; label: string; next: string }[] };
export type ChannelSession = { id: string; at: string; kind: "ussd" | "ivr"; who: string; result: "completed" | "failed" | "timeout"; simulated: boolean; detail: string };
export type Assessment = { id: string; title: string; courseId: string; questions: number; attempts: number; avgScore: number; status: "draft" | "published" };
export type FarmerGroup = { id: string; name: string; district: string; facilitatorId: string; members: number };
export type Notice = { id: string; at: string; severity: "info" | "warning" | "critical"; title: string; read: boolean; acked: boolean };
export type AuditEvent = { id: string; at: string; actor: string; action: string; resource: string; detail: string };
export type Integration = { id: string; name: string; status: "not_connected" | "simulated" | "connected"; note: string };
export type LanguageRow = { code: PlatformLanguage; name: string; default: boolean; coverage: number; enabled?: boolean };

export type TargetAudience = "beginner" | "intermediate" | "advanced" | "all";
export type TargetGroupStatus = "active" | "inactive" | "archived";

/** A course-targeting audience. It has no member list; the farmer count is an estimate. */
export type TargetGroup = {
  id: string;
  name: string;
  description: string;
  audience: TargetAudience;
  province: string;
  /** Empty means the whole province. */
  district: string;
  sector: string;
  crop: CropSlug | "mixed";
  estimatedFarmers: number;
  language: "rw" | "en";
  notes: string;
  status: TargetGroupStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type ModelType = "llm" | "embedding" | "stt" | "tts";
export type ModelPurpose = "chat" | "generation" | "embedding" | "stt" | "tts";
export type ModelStatus = "active" | "inactive" | "testing" | "unavailable";

/** Placeholder provider metadata only. API keys never live in the browser. */
export type AiModel = {
  id: string;
  name: string;
  type: ModelType;
  provider: string;
  version: string;
  purposes: ModelPurpose[];
  languages: PlatformLanguage[];
  status: ModelStatus;
  defaultFor: ModelPurpose[];
  notes: string;
  updatedAt: string;
};

export type ChatbotFeature = "farmer_assistant" | "course_generation" | "teaching_generation";
export type PromptVersion = { version: number; body: string; at: string; by: string; note: string };

export type Chatbot = {
  id: string;
  name: string;
  description: string;
  purpose: string;
  feature: ChatbotFeature;
  /** References a record in the model registry. */
  modelId: string;
  status: "active" | "inactive";
  languages: PlatformLanguage[];
  scope: string;
  behavior: { tone: "simple" | "formal"; maxWords: number; groundedOnly: boolean; refuseRestricted: boolean; fallback: string };
  prompt: string;
  promptVersion: number;
  versions: PromptVersion[];
  updatedAt: string;
};

export type ChannelConfig = {
  ussdStatus: "simulated" | "disabled";
  ussdLanguages: ("rw" | "en")[];
  ivrStatus: "simulated" | "disabled";
  completionPercent: number;
  sessionTimeoutSec: number;
};

export type PlatformSettings = {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  defaultLanguage: PlatformLanguage;
  defaultScope: "platform" | "groups";
  notifications: { accountRequests: boolean; aiFailures: boolean; coursePublished: boolean; weeklySummary: boolean };
};

export type AdminState = {
  users: PortalUser[];
  knowledge: KnowledgeSource[];
  glossary: GlossaryTerm[];
  prompts: PromptItem[];
  ai: AiSettings;
  aiEvents: AiEvent[];
  menus: MenuNode[];
  sessions: ChannelSession[];
  assessments: Assessment[];
  groups: FarmerGroup[];
  notices: Notice[];
  audit: AuditEvent[];
  integrations: Integration[];
  languages: LanguageRow[];
  permissions: Record<Exclude<PortalRole, "ADMIN">, Partial<Record<PermissionAction, boolean>>>;
  targetGroups: TargetGroup[];
  models: AiModel[];
  chatbots: Chatbot[];
  channels: ChannelConfig;
  platform: PlatformSettings;
};
