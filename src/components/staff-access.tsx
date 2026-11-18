import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
export function StaffAccess() {
 const {session}=useAuth(); const qc=useQueryClient(); const [role,setRole]=useState<"facilitator"|"admin">("facilitator");const [busy,setBusy]=useState(false);
 const requests=useQuery({queryKey:["staff-requests",session?.user.id],enabled:!!session,queryFn:async()=>{if(!session)return [];const r=await supabase.from("staff_requests").select("*").eq("user_id",session.user.id);if(r.error)throw r.error;return r.data;}});
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!session)return;setBusy(true);const reason=String(new FormData(e.currentTarget).get("reason"));const r=await supabase.from("staff_requests").insert({user_id:session.user.id,requested_role:role,reason});setBusy(false);if(r.error){toast.error("Ntibyakunze kohereza ubusabe.");return;}toast.success("Ubusabe bwoherejwe.");qc.invalidateQueries({queryKey:["staff-requests"]});}
 return <section className="mt-8 border-t pt-6"><h2 className="text-2xl">Saba uburenganzira bw’abakozi</h2><p className="mt-3 text-sm text-muted-foreground">Ubuyobozi buzabanza gusuzuma ubusabe bwawe.</p>{requests.isError?<p role="alert">Ntibyakunze gufungura ubusabe.</p>:requests.data?.map(r=><p key={r.id} className="mt-3 border-l-2 border-primary pl-3 text-sm">{r.requested_role === "admin" ? "Umuyobozi" : "Umufasha"} · {r.status === "pending" ? "Biracyasuzumwa" : r.status === "approved" ? "Byemejwe — ongera winjire" : "Ntibyemejwe"}</p>)}<form onSubmit={submit} className="mt-5 space-y-4"><div className="space-y-2"><Label>Uruhare usaba</Label><Select value={role} onValueChange={v=>setRole(v as "facilitator"|"admin")}><SelectTrigger aria-label="Uruhare usaba"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="facilitator">Umufasha</SelectItem><SelectItem value="admin">Umuyobozi</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="reason">Impamvu n’ubunararibonye</Label><Textarea id="reason" name="reason" required minLength={10} maxLength={2000} /></div><Button disabled={busy || requests.isLoading || requests.data?.some(r=>r.requested_role===role)} type="submit">Ohereza ubusabe</Button></form></section>;
}
