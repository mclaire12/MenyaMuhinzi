import { featureFallback } from "@/lib/admin/chatbot-routing";
import { updateAdmin } from "@/lib/admin/store";
import type { ChannelSession } from "@/lib/admin/types";
import { groundedAnswer } from "@/lib/mock/services/course-answer";
import { gradeAnswers, questionsForCourse, submitAssessment } from "@/lib/mock/services/farmer";
import { getLearningState, MockServiceError, mutate, newId, nowIso, wait } from "@/lib/mock/store";
import type { AssessmentQuestion, CropSlug, LearningState } from "@/lib/mock/types";
import type { PhoneLanguage } from "@/lib/basic-phone/farmers";
import type { Recording } from "@/lib/basic-phone/voice";

export const sampleQuestions = [
  "Ibihingwa bikenera izuba amasaha angahe ku munsi?",
  "Ni ryari nshyira ifumbire y'imborera mbere yo gutera?",
  "Nakora iki nimbona amababi afite amabara adasanzwe?",
  "Ni uwuhe muti nakoresha ku dukoko?",
  "Ni ryari imvura izagwa i Musanze?",
];

let failures = { transcription: false, answer: false };

/** Makes the next transcription or answer request fail, to test the error paths. */
export function failNext(service: keyof typeof failures) {
  failures = { ...failures, [service]: true };
}

function takeFailure(service: keyof typeof failures) {
  const failed = failures[service];
  failures = { ...failures, [service]: false };
  return failed;
}

export type Transcript = { text: string; engine: "mock"; note: string; recordingSeconds: number | null };

/**
 * MockTranscriptionService: no speech recognition happens. The tester types what the
 * farmer said; a real Kinyarwanda ASR provider can replace this function later.
 */
export async function transcribe(recording: Recording | null, testerText: string): Promise<Transcript> {
  await wait(500);
  if (takeFailure("transcription")) throw new MockServiceError("transcription_failed");
  const text = testerText.trim();
  if (!text) throw new MockServiceError("empty");
  return { text, engine: "mock", note: "Mock transcription: text entered by the tester, not recognised from audio.", recordingSeconds: recording?.seconds ?? null };
}

export type LessonQuestion = {
  learnerId: string;
  question: string;
  language: PhoneLanguage;
  crop: CropSlug;
  courseId: string;
  moduleId: string;
  lessonId: string;
};

export type LessonAnswer = {
  id: string;
  answer: string;
  canAnswer: boolean;
  source: { courseId: string; lessonId: string; lessonTitle: string } | null;
  audio: { kind: "mock_voice"; url: null };
};

/** MockAgriculturalAIService: answers only from the approved lesson content of the current course. */
export async function answerLessonQuestion(input: LessonQuestion): Promise<LessonAnswer> {
  await wait(900);
  if (takeFailure("answer")) throw new MockServiceError("answer_failed");
  const state = getLearningState();
  const course = state.courses.find((item) => item.id === input.courseId && item.status === "published");
  if (!course) throw new MockServiceError("course_unavailable");
  const fallback = featureFallback("farmer_assistant");
  const grounded = fallback ? { kind: "outside" as const, text: fallback, lesson: null } : groundedAnswer(course, input.lessonId, input.question, input.language);
  const id = newId("aq");
  const lesson = grounded.lesson;
  mutate((current) => ({
    ...current,
    aiQuestions: [{
      id, learnerId: input.learnerId, courseId: course.id, lessonId: lesson?.id ?? input.lessonId, crop: input.crop,
      topic: lesson?.title ?? course.title, question: input.question.trim(), answer: grounded.text,
      status: grounded.kind === "answer" ? ("answered" as const) : ("unanswered" as const),
      rating: null, channel: "ivr" as const, at: nowIso(), facilitatorNote: "", correction: null, reviewed: false,
    }, ...current.aiQuestions],
  }));
  return {
    id,
    answer: grounded.text,
    canAnswer: grounded.kind === "answer",
    source: lesson ? { courseId: course.id, lessonId: lesson.id, lessonTitle: lesson.title } : null,
    audio: { kind: "mock_voice", url: null },
  };
}

/** VoiceAssessmentService: a short phone quiz drawn from the course's shared assessment. */
export function ivrQuestions(state: LearningState, courseId: string, limit = 5): AssessmentQuestion[] {
  const all = questionsForCourse(state, courseId);
  const choice = all.filter((question) => (question.kind ?? "choice") === "choice").slice(0, limit - 2);
  const extra = [all.find((question) => question.kind === "true_false"), all.find((question) => question.kind === "short")].filter((question): question is AssessmentQuestion => !!question);
  return [...choice, ...extra].slice(0, limit);
}

export function checkIvrAnswer(question: AssessmentQuestion, value: string) {
  return gradeAnswers([question], { [question.id]: value }).review[0]!;
}

export function saveIvrAttempt(learnerId: string, courseId: string, answers: Record<string, string>, questions: AssessmentQuestion[]) {
  return submitAssessment(learnerId, courseId, answers, questions.map((question) => question.id));
}

export function logChannelSession(kind: ChannelSession["kind"], who: string, result: ChannelSession["result"], detail: string) {
  const entry: ChannelSession = { id: newId("cs"), at: nowIso(), kind, who, result, simulated: true, detail };
  updateAdmin(who, `${kind}-session`, entry.id, detail, (state) => ({ ...state, sessions: [entry, ...state.sessions].slice(0, 200) }));
}
