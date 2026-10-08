"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, signIn } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    const next = new URLSearchParams(window.location.search).get("next");
    try {
      const email = data.get("email");
      const password = data.get("password");
      await signIn(typeof email === "string" ? email : "", typeof password === "string" ? password : "");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 401
          ? "Email or password is incorrect."
          : error instanceof Error
            ? error.message
            : "We couldn't sign you in. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <span className="brand-mark"><Building2 aria-hidden="true" /></span>
          <span>VendorFlow</span>
        </div>
        <Card className="login-card">
          <CardHeader className="gap-2">
            <h1>Welcome back</h1>
            <p>Sign in to manage your supplier network.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="form-alert" role="alert">{error}</div>}
              <div className="form-field">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="form-field">
                <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><span className="text-xs text-slate-500">At least 8 characters</span></div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
            </form>
          </CardContent>
        </Card>
        <p className="login-footnote">Secure access for authorized organization members.</p>
      </div>
    </main>
  );
}
