import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdminActor } from "@/components/admin/shell";
import { CropTag } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { publishCourse, publishProblems } from "@/lib/admin/courses";
import { audienceLabels, groupLocation, matchingFarmers } from "@/lib/admin/groups";
import { useAdmin } from "@/lib/admin/store";
import { courseLessons } from "@/lib/mock/builders";
import { courseAudience } from "@/lib/mock/services/availability";
import { useLearningState } from "@/lib/mock/store";
import type { Course, PublicationScope } from "@/lib/mock/types";

type Step = "scope" | "groups" | "review";

export function PublishDialog({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const admin = useAdmin();
  const learning = useLearningState();
  const { actor } = useAdminActor();
  const [step, setStep] = useState<Step>("scope");
  const [scope, setScope] = useState<PublicationScope>("platform");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState(false);
  const [updating, setUpdating] = useState(false);
  const courseId = course?.id ?? null;

  useEffect(() => {
    if (!course) return;
    const current = course.status === "published" ? courseAudience(course) : null;
    setUpdating(!!current);
    setScope(current?.scope ?? admin.platform.defaultScope);
    setGroupIds(current?.groupIds ?? []);
    setStep("scope");
    setQuery("");
    setDone(false);
    // Reset only when a different course is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!course) return null;
  const activeGroups = admin.targetGroups.filter((group) => group.status === "active");
  const shown = activeGroups.filter((group) => !query.trim() || `${group.name} ${group.province} ${group.district}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = activeGroups.filter((group) => groupIds.includes(group.id));
  const problems = publishProblems(course, { scope, groupIds });
  const estimated = chosen.reduce((sum, group) => sum + group.estimatedFarmers, 0);
  const registered = new Set(chosen.flatMap((group) => matchingFarmers(learning, group).map((farmer) => farmer.id))).size;

  function confirm() {
    if (!course) return;
    const error = publishCourse(course.id, actor, { scope, groupIds });
    if (error) { toast.error(error); return; }
    setDone(true);
    toast.success(updating ? "Publication updated." : "Course published.");
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{done ? (updating ? "Publication updated" : "Course published") : updating ? "Update publication" : "Publish course"}</DialogTitle>
        <DialogDescription>{course.title}</DialogDescription>
      </DialogHeader>
      {done ? <div className="space-y-2 text-sm">
        <p>{scope === "platform" ? "Every farmer on the platform can now find this course in Amasomo." : `Farmers matching ${chosen.map((group) => group.name).join(", ")} can now find this course in Amasomo.`}</p>
        <p className="text-muted-foreground">Basic-phone farmers in the audience reach it through the simulated USSD menu. The change is recorded in the course's publication history.</p>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </div> : <>
        <ol className="admin-actions mb-2 text-sm" aria-label="Steps">{(["scope", ...(scope === "groups" ? ["groups"] : []), "review"] as Step[]).map((item, index) => <li key={item} className={item === step ? "font-bold" : "text-muted-foreground"}>{index + 1}. {item === "scope" ? "Audience" : item === "groups" ? "Groups" : "Review"}</li>)}</ol>
        {step === "scope" && <fieldset className="fac-pick space-y-2"><legend className="mb-2 font-bold">Who should see this course?</legend>
          <label className="flex items-start gap-2"><input type="radio" name="scope" checked={scope === "platform"} onChange={() => setScope("platform")} /><span><b>Entire platform</b><small className="block text-muted-foreground">All farmers, on smartphones and basic phones.</small></span></label>
          <label className="flex items-start gap-2"><input type="radio" name="scope" checked={scope === "groups"} onChange={() => setScope("groups")} /><span><b>Selected groups</b><small className="block text-muted-foreground">Only farmers whose location and crop match one of the chosen groups. Staff can always see it.</small></span></label>
        </fieldset>}
        {step === "groups" && <div className="space-y-2">
          <input className="w-full" aria-label="Search groups" placeholder="Search groups" value={query} onChange={(event) => setQuery(event.target.value)} />
          {!activeGroups.length ? <p className="fac-empty">There are no active groups. Create or activate a group first.</p> : !shown.length ? <p className="fac-empty">No groups match.</p> : <ul className="fac-list">{shown.map((group) => <li key={group.id}><label className="flex items-start gap-2"><input type="checkbox" checked={groupIds.includes(group.id)} onChange={(event) => setGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} /><span><b>{group.name}</b> <CropTag crop={group.crop} /><small className="block text-muted-foreground">{audienceLabels[group.audience]} · {groupLocation(group)} · about {group.estimatedFarmers.toLocaleString()} farmers</small></span></label></li>)}</ul>}
          <p className="text-sm text-muted-foreground">{groupIds.length} group(s) selected.</p>
        </div>}
        {step === "review" && <div className="space-y-3 text-sm">
          <dl className="fac-facts">
            <div><dt>Course</dt><dd>{course.title}</dd></div>
            <div><dt>Content</dt><dd>{course.modules.length} modules · {courseLessons(course).length} lessons · {course.language === "en" ? "English" : "Kinyarwanda"}</dd></div>
            <div><dt>Audience</dt><dd>{scope === "platform" ? "Entire platform" : chosen.map((group) => group.name).join(", ") || "No groups"}</dd></div>
            {scope === "groups" && <div><dt>Reach</dt><dd>About {estimated.toLocaleString()} farmers (estimate) · {registered} registered today</dd></div>}
          </dl>
          {problems.length ? <div className="fac-error"><b>Fix these before publishing:</b><ul className="mt-1 list-disc pl-5">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></div> : <p className="fac-note">{updating ? "The new audience replaces the current one as soon as you confirm." : "Farmers in this audience can open the course as soon as you confirm."}</p>}
        </div>}
        <DialogFooter>
          {step === "scope" ? <Button variant="outline" onClick={onClose}>Cancel</Button> : <Button variant="outline" onClick={() => setStep(step === "review" && scope === "groups" ? "groups" : "scope")}>Back</Button>}
          {step === "review" ? <Button disabled={problems.length > 0} onClick={confirm}>{updating ? "Confirm update" : "Confirm and publish"}</Button> : <Button disabled={step === "groups" && !groupIds.length} onClick={() => setStep(step === "scope" && scope === "groups" ? "groups" : "review")}>Next</Button>}
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}
