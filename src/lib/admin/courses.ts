import { getAdminState, updateAdmin } from "@/lib/admin/store";
import { blankModule, slugify } from "@/lib/mock/builders";
import { blockingIssues } from "@/lib/mock/quality";
import { courseAudience } from "@/lib/mock/services/availability";
import { ADMIN_ACTOR_ID, insertCourse, type Actor } from "@/lib/mock/services/courses";
import { decideCourse } from "@/lib/mock/services/reviews";
import { getLearningState, mutate, newId, nowIso } from "@/lib/mock/store";
import type { AssessmentQuestion, ContentLanguage, Course, CoursePublication, CropSlug, LearningState, PublicationScope, ReviewAction } from "@/lib/mock/types";

export const adminActor = (name: string): Actor => ({ id: ADMIN_ACTOR_ID, name });

export function creatorName(state: LearningState, ownerId: string) {
  if (ownerId === ADMIN_ACTOR_ID) return "Administrator";
  return state.facilitators.find((person) => person.id === ownerId)?.name ?? "Unknown";
}

export function availabilityLabel(course: Course) {
  if (course.status !== "published") return "Not published";
  const audience = courseAudience(course);
  if (audience.scope === "platform") return "Entire platform";
  return `${audience.groupIds.length} group${audience.groupIds.length === 1 ? "" : "s"}`;
}

export type NewCourseValues = { title: string; crop: CropSlug; level: string; description: string; objectives: string[]; language: ContentLanguage; durationWeeks: number; moduleCount: number };

export function validateNewCourse(values: NewCourseValues) {
  const errors: Partial<Record<keyof NewCourseValues, string>> = {};
  if (values.title.trim().length < 5) errors.title = "The title needs at least 5 characters.";
  if (values.description.trim().length < 10) errors.description = "Add a short description (at least 10 characters).";
  if (!values.objectives.length) errors.objectives = "Add at least one learning objective.";
  if (values.durationWeeks < 1 || values.durationWeeks > 26) errors.durationWeeks = "Duration must be 1 to 26 weeks.";
  if (values.moduleCount < 1 || values.moduleCount > 6) errors.moduleCount = "Choose between 1 and 6 modules.";
  return errors;
}

export function createAdminCourse(actor: Actor, values: NewCourseValues) {
  const id = newId("c");
  const at = nowIso();
  const course: Course = {
    id, slug: `${slugify(values.title)}-${id.slice(-4)}`, title: values.title.trim(), crop: values.crop, level: values.level, description: values.description.trim(), objectives: values.objectives,
    language: values.language, durationWeeks: values.durationWeeks, status: "draft", ownerId: actor.id, aiGenerated: false, revision: 1, createdAt: at, updatedAt: at,
    modules: Array.from({ length: values.moduleCount }, (_, index) => blankModule(`${id}-m${index + 1}`, `Igice cya ${index + 1}`)),
  };
  insertCourse(course, actor, "Course created by the administrator");
  updateAdmin(actor.name, "create-course", id, course.title, (state) => state);
  return id;
}

function review(state: LearningState, course: Course, actor: Actor, action: ReviewAction, comment: string): LearningState {
  return { ...state, reviews: [{ id: newId("r"), courseId: course.id, revision: course.revision, action, authorId: actor.id, authorName: actor.name, comment, moduleId: null, lessonId: null, resolved: true, at: nowIso() }, ...state.reviews] };
}

function record(course: Course, actor: Actor, action: CoursePublication["action"], scope: PublicationScope, groupIds: string[]): CoursePublication[] {
  return [{ id: newId("pub"), at: nowIso(), by: actor.name, action, scope, groupIds }, ...(course.publications ?? [])];
}

export type PublishRequest = { scope: PublicationScope; groupIds: string[] };

export function publishProblems(course: Course, request: PublishRequest): string[] {
  const problems: string[] = [];
  if (course.status === "archived") problems.push("Restore the course before publishing it.");
  if (course.status === "rejected") problems.push("This course was returned to its facilitator. Wait for a new revision.");
  if (request.scope === "groups") {
    const groups = getAdminState().targetGroups;
    if (!request.groupIds.length) problems.push("Choose at least one group.");
    request.groupIds.forEach((id) => {
      const group = groups.find((item) => item.id === id);
      if (!group) problems.push("One of the selected groups no longer exists.");
      else if (group.status !== "active") problems.push(`“${group.name}” is ${group.status}. Activate it first.`);
    });
  }
  const blocking = blockingIssues(course);
  if (blocking.length) problems.push(`${blocking.length} required item(s) are missing, for example: ${blocking[0]!.text}`);
  return problems;
}

/** Publishes or updates a course's audience. Publishing to groups keeps the group–course link on the course. */
export function publishCourse(courseId: string, actor: Actor, request: PublishRequest): string | null {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return "Course not found.";
  const problems = publishProblems(course, request);
  if (problems.length) return problems[0]!;
  const wasPublished = course.status === "published";
  const groupIds = request.scope === "groups" ? [...new Set(request.groupIds)] : [];
  const at = nowIso();
  mutate((state) => {
    const next: Course = { ...course, status: "published", updatedAt: at, publishedAt: wasPublished && course.publishedAt ? course.publishedAt : at, audience: { scope: request.scope, groupIds }, publications: record(course, actor, wasPublished ? "updated" : "published", request.scope, groupIds) };
    return review({ ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) }, next, actor, "published", request.scope === "platform" ? "Published to the entire platform" : `Published to ${groupIds.length} group(s)`);
  });
  const names = getAdminState().targetGroups.filter((group) => groupIds.includes(group.id)).map((group) => group.name).join(", ");
  updateAdmin(actor.name, wasPublished ? "update-publication" : "publish-course", courseId, request.scope === "platform" ? `${course.title} → entire platform` : `${course.title} → ${names}`, (state) => state);
  return null;
}

export function unpublishCourse(courseId: string, actor: Actor): string | null {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course || course.status !== "published") return "Only published courses can be unpublished.";
  const audience = courseAudience(course);
  mutate((state) => {
    const next: Course = { ...course, status: "approved", updatedAt: nowIso(), publications: record(course, actor, "unpublished", audience.scope, audience.groupIds) };
    return { ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) };
  });
  updateAdmin(actor.name, "unpublish-course", courseId, course.title, (state) => state);
  return null;
}

export function archiveCourse(courseId: string, actor: Actor) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course || course.status === "archived") return "This course is already archived.";
  mutate((state) => {
    const next: Course = { ...course, status: "archived", updatedAt: nowIso(), ...(course.status === "published" ? { publications: record(course, actor, "unpublished", courseAudience(course).scope, courseAudience(course).groupIds) } : {}) };
    return review({ ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) }, next, actor, "archived", "");
  });
  updateAdmin(actor.name, "archive-course", courseId, course.title, (state) => state);
  return null;
}

export function restoreCourse(courseId: string, actor: Actor) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course || course.status !== "archived") return "Only archived courses can be restored.";
  mutate((state) => {
    const next: Course = { ...course, status: "draft", updatedAt: nowIso() };
    return review({ ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) }, next, actor, "restored", "");
  });
  updateAdmin(actor.name, "restore-course", courseId, course.title, (state) => state);
  return null;
}

export function reviewCourse(courseId: string, actor: Actor, decision: "approved" | "rejected", comment: string) {
  const error = decideCourse(courseId, decision, actor, { approve: true, publish: true }, comment);
  if (!error) updateAdmin(actor.name, decision === "approved" ? "approve-course" : "reject-course", courseId, comment || decision, (state) => state);
  return error;
}

export function assignCourseToGroup(courseId: string, groupId: string, actor: Actor) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return "Course not found.";
  const audience = courseAudience(course);
  if (course.status === "published" && audience.scope === "platform") return "This course is already available to the entire platform.";
  const current = course.status === "published" ? audience.groupIds : [];
  return publishCourse(courseId, actor, { scope: "groups", groupIds: [...current, groupId] });
}

export function removeCourseFromGroup(courseId: string, groupId: string, actor: Actor) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return "Course not found.";
  const audience = courseAudience(course);
  const rest = audience.groupIds.filter((id) => id !== groupId);
  if (course.status !== "published") {
    mutate((state) => ({ ...state, courses: state.courses.map((item) => (item.id === courseId ? { ...item, audience: { scope: "groups", groupIds: rest } } : item)) }));
    return null;
  }
  return rest.length ? publishCourse(courseId, actor, { scope: "groups", groupIds: rest }) : unpublishCourse(courseId, actor);
}

const assessmentId = (courseId: string) => `as-${courseId}`;

export const courseAssessment = (state: LearningState, courseId: string) => state.assessments.find((item) => item.courseId === courseId) ?? null;

export function addAssessmentQuestion(courseId: string, course: Pick<Course, "title">, question: Omit<AssessmentQuestion, "id">) {
  mutate((state) => {
    const existing = courseAssessment(state, courseId);
    const item = { ...question, id: newId("q") };
    if (existing) return { ...state, assessments: state.assessments.map((row) => (row.id === existing.id ? { ...row, questions: [...row.questions, item] } : row)) };
    return { ...state, assessments: [{ id: assessmentId(courseId), courseId, title: `Isuzumabumenyi: ${course.title}`, status: "draft" as const, questions: [item] }, ...state.assessments] };
  });
}

export function removeAssessmentQuestion(courseId: string, questionId: string) {
  mutate((state) => ({ ...state, assessments: state.assessments.map((row) => (row.courseId === courseId ? { ...row, questions: row.questions.filter((item) => item.id !== questionId) } : row)) }));
}

export function setAssessmentStatus(courseId: string, status: "draft" | "published") {
  mutate((state) => ({ ...state, assessments: state.assessments.map((row) => (row.courseId === courseId ? { ...row, status } : row)) }));
}
