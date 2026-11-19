export type AccountStatus = "active" | "suspended" | "deactivated";
export type AccessChannel = "smartphone" | "basic_phone";
export type PortalRole = "ADMIN" | "FACILITATOR" | "SMARTPHONE_FARMER" | "BASIC_PHONE_FARMER";
export type KnowledgeStatus = "uploaded" | "processing" | "awaiting_review" | "approved" | "indexed" | "processing_failed" | "rejected" | "needs_correction" | "archived";
export type PermissionAction = "view" | "create" | "update" | "delete" | "approve" | "publish" | "export" | "manage";

export type PortalUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  district: string;
  language: "rw" | "en" | "fr";
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
};

export type GlossaryTerm = { id: string; rw: string; en: string; fr: string; definition: string; status: "draft" | "reviewed" };
export type PromptItem = { id: string; name: string; purpose: string; version: number; active: boolean; body: string };
export type AiSettings = { model: string; timeoutSec: number; retries: number; dailyLimit: number; fallback: string; active: boolean };
export type AiEvent = { id: string; at: string; question: string; ok: boolean; latencyMs: number; confidence: "high" | "low"; flagged: boolean };
export type MenuNode = { id: string; title: string; options: { key: string; label: string; next: string }[] };
export type ChannelSession = { id: string; at: string; kind: "ussd" | "ivr"; who: string; result: "completed" | "failed" | "timeout"; simulated: boolean; detail: string };
export type Assessment = { id: string; title: string; courseId: string; questions: number; attempts: number; avgScore: number; status: "draft" | "published" };
export type FarmerGroup = { id: string; name: string; district: string; facilitatorId: string; members: number };
export type Notice = { id: string; at: string; severity: "info" | "warning" | "critical"; title: string; read: boolean; acked: boolean };
export type AuditEvent = { id: string; at: string; actor: string; action: string; resource: string; detail: string };
export type Integration = { id: string; name: string; status: "not_connected" | "simulated" | "connected"; note: string };
export type LanguageRow = { code: "rw" | "en" | "fr"; name: string; default: boolean; coverage: number };

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
};
