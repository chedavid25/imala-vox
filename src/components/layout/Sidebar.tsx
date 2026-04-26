"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
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
import { useUIStore } from "@/store/useUIStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [totalUnread, setTotalUnread] = useState(0);

  // Detectar si estamos dentro de la configuración de un agente específico
  const isAgentSubRoute = pathname.includes("/dashboard/ajustes/agentes/") && 
                          pathname.split("/").length > 4;
  
  const { currentAgentName, currentWorkspaceId } = useWorkspaceStore();
  const agentId = isAgentSubRoute ? pathname.split("/")[4] : null;

  useEffect(() => {
    if (!currentWorkspaceId) return;
    const q = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES);
    const unsub = onSnapshot(q, (snap) => {
      const total = snap.docs.reduce((sum, doc) => {
        const data = doc.data();
        if (data.estado === 'resuelto') return sum;
        return sum + (data.unreadCount || 0);
      }, 0);
      setTotalUnread(total);
    });
    return () => unsub();
  }, [currentWorkspaceId]);

  const widthClass = sidebarCollapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]";

  if (isAgentSubRoute) {
    return (
      <aside className={cn(
        "h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20",
        widthClass
      )}>
        <div className="p-4 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => router.push("/dashboard/ajustes/agentes")}
              className="p-1 hover:bg-[var(--bg-sidebar-hover)] rounded-md transition-colors text-[var(--text-tertiary-dark)] shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {!sidebarCollapsed && (
              <h2 className="text-[var(--text-primary-dark)] font-bold text-sm tracking-tight truncate animate-in fade-in duration-300">
                Agente: {currentAgentName || (agentId ? `${agentId.slice(0, 8)}...` : "Agente")}
              </h2>
            )}
          </div>
          
          <button 
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-[var(--bg-sidebar-hover)] rounded-lg transition-colors text-[var(--text-tertiary-dark)] shrink-0 active:scale-95"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80 animate-in fade-in duration-300">
                Identidad
              </div>
            )}
            <NavItem label="Instrucciones" href={`/dashboard/ajustes/agentes/${agentId}/instrucciones`} icon={MessageSquare} active={pathname.includes("/instrucciones")} collapsed={sidebarCollapsed} />
            <NavItem label="Rol y público" href={`/dashboard/ajustes/agentes/${agentId}/rol`} icon={CircleUser} active={pathname.includes("/rol")} collapsed={sidebarCollapsed} />
            <NavItem label="Horario" href={`/dashboard/ajustes/agentes/${agentId}/horario`} icon={Clock} active={pathname.includes("/horario")} collapsed={sidebarCollapsed} />
          </div>

          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80 animate-in fade-in duration-300">
                Conocimiento
              </div>
            )}
            <NavItem label="Archivos" href={`/dashboard/ajustes/agentes/${agentId}/archivos`} icon={BookOpen} active={pathname.includes("/archivos")} collapsed={sidebarCollapsed} />
            <NavItem label="Recursos" href={`/dashboard/ajustes/agentes/${agentId}/recursos`} icon={Zap} active={pathname.includes("/recursos")} collapsed={sidebarCollapsed} />
            <NavItem label="Textos" href={`/dashboard/ajustes/agentes/${agentId}/textos`} icon={MessageSquare} active={pathname.includes("/textos")} collapsed={sidebarCollapsed} />
            <NavItem label="Sitios web" href={`/dashboard/ajustes/agentes/${agentId}/webs`} icon={Globe} active={pathname.includes("/webs")} collapsed={sidebarCollapsed} />
          </div>

          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80 animate-in fade-in duration-300">
                Comportamiento
              </div>
            )}
            <NavItem label="Etiquetas" href={`/dashboard/ajustes/agentes/${agentId}/etiquetas`} icon={Tag} active={pathname.includes("/etiquetas")} collapsed={sidebarCollapsed} />
            <NavItem label="Modo y escalada" href={`/dashboard/ajustes/agentes/${agentId}/modo`} icon={ShieldCheck} active={pathname.includes("/modo")} collapsed={sidebarCollapsed} />
          </div>

          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-[0.06em] opacity-80 animate-in fade-in duration-300">
                Validación
              </div>
            )}
            <NavItem label="Chat de Prueba" href={`/dashboard/ajustes/agentes/${agentId}/playground`} icon={Zap} active={pathname.includes("/playground")} collapsed={sidebarCollapsed} />
          </div>
        </nav>

        <SidebarFooter collapsed={sidebarCollapsed} />
      </aside>
    );
  }

  return (
    <aside className={cn(
      "h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0 relative transition-all duration-300 ease-in-out z-20",
      widthClass
    )}>
      <div className="p-3 border-b border-[var(--border-dark)] h-[var(--header-height)] flex items-center justify-between overflow-hidden">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5 animate-in fade-in duration-300 min-w-0 flex-1">
            <Image
              src="/icons/icon-192.png"
              alt="Imalá Vox"
              width={30}
              height={30}
              className="rounded-xl shrink-0"
            />
            <h2 className="text-[var(--text-primary-dark)] font-bold text-base tracking-tight truncate">
              Imalá Vox
            </h2>
          </div>
        )}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex-1 flex items-center justify-center animate-in zoom-in duration-300 hover:opacity-80 transition-opacity"
            title="Expandir menú"
          >
            <Image
              src="/icons/icon-192.png"
              alt="Imalá Vox"
              width={40}
              height={40}
              className="rounded-xl"
            />
          </button>
        )}
        
        {!sidebarCollapsed && (
          <button 
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-[var(--bg-sidebar-hover)] rounded-lg transition-colors text-[var(--text-tertiary-dark)] shrink-0 active:scale-95"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider animate-in fade-in duration-300">
              Operación
            </div>
          )}
          <NavItem label="Bandeja de entrada" href="/dashboard/operacion/inbox" icon={Inbox} active={pathname.startsWith("/dashboard/operacion/inbox")} collapsed={sidebarCollapsed} badge={totalUnread} />
          <NavItem label="Leads" href="/dashboard/operacion/leads" icon={Target} active={pathname.startsWith("/dashboard/operacion/leads")} collapsed={sidebarCollapsed} />
          <NavItem label="Tareas" href="/dashboard/operacion/tareas" icon={Clock} active={pathname.startsWith("/dashboard/operacion/tareas")} collapsed={sidebarCollapsed} />
          <NavItem label="Contactos" href="/dashboard/operacion/contactos" icon={Users} active={pathname.startsWith("/dashboard/operacion/contactos")} collapsed={sidebarCollapsed} />
          <NavItem label="Difusión" href="/dashboard/operacion/difusion" icon={Megaphone} active={pathname.startsWith("/dashboard/operacion/difusion")} collapsed={sidebarCollapsed} />
        </div>
        
        <div className="space-y-1">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 px-3 py-2 animate-in fade-in duration-300">
              <Brain className="w-3.5 h-3.5 text-[var(--accent)]" />
              <div className="text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
                Cerebro
              </div>
            </div>
          ) : (
            <div className="h-px bg-[var(--border-dark)] my-4 opacity-50" />
          )}
          <NavItem label="Catálogo" href="/dashboard/cerebro/catalogo" icon={LayoutGrid} active={pathname.startsWith("/dashboard/cerebro/catalogo")} collapsed={sidebarCollapsed} />
          <NavItem label="Base de conocimiento" href="/dashboard/cerebro/conocimiento" icon={BookOpen} active={pathname.startsWith("/dashboard/cerebro/conocimiento")} collapsed={sidebarCollapsed} />
          <NavItem label="Lector Web" href="/dashboard/cerebro/scraper" icon={Globe} active={pathname.startsWith("/dashboard/cerebro/scraper")} collapsed={sidebarCollapsed} />
        </div>

        <div className="space-y-1">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 px-3 py-2 animate-in fade-in duration-300">
              <Settings2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <div className="text-[11px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-wider">
                Ajustes
              </div>
            </div>
          ) : (
            <div className="h-px bg-[var(--border-dark)] my-4 opacity-50" />
          )}
          <NavItem label="Agentes IA" href="/dashboard/ajustes/agentes" icon={Bot} active={pathname.startsWith("/dashboard/ajustes/agentes") && !isAgentSubRoute} collapsed={sidebarCollapsed} />
          <NavItem label="Canales" href="/dashboard/ajustes/canales" icon={Link2} active={pathname.startsWith("/dashboard/ajustes/canales")} collapsed={sidebarCollapsed} />
          <NavItem label="Workflows" href="/dashboard/ajustes/workflows" icon={GitBranch} active={pathname.startsWith("/dashboard/ajustes/workflows")} collapsed={sidebarCollapsed} />
          <NavItem label="Etiquetas CRM" href="/dashboard/ajustes/etiquetas" icon={Tag} active={pathname.startsWith("/dashboard/ajustes/etiquetas")} collapsed={sidebarCollapsed} />
          <NavItem label="Facturación" href="/dashboard/ajustes/facturacion" icon={CreditCard} active={pathname.startsWith("/dashboard/ajustes/facturacion")} collapsed={sidebarCollapsed} />
        </div>
      </nav>

      <SidebarFooter collapsed={sidebarCollapsed} />
    </aside>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
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
    <div className="p-2 border-t border-[var(--border-dark)] bg-[var(--bg-sidebar-deep)] overflow-hidden">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full outline-none">
          <div className={cn(
            "flex items-center hover:bg-[var(--bg-sidebar-hover)] rounded-xl transition-all group cursor-pointer",
            collapsed ? "justify-center p-1" : "gap-3 p-2"
          )}>
            <div className="w-9 h-9 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0 border border-black/5 shadow-inner">
              <span className="text-black font-black text-sm leading-none">{initial}</span>
            </div>
            {!collapsed && (
              <>
                <div className="text-xs truncate flex-1 text-left animate-in fade-in duration-300">
                  <p className="text-[var(--text-primary-dark)] font-semibold truncate leading-tight">
                    {userName}
                  </p>
                  <p className="text-[var(--text-tertiary-dark)] font-bold uppercase tracking-tighter text-[9px] mt-0.5 opacity-80">
                    Plan {workspace?.plan || 'Free'}
                  </p>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-[var(--text-tertiary-dark)] group-hover:text-[var(--text-secondary-dark)] transition-colors mr-1" />
              </>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side={collapsed ? "right" : "bottom"} 
          align={collapsed ? "end" : "center"} 
          className="w-56 bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--text-primary-dark)] rounded-2xl shadow-2xl p-2 z-50 ml-2"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-[var(--text-tertiary-dark)] uppercase tracking-widest opacity-70">
              Mi Cuenta
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--border-dark)] mx-1 my-1" />
            <DropdownMenuItem 
              onClick={() => router.push("/dashboard/perfil")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-sidebar-hover)] focus:bg-[var(--bg-sidebar-hover)] cursor-pointer outline-none transition-all"
            >
                <UserIcon className="w-4 h-4 text-[var(--text-secondary-dark)]" />
                <span className="text-sm font-medium">Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => router.push("/dashboard/ajustes")}
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
  collapsed?: boolean;
  badge?: number;
}

function NavItem({ label, href, icon: Icon, active = false, collapsed = false, badge = 0 }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg text-[13px] transition-all duration-200 group border-l-3 relative overflow-hidden",
        collapsed ? "justify-center px-1 py-3" : "px-3 py-2 gap-3",
        active
          ? "bg-[var(--bg-sidebar-hover)] text-[var(--accent)] border-l-[var(--accent)] font-medium shadow-lg shadow-black/10"
          : "text-[var(--text-secondary-dark)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary-dark)] border-l-transparent font-normal"
      )}
    >
      <div className="relative shrink-0">
        <Icon className={cn("transition-colors", collapsed ? "w-5 h-5" : "w-4 h-4", active ? "text-[var(--accent)]" : "text-current group-hover:text-[var(--text-primary-dark)]")} />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="truncate flex-1 animate-in fade-in slide-in-from-left-1 duration-300">
            {label}
          </span>
          {badge > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none shrink-0">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
