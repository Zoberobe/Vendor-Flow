"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, loadSession } from "@/lib/api";
import type { Organization, User } from "@/lib/vendorflow";

type Session = { user: User; organization: Organization; organizations: Organization[] };
const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Protected page rendered without a session.");
  return session;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(pathname !== "/login");
  const [error, setError] = useState("");

  useEffect(() => {
    if (pathname === "/login") return;
    let active = true;
    loadSession().then((value) => {
      if (active) { setSession(value); setLoading(false); setError(""); }
    }).catch((reason: unknown) => {
      if (!active) return;
      setSession(null);
      setLoading(false);
      if (reason instanceof Error && reason.message.includes("no organization")) setError(reason.message);
      else router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => { active = false; };
  }, [pathname, router]);

  useEffect(() => {
    const ended = () => { setSession(null); router.replace("/login"); };
    window.addEventListener("vendorflow:session-ended", ended);
    return () => window.removeEventListener("vendorflow:session-ended", ended);
  }, [router]);

  if (pathname === "/login") return children;
  if (loading || (!session && !error)) return <output className="page-wrap">Checking your session…</output>;
  if (error) return <main className="page-wrap"><h1>Access unavailable</h1><p>{error}</p><button onClick={() => { clearSession(); router.replace("/login"); }}>Sign out</button></main>;
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
