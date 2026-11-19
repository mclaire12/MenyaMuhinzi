import { featureFallback } from "@/lib/admin/chatbot-routing";
import { composeCourse, composeLesson, composeModule } from "@/lib/mock/ai-compose";
import { assessmentFromGenerated, courseFromGenerated } from "@/lib/mock/builders";
import { blockingIssues } from "@/lib/mock/quality";
import { getLearningState, MockServiceError, mutate, newId, nowIso, takeSimulatedFailure, wait } from "@/lib/mock/store";
import type { GeneratedCourse, GeneratedLesson, GeneratedModule, GenerationInput } from "@/lib/mock/types";
import { insertCourse, runCourseAction, type Actor } from "@/lib/mock/services/courses";
import { facilitatorPermissions } from "@/lib/mock/services/facilitators";

export const MOCK_MODEL = "menyamuhinzi-mock-v1";

export function validateInput(input: GenerationInput) {
  const errors: Partial<Record<keyof GenerationInput, string>> = {};
  if (input.topic.trim().length < 4) errors.topic = "Enter a course title or topic (at least 4 characters).";
  if (input.moduleCount < 1 || input.moduleCount > 6) errors.moduleCount = "Choose between 1 and 6 modules.";
  if (input.durationWeeks < 1 || input.durationWeeks > 26) errors.durationWeeks = "Duration must be 1 to 26 weeks.";
  return errors;
}

async function simulate<T>(ms: number, make: () => T) {
  const unavailable = featureFallback("course_generation");
  if (unavailable) throw new MockServiceError(`The course generation assistant is switched off by the administrator. ${unavailable}`);
  await wait(ms);
  if (takeSimulatedFailure()) throw new MockServiceError("The AI service did not respond. Try again.");
  return make();
}

export const generateCourse = (input: GenerationInput, variant = 0): Promise<GeneratedCourse> => simulate(1400, () => composeCourse(input, variant));
export const regenerateModule = (input: GenerationInput, moduleIndex: number, variant: number): Promise<GeneratedModule> => simulate(800, () => composeModule(input, moduleIndex, variant));
export const regenerateLesson = (input: GenerationInput, bankIndex: number, lessonIndex: number, variant: number): Promise<GeneratedLesson> => simulate(600, () => composeLesson(input, bankIndex, lessonIndex, variant));

export function recordGeneration(facilitatorId: string, input: GenerationInput, result: GeneratedCourse) {
  const id = newId("gen");
  mutate((state) => ({ ...state, generations: [{ id, facilitatorId, input, result, status: "generated" as const, courseId: null, model: MOCK_MODEL, createdAt: nowIso() }, ...state.generations].slice(0, 30) }));
  return id;
}

export function updateGeneration(generationId: string, result: GeneratedCourse) {
  mutate((state) => ({ ...state, generations: state.generations.map((item) => (item.id === generationId ? { ...item, result } : item)) }));
}

export const lessonKey = (moduleIndex: number, lessonIndex: number) => `${moduleIndex}-${lessonIndex}`;

export function saveGeneration(generationId: string, actor: Actor, submit: boolean, validatedKeys: Set<string>): { courseId: string | null; error: string | null } {
  const generation = getLearningState().generations.find((item) => item.id === generationId);
  if (!generation) return { courseId: null, error: "Generation not found." };
  if (generation.courseId) return { courseId: generation.courseId, error: "Already saved." };
  const courseId = newId("c");
  const drafted = courseFromGenerated(generation.result, { id: courseId, crop: generation.input.crop, level: generation.input.level, ownerId: actor.id, durationWeeks: generation.input.durationWeeks, language: generation.input.language, at: nowIso() });
  const course = { ...drafted, modules: drafted.modules.map((module, m) => ({ ...module, lessons: module.lessons.map((lesson, l) => ({ ...lesson, validated: validatedKeys.has(lessonKey(m, l)) })) })) };
  insertCourse(course, actor, "AI draft saved for validation");
  mutate((state) => ({
    ...state,
    assessments: [assessmentFromGenerated(generation.result, courseId), ...state.assessments],
    generations: state.generations.map((item) => (item.id === generationId ? { ...item, status: submit ? "submitted" : "saved", courseId } : item)),
  }));
  if (!submit) return { courseId, error: null };
  if (blockingIssues(course).length) return { courseId, error: "Saved as a draft. Every lesson must be marked as validated before it can be submitted." };
  return { courseId, error: runCourseAction(courseId, "submit", actor, facilitatorPermissions()) };
}
