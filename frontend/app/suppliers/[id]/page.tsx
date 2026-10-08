"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SupplierDetail } from "@/components/vendorflow/supplier-detail";

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="page-wrap">
        <Link href="/suppliers" className="back-link"><ArrowLeft /> Suppliers</Link>
        <SupplierDetail supplierId={Number(params.id)} />
    </div>
  );
}
