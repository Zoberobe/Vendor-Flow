"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, LayoutDashboard, LogOut, PackageSearch } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSession } from "@/components/layout/session-provider";
import { clearSession } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, organization } = useSession();
  const name = user.username || user.email;

  return (
    <SidebarProvider style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
        <SidebarHeader className="px-4 pb-3 pt-5">
          <Link href="/" className="brand-lockup" aria-label="VendorFlow dashboard">
            <span className="brand-mark"><Building2 aria-hidden="true" /></span>
            <span>VendorFlow</span>
          </Link>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup className="px-3 py-4">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname === "/"} size="lg" render={<Link href="/" />}>
                    <LayoutDashboard aria-hidden="true" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname.startsWith("/suppliers")} size="lg" render={<Link href="/suppliers" />}>
                    <PackageSearch aria-hidden="true" />
                    <span>Suppliers</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <SidebarSeparator className="mx-0 mb-2" />
          <div className="org-switcher">
            <span className="org-avatar">VF</span>
            <span className="min-w-0 flex-1 text-left">
              <strong>{organization.name}</strong>
              <small>Current organization</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </div>
          <div className="user-panel">
            <span className="user-avatar">{name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <strong>{name}</strong>
              <small>{organization.role}</small>
            </span>
            <button className="logout-link" type="button" onClick={() => clearSession()} aria-label="Sign out"><LogOut aria-hidden="true" /></button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="mobile-bar"><SidebarTrigger /><span>VendorFlow</span></div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
