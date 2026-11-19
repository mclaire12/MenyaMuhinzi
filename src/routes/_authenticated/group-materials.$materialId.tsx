import { createFileRoute, Link } from "@tanstack/react-router";
import { LearningFeedback } from "@/components/learning-ui";
import { useAuth } from "@/hooks/use-auth";
import { learnerIdFor } from "@/lib/mock/services/learners";
import { materialForLearner } from "@/lib/mock/services/teaching";
import { useMockResource } from "@/lib/mock/store";

export const Route = createFileRoute("/_authenticated/group-materials/$materialId")({ component: GroupMaterialPage });

function GroupMaterialPage() {
  const { materialId } = Route.useParams();
  const { user } = useAuth();
  const resource = useMockResource((state) => {
    if (!user) return null;
    const found = materialForLearner(state, learnerIdFor(state, user.id), materialId);
    return found ? { ...found, facilitator: state.facilitators.find((person) => person.id === found.material.facilitatorId)?.name ?? "" } : null;
  });
  if (resource.status === "loading") return <div className="page-width py-10" role="status">Birimo gufunguka…</div>;
  if (resource.status === "error") return <div className="page-width py-10"><LearningFeedback error retry={resource.retry} /></div>;
  const data = resource.data;
  if (!data) return <div className="page-width farmer-page"><LearningFeedback title="Iyi nyigisho ntiboneka" text="Igaragara gusa ku banyamuryango b'itsinda yahawe." /><Link className="mt-3 inline-block font-bold text-primary" to="/notices">Subira ku mamenyesha</Link></div>;
  const { material, groups, facilitator } = data;
  return <div className="page-width farmer-page">
    <Link to="/notices" className="text-sm font-bold text-primary">Subira ku mamenyesha</Link>
    <p className="eyebrow mb-2 mt-4">INYIGISHO Y'ITSINDA</p>
    <h1 className="text-3xl">{material.title}</h1>
    <p className="mt-2 text-muted-foreground">Yateguwe na {facilitator} ku itsinda {groups.map((group) => group.name).join(", ")}. Izakoreshwa no mu mahugurwa mu murima.</p>
    <article className="teach-preview mt-6">
      {material.sections.map((section) => <section key={section.id}>
        <h2>{section.heading}{section.minutes ? <span className="teach-time"> · iminota {section.minutes}</span> : null}</h2>
        <p>{section.body}</p>
      </section>)}
    </article>
  </div>;
}
