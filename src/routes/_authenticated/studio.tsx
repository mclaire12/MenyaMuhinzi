import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import { CourseLoading, LearningFeedback, LearningStat, SectionHeading } from "@/components/learning-ui";
import { StaffAccess } from "@/components/staff-access";
import { StaffApprovals } from "@/components/staff-approvals";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allLessons, coursesQuery } from "@/lib/learning";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Ubuyobozi — MenyaMuhinzi" }, { name: "description", content: "Imbonerahamwe y'abafasha n'abayobozi." }, { property: "og:title", content: "Ubuyobozi — MenyaMuhinzi" }, { property: "og:description", content: "Abiga, kwiyandikisha n’amasomo yarangiye." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Studio,
});

function Studio() {
  const { isStaff, roles, user } = useAuth();
  const coursesState = useQuery(coursesQuery);
  const { data: courses } = coursesState;
  const statsState = useQuery({
    queryKey: ["studio-stats"], enabled: isStaff && !user?.demo,
    queryFn: async () => {
      const [e, p] = await Promise.all([
        supabase.from("enrollments").select("course_id, user_id"),
        supabase.from("lesson_progress").select("lesson_id, status").eq("status", "completed"),
      ]);
      if (e.error) throw e.error;
      if (p.error) throw p.error;
      return { enrollments: e.data ?? [], completions: p.data ?? [] };
    },
  });

  const { data: stats } = statsState;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Ntabwo wemerewe</h1>
        <p className="mt-2 text-muted-foreground">Iki gice ni icy'abafasha n'abayobozi gusa.</p>
        <Button asChild variant="outline" className="mt-5"><Link to="/dashboard">Subira ku byanjye</Link></Button>
        <StaffAccess />
      </div>
    );
  }

  const learners = new Set(stats?.enrollments.map((e) => e.user_id)).size;
  return (
    <div className="page-width pb-14"><BackLink to="/dashboard" label="Subira ku byanjye" />
      <div className="page-heading"><div><p className="eyebrow mb-3">INCAMAKE Y’AMASOMO</p><h1>Ubuyobozi</h1><p className="mt-3 text-muted-foreground">Uruhare: {roles.join(", ")}</p></div><span className="icon-tile"><Users aria-hidden /></span></div>
      {statsState.isLoading || coursesState.isLoading ? <CourseLoading /> : statsState.isError || coursesState.isError ? <LearningFeedback error retry={() => { statsState.refetch(); coursesState.refetch(); }} /> : <>
      <div className="mb-10 grid gap-4 sm:grid-cols-3"><LearningStat label="Abiga" value={learners} icon={Users} /><LearningStat label="Kwiyandikisha" value={stats?.enrollments.length ?? 0} icon={BookOpen} /><LearningStat label="Amasomo yarangiye" value={stats?.completions.length ?? 0} icon={CheckCircle2} /></div>
      <Button asChild className="mb-6"><Link to="/manage">Gutunganya amasomo n’isomero</Link></Button>
      <SectionHeading title="Amasomo n’abiga" eyebrow="AMAKURU Y’AMASOMO" />
      <div className="staff-table">
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
      {!courses?.length && <LearningFeedback />}
      {roles.includes("admin") && !user?.demo && <StaffApprovals />}
      </>}
    </div>
  );
}
