"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Users, 
  Megaphone, 
  LayoutGrid, 
  BrainCircuit,
  CircleUser
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center">
        <h2 className="text-[var(--text-primary-dark)] font-bold text-lg tracking-tight">Imalá Vox</h2>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
          Operación
        </div>
        
        <NavItem 
          label="Bandeja de entrada" 
          href="/operacion/inbox" 
          icon={Inbox} 
          active={pathname === "/operacion/inbox"} 
        />
        <NavItem 
          label="Contactos" 
          href="/operacion/contactos" 
          icon={Users} 
          active={pathname === "/operacion/contactos"} 
        />
        <NavItem 
          label="Difusión" 
          href="/operacion/difusion" 
          icon={Megaphone} 
          active={pathname === "/operacion/difusion"} 
        />
        
        <div className="pt-6 px-3 py-2 text-[11px] font-semibold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
          Cerebro
        </div>
        
        <NavItem 
          label="Catálogo" 
          href="/cerebro/catalogo" 
          icon={LayoutGrid} 
          active={pathname === "/cerebro/catalogo"} 
        />
        <NavItem 
          label="Base de conocimiento" 
          href="/cerebro/conocimiento" 
          icon={BrainCircuit} 
          active={pathname === "/cerebro/conocimiento"} 
        />
      </nav>

      <div className="p-4 border-t border-[var(--border-dark)] bg-[var(--bg-sidebar-deep)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-sidebar-hover)] flex items-center justify-center border border-[var(--border-dark)]">
            <CircleUser className="w-5 h-5 text-[var(--text-secondary-dark)]" />
          </div>
          <div className="text-xs truncate">
            <p className="text-[var(--text-primary-dark)] font-semibold truncate">David Pc</p>
            <p className="text-[var(--text-tertiary-dark)] font-medium">Plan Agencia</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface NavItemProps {
  label: string;
  href: string;
  icon: any;
  active?: boolean;
}

function NavItem({ label, href, icon: Icon, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
        active 
          ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/10" 
          : "text-[var(--text-secondary-dark)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary-dark)]"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-[var(--accent-text)]" : "text-current")} />
      <span>{label}</span>
    </Link>
  );
}
