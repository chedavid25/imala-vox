"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Zap, 
  Shield, 
  CreditCard,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  Layout,
  Database,
  Globe,
  Lock,
  ArrowRight
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AjustesPage() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [wsName, setWsName] = useState(workspace?.nombre || "");
  const [showHelp, setShowHelp] = useState(false);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId) return;

    setLoading(true);
    try {
      const wsRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId);
      await updateDoc(wsRef, { nombre: wsName });
      toast.success("Ajustes del espacio actualizados");
    } catch (error) {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const ayudaAjustes = {
    titulo: "Centro de Configuración",
    descripcion: "Desde aquí controlas la identidad de tu espacio de trabajo y conectas todas las herramientas de tu ecosistema de IA.",
    items: [
      { titulo: "Identidad", detalle: "Personaliza el nombre de tu empresa. Este nombre se usará en reportes y comunicaciones internas." },
      { titulo: "Navegación", detalle: "Usa los accesos directos para saltar rápidamente entre la gestión de equipo, canales y facturación." },
      { titulo: "IA Global", detalle: "Próximamente podrás definir parámetros de comportamiento que afecten a todos tus agentes por igual." },
    ]
  };

  const navItems = [
    {
      title: "Equipo y Usuarios",
      desc: "Administra accesos, roles y colaboraciones.",
      icon: Users,
      href: "/dashboard/ajustes/usuarios",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Canales de Mensajería",
      desc: "Conecta WhatsApp, Instagram y redes sociales.",
      icon: MessageSquare,
      href: "/dashboard/ajustes/canales",
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "Agentes Inteligentes",
      desc: "Entrena y configura tus expertos virtuales.",
      icon: Zap,
      href: "/dashboard/ajustes/agentes",
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent)]/10"
    },
    {
      title: "Facturación y Plan",
      desc: "Gestiona tu suscripción, límites y facturas.",
      icon: CreditCard,
      href: "/dashboard/ajustes/facturacion",
      color: "text-purple-500",
      bg: "bg-purple-50"
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Configuración Global</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Ajustes del Espacio</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-md">Control total sobre la identidad y herramientas de tu negocio.</p>
        </div>

        <button
          onClick={() => setShowHelp(v => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
            showHelp
              ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
              : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          Estructura del Sistema
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
        </button>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaAjustes.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaAjustes.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaAjustes.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* PANEL GENERAL */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-white border border-[var(--border-light)] rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <form onSubmit={handleUpdateWorkspace} className="flex flex-col h-full">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-light)] bg-slate-50/30">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">General</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6 flex-grow">
                <div className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="wsName" className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Nombre del Espacio</Label>
                    <Input 
                      id="wsName"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-2xl h-12 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)]/30 transition-all px-5 shadow-sm"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Identificador Único</Label>
                    <div className="bg-slate-50 border border-[var(--border-light)] rounded-2xl h-12 flex items-center px-5 text-[11px] font-mono text-[var(--text-tertiary-light)] overflow-hidden shadow-inner">
                      {currentWorkspaceId}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--border-light)] space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-[var(--border-light)]">
                     <div className="space-y-0.5">
                       <p className="text-[11px] font-bold text-[var(--text-primary-light)]">Modo Mantenimiento</p>
                       <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Desactiva la IA temporalmente</p>
                     </div>
                     <Switch disabled className="data-[state=checked]:bg-[var(--accent)]" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button 
                  type="submit" 
                  disabled={loading || wsName === workspace?.nombre}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl shadow-xl shadow-[var(--accent)]/10 transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="p-8 bg-blue-600/5 border border-blue-100 rounded-[2.5rem] space-y-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 size-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors" />
            <div className="size-10 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center relative z-10">
              <Database className="size-5 text-blue-600" />
            </div>
            <h4 className="text-sm font-black text-[var(--text-primary-light)] uppercase tracking-tight relative z-10">Conocimiento Global</h4>
            <p className="text-[11px] text-[var(--text-secondary-light)] leading-relaxed font-medium relative z-10">
              Próximamente: define una base de conocimiento maestra que alimente a todos tus agentes IA desde un solo lugar.
            </p>
          </div>
        </div>

        {/* ACCESOS RAPIDOS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {navItems.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="h-full bg-white border border-[var(--border-light)] rounded-[2rem] hover:border-[var(--accent)]/40 transition-all hover:translate-y-[-4px] group overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-[var(--accent)]/5">
                  <CardContent className="p-7 flex items-center gap-5">
                    <div className={`${item.bg} ${item.color} size-16 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 duration-500`}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-[var(--text-primary-light)] text-base tracking-tight">{item.title}</h3>
                         <ChevronRight className="w-4 h-4 text-[var(--text-tertiary-light)] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                      </div>
                      <p className="text-xs text-[var(--text-tertiary-light)] leading-relaxed font-medium line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="p-10 rounded-[3rem] bg-[#1F1F1E] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-all duration-1000">
               <Shield className="size-48 text-amber-500" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <Lock className="size-3 text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Seguridad de Datos</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tight">Asegura tu Ecosistema</h4>
                <p className="text-sm text-white/50 leading-relaxed font-medium max-w-md">
                  Gestiona roles dinámicos (Admin, Agente, Supervisor) y mantén el control total sobre quién accede a cada canal de atención.
                </p>
              </div>
              
              <Link href="/dashboard/ajustes/usuarios">
                <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-14 px-8 rounded-2xl group/btn transition-all shadow-xl shadow-[var(--accent)]/20">
                  Configurar Equipo
                  <ArrowRight className="ml-2 size-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
