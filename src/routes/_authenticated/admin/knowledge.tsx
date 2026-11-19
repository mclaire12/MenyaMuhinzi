import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateAdmin, useAdmin } from "@/lib/admin/store";
import { nextKnowledgeStatus } from "@/lib/admin/workflow";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({ component: Knowledge });

function Knowledge() {
  const data = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? "Administrator";
  const [tab, setTab] = useState<"sources" | "glossary">("sources");
  function advance(id: string) {
    const source = data.knowledge.find((item) => item.id === id);
    const next = source ? nextKnowledgeStatus(source.status) : null;
    if (!source || !next) return;
    updateAdmin(actor, "knowledge-status", id, next, (state) => ({ ...state, knowledge: state.knowledge.map((item) => item.id === id ? { ...item, status: next, updatedAt: new Date().toISOString() } : item) }));
    toast.success(next === "indexed" ? "Approved knowledge is now in the trusted demo collection." : `Moved to ${next}.`);
  }
  function addTerm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rw = String(form.get("rw")).trim();
    const en = String(form.get("en")).trim();
    const definition = String(form.get("definition")).trim();
    if (rw.length < 2 || definition.length < 8) { toast.error("Add the Kinyarwanda term and a definition."); return; }
    updateAdmin(actor, "glossary", rw, en, (state) => ({ ...state, glossary: [{ id: `t-${Date.now()}`, rw, en, fr: String(form.get("fr") ?? ""), definition, status: "draft" }, ...state.glossary] }));
    event.currentTarget.reset();
    toast.success("Glossary term saved in this browser.");
  }
  return <>
    <PageHead title="Knowledge hub" text="Only a source marked indexed is treated as trusted for answers. Uploaded files are records in this demo, not real documents." />
    <div className="admin-actions mb-4"><Button variant={tab === "sources" ? "default" : "outline"} onClick={() => setTab("sources")}>Sources</Button><Button variant={tab === "glossary" ? "default" : "outline"} onClick={() => setTab("glossary")}>Glossary</Button></div>
    {tab === "sources" ? <div className="staff-table"><table className="w-full text-sm"><thead><tr><th>Title</th><th>Type</th><th>Vegetable</th><th>Status</th><th /></tr></thead><tbody>{data.knowledge.map((source) => { const next = nextKnowledgeStatus(source.status); return <tr key={source.id}><td>{source.title}</td><td>{source.kind}</td><td>{source.vegetable}</td><td>{source.status}</td><td>{next && <Button size="sm" onClick={() => advance(source.id)}>{next === "processing" ? "Retry" : next === "approved" ? "Approve" : "Index"}</Button>}</td></tr>; })}</tbody></table></div> : <>
      <form className="admin-form admin-panel mb-4" onSubmit={addTerm}><input name="rw" aria-label="Kinyarwanda" placeholder="Kinyarwanda" required /><input name="en" aria-label="English" placeholder="English" /><input name="fr" aria-label="French" placeholder="French" /><textarea name="definition" aria-label="Definition" placeholder="Definition" required /><Button type="submit">Add term</Button></form>
      <ul className="space-y-2">{data.glossary.map((term) => <li key={term.id} className="admin-panel"><b>{term.rw}</b> · {term.en} · {term.status}<p className="text-sm text-muted-foreground">{term.definition}</p></li>)}</ul>
    </>}
  </>;
}
