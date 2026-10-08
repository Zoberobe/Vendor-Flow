export type Role = "ADMIN" | "MANAGER" | "VIEWER";
export type SupplierStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type Organization = { id: number; name: string; slug: string; role: Role };
export type User = { id: number; email: string; username: string };
export type Member = { id: number; user_id: number; username: string; email: string; role: Role };
export type StatusEvent = { id: number; from_status: SupplierStatus | ""; to_status: SupplierStatus; actor_name: string; created_at: string };
export type Supplier = {
  id: number; legal_name: string; trade_name: string; tax_id: string; email: string; phone: string;
  website: string; responsible: number | null; responsible_name: string; status: SupplierStatus;
  status_history: StatusEvent[]; notes: string; created_at: string; updated_at: string;
};
export type SupplierInput = Pick<Supplier, "legal_name" | "trade_name" | "tax_id" | "email" | "phone" | "website" | "responsible" | "notes">;
export type SupplierPage = { count: number; next: string | null; previous: string | null; results: Supplier[] };
export type SupplierSummary = { total: number; pending: number; approved: number; suspended: number; attention: Supplier[] };
