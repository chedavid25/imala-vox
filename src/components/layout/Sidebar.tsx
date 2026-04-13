"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Users, 
  Megaphone, 
  LayoutGrid, 
  Brain,
  BookOpen,
  Globe,
  Bot,
  Link2,
  GitBranch,
  Tag,
  Settings2,
  ChevronLeft,
  CircleUser,
  Clock,
  MessageSquare,
  ShieldCheck,
  Zap
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Detectar si estamos dentro de la configuración de un agente específico
  // Ruta: /dashboard/ajustes/agentes/[id]/...
  const isAgentSubRoute = pathname.includes("/dashboard/ajustes/agentes/") && 
                          pathname.split("/").length > 4;
  
  const agentId = isAgentSubRoute ? pathname.split("/")[4] : null;

  if (isAgentSubRoute) {
    return (
      <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0 animate-in slide-in-from-left duration-300">
        <div className="p-4 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center gap-2">
          <button 
            onClick={() => router.push("/dashboard/ajustes/agentes")}
            className="p-1 hover:bg-[var(--bg-sidebar-hover)] rounded-md transition-colors text-[var(--text-tertiary-dark)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[var(--text-primary-dark)] font-bold text-sm tracking-tight truncate">
            Agente: {agentId?.slice(0, 8)}...
          </h2>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* IDENTIDAD */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80">
              Identidad
            </div>
            <NavItem 
              label="Instrucciones" 
              href={`/dashboard/ajustes/agentes/${agentId}/instrucciones`}
              icon={MessageSquare}
              active={pathname.includes("/instrucciones")}
            />
            <NavItem 
              label="Rol y público" 
              href={`/dashboard/ajustes/agentes/${agentId}/rol`}
              icon={CircleUser}
              active={pathname.includes("/rol")}
            />
            <NavItem 
              label="Horario" 
              href={`/dashboard/ajustes/agentes/${agentId}/horario`}
              icon={Clock}
              active={pathname.includes("/horario")}
            />
          </div>

          {/* CONOCIMIENTO */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80">
              Conocimiento
            </div>
            <NavItem 
              label="Archivos" 
              href={`/dashboard/ajustes/agentes/${agentId}/archivos`}
              icon={BookOpen}
              active={pathname.includes("/archivos")}
            />
            <NavItem 
              label="Recursos" 
              href={`/dashboard/ajustes/agentes/${agentId}/recursos`}
              icon={Zap}
              active={pathname.includes("/recursos")}
            />
            <NavItem 
              label="Textos" 
              href={`/dashboard/ajustes/agentes/${agentId}/textos`}
              icon={MessageSquare}
              active={pathname.includes("/textos")}
            />
            <NavItem 
              label="Sitios web" 
              href={`/dashboard/ajustes/agentes/${agentId}/webs`}
              icon={Globe}
              active={pathname.includes("/webs")}
            />
          </div>

          {/* COMPORTAMIENTO */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80">
              Comportamiento
            </div>
            <NavItem 
              label="Etiquetas" 
              href={`/dashboard/ajustes/agentes/${agentId}/etiquetas`}
              icon={Tag}
              active={pathname.includes("/etiquetas")}
            />
            <NavItem 
              label="Modo y escalada" 
              href={`/dashboard/ajustes/agentes/${agentId}/modo`}
              icon={ShieldCheck}
              active={pathname.includes("/modo")}
            />
          </div>

          {/* PRUEBAS */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80">
              Validación
            </div>
            <NavItem 
              label="Chat de Prueba" 
              href={`/dashboard/ajustes/agentes/${agentId}/playground`}
              icon={Zap}
              active={pathname.includes("/playground")}
            />
          </div>
        </nav>

        <SidebarFooter />
      </aside>
    );
  }

  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center">
        <h2 className="text-[var(--text-primary-dark)] font-bold text-lg tracking-tight">Imalá Vox</h2>
      </div>
      
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* OPERACIÓN */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
            Operación
          </div>
          <NavItem 
            label="Bandeja de entrada" 
            href="/dashboard/operacion/inbox" 
            icon={Inbox} 
            active={pathname.startsWith("/dashboard/operacion/inbox")} 
          />
          <NavItem 
            label="Contactos" 
            href="/dashboard/operacion/contactos" 
            icon={Users} 
            active={pathname.startsWith("/dashboard/operacion/contactos")} 
          />
          <NavItem 
            label="Difusión" 
            href="/dashboard/operacion/difusion" 
            icon={Megaphone} 
            active={pathname.startsWith("/dashboard/operacion/difusion")} 
          />
        </div>
        
        {/* CEREBRO */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
            <div className="text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
              Cerebro
            </div>
          </div>
          <NavItem 
            label="Catálogo" 
            href="/dashboard/cerebro/catalogo" 
            icon={LayoutGrid} 
            active={pathname.startsWith("/dashboard/cerebro/catalogo")} 
          />
          <NavItem 
            label="Base de conocimiento" 
            href="/dashboard/cerebro/conocimiento" 
            icon={BookOpen} 
            active={pathname.startsWith("/dashboard/cerebro/conocimiento")} 
          />
          <NavItem 
            label="Scraper" 
            href="/dashboard/cerebro/scraper" 
            icon={Globe} 
            active={pathname.startsWith("/dashboard/cerebro/scraper")} 
          />
        </div>

        {/* AJUSTES */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Settings2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <div className="text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
              Ajustes
            </div>
          </div>
          <NavItem 
            label="Agentes IA" 
            href="/dashboard/ajustes/agentes" 
            icon={Bot} 
            active={pathname.startsWith("/dashboard/ajustes/agentes") && !isAgentSubRoute} 
          />
          <NavItem 
            label="Canales" 
            href="/dashboard/ajustes/canales" 
            icon={Link2} 
            active={pathname.startsWith("/dashboard/ajustes/canales")} 
          />
          <NavItem 
            label="Workflows" 
            href="/dashboard/ajustes/workflows" 
            icon={GitBranch} 
            active={pathname.startsWith("/dashboard/ajustes/workflows")} 
          />
          <NavItem 
            label="Etiquetas CRM" 
            href="/dashboard/ajustes/etiquetas" 
            icon={Tag} 
            active={pathname.startsWith("/dashboard/ajustes/etiquetas")} 
          />
        </div>
      </nav>

      <SidebarFooter />
    </aside>
  );
}

function SidebarFooter() {
  return (
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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 group border-l-3",
        active 
          ? "bg-[var(--bg-sidebar-hover)] text-[var(--accent)] border-l-[var(--accent)] font-medium shadow-lg shadow-black/10" 
          : "text-[var(--text-secondary-dark)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary-dark)] border-l-transparent font-normal"
      )}
    >
      <Icon className={cn("w-4 h-4 transition-colors", active ? "text-[var(--accent)]" : "text-current group-hover:text-[var(--text-primary-dark)]")} />
      <span>{label}</span>
    </Link>
  );
}
