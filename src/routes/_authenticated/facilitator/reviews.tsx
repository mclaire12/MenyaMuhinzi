import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { CropTag, Empty, formatDateTime, StatusPill } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { formatLabels } from "@/lib/mock/crops";
import { courseIssues } from "@/lib/mock/quality";
import { runCourseAction } from "@/lib/mock/services/courses";
import { addReviewComment, courseReviews, courseRevisions, decideCourse, latestDecision, reviewQueue, setCommentResolved, setLessonValidated } from "@/lib/mock/services/reviews";
import type { ContentReview, Course } from "@/lib/mock/types";
import { canEditCourse, canReviewCourse } from "@/lib/mock/workflow";

export const Route = createFileRoute("/_authenticated/facilitator/reviews")({
  validateSearch: (search: Record<string, unknown>): { course?: string } => (typeof search["course"] === "string" ? { course: search["course"] } : {}),
  component: Reviews,
});

const actionText: Record<ContentReview["action"], string> = { submitted: "Submitted for review", comment: "Comment", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn from review", published: "Published", archived: "Archived", restored: "Restored as draft" };

function Reviews() {
  const { facilitator, permissions, state } = useFacilitator();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queue = reviewQueue(state, facilitator.id);
  const decided = state.courses.filter((course) => course.ownerId === facilitator.id && (course.status === "approved" || course.status === "published") && latestDecision(state, course.id));
  const groups: [string, Course[], string][] = [
    ["Peer review", permissions.approve ? queue.peers : [], permissions.approve ? "Courses by other facilitators that you can approve or reject." : "Your role cannot approve courses."],
    ["Waiting for an expert", queue.mine, "Your submitted courses."],
    ["Returned to you", queue.returned, "Rejected courses to revise and resubmit."],
    ["Recently approved", decided, ""],
  ];
  const all = groups.flatMap(([, list]) => list);
  const selected = state.courses.find((course) => course.id === search.course) ?? all[0];
  const visible = selected && (selected.ownerId === facilitator.id || selected.status === "pending_review") ? selected : undefined;
  return <>
    <PageHead title="Content review" text="Agricultural information must be validated by a qualified expert before it is published. AI-generated content is never published automatically." />
    <div className="review-layout">
      <nav className="space-y-3" aria-label="Review queue">{groups.map(([title, list, hint]) => <section key={title} className="admin-panel">
        <h2 className="text-base">{title} <span className="text-muted-foreground">({list.length})</span></h2>
        {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
        {list.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="space-y-1">{list.map((course) => <li key={course.id}><button type="button" className={visible?.id === course.id ? "lesson-pick is-active w-full" : "lesson-pick w-full"} onClick={() => navigate({ search: { course: course.id } })}><span className="min-w-0 flex-1 text-left"><b className="block truncate">{course.title}</b><small className="text-muted-foreground">{state.facilitators.find((person) => person.id === course.ownerId)?.name} · rev {course.revision}</small></span><StatusPill status={course.status} /></button></li>)}</ul>}
      </section>)}</nav>
      <div className="min-w-0">{visible ? <ReviewDetail key={visible.id} course={visible} /> : <Empty text="Choose a course from the queue." />}</div>
    </div>
  </>;
}

function ReviewDetail({ course }: { course: Course }) {
  const { facilitator, actor, permissions, state } = useFacilitator();
  const [comment, setComment] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const reviewer = canReviewCourse(course, facilitator.id, permissions);
  const owner = course.ownerId === facilitator.id;
  const editable = owner && canEditCourse(course);
  const reviews = courseReviews(state, course.id);
  const comments = reviews.filter((item) => item.action === "comment");
  const issues = courseIssues(course);
  const canValidate = reviewer || editable;
  const ownerName = state.facilitators.find((person) => person.id === course.ownerId)?.name ?? "Unknown";

  function decide(decision: "approved" | "rejected") {
    const error = decideCourse(course.id, decision, actor, permissions, decisionNote);
    if (error) toast.error(error); else { toast.success(decision === "approved" ? "Course approved. An administrator can now publish it." : "Course returned to the author with your feedback."); setDecisionNote(""); }
  }
  function ownerAction(action: "revise" | "submit" | "withdraw") {
    const error = runCourseAction(course.id, action, actor, permissions);
    if (error) toast.error(error); else toast.success(action === "revise" ? "New revision started. Edit the course, then resubmit." : action === "submit" ? "Resubmitted for review." : "Withdrawn from review.");
  }
  function comment_(target: { moduleId: string | null; lessonId: string | null }, text: string) {
    if (addReviewComment(course.id, actor, text, target)) toast.success("Comment added."); else toast.error("Write a comment first.");
  }

  return <div className="space-y-3">
    <section className="admin-panel">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl">{course.title}</h2><p className="text-sm text-muted-foreground">By {ownerName} · revision {course.revision} · updated {formatDateTime(course.updatedAt)}</p></div><span className="flex gap-2"><CropTag crop={course.crop} /><StatusPill status={course.status} /></span></div>
      <p className="mt-2 text-sm">{course.description}</p>
      {course.objectives.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{course.objectives.map((item) => <li key={item}>{item}</li>)}</ul>}
      <div className="admin-actions mt-3">
        {owner && course.status === "rejected" && <Button onClick={() => ownerAction("revise")}>Revise content</Button>}
        {owner && course.status === "draft" && <Button onClick={() => ownerAction("submit")} disabled={issues.some((issue) => issue.blocking)}>Resubmit for review</Button>}
        {owner && course.status === "pending_review" && <Button variant="outline" onClick={() => ownerAction("withdraw")}>Withdraw to edit</Button>}
        {editable && <Button asChild variant="outline"><Link to="/facilitator/courses/$courseId" params={{ courseId: course.id }}>Edit in course editor</Link></Button>}
        {owner && course.status === "pending_review" && <p className="text-sm text-muted-foreground">Waiting for an agricultural expert. You cannot approve your own course.</p>}
      </div>
    </section>

    {reviewer && <section className="admin-panel admin-form"><h2 className="text-lg">Your decision</h2><p className="text-sm text-muted-foreground">Approve only if the agricultural information is correct and complete. Rejecting requires an explanation for the author.</p><textarea rows={3} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Feedback for the author" /><div className="admin-actions"><Button onClick={() => decide("approved")} disabled={issues.some((issue) => issue.blocking)}>Approve</Button><Button variant="destructive" onClick={() => decide("rejected")}>Reject with feedback</Button></div></section>}

    <section className="admin-panel"><h2 className="mb-2 text-lg">Missing information</h2>{issues.length === 0 ? <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" aria-hidden />Nothing missing.</p> : <ul className="space-y-1 text-sm">{issues.map((issue, index) => <li key={index} className="flex gap-2"><CircleAlert className={issue.blocking ? "mt-0.5 size-4 shrink-0 text-destructive" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} aria-hidden />{issue.text}</li>)}</ul>}</section>

    <section className="admin-panel"><h2 className="mb-2 text-lg">Modules and lessons</h2>
      {course.modules.map((module, m) => <div key={module.id} className="mb-3"><h3 className="font-bold">{m + 1}. {module.title}</h3><p className="text-sm text-muted-foreground">{module.description}</p>
        {module.lessons.map((lesson) => { const lessonComments = comments.filter((item) => item.lessonId === lesson.id); return <details key={lesson.id} className="studio-lesson"><summary><span><b>{lesson.title}</b>{lessonComments.some((item) => !item.resolved) && <span className="ml-2 text-xs text-destructive">{lessonComments.filter((item) => !item.resolved).length} open comment(s)</span>}</span><span className="flex items-center gap-2"><small>{formatLabels[lesson.format]}</small>{lesson.aiGenerated && <span className={lesson.validated ? "status-pill" : "ai-tag"} data-status="approved">{lesson.validated ? "Validated" : "AI · not validated"}</span>}</span></summary>
          <div className="mt-2 space-y-2 text-sm">
            <p className="whitespace-pre-line">{lesson.body || <i>No educational text.</i>}</p>
            {lesson.example && <p><b>Example:</b> {lesson.example}</p>}
            <p><b>Key points:</b> {lesson.keyPoints.join(" · ") || "—"}</p>
            <p><b>Basic-phone text:</b> {lesson.ussdText || "—"}</p>
            {lesson.aiGenerated && canValidate && <label className="fac-validate"><input type="checkbox" checked={lesson.validated} onChange={(event) => { if (setLessonValidated(course.id, lesson.id, actor, event.target.checked, permissions)) toast.success(event.target.checked ? "Lesson validated." : "Validation removed."); }} />Content checked against approved agricultural guidance</label>}
            <CommentList comments={lessonComments} />
            <CommentBox label="Comment on this lesson" onSubmit={(text) => comment_({ moduleId: module.id, lessonId: lesson.id }, text)} />
          </div>
        </details>; })}
      </div>)}
    </section>

    <section className="admin-panel admin-form"><h2 className="text-lg">General comments</h2>
      <CommentList comments={comments.filter((item) => !item.lessonId)} />
      <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment for the whole course" />
      <div><Button size="sm" variant="outline" onClick={() => { comment_({ moduleId: null, lessonId: null }, comment); setComment(""); }}><MessageSquare aria-hidden />Add comment</Button></div>
    </section>

    <section className="admin-panel"><h2 className="mb-2 text-lg">Review and revision history</h2><ul className="fac-list">{[...reviews.filter((item) => item.action !== "comment").map((item) => ({ id: item.id, at: item.at, text: `${actionText[item.action]} by ${item.authorName}`, detail: item.comment, revision: item.revision })), ...courseRevisions(state, course.id).map((item) => ({ id: item.id, at: item.at, text: item.summary, detail: item.by, revision: item.revision }))].sort((a, b) => b.at.localeCompare(a.at)).map((item) => <li key={item.id}><span>{item.text}<small className="block text-muted-foreground">Revision {item.revision}{item.detail ? ` · ${item.detail}` : ""}</small></span><small>{formatDateTime(item.at)}</small></li>)}</ul></section>
  </div>;
}

function CommentList({ comments }: { comments: ContentReview[] }) {
  if (!comments.length) return null;
  return <ul className="space-y-2">{comments.map((item) => <li key={item.id} className={item.resolved ? "review-comment is-resolved" : "review-comment"}><p>{item.comment}</p><small className="text-muted-foreground">{item.authorName} · {formatDateTime(item.at)} · revision {item.revision}</small><button type="button" className="ml-2 text-xs font-bold text-primary" onClick={() => setCommentResolved(item.id, !item.resolved)}>{item.resolved ? "Reopen" : "Mark resolved"}</button></li>)}</ul>;
}

function CommentBox({ label, onSubmit }: { label: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-md border px-2 py-1" aria-label={label} placeholder={label} value={text} onChange={(event) => setText(event.target.value)} /><Button size="sm" variant="outline" onClick={() => { onSubmit(text); setText(""); }}>Comment</Button></div>;
}
