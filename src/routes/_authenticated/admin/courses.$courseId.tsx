import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import { cropOf, statusLabels } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";
import { courseLearnerIds, setCourseStatusByReviewer } from "@/lib/mock/services/courses";
import { learnerCourseProgress } from "@/lib/mock/services/learners";
import { latestDecision } from "@/lib/mock/services/reviews";
import type { CourseStatus } from "@/lib/mock/types";
import { adminCourseStatuses } from "@/lib/mock/workflow";

const moveLabels: Partial<Record<CourseStatus, string>> = { approved: "Approve", rejected: "Reject with feedback", published: "Publish", archived: "Archive", draft: "Restore as draft" };

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({ component: CoursePage });

function CoursePage() {
  const { courseId } = Route.useParams();
  const state = useLearningState();
  useAdmin();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const course = state.courses.find((item) => item.id === courseId);
  if (!course) return <PageHead title="Course not found" text="This demo course does not exist." />;
  const current = course;
  const learners = courseLearnerIds(state, course.id);
  const finished = learners.filter((id) => { const row = learnerCourseProgress(state, id, current.id); return row.total > 0 && row.done === row.total; }).length;
  const owner = state.facilitators.find((person) => person.id === course.ownerId)?.name ?? "Unknown";
  const decision = latestDecision(state, course.id);
  function move(status: CourseStatus) {
    if (status === "rejected" && !comment.trim()) { toast.error("Explain what must change before rejecting."); return; }
    const actor = { id: "admin", name: user?.name ?? "Administrator" };
    setCourseStatusByReviewer(current.id, status, actor, comment.trim());
    updateAdmin(actor.name, "course-status", current.id, status, (admin) => admin);
    setComment("");
    toast.success(`Course is now ${statusLabels[status].toLowerCase()}.`);
  }
  const next = adminCourseStatuses(course.status);
  return <>
    <Link to="/admin/courses" className="text-sm font-bold text-primary">Back to courses</Link>
    <PageHead title={course.title} text={`${cropOf(course.crop).name_en} · ${course.level} · by ${owner} · revision ${course.revision} · ${statusLabels[course.status]}`} />
    {course.aiGenerated && <p className="admin-banner">Drafted with AI by the facilitator. Check that every lesson was validated before approving.</p>}
    {decision && <p className="mb-3 text-sm text-muted-foreground">Last decision: {decision.action} by {decision.authorName}{decision.comment ? ` — ${decision.comment}` : ""}</p>}
    {next.length > 0 ? <div className="admin-panel admin-form mb-4">
      {next.includes("rejected") && <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Feedback for the facilitator (required to reject)" />}
      <div className="admin-actions">{next.map((status) => <Button key={status} variant={status === "published" || status === "approved" ? "default" : "outline"} onClick={() => move(status)}>{moveLabels[status] ?? statusLabels[status]}</Button>)}</div>
    </div> : <p className="mb-4 text-sm text-muted-foreground">No administrator action for a {statusLabels[course.status].toLowerCase()} course.</p>}
    <div className="admin-stats"><article className="admin-stat"><span>Learners</span><b>{learners.length}</b></article><article className="admin-stat"><span>Completed</span><b>{finished}</b></article><article className="admin-stat"><span>Lessons</span><b>{course.modules.reduce((sum, module) => sum + module.lessons.length, 0)}</b></article></div>
    <div className="grid gap-3 md:grid-cols-3">{course.modules.map((module) => <article key={module.id} className="admin-panel"><h2 className="font-bold">{module.title}</h2><ul className="mt-2 text-sm">{module.lessons.map((lesson) => <li key={lesson.id}>{lesson.title}{lesson.aiGenerated ? lesson.validated ? " · validated" : " · not validated" : ""}</li>)}</ul></article>)}</div>
    <p className="mt-4 text-sm text-muted-foreground">Facilitators edit lessons in the Facilitator Portal. Only drafts can be edited.</p>
  </>;
}
