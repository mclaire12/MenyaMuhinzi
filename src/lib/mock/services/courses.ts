import { blankLesson, blankModule, courseLessons, slugify } from "@/lib/mock/builders";
import { blockingIssues } from "@/lib/mock/quality";
import { mutate, newId, nowIso, getLearningState } from "@/lib/mock/store";
import type { Course, CourseModule, CropSlug, LearningResource, LearningState, Lesson, ReviewAction } from "@/lib/mock/types";
import { canEditCourse, facilitatorActions, type ActorPermissions, type CourseAction } from "@/lib/mock/workflow";

export type Actor = { id: string; name: string };

export const managedCourses = (state: LearningState, facilitatorId: string) => state.courses.filter((course) => course.ownerId === facilitatorId);

export function courseLearnerIds(state: LearningState, courseId: string) {
  const ids = new Set(state.enrollments.filter((item) => item.courseId === courseId).map((item) => item.learnerId));
  state.assignments.filter((item) => item.courseId === courseId).forEach((item) => {
    if (item.target.kind === "farmer") ids.add(item.target.id);
    else state.groups.find((group) => group.id === item.target.id)?.memberIds.forEach((id) => ids.add(id));
  });
  return [...ids];
}

function review(state: LearningState, course: Course, actor: Actor, action: ReviewAction, comment = "", target: { moduleId?: string; lessonId?: string } = {}): LearningState {
  return { ...state, reviews: [{ id: newId("r"), courseId: course.id, revision: course.revision, action, authorId: actor.id, authorName: actor.name, comment, moduleId: target.moduleId ?? null, lessonId: target.lessonId ?? null, resolved: action !== "comment" && action !== "rejected", at: nowIso() }, ...state.reviews] };
}

function logRevision(state: LearningState, course: Course, actor: Actor, summary: string): LearningState {
  return { ...state, revisions: [{ id: newId("rv"), courseId: course.id, revision: course.revision, by: actor.name, summary, at: nowIso() }, ...state.revisions].slice(0, 400) };
}

function editCourse(courseId: string, actor: Actor, summary: string, change: (course: Course) => Course) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course || !canEditCourse(course)) return false;
  mutate((state) => {
    const next = { ...change(course), updatedAt: nowIso() };
    return logRevision({ ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) }, next, actor, summary);
  });
  return true;
}

export function createCourse(actor: Actor, values: { title: string; crop: CropSlug; level: string; description: string }) {
  const id = newId("c");
  const at = nowIso();
  const course: Course = {
    id, slug: `${slugify(values.title)}-${id.slice(-4)}`, title: values.title, crop: values.crop, level: values.level, description: values.description, objectives: [], language: "rw", durationWeeks: 2,
    status: "draft", ownerId: actor.id, aiGenerated: false, revision: 1, createdAt: at, updatedAt: at, modules: [blankModule(`${id}-m1`, "Igice cya mbere")],
  };
  mutate((state) => logRevision({ ...state, courses: [course, ...state.courses] }, course, actor, "Course created"));
  return id;
}

export function insertCourse(course: Course, actor: Actor, summary: string) {
  mutate((state) => logRevision({ ...state, courses: [course, ...state.courses] }, course, actor, summary));
}

export function duplicateCourse(actor: Actor, courseId: string) {
  const source = getLearningState().courses.find((item) => item.id === courseId);
  if (!source) return null;
  const id = newId("c");
  const at = nowIso();
  const copy: Course = {
    ...source, id, slug: `${source.slug}-copy-${id.slice(-4)}`, title: `${source.title} (kopi)`, status: "draft", ownerId: actor.id, revision: 1, createdAt: at, updatedAt: at,
    modules: source.modules.map((module, m) => ({ ...module, id: `${id}-m${m + 1}`, lessons: module.lessons.map((lesson, l) => ({ ...lesson, id: `${id}-m${m + 1}-l${l + 1}`, videoScenes: lesson.videoScenes.map((scene) => ({ ...scene, id: newId("s") })) })) })),
  };
  delete copy.publishedAt;
  mutate((state) => logRevision({ ...state, courses: [copy, ...state.courses] }, copy, actor, `Duplicated from "${source.title}"`));
  return id;
}

export function updateCourseDetails(courseId: string, actor: Actor, patch: Partial<Pick<Course, "title" | "crop" | "level" | "description" | "objectives" | "language" | "durationWeeks">>) {
  return editCourse(courseId, actor, "Course details edited", (course) => ({ ...course, ...patch }));
}

export function runCourseAction(courseId: string, action: CourseAction, actor: Actor, permissions: ActorPermissions): string | null {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return "Course not found.";
  if (!facilitatorActions(course.status, permissions).includes(action)) return "This action is not available for the current status.";
  if (action === "submit" && blockingIssues(course).length) return "Fix the missing information before submitting.";
  const at = nowIso();
  mutate((state) => {
    const update = (patch: Partial<Course>) => {
      const next = { ...course, ...patch, updatedAt: at };
      return { next, state: { ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) } };
    };
    if (action === "submit") {
      const { next, state: s } = update({ status: "pending_review" });
      const settled = { ...s, reviews: s.reviews.map((item) => (item.courseId === courseId && item.action === "rejected" ? { ...item, resolved: true } : item)) };
      return review(settled, next, actor, "submitted", next.revision > 1 ? `Resubmitted as revision ${next.revision}` : "");
    }
    if (action === "withdraw") { const { next, state: s } = update({ status: "draft" }); return review(s, next, actor, "withdrawn"); }
    if (action === "publish") { const { next, state: s } = update({ status: "published", publishedAt: at }); return review(s, next, actor, "published"); }
    if (action === "archive") { const { next, state: s } = update({ status: "archived" }); return review(s, next, actor, "archived"); }
    if (action === "restore") { const { next, state: s } = update({ status: "draft" }); return review(s, next, actor, "restored"); }
    const { next, state: s } = update({ status: "draft", revision: course.revision + 1 });
    return logRevision(s, next, actor, `Revision ${next.revision} started after review feedback`);
  });
  return null;
}

export function setCourseStatusByReviewer(courseId: string, status: Course["status"], actor: Actor, comment: string) {
  const course = getLearningState().courses.find((item) => item.id === courseId);
  if (!course) return;
  const at = nowIso();
  const action: ReviewAction = status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "published" ? "published" : status === "archived" ? "archived" : "restored";
  mutate((state) => {
    const next = { ...course, status, updatedAt: at, ...(status === "published" ? { publishedAt: at } : {}) };
    return review({ ...state, courses: state.courses.map((item) => (item.id === courseId ? next : item)) }, next, actor, action, comment);
  });
}

const mapModules = (course: Course, change: (modules: CourseModule[]) => CourseModule[]) => ({ ...course, modules: change(course.modules) });
const mapLesson = (course: Course, lessonId: string, change: (lesson: Lesson) => Lesson) => mapModules(course, (modules) => modules.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => (lesson.id === lessonId ? change(lesson) : lesson)) })));

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}

export const addModule = (courseId: string, actor: Actor) => {
  const id = newId("m");
  return editCourse(courseId, actor, "Module added", (course) => mapModules(course, (modules) => [...modules, blankModule(id, `Igice cya ${modules.length + 1}`)])) ? id : null;
};
export const updateModule = (courseId: string, moduleId: string, actor: Actor, patch: Partial<Pick<CourseModule, "title" | "description">>) =>
  editCourse(courseId, actor, "Module edited", (course) => mapModules(course, (modules) => modules.map((module) => (module.id === moduleId ? { ...module, ...patch } : module))));
export const deleteModule = (courseId: string, moduleId: string, actor: Actor) =>
  editCourse(courseId, actor, "Module deleted", (course) => mapModules(course, (modules) => modules.filter((module) => module.id !== moduleId)));
export const moveModule = (courseId: string, moduleId: string, direction: -1 | 1, actor: Actor) =>
  editCourse(courseId, actor, "Modules reordered", (course) => mapModules(course, (modules) => move(modules, modules.findIndex((module) => module.id === moduleId), direction)));

export const addLesson = (courseId: string, moduleId: string, actor: Actor) => {
  const id = newId("l");
  return editCourse(courseId, actor, "Lesson added", (course) => mapModules(course, (modules) => modules.map((module) => (module.id === moduleId ? { ...module, lessons: [...module.lessons, blankLesson(id)] } : module)))) ? id : null;
};
export const updateLesson = (courseId: string, lessonId: string, actor: Actor, patch: Partial<Omit<Lesson, "id">>, summary = "Lesson edited") =>
  editCourse(courseId, actor, summary, (course) => mapLesson(course, lessonId, (lesson) => ({ ...lesson, ...patch })));
export const deleteLesson = (courseId: string, lessonId: string, actor: Actor) =>
  editCourse(courseId, actor, "Lesson deleted", (course) => mapModules(course, (modules) => modules.map((module) => ({ ...module, lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) }))));
export const moveLesson = (courseId: string, moduleId: string, lessonId: string, direction: -1 | 1, actor: Actor) =>
  editCourse(courseId, actor, "Lessons reordered", (course) => mapModules(course, (modules) => modules.map((module) => (module.id === moduleId ? { ...module, lessons: move(module.lessons, module.lessons.findIndex((lesson) => lesson.id === lessonId), direction) } : module))));

export function findLesson(state: LearningState, lessonId: string) {
  for (const course of state.courses) for (const module of course.modules) { const lesson = module.lessons.find((item) => item.id === lessonId); if (lesson) return { course, module, lesson }; }
  return null;
}

export function addResource(actor: Actor, values: Omit<LearningResource, "id" | "createdAt">) {
  const course = getLearningState().courses.find((item) => item.id === values.courseId);
  if (!course || !canEditCourse(course)) return false;
  mutate((state) => logRevision({ ...state, resources: [{ ...values, id: newId("res"), createdAt: nowIso() }, ...state.resources] }, course, actor, `Resource added: ${values.title}`));
  return true;
}

export function removeResource(actor: Actor, resourceId: string) {
  const state = getLearningState();
  const resource = state.resources.find((item) => item.id === resourceId);
  const course = state.courses.find((item) => item.id === resource?.courseId);
  if (!resource || !course || !canEditCourse(course)) return false;
  mutate((current) => logRevision({ ...current, resources: current.resources.filter((item) => item.id !== resourceId) }, course, actor, `Resource removed: ${resource.title}`));
  return true;
}

export const lessonCount = (course: Course) => courseLessons(course).length;
