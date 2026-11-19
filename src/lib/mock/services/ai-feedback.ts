import { mutate, nowIso } from "@/lib/mock/store";
import type { LearningState } from "@/lib/mock/types";
import { myFarmers } from "@/lib/mock/services/farmers";
import { addReviewComment } from "@/lib/mock/services/reviews";
import type { Actor } from "@/lib/mock/services/courses";

export function myQuestions(state: LearningState, facilitatorId: string) {
  const ids = new Set(myFarmers(state, facilitatorId).map((farmer) => farmer.id));
  return state.aiQuestions.filter((item) => ids.has(item.learnerId)).sort((a, b) => b.at.localeCompare(a.at));
}

export function questionInsights(state: LearningState, facilitatorId: string) {
  const questions = myQuestions(state, facilitatorId);
  const byTopic = new Map<string, { topic: string; asked: number; unanswered: number; flagged: number; notHelpful: number }>();
  questions.forEach((item) => {
    const row = byTopic.get(item.topic) ?? { topic: item.topic, asked: 0, unanswered: 0, flagged: 0, notHelpful: 0 };
    row.asked += 1;
    if (item.status === "unanswered") row.unanswered += 1;
    if (item.status === "flagged") row.flagged += 1;
    if (item.rating === "not_helpful") row.notHelpful += 1;
    byTopic.set(item.topic, row);
  });
  const topics = [...byTopic.values()].sort((a, b) => b.asked - a.asked);
  return {
    questions,
    frequent: topics,
    unanswered: questions.filter((item) => item.status === "unanswered"),
    flagged: questions.filter((item) => item.status === "flagged"),
    ratings: { helpful: questions.filter((item) => item.rating === "helpful").length, notHelpful: questions.filter((item) => item.rating === "not_helpful").length, none: questions.filter((item) => !item.rating).length },
    gaps: topics.filter((row) => row.unanswered + row.flagged + row.notHelpful > 0).map((row) => ({ ...row, score: row.unanswered * 2 + row.flagged * 2 + row.notHelpful })).sort((a, b) => b.score - a.score),
  };
}

export function saveQuestionFeedback(questionId: string, actor: Actor, values: { note: string; correction: string }) {
  let target: { courseId: string; lessonId: string | null; question: string } | null = null;
  mutate((state) => ({
    ...state,
    aiQuestions: state.aiQuestions.map((item) => {
      if (item.id !== questionId) return item;
      target = { courseId: item.courseId, lessonId: item.lessonId, question: item.question };
      return { ...item, facilitatorNote: values.note.trim(), reviewed: true, correction: values.correction.trim() ? { text: values.correction.trim(), status: "suggested" as const, by: actor.name, at: nowIso() } : item.correction };
    }),
  }));
  const found = target as { courseId: string; lessonId: string | null; question: string } | null;
  if (found && values.correction.trim()) addReviewComment(found.courseId, actor, `Content correction from a farmer question (“${found.question}”): ${values.correction.trim()}`, { moduleId: null, lessonId: found.lessonId });
}
