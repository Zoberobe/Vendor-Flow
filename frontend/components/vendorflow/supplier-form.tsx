"use client";

import { AppLink as Link } from "@/components/layout/app-link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getMembers, saveSupplier } from "@/lib/api";
import { useSession } from "@/components/layout/session-provider";
import type { Member, Supplier, SupplierInput } from "@/lib/vendorflow";

type SupplierFormProps = { supplier?: Supplier };

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();
  const { organization } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [responsible, setResponsible] = useState(String(supplier?.responsible ?? ""));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(supplier);
  const selectedResponsible = members.find((member) => String(member.id) === responsible);

  useEffect(() => {
    getMembers(organization.id).then(setMembers).catch((reason: unknown) => setErrors({ form: reason instanceof Error ? reason.message : "Could not load members." }));
  }, [organization.id]);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: SupplierInput = {
      legal_name: getFormValue(data, "legal_name"),
      trade_name: getFormValue(data, "trade_name"),
      tax_id: getFormValue(data, "tax_id"),
      email: getFormValue(data, "email"),
      phone: getFormValue(data, "phone"),
      website: getFormValue(data, "website"),
      responsible: responsible && responsible !== "NONE" ? Number(responsible) : null,
      notes: getFormValue(data, "notes"),
    };
    const nextErrors: Record<string, string> = {};
    if (!input.legal_name) nextErrors.legal_name = "Legal name is required.";
    if (!input.tax_id) nextErrors.tax_id = "Tax ID is required.";
    if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) nextErrors.email = "Enter a valid email address.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const result = await saveSupplier(organization.id, input, supplier?.id);
      router.push(`/suppliers/${result.id}`);
    } catch (error) {
      setErrors(error instanceof ApiError ? { form: error.message, ...error.fields } : { form: error instanceof Error ? error.message : "Could not save supplier." });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="supplier-form">
      {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}

      <section className="form-section" aria-labelledby="basic-heading">
        <div className="form-section-heading">
          <h2 id="basic-heading">Basic information</h2>
          <p>Legal and identifying details for this supplier.</p>
        </div>
        <div className="form-grid">
          <FormField id="legal_name" label="Legal name" required error={errors.legal_name} className="sm:col-span-2">
            <Input id="legal_name" name="legal_name" defaultValue={supplier?.legal_name} aria-invalid={Boolean(errors.legal_name)} aria-describedby={errors.legal_name ? "legal_name-error" : undefined} />
          </FormField>
          <FormField id="trade_name" label="Trade name">
            <Input id="trade_name" name="trade_name" defaultValue={supplier?.trade_name} />
          </FormField>
          <FormField id="tax_id" label="Tax ID" required error={errors.tax_id}>
            <Input id="tax_id" name="tax_id" defaultValue={supplier?.tax_id} aria-invalid={Boolean(errors.tax_id)} aria-describedby={errors.tax_id ? "tax_id-error" : undefined} />
          </FormField>
        </div>
      </section>

      <section className="form-section" aria-labelledby="contact-heading">
        <div className="form-section-heading">
          <h2 id="contact-heading">Contact</h2>
          <p>Primary business contact information.</p>
        </div>
        <div className="form-grid">
          <FormField id="email" label="Email" error={errors.email}>
            <Input id="email" name="email" type="email" defaultValue={supplier?.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          </FormField>
          <FormField id="phone" label="Phone">
            <Input id="phone" name="phone" type="tel" defaultValue={supplier?.phone} />
          </FormField>
          <FormField id="website" label="Website" className="sm:col-span-2">
            <Input id="website" name="website" type="url" defaultValue={supplier?.website} />
          </FormField>
        </div>
      </section>

      <section className="form-section" aria-labelledby="management-heading">
        <div className="form-section-heading">
          <h2 id="management-heading">Management</h2>
          <p>Assign ownership and add internal context.</p>
        </div>
        <div className="form-grid">
          <div className="form-field sm:col-span-2">
            <Label htmlFor="responsible">Responsible</Label>
            <Select value={responsible} onValueChange={(value) => setResponsible(value ?? "")}>
              <SelectTrigger id="responsible" className="form-control">
                <SelectValue>
                  {selectedResponsible
                    ? `${selectedResponsible.username || selectedResponsible.email} — ${selectedResponsible.role === "ADMIN" ? "Admin" : "Manager"}`
                    : "Select a responsible"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Unassigned</SelectItem>
                {members.filter((member) => member.role !== "VIEWER").map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>{member.username || member.email} — {member.role === "ADMIN" ? "Admin" : "Manager"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormField id="notes" label="Notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={5} defaultValue={supplier?.notes} />
          </FormField>
        </div>
      </section>

      <div className="form-actions">
        <Button nativeButton={false} variant="outline" size="lg" render={<Link href={supplier ? `/suppliers/${supplier.id}` : "/suppliers"} />}>Cancel</Button>
        <Button type="submit" size="lg" disabled={submitting}>{submitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save changes" : "Create supplier")}</Button>
      </div>
    </form>
  );
}

function getFormValue(data: FormData, field: string) {
  const value = data.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function FormField({ id, label, required = false, error, className = "", children }: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`form-field ${className}`}>
      <Label htmlFor={id}>{label}{required && <span className="text-red-600" aria-hidden="true">*</span>}</Label>
      {children}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}
