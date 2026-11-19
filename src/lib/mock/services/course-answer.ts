import { courseLessons } from "@/lib/mock/builders";
import type { ContentLanguage, Course, Lesson } from "@/lib/mock/types";

const stop = new Set(["ni", "gute", "nigute", "ryari", "nahinga", "neza", "ku", "mu", "na", "cyangwa", "iki", "ibyo", "kandi", "nta", "the", "how", "what", "can", "when", "should", "does", "for", "and"]);

export function tokens(text: string) {
  return text.toLowerCase().split(/[^a-z0-9àâäéèêëïîôùûüç]+/i).filter((word) => word.length > 2 && !stop.has(word));
}

export const restrictedQuestion = /(^|\s)(imiti|umuti|muti|doze|npk)(\s|$)|pesticide|fertili[sz]er|dosage|ingano y.?ifumbire/i;

export type GroundedAnswer = { kind: "answer" | "restricted" | "outside"; text: string; lesson: Lesson | null };

/** Answers only from approved lessons of one published course; the current lesson is preferred. */
export function groundedAnswer(course: Course, lessonId: string | null, question: string, language: ContentLanguage): GroundedAnswer {
  const lessons = courseLessons(course);
  const focus = lessons.find((lesson) => lesson.id === lessonId) ?? null;
  const pool = focus ? [focus, ...lessons.filter((lesson) => lesson.id !== focus.id)] : lessons;
  const asked = tokens(question);
  const ranked = pool
    .map((lesson) => {
      const overlap = tokens(`${lesson.title} ${lesson.body} ${lesson.keyPoints.join(" ")} ${lesson.example} ${lesson.narration}`).filter((word) => asked.includes(word)).length;
      return { lesson, overlap, score: overlap + (focus?.id === lesson.id ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.lesson ?? null;
  const en = language === "en";
  if (restrictedQuestion.test(question)) {
    return {
      kind: "restricted",
      lesson: focus,
      text: en
        ? "I cannot give pesticide or fertilizer doses. Please ask your facilitator or an agronomist, and follow the approved instructions in your lesson."
        : "Sinaguhaye umuti cyangwa ingano y'ifumbire. Ibyo bisaba umujyanama w'ubuhinzi. Reba isomo ryo kurinda ibihingwa, ukurikize amabwiriza yemewe.",
    };
  }
  if (!best || (ranked[0]?.overlap ?? 0) === 0) {
    return {
      kind: "outside",
      lesson: null,
      text: en
        ? `This question is outside the course "${course.title}". Please ask about what the lessons teach, or ask your facilitator.`
        : `Iki kibazo kiri hanze y'isomo "${course.title}". Baza ikintu kiri mu masomo yemewe, cyangwa ubaze umufashamyumvire wawe.`,
    };
  }
  const points = best.keyPoints.slice(0, 3);
  const example = best.example || best.body.split(".").slice(0, 2).join(".").trim();
  const text = en
    ? [`From the lesson "${best.title}" (lesson content is in Kinyarwanda):`, ...points.map((point) => `• ${point}`), example ? `Example: ${example}` : ""].filter(Boolean).join("\n")
    : [`Mu isomo "${best.title}":`, ...points.map((point) => `• ${point}`), example ? `Urugero: ${example}` : ""].filter(Boolean).join("\n");
  return { kind: "answer", lesson: best, text };
}
