import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SupplierStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

const styles: Record<SupplierStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  SUSPENDED: "border-slate-200 bg-slate-100 text-slate-700",
};

export function StatusBadge({ status }: { status: SupplierStatus }) {
  return <Badge variant="outline" className={cn("h-6 px-2.5 text-[0.72rem] tracking-wide", styles[status])}>{status}</Badge>;
}
