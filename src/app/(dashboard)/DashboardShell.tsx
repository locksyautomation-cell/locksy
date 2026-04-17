"use client";

import Sidebar from "@/components/layout/Sidebar";
import ClientSidebar from "@/components/layout/ClientSidebar";
import AdminSidebar from "./admin/AdminSidebar";
import { NAV_ITEMS } from "@/lib/constants";

interface DashboardShellProps {
  role: string;
  children: React.ReactNode;
}

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const navItems =
    role === "dealer" ? NAV_ITEMS.dealer : NAV_ITEMS.client;

  if (role === "admin") {
    return (
      <div className="min-h-screen bg-muted">
        <AdminSidebar />
        <div className="md:pl-64">
          <main className="px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {role === "client" ? (
        <ClientSidebar />
      ) : (
        <Sidebar items={navItems as unknown as { label: string; href: string; icon: string }[]} />
      )}
      <div className="md:pl-64">
        <main className="px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
