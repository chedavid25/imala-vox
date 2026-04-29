"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Activity,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { removerSesionAdmin } from "@/app/actions/superadmin";

const menuItems = [
  { label: "Resumen",    href: "/superadmin",             icon: LayoutDashboard },
  { label: "Clientes",   href: "/superadmin/espacios",    icon: Building2 },
  { label: "Facturación",href: "/superadmin/facturacion", icon: CreditCard },
  { label: "Uso",        href: "/superadmin/uso",         icon: BarChart3 },
  { label: "Eventos",    href: "/superadmin/eventos",     icon: Activity },
];

export function SuperAdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await removerSesionAdmin();
    router.push("/auth");
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-sidebar-deep)] text-[var(--text-primary-dark)] overflow-hidden font-sans">

      {/* Top bar */}
      <header className="bg-[var(--bg-sidebar)] border-b border-white/5 px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <ShieldCheck className="size-4 text-black" />
          </div>
          <span className="font-black text-xs uppercase tracking-[0.2em] text-white">SuperAdmin</span>
          <Badge className="ml-2 bg-white/10 text-white/60 border-transparent py-0.5 px-2.5 text-[9px] font-black tracking-widest uppercase">
            Admin Mode
          </Badge>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/5"
        >
          <LogOut className="size-3.5" />
          Salir
        </button>
      </header>

      {/* Tab bar */}
      <nav className="bg-[var(--bg-sidebar)] border-b border-white/5 px-4 flex items-end gap-1 shrink-0">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-white/40 hover:text-white hover:border-white/20"
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="p-8 pb-32 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
