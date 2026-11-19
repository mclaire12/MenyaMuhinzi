import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead, useFacilitator } from "@/components/facilitator/shell";
import { MaterialEditor } from "@/components/facilitator/teaching-editor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/facilitator/teaching/$materialId")({
  validateSearch: (search: Record<string, unknown>): { publish?: boolean } => (search["publish"] ? { publish: true } : {}),
  component: MaterialPage,
});

function MaterialPage() {
  const { materialId } = Route.useParams();
  const search = Route.useSearch();
  const { facilitator, state } = useFacilitator();
  const material = state.materials.find((item) => item.id === materialId && item.facilitatorId === facilitator.id);
  if (!material) return <PageHead title="Material not found" text="This teaching material does not exist or was prepared by another facilitator."><Button asChild variant="outline"><Link to="/facilitator/teaching">Back to teaching materials</Link></Button></PageHead>;
  return <>
    <Link to="/facilitator/teaching" className="text-sm font-bold text-primary">Back to teaching materials</Link>
    <PageHead title={material.title} text="Preview and edit this material, then publish it to the groups you manage." />
    <MaterialEditor key={material.id} initial={{ input: material.input, title: material.title, sections: material.sections, variant: material.variant }} material={material} startPublishing={!!search.publish} onSaved={() => undefined} />
  </>;
}
