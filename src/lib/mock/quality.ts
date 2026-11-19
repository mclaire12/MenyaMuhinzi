import type { Course } from "@/lib/mock/types";

export type ContentIssue = { moduleId: string | null; lessonId: string | null; text: string; blocking: boolean };

export function courseIssues(course: Course): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const add = (text: string, moduleId: string | null = null, lessonId: string | null = null, blocking = true) => issues.push({ moduleId, lessonId, text, blocking });
  if (course.title.trim().length < 5) add("Course title is too short.");
  if (!course.description.trim()) add("Course description is missing.");
  if (!course.objectives.length) add("Learning objectives are missing.");
  if (!course.modules.length) add("The course has no modules.");
  course.modules.forEach((module, moduleIndex) => {
    const where = `Module ${moduleIndex + 1}`;
    if (!module.lessons.length) add(`${where} has no lessons.`, module.id);
    module.lessons.forEach((lesson, lessonIndex) => {
      const label = `${where}, lesson ${lessonIndex + 1} (${lesson.title})`;
      if (lesson.body.trim().length < 40) add(`${label}: educational text is missing or too short.`, module.id, lesson.id);
      if (lesson.keyPoints.length < 2) add(`${label}: add at least two key points.`, module.id, lesson.id);
      if (!lesson.summary.trim()) add(`${label}: description is missing.`, module.id, lesson.id, false);
      if (!lesson.ussdText.trim()) add(`${label}: basic-phone text (USSD/SMS) is missing.`, module.id, lesson.id);
      if (lesson.format === "audio" && !lesson.narration.trim()) add(`${label}: audio lesson needs a narration script.`, module.id, lesson.id);
      if (lesson.format === "video" && !lesson.videoScenes.length) add(`${label}: video lesson needs at least one scene.`, module.id, lesson.id);
      if (lesson.aiGenerated && !lesson.validated) add(`${label}: AI-generated content has not been validated.`, module.id, lesson.id);
      if (!lesson.example.trim()) add(`${label}: no practical example.`, module.id, lesson.id, false);
    });
  });
  return issues;
}

export const blockingIssues = (course: Course) => courseIssues(course).filter((issue) => issue.blocking);
