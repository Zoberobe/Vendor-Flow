"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { ArrowLeft } from "lucide-react";

import { SupplierForm } from "@/components/vendorflow/supplier-form";
import { useSession } from "@/components/layout/session-provider";


export default function CreateSupplierPage() {
  const { organization } = useSession();
  return (
    <div className="page-wrap form-page">
        <Link href="/suppliers" className="back-link"><ArrowLeft /> Suppliers</Link>
        <header className="page-header mt-5">
          <div><h1>Create supplier</h1><p className="page-description">Add a supplier to the VendorFlow network.</p></div>
        </header>
        {organization.role === "VIEWER" ? <p>You do not have permission to create suppliers.</p> : <SupplierForm />}
    </div>
  );
}
