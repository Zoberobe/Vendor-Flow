"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";
import { getSupplierSummary } from "@/lib/api";
import type { SupplierSummary } from "@/lib/vendorflow";
import { StatusBadge } from "@/components/vendorflow/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DashboardPage() {
  const { user, organization } = useSession();
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getSupplierSummary(organization.id).then((data) => { if (active) setSummary(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load dashboard."); });
    return () => { active = false; };
  }, [organization.id]);
  const metrics = [
    { label: "Total suppliers", value: summary?.total ?? 0, accent: "primary" },
    { label: "Pending", value: summary?.pending ?? 0, accent: "warning" },
    { label: "Approved", value: summary?.approved ?? 0, accent: "success" },
    { label: "Suspended", value: summary?.suspended ?? 0, accent: "neutral" },
  ];
  return <div className="page-wrap">
    <header className="page-header"><div>
      <p className="eyebrow">{new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}</p>
      <h1>Dashboard</h1><p className="page-description">Welcome, {user.username || user.email}. Here is what needs attention in {organization.name}.</p>
    </div></header>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {!summary && !error && <output>Loading dashboard…</output>}
    {summary && <><section aria-label="Supplier summary" className="metric-grid">
      {metrics.map((metric) => <Card key={metric.label} className="metric-card"><CardContent className="flex items-end justify-between gap-4">
        <div><p className="metric-label">{metric.label}</p><p className="metric-value">{metric.value}</p></div>
        <span className={`metric-mark metric-mark-${metric.accent}`} aria-hidden="true" />
      </CardContent></Card>)}
    </section>
    <section className="surface-table" aria-labelledby="attention-heading">
      <div className="section-heading"><div><div className="section-title-row"><Clock3 aria-hidden="true" /><h2 id="attention-heading">Suppliers requiring attention</h2></div><p>Pending reviews and suspended relationships.</p></div>
        <Button nativeButton={false} variant="outline" size="lg" render={<Link href="/suppliers" />}>View all suppliers <ArrowRight data-icon="inline-end" /></Button></div>
      {summary.attention.length ? <Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Responsible</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader>
        <TableBody>{summary.attention.map((supplier) => <TableRow key={supplier.id}>
          <TableCell><Link className="supplier-link" href={`/suppliers/${supplier.id}`}>{supplier.trade_name || supplier.legal_name}</Link><span className="cell-secondary">{supplier.legal_name}</span></TableCell>
          <TableCell>{supplier.responsible_name}</TableCell><TableCell><StatusBadge status={supplier.status} /></TableCell>
          <TableCell className="text-right text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(supplier.updated_at))}</TableCell>
        </TableRow>)}</TableBody></Table> : <div className="empty-state"><p>No pending or suspended suppliers.</p></div>}
    </section></>}
  </div>;
}
