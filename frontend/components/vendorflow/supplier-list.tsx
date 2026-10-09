"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { useEffect, useState } from "react";
import { ArrowUpDown, MoreHorizontal, Plus, Search } from "lucide-react";

import { StatusBadge } from "@/components/vendorflow/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/components/layout/session-provider";
import { getMembers, getSuppliers } from "@/lib/api";
import type { Member, SupplierPage } from "@/lib/vendorflow";

const PAGE_SIZE = 10;

const statusLabels: Record<string, string> = {
  ALL: "All statuses",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

const orderingLabels: Record<string, string> = {
  updated_desc: "Last updated",
  created_desc: "Newest",
  created_asc: "Oldest",
  name_asc: "Name A–Z",
};

export function SupplierList() {
  const { organization } = useSession();
  const role = organization.role;
  const [members, setMembers] = useState<Member[]>([]);
  const [result, setResult] = useState<SupplierPage | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [responsible, setResponsible] = useState("ALL");
  const [ordering, setOrdering] = useState("updated_desc");
  const [page, setPage] = useState(1);
  const canWrite = role === "ADMIN" || role === "MANAGER";

  useEffect(() => {
    getMembers(organization.id).then(setMembers).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load members."));
  }, [organization.id]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setResult(null);
      setError("");
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ordering: ({ updated_desc: "-updated_at", created_desc: "-created_at", created_asc: "created_at", name_asc: "legal_name" } as Record<string, string>)[ordering] });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);
      if (responsible !== "ALL") params.set("responsible", responsible);
      getSuppliers(organization.id, params).then((data) => { if (active) { setResult(data); setError(""); } })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load suppliers."); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organization.id, page, search, status, responsible, ordering]);
  const visible = result?.results ?? [];
  const count = result?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, count);

  const changeFilter = (setter: (value: string) => void, value: string | null) => {
    setter(value ?? "ALL");
    setPage(1);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Vendor network</p>
          <h1>Suppliers</h1>
          <p className="page-description">Manage supplier records, responsibilities and approval status.</p>
        </div>
        {canWrite && (
          <Button nativeButton={false} size="lg" render={<Link href="/suppliers/new" />}>
            <Plus data-icon="inline-start" /> Add supplier
          </Button>
        )}
      </header>

      <section className="surface-table mt-0" aria-label="Supplier directory">
        <div className="supplier-toolbar">
          <div className="search-field">
            <Search aria-hidden="true" />
            <Input
              className="pl-10!"
              aria-label="Search suppliers"
              placeholder="Search suppliers..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(value) => changeFilter(setStatus, value)}>
            <SelectTrigger className="toolbar-select">
              <SelectValue>{statusLabels[status] ?? "All statuses"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responsible} onValueChange={(value) => changeFilter(setResponsible, value)}>
            <SelectTrigger className="toolbar-select">
              <SelectValue>
                {responsible === "ALL"
                  ? "All responsibles"
                  : members.find((member) => String(member.id) === responsible)?.username ?? "All responsibles"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All responsibles</SelectItem>
              {members.filter((member) => member.role !== "VIEWER").map((member) => (
                <SelectItem key={member.id} value={String(member.id)}>{member.username || member.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ordering} onValueChange={(value) => setOrdering(value ?? "updated_desc")}>
            <SelectTrigger className="toolbar-select">
              <ArrowUpDown />
              <SelectValue>{orderingLabels[ordering] ?? "Last updated"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Last updated</SelectItem>
              <SelectItem value="created_desc">Newest</SelectItem>
              <SelectItem value="created_asc">Oldest</SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <div className="form-alert" role="alert">{error}</div>}
        {!result && !error && <output className="p-6">Loading suppliers…</output>}
        {visible.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Tax ID</TableHead>
                <TableHead className="hidden lg:table-cell">Responsible</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Updated</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link className="supplier-link" href={`/suppliers/${supplier.id}`}>{supplier.trade_name || supplier.legal_name}</Link>
                    <span className="cell-secondary max-w-[260px] truncate">{supplier.legal_name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[0.82rem]">{supplier.tax_id}</TableCell>
                  <TableCell className="hidden lg:table-cell">{supplier.responsible_name}</TableCell>
                  <TableCell><StatusBadge status={supplier.status} /></TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(supplier.updated_at))}
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${supplier.trade_name || supplier.legal_name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem render={<Link href={`/suppliers/${supplier.id}`} />}>View details</DropdownMenuItem>
                        {canWrite && <DropdownMenuItem render={<Link href={`/suppliers/${supplier.id}/edit`} />}>Edit supplier</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : result && (
          <div className="empty-state">
            <h2>{search || status !== "ALL" || responsible !== "ALL" ? "No matching suppliers" : "No suppliers yet"}</h2>
            <p>{search || status !== "ALL" || responsible !== "ALL" ? "Try changing your search or filters." : "Add your first supplier to start managing your vendor network."}</p>
            {canWrite && !search && status === "ALL" && responsible === "ALL" && <Button nativeButton={false} render={<Link href="/suppliers/new" />}><Plus /> Add supplier</Button>}
          </div>
        )}

        <div className="pagination-bar">
          <p>Showing {start}–{end} of {count}</p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" aria-disabled={page === 1} onClick={(event) => { event.preventDefault(); setPage(Math.max(1, page - 1)); }} /></PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <PaginationItem key={number}><PaginationLink href="#" isActive={number === page} onClick={(event) => { event.preventDefault(); setPage(number); }}>{number}</PaginationLink></PaginationItem>
              ))}
              <PaginationItem><PaginationNext href="#" aria-disabled={page === pageCount} onClick={(event) => { event.preventDefault(); setPage(Math.min(pageCount, page + 1)); }} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>
    </>
  );
}
