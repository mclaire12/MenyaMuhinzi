import { courseLessons } from "@/lib/mock/builders";
import { cropOf } from "@/lib/mock/crops";
import { learnerIdFor } from "@/lib/mock/services/learners";
import { getLearningState, MockServiceError, mutate, newId, nowIso, takeSimulatedFailure, wait } from "@/lib/mock/store";
import type { AssessmentQuestion, Farmer, FarmerSettings, LearningState } from "@/lib/mock/types";

const defaultSettings = (learnerId: string): FarmerSettings => ({ learnerId, language: "rw", notifyNew: true, notifyAssigned: true, notifyReminder: true, notifyResults: true });

export function settingsFor(state: LearningState, learnerId: string) {
  return state.settings.find((item) => item.learnerId === learnerId) ?? defaultSettings(learnerId);
}

export function farmerByAccount(state: LearningState, accountId: string) {
  const learnerId = learnerIdFor(state, accountId);
  return state.farmers.find((farmer) => farmer.id === learnerId) ?? null;
}

export type FarmerProfileValues = Pick<Farmer, "name" | "phone" | "province" | "district" | "sector" | "cell" | "village" | "cropInterest">;

export function updateFarmerProfile(accountId: string, values: FarmerProfileValues) {
  let error: string | null = null;
  mutate((state) => {
    const farmer = farmerByAccount(state, accountId);
    if (!farmer) { error = "Nta mwirondoro ubonetse."; return state; }
    return { ...state, farmers: state.farmers.map((item) => item.id === farmer.id ? { ...item, ...values } : item) };
  });
  return error;
}

export function saveFarmerSettings(accountId: string, values: Omit<FarmerSettings, "learnerId">) {
  mutate((state) => {
    const learnerId = learnerIdFor(state, accountId);
    const next = { learnerId, ...values };
    const settings = state.settings.some((item) => item.learnerId === learnerId)
      ? state.settings.map((item) => item.learnerId === learnerId ? next : item)
      : [...state.settings, next];
    return { ...state, settings };
  });
}

export type FarmerNotice = { id: string; kind: "published" | "assigned" | "reminder" | "update" | "result"; title: string; text: string; at: string; slug: string; courseId: string; read: boolean };

export function farmerNotices(state: LearningState, accountId: string): FarmerNotice[] {
  const learnerId = learnerIdFor(state, accountId);
  const settings = settingsFor(state, learnerId);
  const read = new Set(state.noticeReads.filter((item) => item.learnerId === learnerId).map((item) => item.noticeId));
  const rows: FarmerNotice[] = [];
  const published = state.courses.filter((course) => course.status === "published");
  if (settings.notifyNew) {
    published.filter((course) => course.publishedAt).forEach((course) => rows.push({ id: `pub-${course.id}`, kind: "published", title: "Isomo rishya", text: course.title, at: course.publishedAt!, slug: course.slug, courseId: course.id, read: false }));
  }
  if (settings.notifyAssigned) {
    state.assignments.filter((item) => item.target.kind === "farmer" ? item.target.id === learnerId : state.groups.some((group) => group.id === item.target.id && group.memberIds.includes(learnerId))).forEach((item) => {
      const course = published.find((course) => course.id === item.courseId);
      if (!course) return;
      rows.push({ id: `asg-${item.id}`, kind: "assigned", title: "Wahawe isomo", text: course.title, at: item.assignedAt, slug: course.slug, courseId: course.id, read: false });
    });
  }
  if (settings.notifyReminder) {
    published.forEach((course) => {
      const lessons = courseLessons(course);
      const done = state.progress.filter((item) => item.learnerId === learnerId && item.courseId === course.id && item.status === "completed").length;
      const last = state.progress.filter((item) => item.learnerId === learnerId && item.courseId === course.id).map((item) => item.updatedAt).sort().at(-1);
      if (done > 0 && done < lessons.length && last && Date.now() - new Date(last).getTime() > 2 * 86400000) {
        rows.push({ id: `rem-${course.id}`, kind: "reminder", title: "Komeza kwiga", text: course.title, at: last, slug: course.slug, courseId: course.id, read: false });
      }
    });
  }
  if (settings.notifyResults) {
    state.attempts.filter((item) => item.learnerId === learnerId).forEach((item) => {
      const course = state.courses.find((course) => course.id === item.courseId);
      rows.push({ id: `res-${item.id}`, kind: "result", title: "Amanota yawe", text: `${course?.title ?? "Isuzumabumenyi"} · ${item.score}%`, at: item.at, slug: course?.slug ?? "", courseId: item.courseId, read: false });
    });
  }
  published.forEach((course) => {
    const enrolled = state.enrollments.some((item) => item.learnerId === learnerId && item.courseId === course.id);
    if (enrolled && course.updatedAt > (course.publishedAt ?? course.createdAt)) rows.push({ id: `upd-${course.id}`, kind: "update", title: "Isomo ryavuguruwe", text: course.title, at: course.updatedAt, slug: course.slug, courseId: course.id, read: false });
  });
  return rows.map((item) => ({ ...item, read: read.has(item.id) })).sort((a, b) => b.at.localeCompare(a.at));
}

export function markNoticeRead(accountId: string, noticeId: string) {
  mutate((state) => {
    const learnerId = learnerIdFor(state, accountId);
    if (state.noticeReads.some((item) => item.learnerId === learnerId && item.noticeId === noticeId)) return state;
    return { ...state, noticeReads: [...state.noticeReads, { learnerId, noticeId }] };
  });
}

export function questionsForCourse(state: LearningState, courseId: string): AssessmentQuestion[] {
  const course = state.courses.find((item) => item.id === courseId && item.status === "published");
  const stored = state.assessments.find((item) => item.courseId === courseId);
  if (!course || !stored) return [];
  const questions = stored.questions.map((question) => ({ ...question, kind: question.kind ?? "choice" as const, explanation: question.explanation ?? "Reba neza isomo rijyanye n'iki kibazo." }));
  const extra: AssessmentQuestion[] = [];
  if (!questions.some((question) => question.kind === "true_false")) extra.push({ id: `${courseId}-tf`, kind: "true_false", question: "Ni byiza kugenzura umurima buri cyumweru?", options: ["Yego", "Oya"], answer: 0, topic: "Kwita ku murima", explanation: "Genzura buri cyumweru kugira ngo ubone ikibazo hakiri kare." });
  if (!questions.some((question) => question.kind === "short")) extra.push({ id: `${courseId}-short`, kind: "short", question: "Andika umubare w'amasaha y'izuba ibihingwa bikenera ku munsi.", options: [], answer: 0, accept: "6|atandatu", topic: "Izuba", explanation: "Igisubizo ni amasaha atandatu." });
  return [...questions, ...extra];
}

export type ReviewedAnswer = { id: string; question: string; yours: string; correct: string; ok: boolean; explanation: string };

function answerText(question: AssessmentQuestion, value: string) {
  if (question.kind === "short") return value.trim() || "—";
  const index = Number(value);
  return question.options[index] ?? "—";
}

export function gradeAnswers(questions: AssessmentQuestion[], answers: Record<string, string>) {
  const review: ReviewedAnswer[] = questions.map((question) => {
    const value = answers[question.id] ?? "";
    const ok = question.kind === "short"
      ? (question.accept ?? "").split("|").some((part) => value.trim().toLowerCase().includes(part.trim().toLowerCase()) && part.trim().length > 0)
      : Number(value) === question.answer;
    return { id: question.id, question: question.question, yours: answerText(question, value), correct: question.kind === "short" ? (question.accept?.split("|")[0] ?? "") : (question.options[question.answer] ?? ""), ok, explanation: question.explanation ?? "" };
  });
  const score = questions.length ? Math.round((review.filter((item) => item.ok).length / questions.length) * 100) : 0;
  return { review, score, missedTopics: review.filter((item) => !item.ok).map((item) => questions.find((question) => question.id === item.id)?.topic ?? item.question) };
}

export function submitAssessment(accountId: string, courseId: string, answers: Record<string, string>) {
  const questions = questionsForCourse(getLearningState(), courseId);
  const graded = gradeAnswers(questions, answers);
  mutate((state) => {
    const learnerId = learnerIdFor(state, accountId);
    const assessment = state.assessments.find((item) => item.courseId === courseId);
    const attempt = { id: newId("at"), assessmentId: assessment?.id ?? `as-${courseId}`, courseId, learnerId, score: graded.score, missedTopics: graded.missedTopics, at: nowIso() };
    return { ...state, attempts: [attempt, ...state.attempts] };
  });
  return graded;
}

const stop = new Set(["ni", "gute", "nigute", "ryari", "nahinga", "neza", "ku", "mu", "na", "cyangwa", "iki", "ibyo", "kandi", "nta", "the", "how", "what", "can"]);

function tokens(text: string) {
  return text.toLowerCase().split(/[^a-z0-9àâäéèêëïîôùûüç]+/i).filter((word) => word.length > 2 && !stop.has(word));
}

export type AssistantReply = { answer: string; lessonId: string | null; lessonTitle: string | null; courseId: string };

export async function askFarmer(accountId: string, courseId: string, lessonId: string | null, question: string): Promise<AssistantReply> {
  await wait();
  if (takeSimulatedFailure()) throw new MockServiceError("Simulated failure");
  const state = getLearningState();
  const course = state.courses.find((item) => item.id === courseId && item.status === "published");
  if (!course) throw new MockServiceError("Isomo ntiribonetse");
  const learnerId = learnerIdFor(state, accountId);
  const language = settingsFor(state, learnerId).language;
  const lessons = courseLessons(course);
  const focus = lessons.find((lesson) => lesson.id === lessonId) ?? null;
  const pool = focus ? [focus, ...lessons.filter((lesson) => lesson.id !== focus.id)] : lessons;
  const asked = tokens(question);
  const ranked = pool.map((lesson) => ({ lesson, score: tokens(`${lesson.title} ${lesson.body} ${lesson.keyPoints.join(" ")} ${lesson.example}`).filter((word) => asked.includes(word)).length + (focus?.id === lesson.id ? 1 : 0) })).sort((a, b) => b.score - a.score);
  const best = ranked[0]?.lesson ?? null;
  const blocked = /(^|\s)(imiti|umuti|muti|doze|npk)(\s|$)|pesticide|fertilizer|ingano y.?ifumbire/i.test(question);
  const outside = !best || (ranked[0]?.score ?? 0) === 0;
  let answer: string;
  if (blocked) answer = "Sinaguhaye umuti cyangwa ingano y'ifumbire. Ibyo bisaba umujyanama w'ubuhinzi. Reba isomo ryo kurinda ibihingwa, ukurikize amabwiriza yemewe.";
  else if (outside || !best) answer = `Iki kibazo kiri hanze y'isomo "${course.title}". Baza ikintu kiri mu masomo yemewe gusa.`;
  else answer = [`Mu isomo "${best.title}":`, ...best.keyPoints.slice(0, 3).map((point) => `• ${point}`), best.example ? `Urugero: ${best.example}` : best.body.split(".").slice(0, 2).join(".").trim()].filter(Boolean).join("\n");
  const note = language === "en" ? "\n\nThis is a practice answer from your course, not a live adviser." : language === "fr" ? "\n\nCeci est une réponse d'exercice tirée de votre cours." : "";
  const full = `Iki ni igisubizo cy'igerageza, giteguwe mu masomo yemewe. Ntabwo ari AI nyayo.\n\n${answer}${note}`;
  const topic = best?.title ?? cropOf(course.crop).name_rw;
  mutate((current) => ({
    ...current,
    aiQuestions: [{ id: newId("aq"), learnerId, courseId: course.id, lessonId: best?.id ?? lessonId, crop: course.crop, topic, question: question.trim(), answer: full, status: "answered" as const, rating: null, channel: "web" as const, at: nowIso(), facilitatorNote: "", correction: null, reviewed: false }, ...current.aiQuestions],
  }));
  return { answer: full, lessonId: best?.id ?? null, lessonTitle: best?.title ?? null, courseId: course.id };
}

export function rateAnswer(questionId: string, rating: "helpful" | "not_helpful") {
  mutate((state) => ({ ...state, aiQuestions: state.aiQuestions.map((item) => item.id === questionId ? { ...item, rating } : item) }));
}

export function lessonFormats(lessons: { narration: string; videoScenes: { id: string }[] }[]) {
  const formats = ["Soma"];
  if (lessons.some((lesson) => lesson.videoScenes.length > 0)) formats.push("Reba");
  if (lessons.some((lesson) => lesson.narration.trim())) formats.push("Umva");
  return formats;
}
