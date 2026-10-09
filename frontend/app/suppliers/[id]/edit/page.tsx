"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SupplierForm } from "@/components/vendorflow/supplier-form";
import { getSupplier } from "@/lib/api";
import { useSession } from "@/components/layout/session-provider";
import type { Supplier } from "@/lib/vendorflow";

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  const { organization } = useSession();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (organization.role === "VIEWER") return;
    let active = true;
    getSupplier(organization.id, Number(params.id)).then((value) => { if (active) setSupplier(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load supplier."); });
    return () => { active = false; };
  }, [organization.id, organization.role, params.id]);

  return (
    <div className="page-wrap form-page">
        <Link href={`/suppliers/${params.id}`} className="back-link"><ArrowLeft /> Supplier details</Link>
        <header className="page-header mt-5">
          <div><h1>Edit supplier</h1><p className="page-description">Update supplier information and responsibility.</p></div>
        </header>
        {organization.role === "VIEWER" ? <p>You do not have permission to edit suppliers.</p> : supplier ? <SupplierForm supplier={supplier} /> : <p>{error || "Loading supplier…"}</p>}
    </div>
  );
}
