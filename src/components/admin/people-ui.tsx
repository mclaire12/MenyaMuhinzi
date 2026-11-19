import { useState } from "react";
import { toast } from "sonner";
import { useAdminActor } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { rejectUser } from "@/lib/admin/people";
import type { AccountStatus, PortalUser } from "@/lib/admin/types";

export const statusTone = (status: AccountStatus) => (status === "active" ? "ok" : status === "pending" ? "warn" : status === "rejected" || status === "suspended" ? "bad" : "muted");

export function RejectDialog({ user, onClose }: { user: PortalUser | null; onClose: () => void }) {
  const { name } = useAdminActor();
  const [reason, setReason] = useState("");
  const close = () => { setReason(""); onClose(); };
  return <Dialog open={!!user} onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Reject {user?.name}?</DialogTitle><DialogDescription>The request is marked rejected and the account cannot be used. You can add a reason for the record.</DialogDescription></DialogHeader>
      <label className="admin-form">Reason (optional)<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: duplicate request" /></label>
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="destructive" onClick={() => { if (!user) return; const error = rejectUser(name, user.id, reason); if (error) toast.error(error); else toast.success(`${user.name}'s request was rejected.`); close(); }}>Reject request</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
