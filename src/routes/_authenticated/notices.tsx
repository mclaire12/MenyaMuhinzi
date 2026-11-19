import { createFileRoute, Link } from "@tanstack/react-router";
import { LearningFeedback } from "@/components/learning-ui";
import { useAuth } from "@/hooks/use-auth";
import { farmerNotices, markNoticeRead } from "@/lib/mock/services/farmer";
import { useMockResource } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/notices")({ component: NoticesPage });

const kindLabel = { published: "Rishya", assigned: "Wahawe", reminder: "Wibuke", update: "Ryahindutse", result: "Amanota" };

function NoticesPage() {
  const { user } = useAuth();
  const resource = useMockResource((state) => user ? farmerNotices(state, user.id) : []);
  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const rows = resource.data;
  return <div className="page-width farmer-page">
    <p className="eyebrow mb-2">UBUTUMWA</p>
    <h1 className="text-3xl">Amamenyesha</h1>
    {rows.length === 0 ? <LearningFeedback title="Nta butumwa" text="Amamenyesha y'amasomo azagaragara hano." /> : <ul className="notice-list">{rows.map((item) => <li key={item.id} data-read={item.read}>{item.kind === "result" ? <Link to="/quiz/$courseId" params={{ courseId: item.courseId }} onClick={() => user && markNoticeRead(user.id, item.id)}><small>{kindLabel[item.kind]}</small><b>{item.title}</b><span>{item.text}</span></Link> : <Link to="/courses/$slug" params={{ slug: item.slug }} onClick={() => user && markNoticeRead(user.id, item.id)}><small>{kindLabel[item.kind]}</small><b>{item.title}</b><span>{item.text}</span></Link>}</li>)}</ul>}
  </div>;
}
