"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";

import { StatusBadge } from "@/components/vendorflow/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, getSupplier, supplierDetailPath } from "@/lib/api";
import { useSession } from "@/components/layout/session-provider";
import type { Supplier } from "@/lib/vendorflow";

export function SupplierDetail({ supplierId }: { supplierId: number }) {
  const router = useRouter();
  const { organization } = useSession();
  const role = organization.role;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = role === "ADMIN" || role === "MANAGER";

  useEffect(() => {
    let active = true;
    getSupplier(organization.id, supplierId).then((value) => { if (active) { setSupplier(value); setLoading(false); } })
      .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Could not load supplier."); setLoading(false); } });
    return () => { active = false; };
  }, [organization.id, supplierId]);

  async function transition(action: "approve" | "reject" | "suspend") {
    if (!supplier) return;
    setBusy(true);
    try {
      const updated = await apiRequest<Supplier>(`${supplierDetailPath(organization.id, supplier.id)}${action}/`, { method: "POST" });
      setSupplier(updated);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change status.");
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function removeSupplier() {
    if (!supplier) return;
    setBusy(true);
    try {
      await apiRequest(supplierDetailPath(organization.id, supplier.id), { method: "DELETE" });
      router.push("/suppliers");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete supplier.");
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <output>Loading supplier…</output>;
  if (!supplier) {
    return (
      <div className="not-found-state">
        <p className="eyebrow">Supplier record</p>
        <h1>Supplier not found</h1>
        <p>{error || "This record may have been removed or is not available in the current organization."}</p>
        <Button nativeButton={false} render={<Link href="/suppliers" />}>Back to suppliers</Button>
      </div>
    );
  }

  const displayName = supplier.trade_name || supplier.legal_name;

  return (
    <>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <header className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1>{displayName}</h1>
            <StatusBadge status={supplier.status} />
          </div>
          <p>{supplier.legal_name}</p>
          <p className="detail-tax">{supplier.tax_id}</p>
        </div>
        <div className="detail-actions">
          {canEdit && <Button nativeButton={false} variant="outline" size="lg" render={<Link href={`/suppliers/${supplier.id}/edit`} />}><Pencil /> Edit supplier</Button>}
          {role === "ADMIN" && (
            <ConfirmAction
              title="Delete supplier?"
              description="This permanently removes the supplier from this organization."
              actionLabel="Delete"
              icon={<Trash2 />}
              onConfirm={removeSupplier}
              trigger={<Button variant="destructive" size="lg"><Trash2 /> Delete</Button>}
            />
          )}
        </div>
      </header>

      <div className="detail-layout">
        <section className="detail-section" aria-labelledby="general-heading">
          <div className="detail-section-heading"><h2 id="general-heading">General information</h2><p>Supplier identity, contact and ownership.</p></div>
          <dl className="detail-list">
            <DetailItem label="Legal name" value={supplier.legal_name} />
            <DetailItem label="Trade name" value={supplier.trade_name || "—"} />
            <DetailItem label="Email" value={supplier.email || "—"} />
            <DetailItem label="Phone" value={supplier.phone || "—"} />
            <DetailItem label="Website" value={supplier.website ? <a href={supplier.website} target="_blank" rel="noreferrer">{supplier.website.replace(/^https?:\/\//, "")} <ExternalLink /></a> : "—"} />
            <DetailItem label="Responsible" value={supplier.responsible_name} />
            <DetailItem label="Created" value={new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(supplier.created_at))} />
            <DetailItem label="Notes" value={supplier.notes || "—"} wide />
          </dl>
        </section>

        <aside className="workflow-panel" aria-labelledby="workflow-heading">
          <div className="detail-section-heading"><h2 id="workflow-heading">Workflow</h2><p>Current approval state.</p></div>
          <div className="workflow-status"><span>Current status</span><StatusBadge status={supplier.status} /></div>
          {supplier.status === "PENDING" && canEdit && (
            <div className="workflow-actions">
              <ConfirmAction
                title="Reject supplier?"
                description="The supplier will be marked as rejected after the review."
                actionLabel="Reject"
                onConfirm={() => transition("reject")}
                trigger={<Button variant="destructive" size="lg" disabled={busy}><X /> Reject</Button>}
              />
              <ConfirmAction
                title="Approve supplier?"
                description="The supplier will be marked as approved and the decision recorded in its history."
                actionLabel="Approve"
                actionVariant="default"
                icon={<Check />}
                onConfirm={() => transition("approve")}
                trigger={<Button size="lg" disabled={busy}><Check /> Approve</Button>}
              />
            </div>
          )}
          {supplier.status === "APPROVED" && role === "ADMIN" && (
            <div className="workflow-actions">
              <ConfirmAction
                title="Suspend supplier?"
                description="This supplier will no longer be considered active."
                actionLabel="Suspend"
                icon={<Ban />}
                onConfirm={() => transition("suspend")}
                trigger={<Button variant="destructive" size="lg" disabled={busy}><Ban /> Suspend supplier</Button>}
              />
            </div>
          )}
          {(role === "VIEWER" || supplier.status === "REJECTED" || supplier.status === "SUSPENDED") && (
            <p className="workflow-note">No workflow actions are available for this supplier.</p>
          )}
        </aside>
      </div>
      <section className="detail-section mt-6" aria-labelledby="history-heading">
        <div className="detail-section-heading"><h2 id="history-heading">Status history</h2><p>Recorded approval decisions and who made them.</p></div>
        {supplier.status_history.length ? <ol className="space-y-3">
          {[...supplier.status_history].reverse().map((event) => <li key={event.id} className="flex flex-wrap items-center gap-3 border-b py-2">
            <StatusBadge status={event.to_status} />
            <span>{event.from_status ? `${event.from_status} → ${event.to_status}` : "Supplier created"}</span>
            <span className="text-muted-foreground">by {event.actor_name}</span>
            <time className="text-muted-foreground" dateTime={event.created_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</time>
          </li>)}
        </ol> : <p>No recorded status events yet.</p>}
      </section>
    </>
  );
}

function DetailItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "detail-item detail-item-wide" : "detail-item"}><dt>{label}</dt><dd>{value}</dd></div>;
}

function ConfirmAction({ title, description, actionLabel, actionVariant = "destructive", icon, onConfirm, trigger }: {
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: "default" | "destructive";
  icon?: React.ReactNode;
  onConfirm: () => Promise<void>;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setConfirmationError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (reason) {
      setConfirmationError(reason instanceof Error ? reason.message : "The action could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(value) => { if (!submitting) { setOpen(value); setConfirmationError(""); } }}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogCancel variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Close dialog"><X aria-hidden="true" /></AlertDialogCancel>
        <AlertDialogHeader>
          {icon && <AlertDialogMedia>{icon}</AlertDialogMedia>}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmationError && <p className="form-alert" role="alert">{confirmationError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant} disabled={submitting} onClick={() => { void confirm(); }}>{submitting ? "Working..." : actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
