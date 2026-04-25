"use client";

import React, { useState } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Camera, 
  Save, 
  LogOut, 
  Key, 
  UserCheck,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { cn } from "@/lib/utils";

export default function PerfilPage() {
  const user = auth.currentUser;
  const router = useRouter();
  const { workspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [showHelp, setShowHelp] = useState(false);

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

  const ayudaPerfil = {
    titulo: "Tu Cuenta Personal",
    descripcion: "Gestiona tu identidad digital dentro de Imalá Vox y asegura el acceso a tus herramientas de IA.",
    items: [
      { titulo: "Identidad", detalle: "Tu nombre público es el que verán tus compañeros en los registros de actividad y chats internos." },
      { titulo: "Seguridad", detalle: "Mantén tu contraseña actualizada. Recomendamos cambiarla cada 3 meses para máxima protección." },
      { titulo: "Suscripción", detalle: "Tu perfil está vinculado a tu plan actual. Si eres Admin, puedes gestionar los pagos desde Ajustes." },
    ]
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Configuración de Cuenta</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-md">Gestiona tus datos personales y preferencias de seguridad.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            Seguridad y Perfil
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>

          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="rounded-xl text-rose-500 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest h-11 px-6 border border-rose-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
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
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaPerfil.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaPerfil.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaPerfil.items.map((item, i) => (
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
        {/* COLUMNA IZQUIERDA: RESUMEN RAPIDO */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-white border border-[var(--border-light)] rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <CardContent className="pt-10 flex flex-col items-center text-center space-y-8 flex-grow p-8">
              <div className="relative group">
                <div className="size-32 rounded-[2.5rem] bg-[var(--accent)] flex items-center justify-center border-4 border-white shadow-2xl group-hover:rotate-3 transition-all duration-500 overflow-hidden relative">
                  <span className="text-5xl font-black text-black">
                    {displayName.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-3 bg-slate-900 text-[var(--accent)] rounded-2xl border-2 border-white shadow-xl hover:scale-110 transition-all z-10">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[var(--text-primary-light)] tracking-tight">{displayName || "Usuario"}</h2>
                <p className="text-xs text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest">{user.email}</p>
                
                <div className="pt-4 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                    <Shield className="w-3.5 h-3.5" />
                    Plan {workspace?.plan || 'Starter'}
                  </div>
                </div>
              </div>

              <div className="w-full pt-8 border-t border-slate-50 space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl">
                  <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Miembro desde</span>
                  <span className="text-xs font-black text-[var(--text-secondary-light)]">{new Date(user.metadata.creationTime!).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl">
                  <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Último acceso</span>
                  <span className="text-xs font-black text-[var(--text-secondary-light)]">{new Date(user.metadata.lastSignInTime!).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-8 pt-0 bg-slate-50/30">
               <div className="w-full p-4 bg-white border border-[var(--border-light)] rounded-2xl flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    Completa tu perfil para que tu equipo te identifique fácilmente.
                  </p>
               </div>
            </CardFooter>
          </Card>
        </div>

        {/* COLUMNA DERECHA: PESTAÑAS Y FORMULARIOS */}
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="detalles" className="w-full">
            <TabsList className="bg-white p-1.5 rounded-[1.5rem] border border-[var(--border-light)] w-full justify-start h-16 shadow-sm mb-8">
              <TabsTrigger 
                value="detalles" 
                className="rounded-2xl px-8 h-full data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Información Personal
              </TabsTrigger>
              <TabsTrigger 
                value="seguridad" 
                className="rounded-2xl px-8 h-full data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Seguridad de Acceso
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detalles" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-white border border-[var(--border-light)] rounded-[2.5rem] overflow-hidden shadow-sm">
                <form onSubmit={handleUpdateProfile}>
                  <CardHeader className="p-10 border-b border-[var(--border-light)] bg-slate-50/30">
                    <CardTitle className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Detalles Públicos</CardTitle>
                    <p className="text-xs text-[var(--text-tertiary-light)] font-medium mt-1">Personaliza cómo te ven los demás en el CRM.</p>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Nombre Completo</Label>
                        <div className="relative">
                          <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ej: David Pérez"
                            className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-2xl pl-12 h-14 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2.5 opacity-60">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Correo Electrónico</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            id="email"
                            value={user.email || ""}
                            disabled
                            className="bg-slate-50 border-[var(--border-light)] rounded-2xl pl-12 h-14 font-bold text-sm shadow-inner cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-10 pt-0 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={loading || displayName === user.displayName}
                      className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-[0.98]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          Guardar Cambios
                          <Save className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="seguridad" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-white border border-[var(--border-light)] rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="p-10 border-b border-[var(--border-light)] bg-slate-50/30">
                  <CardTitle className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Acceso y Privacidad</CardTitle>
                  <p className="text-xs text-[var(--text-tertiary-light)] font-medium mt-1">Protege tu cuenta y gestiona tus credenciales.</p>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl gap-6">
                    <div className="flex gap-5 items-center">
                      <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Key className="w-7 h-7 text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-black text-white tracking-tight uppercase">Restablecer Contraseña</p>
                        <p className="text-xs font-medium text-white/50">Recibirás un link de recuperación en tu email.</p>
                      </div>
                    </div>
                    
                    <button
                      className="rounded-2xl border border-white/20 bg-transparent text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest px-8 h-12 transition-all shrink-0 flex items-center cursor-pointer"
                    >
                      Enviar Link
                      <ArrowRight className="ml-2 size-3.5" />
                    </button>
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
