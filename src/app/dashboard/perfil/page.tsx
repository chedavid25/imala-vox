"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Shield, 
  Camera, 
  Save, 
  LogOut, 
  Key, 
  Bell, 
  Settings,
  Sparkles,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/firebase";
import { updateProfile, signOut } from "firebase/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function PerfilPage() {
  const user = auth.currentUser;
  const router = useRouter();
  const { workspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await updateProfile(user, { displayName });
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/auth");
    } catch (e) {
      toast.error("Error al cerrar sesión");
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER INTEGRADO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <UserIcon className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Mi Cuenta</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary-light)] tracking-tight">Mi Perfil</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)] max-w-md leading-relaxed font-medium">
            Administra tu información personal y preferencias de seguridad.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="rounded-2xl border-rose-500/20 text-rose-500 hover:bg-rose-500/5 font-bold h-12 px-6"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: RESUMEN RAPIDO */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
            <CardContent className="pt-10 flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                <div className="size-24 rounded-full bg-[var(--accent)] flex items-center justify-center border-4 border-[var(--bg-card)] shadow-[0_0_50px_rgba(200,255,0,0.2)]">
                  <span className="text-3xl font-black text-black">
                    {displayName.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-black text-[var(--accent)] rounded-full border-2 border-[var(--bg-card)] hover:scale-110 transition-all">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <div>
                <h2 className="text-xl font-black text-[var(--text-primary-light)]">{displayName || "Usuario"}</h2>
                <p className="text-xs text-[var(--text-tertiary-light)] font-medium mt-1 uppercase tracking-widest">{user.email}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full border border-[var(--accent)]/20 text-[10px] font-black uppercase tracking-tighter">
                  <Shield className="w-3 h-3" />
                  Plan {workspace?.plan || 'Starter'}
                </div>
              </div>

              <div className="w-full pt-6 border-t border-[var(--border-light)] text-left space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-tertiary-light)]">Miembro desde</span>
                  <span className="font-black text-[var(--text-secondary-light)]">{new Date(user.metadata.creationTime!).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-tertiary-light)]">Último acceso</span>
                  <span className="font-black text-[var(--text-secondary-light)]">{new Date(user.metadata.lastSignInTime!).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: PESTAÑAS Y FORMULARIOS */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="detalles" className="w-full">
            <TabsList className="bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-light)] w-full justify-start h-14 space-x-2">
              <TabsTrigger value="detalles" className="rounded-xl px-6 h-full data-[state=active]:bg-[var(--bg-sidebar-hover)] data-[state=active]:text-[var(--accent)] font-bold text-xs uppercase tracking-widest">
                Detalles Personales
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="rounded-xl px-6 h-full data-[state=active]:bg-[var(--bg-sidebar-hover)] data-[state=active]:text-[var(--accent)] font-bold text-xs uppercase tracking-widest">
                Seguridad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detalles" className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
                <form onSubmit={handleUpdateProfile}>
                  <CardHeader className="p-8 border-b border-[var(--border-light)] bg-[var(--bg-main)]/30">
                    <CardTitle className="text-lg font-extrabold text-[var(--text-primary-light)]">Información Pública</CardTitle>
                    <CardDescription className="text-xs font-medium">Este es el nombre que verán los demás miembros de tu equipo.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Nombre Completo</Label>
                        <div className="relative">
                          <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
                          <Input 
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Tu nombre"
                            className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl pl-12 h-12 font-medium text-sm focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2 opacity-60 cursor-not-allowed">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Correo Electrónico (No editable)</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
                          <Input 
                            id="email"
                            value={user.email || ""}
                            disabled
                            className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl pl-12 h-12 font-medium text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8 pt-0 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={loading || displayName === user.displayName}
                      className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-[var(--accent)]/20 transition-all"
                    >
                      {loading ? "Guardando..." : "Guardar Cambios"}
                      <Save className="ml-2 w-4 h-4" />
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="seguridad" className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
                <CardHeader className="p-8 border-b border-[var(--border-light)] bg-[var(--bg-main)]/30">
                  <CardTitle className="text-lg font-extrabold text-[var(--text-primary-light)]">Acceso y Seguridad</CardTitle>
                  <CardDescription className="text-xs font-medium">Gestiona tu contraseña y métodos de autenticación.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="flex items-center justify-between p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                    <div className="flex gap-4 items-center">
                      <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Key className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary-light)] uppercase tracking-tight">Cambiar Contraseña</p>
                        <p className="text-[11px] font-medium text-[var(--text-tertiary-light)] mt-1">Te enviaremos un link de recuperación por correo.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="rounded-xl border-[var(--border-light)] font-bold text-[10px] uppercase tracking-widest px-6"
                    >
                      Enviar Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
