"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Zap, 
  Shield, 
  CreditCard,
  Globe,
  Bell,
  ChevronRight,
  Database,
  Search,
  Layout
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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

export default function AjustesPage() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [wsName, setWsName] = useState(workspace?.nombre || "");

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

  const navItems = [
    {
      title: "Equipo y Usuarios",
      desc: "Gestiona los accesos de tus colaboradores y sus roles.",
      icon: Users,
      href: "/dashboard/ajustes/usuarios",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Canales de Mensajería",
      desc: "WhatsApp, Instagram y Facebook conectados.",
      icon: MessageSquare,
      href: "/dashboard/ajustes/canales",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Agentes Inteligentes",
      desc: "Configura la personalidad y conocimiento de tu IA.",
      icon: Zap,
      href: "/dashboard/ajustes/agentes",
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent)]/10"
    },
    {
      title: "Facturación y Plan",
      desc: "Administra tu suscripción, límites y facturas.",
      icon: CreditCard,
      href: "/dashboard/ajustes/facturacion",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER INTEGRADO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Settings className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Configuración</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary-light)] tracking-tight">Ajustes del Espacio</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)] max-w-md leading-relaxed font-medium">
            Control global de tu ecosistema de agentes, equipo y canales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* PANEL GENERAL */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2.5rem] shadow-2xl shadow-black/5 overflow-hidden">
            <form onSubmit={handleUpdateWorkspace}>
              <CardHeader className="p-8 border-b border-[var(--border-light)] bg-transparent">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">General</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="wsName" className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Nombre del Espacio</Label>
                    <Input 
                      id="wsName"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-2xl h-12 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)]/30 transition-all px-5"
                    />
                  </div>
                  
                  <div className="grid gap-2 opacity-60">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">ID del Espacio</Label>
                    <div className="bg-[var(--bg-input)]/50 border border-[var(--border-light)] rounded-2xl h-12 flex items-center px-5 text-[11px] font-mono text-[var(--text-tertiary-light)] overflow-hidden">
                      {currentWorkspaceId}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-light)] space-y-4">
                  <div className="flex items-center justify-between p-2">
                     <div className="space-y-0.5">
                       <p className="text-xs font-bold text-[var(--text-primary-light)]">Modo Mantenimiento</p>
                       <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Desactivar IA temporalmente</p>
                     </div>
                     <Switch disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button 
                  type="submit" 
                  disabled={loading || wsName === workspace?.nombre}
                  className="w-full bg-white text-black hover:bg-white/90 font-black text-xs uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-black/10 transition-all active:scale-95"
                >
                  {loading ? "Actualizando..." : "Guardar Cambios"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="p-8 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-[2.5rem] space-y-4">
            <div className="size-10 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
              <Zap className="size-5 text-[var(--accent)]" />
            </div>
            <h4 className="text-sm font-black text-[var(--text-primary-light)] uppercase tracking-tight">Atajo de IA</h4>
            <p className="text-[11px] text-[var(--text-secondary-light)] leading-relaxed font-medium">
              Próximamente podrás entrenar a tu IA globalmente desde aquí para que responda dudas sobre tu empresa sin importar el agente.
            </p>
          </div>
        </div>

        {/* ACCESOS RAPIDOS A OTRAS SECCIONES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navItems.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="h-full bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl hover:border-[var(--accent)]/40 transition-all hover:translate-y-[-4px] group overflow-hidden cursor-pointer shadow-xl shadow-black/5">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`${item.bg} ${item.color} p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between">
                         <h3 className="font-extrabold text-[var(--text-primary-light)] text-sm tracking-tight">{item.title}</h3>
                         <ChevronRight className="w-4 h-4 text-[var(--text-tertiary-light)] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                      </div>
                      <p className="text-[11px] text-[var(--text-tertiary-light)] leading-relaxed font-medium line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="p-8 rounded-[2.5rem] bg-[#1F1F1E] border border-white/5 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-all duration-1000">
               <Shield className="size-32 text-amber-500" />
            </div>
            <div className="space-y-2 relative z-10">
              <h4 className="text-lg font-black text-white italic">Asegura tu Ecosistema</h4>
              <p className="text-xs text-white/60 leading-relaxed font-medium max-w-md">
                Administra roles de usuarios dinámicos (Admin, Agente, Supervisor) y mantén el registro de actividad de cada uno de tus canales conectados.
              </p>
            </div>
            <div className="pt-4 relative z-10">
               <Button 
                 render={<Link href="/dashboard/ajustes/usuarios" />}
                 nativeButton={false}
                 className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-10 px-6 rounded-xl"
               >
                 Configurar Roles de Usuario
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
