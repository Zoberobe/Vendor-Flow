import type { Member, Organization, Supplier, SupplierInput, SupplierPage, SupplierSummary, User } from "@/lib/vendorflow";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://vendorflow-api-rlbq.onrender.com/api").replace(/\/$/, "");
const ACCESS = "vendorflow.access";
const REFRESH = "vendorflow.refresh";
let refreshPromise: Promise<string> | null = null;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly fields?: Record<string, string>) {
    super(message); this.name = "ApiError";
  }
}
export function clearSession(notify = true) {
  if (typeof window === "undefined") return;
  for (const key of [ACCESS, REFRESH, "vendorflow.organization", "vendorflow.role", "vendorflow.user", "vendorflow.suppliers"])
    window.localStorage.removeItem(key);
  if (notify) window.dispatchEvent(new Event("vendorflow:session-ended"));
}
export function getOrganization(): Organization | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem("vendorflow.organization") ?? "null") as Organization | null; }
  catch { return null; }
}
export function requireOrganization(): Organization {
  const organization = getOrganization();
  if (!organization) throw new ApiError("No organization is available for this account.", 403);
  return organization;
}
async function refreshAccess(): Promise<string> {
  if (!refreshPromise) refreshPromise = (async () => {
    const refresh = window.localStorage.getItem(REFRESH);
    if (!refresh) throw new ApiError("Your session has expired. Please sign in again.", 401);
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
    });
    if (!response.ok) throw new ApiError("Your session has expired. Please sign in again.", 401);
    const tokens = await response.json() as { access: string; refresh?: string };
    window.localStorage.setItem(ACCESS, tokens.access);
    if (tokens.refresh) window.localStorage.setItem(REFRESH, tokens.refresh);
    return tokens.access;
  })().catch((error) => { clearSession(); throw error; }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = typeof window === "undefined" ? null : window.localStorage.getItem(ACCESS);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" }); }
  catch { throw new ApiError("Could not reach the API. Please try again."); }
  if (response.status === 401 && retry && !path.startsWith("/auth/token/")) {
    await refreshAccess(); return apiRequest<T>(path, options, false);
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const fields: Record<string, string> = {};
    if (body && typeof body === "object") for (const [key, value] of Object.entries(body))
      fields[key] = Array.isArray(value) ? value.join(" ") : String(value);
    if (response.status === 401 && !path.startsWith("/auth/token/")) clearSession();
    throw new ApiError(fields.detail ?? Object.values(fields)[0] ?? "The request could not be completed.", response.status, fields);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export async function loadSession() {
  if (!window.localStorage.getItem(ACCESS) && !window.localStorage.getItem(REFRESH)) throw new ApiError("Sign in required.", 401);
  const user = await apiRequest<User>("/me/");
  const organizations = await apiRequest<Organization[]>("/organizations/");
  const selected = getOrganization();
  const organization = organizations.find((item) => item.id === selected?.id) ?? organizations[0];
  if (!organization) throw new ApiError("Your account has no organization membership.", 403);
  window.localStorage.setItem("vendorflow.organization", JSON.stringify(organization));
  window.localStorage.setItem("vendorflow.user", JSON.stringify(user));
  return { user, organization, organizations };
}
export async function signIn(email: string, password: string) {
  clearSession(false);
  const tokens = await apiRequest<{ access: string; refresh: string }>("/auth/token/", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  window.localStorage.setItem(ACCESS, tokens.access);
  window.localStorage.setItem(REFRESH, tokens.refresh);
  try { return await loadSession(); }
  catch (error) { clearSession(false); throw error; }
}
export const supplierPath = (organizationId: number) => `/organizations/${organizationId}/suppliers/`;
export const supplierDetailPath = (organizationId: number, supplierId: number) => `${supplierPath(organizationId)}${supplierId}/`;
export const getMembers = (organizationId: number) => apiRequest<Member[]>(`/organizations/${organizationId}/members/`);
export const getSupplier = (organizationId: number, supplierId: number) => apiRequest<Supplier>(supplierDetailPath(organizationId, supplierId));
export const getSupplierSummary = (organizationId: number) => apiRequest<SupplierSummary>(`${supplierPath(organizationId)}summary/`);
export const getSuppliers = (organizationId: number, params: URLSearchParams) => apiRequest<SupplierPage>(`${supplierPath(organizationId)}?${params}`);
export const saveSupplier = (organizationId: number, input: SupplierInput, supplierId?: number) => apiRequest<Supplier>(supplierId ? supplierDetailPath(organizationId, supplierId) : supplierPath(organizationId), { method: supplierId ? "PATCH" : "POST", body: JSON.stringify(input) });
