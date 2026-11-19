import type { Course, LearningState, Lesson } from "@/lib/mock/types";
import type { PhoneLanguage } from "@/lib/basic-phone/farmers";

export const IVR_CALLER_NAME = "MenyaMuhinzi";

export type ScriptPart = { kind: "intro" | "body" | "example" | "summary" | "outro"; text: string; start: number; end: number };

export type LessonAudio = {
  parts: ScriptPart[];
  duration: number;
  /** "file" uses an approved recording; "narration" is read aloud from the approved script by a mock voice. */
  source: "file" | "narration";
  url: string | null;
};

/** Builds the call audio from the approved narration; length follows the lesson's planned minutes. */
export function lessonAudio(state: LearningState, course: Course, lesson: Lesson, lang: PhoneLanguage): LessonAudio | null {
  const narration = lesson.narration.trim() || lesson.body.trim();
  if (!narration) return null;
  const file = state.resources.find((item) => item.lessonId === lesson.id && item.kind === "audio" && item.url.trim());
  const en = lang === "en";
  const texts: Omit<ScriptPart, "start" | "end">[] = [
    { kind: "intro", text: en ? `Hello. This is MenyaMuhinzi. Lesson: ${lesson.title}, from the course ${course.title}. The lesson is in Kinyarwanda.` : `Muraho! Aha ni MenyaMuhinzi. Isomo: ${lesson.title}, mu masomo ya ${course.title}.` },
    ...narration.split(/(?<=[.!?])\s+/).filter(Boolean).map((text) => ({ kind: "body" as const, text })),
    ...(lesson.example ? [{ kind: "example" as const, text: `Urugero: ${lesson.example}` }] : []),
    ...(lesson.keyPoints.length ? [{ kind: "summary" as const, text: `Ibyo kwibuka: ${lesson.keyPoints.join(". ")}.` }] : []),
    { kind: "outro", text: en ? "The lesson is finished. Press 0 for the next lesson, 9 for the assessment, 1 to replay, or # to end the call." : "Isomo rirangiye. Kanda 0 ukomeze ku isomo rikurikira, 9 ku isuzumabumenyi, 1 usubiremo, cyangwa # usoze." },
  ];
  const duration = Math.max(60, Math.round(lesson.durationMinutes * 60));
  const weight = texts.reduce((sum, part) => sum + Math.max(part.text.length, 40), 0);
  let cursor = 0;
  const parts = texts.map((part, i) => {
    const length = i === texts.length - 1 ? duration - cursor : Math.round((Math.max(part.text.length, 40) / weight) * duration);
    const next = { ...part, start: cursor, end: cursor + length };
    cursor += length;
    return next;
  });
  return { parts, duration, source: file ? "file" : "narration", url: file?.url ?? null };
}

export function partAt(audio: LessonAudio, position: number) {
  return audio.parts.find((part) => position >= part.start && position < part.end) ?? audio.parts.at(-1)!;
}

export type IvrKeyHelp = { key: string; label: string }[];

export const ivrKeys = {
  rw: {
    lesson: [
      { key: "1", label: "Hagarika / komeza" },
      { key: "0", label: "Subiramo isomo" },
      { key: "2", label: "Isomo ryabanje" },
      { key: "3", label: "Isomo rikurikira" },
      { key: "8", label: "Baza ikibazo" },
      { key: "9", label: "Isuzumabumenyi" },
      { key: "#", label: "Soza ikiganiro" },
    ],
    finished: [
      { key: "0", label: "Komeza ku isomo rikurikira" },
      { key: "1", label: "Subiramo isomo" },
      { key: "8", label: "Baza ikibazo" },
      { key: "9", label: "Isuzumabumenyi" },
      { key: "#", label: "Soza ikiganiro" },
    ],
    answer: [
      { key: "0", label: "Subiramo igisubizo" },
      { key: "8", label: "Baza ikindi kibazo" },
      { key: "*", label: "Subira ku isomo" },
      { key: "#", label: "Soza ikiganiro" },
    ],
    question: [
      { key: "1-4", label: "Hitamo igisubizo" },
      { key: "0", label: "Subiramo ikibazo" },
      { key: "*", label: "Subira ku isomo" },
      { key: "#", label: "Soza ikiganiro" },
    ],
    feedback: [
      { key: "0", label: "Komeza ku kibazo gikurikira" },
      { key: "*", label: "Subira ku isomo" },
      { key: "#", label: "Soza ikiganiro" },
    ],
    result: [
      { key: "0", label: "Ongera ukore isuzuma" },
      { key: "*", label: "Subira ku isomo" },
      { key: "#", label: "Soza ikiganiro" },
    ],
  },
  en: {
    lesson: [
      { key: "1", label: "Pause / resume" },
      { key: "0", label: "Replay lesson" },
      { key: "2", label: "Previous lesson" },
      { key: "3", label: "Next lesson" },
      { key: "8", label: "Ask a question" },
      { key: "9", label: "Assessment" },
      { key: "#", label: "End call" },
    ],
    finished: [
      { key: "0", label: "Continue to next lesson" },
      { key: "1", label: "Replay lesson" },
      { key: "8", label: "Ask a question" },
      { key: "9", label: "Assessment" },
      { key: "#", label: "End call" },
    ],
    answer: [
      { key: "0", label: "Repeat the answer" },
      { key: "8", label: "Ask another question" },
      { key: "*", label: "Back to the lesson" },
      { key: "#", label: "End call" },
    ],
    question: [
      { key: "1-4", label: "Choose an answer" },
      { key: "0", label: "Repeat the question" },
      { key: "*", label: "Back to the lesson" },
      { key: "#", label: "End call" },
    ],
    feedback: [
      { key: "0", label: "Next question" },
      { key: "*", label: "Back to the lesson" },
      { key: "#", label: "End call" },
    ],
    result: [
      { key: "0", label: "Retake the assessment" },
      { key: "*", label: "Back to the lesson" },
      { key: "#", label: "End call" },
    ],
  },
} satisfies Record<PhoneLanguage, Record<string, IvrKeyHelp>>;
