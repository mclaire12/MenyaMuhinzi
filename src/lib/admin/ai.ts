import { adminId, getAdminState, updateAdmin } from "@/lib/admin/store";
import type { AdminState, AiModel, Chatbot, ChatbotFeature, ModelPurpose, ModelStatus, ModelType, PlatformLanguage } from "@/lib/admin/types";
import { composeCourse } from "@/lib/mock/ai-compose";
import { groundedAnswer } from "@/lib/mock/services/course-answer";
import { nowIso, wait } from "@/lib/mock/store";
import { composeSections, composeTitle } from "@/lib/mock/teaching-compose";
import type { CropSlug, LearningState } from "@/lib/mock/types";

export const modelTypeLabels: Record<ModelType, string> = { llm: "Large language model", embedding: "Embedding", stt: "Speech-to-text", tts: "Text-to-speech" };
export const purposeLabels: Record<ModelPurpose, string> = { chat: "Chat answers", generation: "Content generation", embedding: "Knowledge search", stt: "Speech recognition", tts: "Voice narration" };
export const modelStatusLabels: Record<ModelStatus, string> = { active: "Active", inactive: "Inactive", testing: "Testing", unavailable: "Unavailable" };
export const featureLabels: Record<ChatbotFeature, string> = { farmer_assistant: "Baza and IVR key 8 (farmer questions)", course_generation: "Course generation (admin and facilitators)", teaching_generation: "Teaching materials (facilitators)" };
export const purposesForType: Record<ModelType, ModelPurpose[]> = { llm: ["chat", "generation"], embedding: ["embedding"], stt: ["stt"], tts: ["tts"] };
export const languageLabels: Record<PlatformLanguage, string> = { rw: "Kinyarwanda", en: "English", fr: "French" };

export const usable = (model: AiModel | undefined) => !!model && (model.status === "active" || model.status === "testing");
export const chatbotsUsing = (admin: AdminState, modelId: string) => admin.chatbots.filter((bot) => bot.modelId === modelId);
export const activeChatbotsUsing = (admin: AdminState, modelId: string) => chatbotsUsing(admin, modelId).filter((bot) => bot.status === "active");

/** Request counts come from the shared demo records each chatbot produces. */
export function chatbotUsage(admin: AdminState, learning: LearningState, bot: Chatbot) {
  const tests = admin.aiEvents.filter((event) => event.chatbotId === bot.id).length;
  if (bot.feature === "farmer_assistant") return learning.aiQuestions.length + admin.aiEvents.filter((event) => event.source !== "test").length + tests;
  if (bot.feature === "course_generation") return learning.generations.length + tests;
  return learning.materials.length + tests;
}

export function modelUsage(admin: AdminState, learning: LearningState, modelId: string) {
  const tests = admin.aiEvents.filter((event) => event.modelId === modelId && !event.chatbotId).length;
  return chatbotsUsing(admin, modelId).reduce((sum, bot) => sum + chatbotUsage(admin, learning, bot), tests);
}

export type ModelValues = Pick<AiModel, "name" | "type" | "provider" | "version" | "purposes" | "languages" | "status" | "notes">;
export const emptyModel = (): ModelValues => ({ name: "", type: "llm", provider: "", version: "", purposes: ["chat"], languages: ["rw"], status: "testing", notes: "" });

const secretPattern = /(sk-|api[_-]?key|bearer\s|secret)/i;

export function validateModel(values: ModelValues, ignoreId: string | null) {
  const errors: Partial<Record<keyof ModelValues, string>> = {};
  if (values.name.trim().length < 3) errors.name = "Enter a model name.";
  else if (getAdminState().models.some((model) => model.id !== ignoreId && model.name.trim().toLowerCase() === values.name.trim().toLowerCase())) errors.name = "A model with this name is already registered.";
  if (values.provider.trim().length < 2) errors.provider = "Name the provider.";
  if (!values.purposes.length) errors.purposes = "Choose at least one purpose.";
  if (!values.languages.length) errors.languages = "Choose at least one language.";
  if ([values.provider, values.version, values.notes].some((text) => secretPattern.test(text))) errors.notes = "Do not paste API keys or secrets here. Keys stay on the server.";
  return errors;
}

export function saveModel(actor: string, values: ModelValues, id: string | null) {
  const clean = { ...values, name: values.name.trim(), provider: values.provider.trim(), version: values.version.trim() || "—", notes: values.notes.trim(), purposes: values.purposes.filter((purpose) => purposesForType[values.type].includes(purpose)) };
  if (id) {
    updateAdmin(actor, "edit-model", id, clean.name, (state) => ({ ...state, models: state.models.map((model) => (model.id === id ? { ...model, ...clean, defaultFor: model.defaultFor.filter((purpose) => clean.purposes.includes(purpose)), updatedAt: nowIso() } : model)) }));
    return id;
  }
  const next = adminId("m");
  updateAdmin(actor, "add-model", next, clean.name, (state) => ({ ...state, models: [...state.models, { id: next, ...clean, defaultFor: [], updatedAt: nowIso() }] }));
  return next;
}

export function setModelStatus(actor: string, id: string, status: ModelStatus) {
  updateAdmin(actor, "model-status", id, modelStatusLabels[status], (state) => ({ ...state, models: state.models.map((model) => (model.id === id ? { ...model, status, defaultFor: status === "active" ? model.defaultFor : [], updatedAt: nowIso() } : model)) }));
}

export function setDefaultModel(actor: string, id: string, purpose: ModelPurpose): string | null {
  const model = getAdminState().models.find((item) => item.id === id);
  if (!model) return "Model not found.";
  if (model.status !== "active") return "Only an active model can be the default.";
  if (!model.purposes.includes(purpose)) return `This model is not registered for ${purposeLabels[purpose].toLowerCase()}.`;
  updateAdmin(actor, "default-model", id, purposeLabels[purpose], (state) => ({
    ...state,
    models: state.models.map((item) => ({ ...item, defaultFor: item.id === id ? [...new Set([...item.defaultFor, purpose])] : item.defaultFor.filter((value) => value !== purpose) })),
  }));
  return null;
}

export type ChatbotValues = Pick<Chatbot, "name" | "description" | "purpose" | "feature" | "modelId" | "status" | "languages" | "scope" | "behavior">;

export function emptyChatbot(admin: AdminState): ChatbotValues {
  const model = admin.models.find((item) => item.type === "llm" && item.defaultFor.includes("chat")) ?? admin.models.find((item) => item.type === "llm");
  return { name: "", description: "", purpose: "", feature: "farmer_assistant", modelId: model?.id ?? "", status: "inactive", languages: ["rw"], scope: "", behavior: { tone: "simple", maxWords: 120, groundedOnly: true, refuseRestricted: true, fallback: "Baza umufashamyumvire wawe." } };
}

export function validateChatbot(values: ChatbotValues, prompt: string | null) {
  const errors: Partial<Record<keyof ChatbotValues | "prompt", string>> = {};
  if (values.name.trim().length < 3) errors.name = "Enter a chatbot name.";
  if (values.purpose.trim().length < 3) errors.purpose = "Describe its purpose.";
  const model = getAdminState().models.find((item) => item.id === values.modelId);
  if (!model || model.type !== "llm") errors.modelId = "Choose a language model from the registry.";
  if (!values.languages.length) errors.languages = "Choose at least one language.";
  if (values.behavior.maxWords < 20 || values.behavior.maxWords > 2000) errors.behavior = "Maximum answer length must be 20 to 2,000 words.";
  if (!values.behavior.fallback.trim()) errors.behavior = "Enter the fallback message.";
  if (prompt !== null && prompt.trim().length < 20) errors.prompt = "Write the system instructions (at least 20 characters).";
  return errors;
}

export function saveChatbot(actor: string, values: ChatbotValues, id: string | null, prompt = "") {
  const clean = { ...values, name: values.name.trim(), description: values.description.trim(), purpose: values.purpose.trim(), scope: values.scope.trim(), behavior: { ...values.behavior, fallback: values.behavior.fallback.trim() } };
  const at = nowIso();
  if (id) {
    updateAdmin(actor, "edit-chatbot", id, clean.name, (state) => ({ ...state, chatbots: state.chatbots.map((bot) => (bot.id === id ? { ...bot, ...clean, updatedAt: at } : bot)) }));
    return id;
  }
  const next = adminId("cb");
  updateAdmin(actor, "add-chatbot", next, clean.name, (state) => ({ ...state, chatbots: [...state.chatbots, { id: next, ...clean, prompt: prompt.trim(), promptVersion: 1, versions: [{ version: 1, body: prompt.trim(), at, by: actor, note: "First version" }], updatedAt: at }] }));
  return next;
}

export function setChatbotStatus(actor: string, id: string, status: Chatbot["status"]): string | null {
  const admin = getAdminState();
  const bot = admin.chatbots.find((item) => item.id === id);
  if (!bot) return "Chatbot not found.";
  if (status === "active" && !usable(admin.models.find((model) => model.id === bot.modelId))) return "Assign an active model before activating this chatbot.";
  updateAdmin(actor, "chatbot-status", id, status, (state) => ({ ...state, chatbots: state.chatbots.map((item) => (item.id === id ? { ...item, status, updatedAt: nowIso() } : item)) }));
  return null;
}

export function savePromptVersion(actor: string, id: string, body: string, note: string): string | null {
  const bot = getAdminState().chatbots.find((item) => item.id === id);
  if (!bot) return "Chatbot not found.";
  if (body.trim().length < 20) return "Write the system instructions (at least 20 characters).";
  if (body.trim() === bot.prompt.trim()) return "The prompt has not changed.";
  if (secretPattern.test(body)) return "Do not put API keys or secrets in a prompt.";
  const version = Math.max(0, ...bot.versions.map((item) => item.version)) + 1;
  const at = nowIso();
  updateAdmin(actor, "prompt-version", id, `v${version}`, (state) => ({ ...state, chatbots: state.chatbots.map((item) => (item.id === id ? { ...item, prompt: body.trim(), promptVersion: version, versions: [{ version, body: body.trim(), at, by: actor, note: note.trim() || "Edited" }, ...item.versions], updatedAt: at } : item)) }));
  return null;
}

export function restorePromptVersion(actor: string, id: string, version: number): string | null {
  const bot = getAdminState().chatbots.find((item) => item.id === id);
  const old = bot?.versions.find((item) => item.version === version);
  if (!bot || !old) return "Version not found.";
  if (old.body === bot.prompt) return "This version is already in use.";
  return savePromptVersion(actor, id, old.body, `Restored from v${version}`);
}

export type TestResult = { ok: boolean; outcome: "answered" | "refused" | "outside" | "fallback" | "failed" | "generated"; text: string; modelName: string; latencyMs: number; notes: string[]; audioUrl?: string };

const clip = (text: string, maxWords: number) => {
  const words = text.split(/(\s+)/);
  return words.filter((part) => part.trim()).length <= maxWords ? text : `${words.slice(0, maxWords * 2).join("").trim()}…`;
};

function logTest(question: string, result: TestResult, ids: { chatbotId?: string; modelId?: string }) {
  updateAdmin("AI test console", "ai-test", ids.chatbotId ?? ids.modelId ?? "test", `${result.outcome}: ${question.slice(0, 60)}`, (state) => ({
    ...state,
    aiEvents: [{ id: adminId("ai"), at: nowIso(), question, ok: result.ok, latencyMs: result.latencyMs, confidence: result.outcome === "answered" || result.outcome === "generated" ? "high" as const : "low" as const, flagged: result.outcome === "refused", source: "test" as const, ...ids }, ...state.aiEvents].slice(0, 200),
  }));
}

export type ChatbotTest = { question: string; courseId: string; crop: CropSlug; language: "rw" | "en"; prompt?: string };

/** Never calls a provider: the farmer assistant reuses the grounded-answer logic farmers get, the generators reuse the mock composers. */
export async function simulateChatbot(bot: Chatbot, learning: LearningState, input: ChatbotTest): Promise<TestResult> {
  const latencyMs = 400 + Math.round(Math.random() * 700);
  await wait(latencyMs);
  const admin = getAdminState();
  const model = admin.models.find((item) => item.id === bot.modelId);
  const modelName = model ? `${model.name} (${model.version})` : "No model";
  const notes = input.prompt !== undefined && input.prompt.trim() !== bot.prompt.trim() ? ["Tested with an unsaved prompt draft. The mock does not interpret prompt wording; it checks configuration and routing."] : [];
  let result: TestResult;
  if (!model) result = { ok: false, outcome: "failed", text: "The assigned model is not in the registry.", modelName, latencyMs, notes };
  else if (bot.status !== "active") result = { ok: false, outcome: "fallback", text: bot.behavior.fallback, modelName, latencyMs, notes: [...notes, "This chatbot is inactive, so users would see the fallback message."] };
  else if (!usable(model)) result = { ok: false, outcome: "failed", text: `${model.name} is ${model.status}. Requests fail and users see: “${bot.behavior.fallback}”`, modelName, latencyMs, notes };
  else if (!bot.languages.includes(input.language)) result = { ok: false, outcome: "failed", text: `${languageLabels[input.language]} is not enabled for this chatbot.`, modelName, latencyMs, notes };
  else if (bot.feature === "farmer_assistant") {
    const course = learning.courses.find((item) => item.id === input.courseId && item.status === "published");
    if (!course) result = { ok: false, outcome: "failed", text: "Choose a published course: answers are grounded in its lessons.", modelName, latencyMs, notes };
    else {
      const answer = groundedAnswer(course, null, input.question, input.language);
      const extra = answer.kind === "outside" && bot.behavior.groundedOnly ? `\n${bot.behavior.fallback}` : "";
      if (answer.kind === "restricted" && !bot.behavior.refuseRestricted) notes.push("Restricted-topic refusal is switched off in this configuration, but the mock always refuses chemical doses for safety.");
      result = { ok: answer.kind === "answer", outcome: answer.kind === "answer" ? "answered" : answer.kind === "restricted" ? "refused" : "outside", text: clip(answer.text + extra, bot.behavior.maxWords), modelName, latencyMs, notes: answer.lesson ? [...notes, `Grounded in lesson: ${answer.lesson.title}`] : notes };
    }
  } else if (bot.feature === "course_generation") {
    const course = composeCourse({ topic: input.question, crop: input.crop, level: "Intangiriro", description: "", objectives: [], language: input.language, durationWeeks: 2, moduleCount: 2, instructions: "" });
    result = { ok: true, outcome: "generated", text: clip([course.title, course.description, ...course.outline].join("\n"), bot.behavior.maxWords), modelName, latencyMs, notes: [...notes, "Draft only. Nothing was saved or published."] };
  } else {
    const teaching = { topic: input.question, crop: input.crop, audience: "beginner" as const, objectives: "", durationMinutes: 90, language: input.language, instructions: "" };
    const sections = composeSections(teaching, 0);
    result = { ok: true, outcome: "generated", text: clip([composeTitle(teaching), ...sections.map((section) => `• ${section.heading}${section.minutes ? ` (${section.minutes} min)` : ""}`)].join("\n"), bot.behavior.maxWords), modelName, latencyMs, notes: [...notes, "Draft only. Nothing was saved or published."] };
  }
  logTest(input.question, result, { chatbotId: bot.id, modelId: bot.modelId });
  return result;
}

function fakeVector(text: string) {
  let seed = [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 100003, 7);
  return Array.from({ length: 8 }, () => { seed = (seed * 16807) % 2147483647; return ((seed / 2147483647) * 2 - 1).toFixed(3); });
}

export async function simulateModel(model: AiModel, purpose: ModelPurpose, input: string, learning: LearningState): Promise<TestResult> {
  const latencyMs = 300 + Math.round(Math.random() * 600);
  await wait(latencyMs);
  const modelName = `${model.name} (${model.version})`;
  const notes = model.status === "testing" ? ["This model is in testing. Do not rely on it for farmers yet."] : [];
  let result: TestResult;
  if (!usable(model)) result = { ok: false, outcome: "failed", text: `${model.name} is ${model.status}. The request was refused.`, modelName, latencyMs, notes };
  else if (!model.purposes.includes(purpose)) result = { ok: false, outcome: "failed", text: `This model is not registered for ${purposeLabels[purpose].toLowerCase()}.`, modelName, latencyMs, notes };
  else if (!input.trim()) result = { ok: false, outcome: "failed", text: "Enter sample input first.", modelName, latencyMs, notes };
  else if (purpose === "chat") {
    const course = learning.courses.find((item) => item.status === "published");
    const answer = course ? groundedAnswer(course, null, input, "rw") : null;
    result = { ok: !!answer && answer.kind === "answer", outcome: answer?.kind === "answer" ? "answered" : answer?.kind === "restricted" ? "refused" : "outside", text: answer?.text ?? "No published course to ground the answer in.", modelName, latencyMs, notes: course ? [...notes, `Grounded in: ${course.title}`] : notes };
  } else if (purpose === "generation") {
    const course = composeCourse({ topic: input, crop: "tomato", level: "Intangiriro", description: "", objectives: [], language: "rw", durationWeeks: 2, moduleCount: 2, instructions: "" });
    result = { ok: true, outcome: "generated", text: [course.title, ...course.outline].join("\n"), modelName, latencyMs, notes };
  } else if (purpose === "embedding") {
    result = { ok: true, outcome: "generated", text: `[${fakeVector(input).join(", ")}, …]`, modelName, latencyMs, notes: [...notes, "Simulated vector, first 8 of its dimensions. Nothing was indexed."] };
  } else if (purpose === "tts") {
    const words = input.trim().split(/\s+/).length;
    result = { ok: true, outcome: "generated", text: `About ${Math.max(1, Math.round(words / 2.2))} seconds of Kinyarwanda speech for ${words} word(s).`, modelName, latencyMs, audioUrl: "/media/lessons/tomato-m1-l1.wav", notes: [...notes, "No audio is synthesised in the browser. The player has a lesson narration that was recorded offline with this model."] };
  } else {
    result = { ok: true, outcome: "generated", text: `Simulated transcript: “${input.trim()}”`, modelName, latencyMs, notes };
  }
  logTest(input, result, { modelId: model.id });
  return result;
}
