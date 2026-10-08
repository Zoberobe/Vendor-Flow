"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/layout/session-provider";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return <SessionProvider>{pathname === "/login" ? children : <AppShell>{children}</AppShell>}</SessionProvider>;
}
