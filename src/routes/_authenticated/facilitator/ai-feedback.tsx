import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { CropTag, Empty, formatDateTime, Loadable, Panel, Stat } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { useMockResource } from "@/lib/mock/store";
import { questionInsights, saveQuestionFeedback } from "@/lib/mock/services/ai-feedback";
import { misunderstoodTopics } from "@/lib/mock/services/analytics";
import type { AIQuestion } from "@/lib/mock/types";

export const Route = createFileRoute("/_authenticated/facilitator/ai-feedback")({ component: AiFeedback });

const statusText: Record<AIQuestion["status"], string> = { answered: "Answered", unanswered: "AI could not answer", flagged: "Flagged" };

function AiFeedback() {
  const { facilitator, state } = useFacilitator();
  const [view, setView] = useState<"all" | "unanswered" | "flagged" | "not_helpful">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const resource = useMockResource((current) => ({ insights: questionInsights(current, facilitator.id), topics: misunderstoodTopics(current, facilitator.id) }));
  return <>
    <PageHead title="AI learning feedback" text="How your farmers use the AI learning assistant. Suggest corrections to course content here; AI providers and model settings are managed by administrators." />
    <Loadable resource={resource} empty={(data) => (data.insights.questions.length ? null : "Your farmers have not asked the AI any questions yet.")}>{({ insights, topics }) => {
      const list = insights.questions.filter((item) => view === "all" || (view === "not_helpful" ? item.rating === "not_helpful" : item.status === view));
      const open = insights.questions.find((item) => item.id === openId) ?? null;
      return <>
        <div className="admin-stats">
          <Stat label="Questions asked" value={insights.questions.length} />
          <Stat label="AI could not answer" value={insights.unanswered.length} />
          <Stat label="Flagged responses" value={insights.flagged.length} />
          <Stat label="Helpful / not helpful" value={`${insights.ratings.helpful} / ${insights.ratings.notHelpful}`} hint={`${insights.ratings.none} without a rating`} />
        </div>
        <div className="fac-grid">
          <Panel title="Frequently asked topics"><ul className="fac-list">{insights.frequent.map((row) => <li key={row.topic}><span>{row.topic}</span><small>{row.asked} question(s){row.unanswered ? ` · ${row.unanswered} unanswered` : ""}{row.flagged ? ` · ${row.flagged} flagged` : ""}</small></li>)}</ul></Panel>
          <Panel title="Frequently misunderstood topics">{topics.length === 0 ? <Empty text="Nothing recorded." /> : <ul className="fac-list">{topics.map((row) => <li key={row.topic}><span>{row.topic}</span><small>{row.missed} missed in assessments · {row.questions} unresolved question(s)</small></li>)}</ul>}</Panel>
          <Panel title="Knowledge gaps">{insights.gaps.length === 0 ? <Empty text="No gaps identified." /> : <ul className="fac-list">{insights.gaps.map((row) => <li key={row.topic}><span><b>{row.topic}</b><small className="block text-muted-foreground">Consider adding or correcting a lesson on this topic.</small></span><small>{row.unanswered} unanswered · {row.flagged} flagged · {row.notHelpful} not helpful</small></li>)}</ul>}</Panel>
        </div>
        <section className="admin-panel mt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">Questions</h2><div className="admin-actions">{(["all", "unanswered", "flagged", "not_helpful"] as const).map((item) => <Button key={item} size="sm" variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>{item === "all" ? "All" : item === "unanswered" ? "Could not answer" : item === "flagged" ? "Flagged" : "Rated not helpful"}</Button>)}</div></div>
          <div className="review-layout">
            {list.length === 0 ? <Empty text="No questions in this view." /> : <ul className="space-y-1">{list.map((item) => <li key={item.id}><button type="button" className={openId === item.id ? "lesson-pick is-active w-full" : "lesson-pick w-full"} onClick={() => setOpenId(item.id)}><span className="min-w-0 flex-1 text-left"><b className="block">{item.question}</b><small className="text-muted-foreground">{state.farmers.find((farmer) => farmer.id === item.learnerId)?.name} · {item.channel.toUpperCase()} · {formatDateTime(item.at)}</small></span><span className="status-pill" data-status={item.status === "answered" ? "published" : item.status === "flagged" ? "rejected" : "pending_review"}>{statusText[item.status]}</span></button></li>)}</ul>}
            <div>{open ? <QuestionDetail key={open.id} question={open} /> : <Empty text="Choose a question to inspect it." />}</div>
          </div>
        </section>
      </>;
    }}</Loadable>
  </>;
}

function QuestionDetail({ question }: { question: AIQuestion }) {
  const { actor, state } = useFacilitator();
  const [note, setNote] = useState(question.facilitatorNote);
  const [correction, setCorrection] = useState("");
  const course = state.courses.find((item) => item.id === question.courseId);
  return <form className="admin-panel admin-form" onSubmit={(event) => { event.preventDefault(); if (!note.trim() && !correction.trim()) { toast.error("Write feedback or a correction."); return; } saveQuestionFeedback(question.id, actor, { note, correction }); setCorrection(""); toast.success(correction.trim() ? "Feedback saved. The correction was added as a review comment on the course." : "Feedback saved."); }}>
    <div className="flex flex-wrap items-center gap-2"><CropTag crop={question.crop} /><span className="text-sm text-muted-foreground">Topic: {question.topic} · {course?.title}</span></div>
    <p><b>Farmer asked:</b> {question.question}</p>
    <p className="text-sm"><b>AI answered:</b> {question.answer || <i>No answer — the assistant did not have approved content for this question.</i>}</p>
    <p className="text-sm text-muted-foreground">Farmer rating: {question.rating === "helpful" ? "Helpful" : question.rating === "not_helpful" ? "Not helpful" : "Not rated"}{question.reviewed ? " · reviewed" : ""}</p>
    {question.correction && <p className="fac-note">Correction suggested by {question.correction.by}: {question.correction.text}</p>}
    <label>Your feedback on this response<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <label>Suggest a correction to the course content (optional)<textarea rows={3} value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="What should the lesson say?" /></label>
    <div><Button type="submit">Save feedback</Button></div>
  </form>;
}
