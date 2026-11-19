export type CropSlug = "tomato" | "cabbage" | "carrot";
export type ContentLanguage = "rw" | "en" | "fr";
export type CourseStatus = "draft" | "pending_review" | "approved" | "published" | "rejected" | "archived";
export type LessonFormat = "reading" | "video" | "audio";
export type AccessChannel = "smartphone" | "basic_phone";
export type LearningChannel = "web" | "ussd" | "ivr";

export interface Location {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

export interface NotificationPreferences {
  reviewDecisions: boolean;
  farmerQuestions: boolean;
  weeklySummary: boolean;
  smsAlerts: boolean;
}

export interface Facilitator {
  id: string;
  accountId: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  organisation: string;
  qualification: string;
  yearsOfExperience: number;
  district: string;
  specialties: CropSlug[];
  language: ContentLanguage;
  notifications: NotificationPreferences;
  responsibilities: string[];
}

export interface Farmer extends Location {
  id: string;
  accountId?: string;
  name: string;
  phone: string;
  channel: AccessChannel;
  facilitatorId: string;
  cropInterest: CropSlug[];
  joinedAt: string;
}

export interface FarmerGroup extends Location {
  id: string;
  name: string;
  facilitatorId: string;
  crop: CropSlug | "mixed";
  programme: string;
  memberIds: string[];
  createdAt: string;
  activity: { at: string; text: string }[];
}

export interface VideoScene {
  id: string;
  title: string;
  narration: string;
  visual: string;
  subtitle: string;
  seconds: number;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  body: string;
  example: string;
  keyPoints: string[];
  durationMinutes: number;
  format: LessonFormat;
  narration: string;
  narrationLanguage: ContentLanguage;
  ussdText: string;
  videoScenes: VideoScene[];
  illustration: string;
  aiGenerated: boolean;
  validated: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  crop: CropSlug;
  level: string;
  description: string;
  objectives: string[];
  language: ContentLanguage;
  durationWeeks: number;
  status: CourseStatus;
  ownerId: string;
  modules: CourseModule[];
  aiGenerated: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type ResourceKind = "image" | "video" | "audio" | "document" | "subtitle";

export interface LearningResource {
  id: string;
  courseId: string;
  lessonId: string;
  kind: ResourceKind;
  title: string;
  note: string;
  language: ContentLanguage;
  url: string;
  createdAt: string;
}

export type AssignmentTarget = { kind: "farmer" | "group"; id: string };

export interface CourseAssignment {
  id: string;
  courseId: string;
  target: AssignmentTarget;
  assignedBy: string;
  assignedAt: string;
  startAt: string;
  dueAt: string | null;
  note: string;
}

export interface Enrollment {
  learnerId: string;
  courseId: string;
  enrolledAt: string;
}

export interface LearningProgress {
  learnerId: string;
  courseId: string;
  lessonId: string;
  status: "in_progress" | "completed";
  channel: LearningChannel;
  updatedAt: string;
  completedAt: string | null;
  positionSec?: number;
  durationSec?: number;
}

export type QuestionKind = "choice" | "true_false" | "short";

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  topic: string;
  kind?: QuestionKind;
  accept?: string;
  explanation?: string;
}

export interface FarmerSettings {
  learnerId: string;
  language: ContentLanguage;
  notifyNew: boolean;
  notifyAssigned: boolean;
  notifyReminder: boolean;
  notifyResults: boolean;
}

export interface NoticeRead {
  learnerId: string;
  noticeId: string;
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  status: "draft" | "published";
  questions: AssessmentQuestion[];
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  courseId: string;
  learnerId: string;
  score: number;
  missedTopics: string[];
  at: string;
}

export type ReviewAction = "submitted" | "comment" | "approved" | "rejected" | "withdrawn" | "published" | "archived" | "restored";

export interface ContentReview {
  id: string;
  courseId: string;
  revision: number;
  action: ReviewAction;
  authorId: string;
  authorName: string;
  comment: string;
  moduleId: string | null;
  lessonId: string | null;
  resolved: boolean;
  at: string;
}

export interface CourseRevision {
  id: string;
  courseId: string;
  revision: number;
  by: string;
  summary: string;
  at: string;
}

export interface AIQuestion {
  id: string;
  learnerId: string;
  courseId: string;
  lessonId: string | null;
  crop: CropSlug;
  topic: string;
  question: string;
  answer: string;
  status: "answered" | "unanswered" | "flagged";
  rating: "helpful" | "not_helpful" | null;
  channel: LearningChannel;
  at: string;
  facilitatorNote: string;
  correction: { text: string; status: "suggested" | "applied"; by: string; at: string } | null;
  reviewed: boolean;
}

export interface GenerationInput {
  topic: string;
  crop: CropSlug;
  level: string;
  description: string;
  objectives: string[];
  language: ContentLanguage;
  durationWeeks: number;
  moduleCount: number;
  instructions: string;
}

export interface GeneratedLesson {
  title: string;
  summary: string;
  objectives: string[];
  body: string;
  example: string;
  keyPoints: string[];
  narration: string;
  ussdText: string;
  illustration: string;
  durationMinutes: number;
  questions: Omit<AssessmentQuestion, "id">[];
}

export interface GeneratedModule {
  bankIndex: number;
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  objectives: string[];
  outline: string[];
  modules: GeneratedModule[];
  resources: string[];
}

export interface AIContentGeneration {
  id: string;
  facilitatorId: string;
  input: GenerationInput;
  result: GeneratedCourse;
  status: "generated" | "saved" | "submitted";
  courseId: string | null;
  model: string;
  createdAt: string;
}

export interface MockConfig {
  latencyMs: number;
  failNextLoad: boolean;
}

export interface LearningState {
  version: number;
  facilitators: Facilitator[];
  farmers: Farmer[];
  groups: FarmerGroup[];
  courses: Course[];
  resources: LearningResource[];
  assignments: CourseAssignment[];
  enrollments: Enrollment[];
  progress: LearningProgress[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  reviews: ContentReview[];
  revisions: CourseRevision[];
  aiQuestions: AIQuestion[];
  generations: AIContentGeneration[];
  settings: FarmerSettings[];
  noticeReads: NoticeRead[];
  config: MockConfig;
}
