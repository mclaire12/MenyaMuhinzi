import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allLessons, coursesQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Ubuyobozi — MenyaMuhinzi" }, { name: "description", content: "Imbonerahamwe y'abafasha n'abayobozi." }] }),
  component: Studio,
});

function Studio() {
  const { isStaff, roles } = useAuth();
  const { data: courses } = useQuery(coursesQuery);
  const { data: stats } = useQuery({
    queryKey: ["studio-stats"], enabled: isStaff,
    queryFn: async () => {
      const [e, p] = await Promise.all([
        supabase.from("enrollments").select("course_id, user_id"),
        supabase.from("lesson_progress").select("lesson_id, status").eq("status", "completed"),
      ]);
      return { enrollments: e.data ?? [], completions: p.data ?? [] };
    },
  });

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Ntabwo wemerewe</h1>
        <p className="mt-2 text-muted-foreground">Iki gice ni icy'abafasha n'abayobozi gusa.</p>
        <Link to="/dashboard" className="mt-4 inline-block font-bold text-primary">Subira ku byanjye</Link>
      </div>
    );
  }

  const learners = new Set(stats?.enrollments.map((e) => e.user_id)).size;
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-4xl font-semibold">Ubuyobozi</h1>
        <p className="text-muted-foreground">Uruhare: {roles.join(", ")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Abiga", learners], ["Kwiyandikisha", stats?.enrollments.length ?? 0], ["Amasomo yarangiye", stats?.completions.length ?? 0]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-5"><p className="text-muted-foreground">{k}</p><p className="font-display text-4xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Isomo</TableHead><TableHead>Ibice</TableHead><TableHead>Amasomo</TableHead><TableHead>Abiyandikishije</TableHead></TableRow></TableHeader>
          <TableBody>
            {courses?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-bold">{c.title}</TableCell>
                <TableCell>{c.course_modules.length}</TableCell>
                <TableCell>{allLessons(c).length}</TableCell>
                <TableCell>{stats?.enrollments.filter((e) => e.course_id === c.id).length ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
