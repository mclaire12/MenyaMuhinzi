import type { Assessment, Course, CourseModule, CropSlug, GeneratedCourse, GeneratedLesson, Lesson } from "@/lib/mock/types";

export function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "isomo";
}

export function blankLesson(id: string, title = "Isomo rishya"): Lesson {
  return { id, title, summary: "", objectives: [], body: "", example: "", keyPoints: [], durationMinutes: 8, format: "reading", narration: "", narrationLanguage: "rw", ussdText: "", videoScenes: [], illustration: "", aiGenerated: false, validated: false };
}

export function blankModule(id: string, title = "Igice gishya"): CourseModule {
  return { id, title, description: "", lessons: [] };
}

export function lessonFromGenerated(generated: GeneratedLesson, id: string): Lesson {
  return {
    id,
    title: generated.title,
    summary: generated.summary,
    objectives: generated.objectives,
    body: generated.body,
    example: generated.example,
    keyPoints: generated.keyPoints,
    durationMinutes: generated.durationMinutes,
    format: "reading",
    narration: generated.narration,
    narrationLanguage: "rw",
    ussdText: generated.ussdText,
    videoScenes: [],
    illustration: generated.illustration,
    aiGenerated: true,
    validated: false,
  };
}

export function courseFromGenerated(generated: GeneratedCourse, meta: { id: string; crop: CropSlug; level: string; ownerId: string; durationWeeks: number; language: Course["language"]; at: string }): Course {
  return {
    id: meta.id,
    slug: `${slugify(generated.title)}-${meta.id.slice(-4)}`,
    title: generated.title,
    crop: meta.crop,
    level: meta.level,
    description: generated.description,
    objectives: generated.objectives,
    language: meta.language,
    durationWeeks: meta.durationWeeks,
    status: "draft",
    ownerId: meta.ownerId,
    aiGenerated: true,
    revision: 1,
    createdAt: meta.at,
    updatedAt: meta.at,
    modules: generated.modules.map((module, moduleIndex) => ({
      id: `${meta.id}-m${moduleIndex + 1}`,
      title: module.title,
      description: module.description,
      lessons: module.lessons.map((lesson, lessonIndex) => lessonFromGenerated(lesson, `${meta.id}-m${moduleIndex + 1}-l${lessonIndex + 1}`)),
    })),
  };
}

export function assessmentFromGenerated(generated: GeneratedCourse, courseId: string): Assessment {
  return {
    id: `as-${courseId}`,
    courseId,
    title: `Isuzumabumenyi: ${generated.title}`,
    status: "draft",
    questions: generated.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.questions)).map((question, index) => ({ ...question, id: `${courseId}-q${index + 1}` })),
  };
}

export const courseLessons = (course: Course) => course.modules.flatMap((module) => module.lessons);
