"use client";

import React, { useState, useEffect } from "react";
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
  Zap,
  LogOut,
  User as UserIcon,
  ChevronsUpDown,
  Target,
  CreditCard
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Detectar si estamos dentro de la configuración de un agente específico
  const isAgentSubRoute = pathname.includes("/dashboard/ajustes/agentes/") && 
                          pathname.split("/").length > 4;
  
  const { currentAgentName } = useWorkspaceStore();
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
            Agente: {currentAgentName || (agentId ? `${agentId.slice(0, 8)}...` : "Agente")}
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

  // Estructura normal del Sidebar
  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0 relative z-20">
      <div className="p-4 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center">
        <h2 className="text-[var(--text-primary-dark)] font-bold text-lg tracking-tight">Imalá Vox</h2>
      </div>
      
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
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
            label="Leads" 
            href="/dashboard/operacion/leads" 
            icon={Target} 
            active={pathname.startsWith("/dashboard/operacion/leads")} 
          />
          <NavItem 
            label="Tareas" 
            href="/dashboard/operacion/tareas" 
            icon={Clock} 
            active={pathname.startsWith("/dashboard/operacion/tareas")} 
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
          <NavItem 
            label="Facturación" 
            href="/dashboard/ajustes/facturacion" 
            icon={CreditCard} 
            active={pathname.startsWith("/dashboard/ajustes/facturacion")} 
          />
        </div>
      </nav>

      <SidebarFooter />
    </aside>
  );
}

function SidebarFooter() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const { workspace } = useWorkspaceStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!mounted) return null;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/auth");
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

  const userName = user?.displayName || (user?.email?.split('@')[0]) || "Usuario";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="p-2 border-t border-[var(--border-dark)] bg-[var(--bg-sidebar-deep)]">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex items-center gap-3 w-full p-2 hover:bg-[var(--bg-sidebar-hover)] rounded-xl transition-all group outline-none cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0 border border-black/5">
              <span className="text-black font-black text-sm leading-none">{initial}</span>
            </div>
            <div className="text-xs truncate flex-1 text-left">
              <p className="text-[var(--text-primary-dark)] font-semibold truncate leading-tight">
                {userName}
              </p>
              <p className="text-[var(--text-tertiary-dark)] font-bold uppercase tracking-tighter text-[9px] mt-0.5 opacity-80">
                Plan {workspace?.plan || 'Free'}
              </p>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-[var(--text-tertiary-dark)] group-hover:text-[var(--text-secondary-dark)] transition-colors mr-1" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--text-primary-dark)] rounded-2xl shadow-2xl p-2 z-50">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-widest opacity-70">
              Mi Cuenta
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--border-dark)] mx-1 my-1" />
            <DropdownMenuItem 
              render={<Link href="/dashboard/perfil" />}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-sidebar-hover)] focus:bg-[var(--bg-sidebar-hover)] cursor-pointer outline-none transition-all"
            >
                <UserIcon className="w-4 h-4 text-[var(--text-secondary-dark)]" />
                <span className="text-sm font-medium">Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              render={<Link href="/dashboard/ajustes" />}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-sidebar-hover)] focus:bg-[var(--bg-sidebar-hover)] cursor-pointer outline-none transition-all"
            >
                <Settings2 className="w-4 h-4 text-[var(--text-secondary-dark)]" />
                <span className="text-sm font-medium">Ajustes</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-[var(--border-dark)] mx-1 my-1" />
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 cursor-pointer outline-none transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold">Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

