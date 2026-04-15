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
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removerSesionAdmin } from "@/app/actions/superadmin";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { label: "Resumen", href: "/superadmin", icon: LayoutDashboard },
    { label: "Espacios de Trabajo", href: "/superadmin/espacios", icon: Building2 },
    { label: "Facturación Global", href: "/superadmin/facturacion", icon: CreditCard },
    { label: "Monitor de Uso", href: "/superadmin/uso", icon: BarChart3 },
    { label: "Registro de Eventos", href: "/superadmin/eventos", icon: Activity },
  ];

  const handleLogout = async () => {
    await removerSesionAdmin();
    router.push("/auth");
  };

  return (
    <div className="flex h-screen bg-[var(--bg-sidebar)] text-[var(--text-primary-dark)] overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className={cn(
        "bg-[var(--bg-sidebar)] border-r border-white/5 flex flex-col transition-all duration-300 z-50 shadow-2xl shrink-0",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", !isSidebarOpen && "opacity-0 invisible w-0")}>
            <div className="size-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <ShieldCheck className="size-5 text-black" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.2em]">SuperAdmin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg">
            {isSidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-[var(--accent)] text-black font-bold shadow-xl shadow-[var(--accent)]/20" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("size-5", isActive ? "text-black" : "text-white/40 group-hover:text-white")} />
                {isSidebarOpen && <span className="text-sm tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 px-4 py-6 text-white/40 hover:text-rose-400 hover:bg-rose-500/5 transition-all rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="size-5" />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Salir del Panel</span>}
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto scroll-smooth bg-[var(--bg-sidebar-deep)]">
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 bg-[var(--bg-sidebar-deep)]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold opacity-60">Plataforma</h2>
            <div className="size-1 rounded-full bg-white/20"></div>
            <h2 className="text-sm font-bold text-[var(--accent)]">Consola de Control</h2>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-white/10 text-white border-transparent py-1 px-3 text-[10px] font-black tracking-widest uppercase">Admin Mode</Badge>
          </div>
        </header>
        <div className="p-8 pb-32">
          {children}
        </div>
      </main>
    </div>
  );
}
