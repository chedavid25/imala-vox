"use client";

import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Bot, 
  ShieldCheck, 
  Brain, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Mail,
  Lock,
  User,
  Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { verificarYSetearAdmin } from "@/app/actions/superadmin";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estados para Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Estados para Registro
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      // Verificar si ya tiene workspace
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { COLLECTIONS } = await import('@/lib/types/firestore');
      const q = query(
        collection(db, COLLECTIONS.ESPACIOS),
        where('propietarioUid', '==', result.user.uid),
        limit(1)
      );
      const snap = await getDocs(q);
      
      // Verificar si es SuperAdmin y setear cookie
      const esAdmin = await verificarYSetearAdmin(result.user.uid, result.user.email ?? undefined);

      toast.success("¡Bienvenido de nuevo!");
      
      if (esAdmin) {
        window.location.href = "/superadmin";
      } else {
        router.push(snap.empty ? "/onboarding" : "/dashboard/operacion/inbox");
      }
    } catch (error: any) {
      console.error("Error login:", error);
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (registerPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await updateProfile(user, { displayName: registerName });
      toast.success("Cuenta creada exitosamente");
      router.push("/onboarding");
    } catch (error: any) {
      console.error("Error registro:", error);
      toast.error(error.message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      // Verificar si ya tiene workspace
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { COLLECTIONS } = await import('@/lib/types/firestore');
      const q = query(
        collection(db, COLLECTIONS.ESPACIOS),
        where('propietarioUid', '==', result.user.uid),
        limit(1)
      );
      const snap = await getDocs(q);
      
      // Verificar si es SuperAdmin y setear cookie
      const esAdmin = await verificarYSetearAdmin(result.user.uid, result.user.email ?? undefined);

      toast.success(`¡Hola, ${result.user.displayName}!`);
      
      if (esAdmin) {
        window.location.href = "/superadmin";
      } else {
        router.push(snap.empty ? '/onboarding' : '/dashboard/operacion/inbox');
      }
    } catch (error: any) {
      console.error("Error Google login:", error);
      toast.error("Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      {/* PANEL IZQUIERDO: OSCURO (ESTILO LINEAR) */}
      <div className="hidden lg:flex w-1/2 bg-[var(--bg-sidebar)] p-12 flex-col justify-between text-[var(--text-primary-dark)] relative overflow-hidden">
        {/* Decoración de fondo sutil */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-12 group cursor-pointer w-fit">
            <div className="size-12 flex items-center justify-center group-hover:scale-105 transition-transform animate-in zoom-in duration-500">
                <Image src="/icons/logo transparente vox.png" alt="Logo" width={48} height={48} className="rounded-md object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-[var(--accent)]">Imalá Vox</h1>
          </Link>

          <div className="space-y-8 mt-24">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
                La nueva era de la <br />
                <span className="text-[var(--accent)]">atención inteligente.</span>
            </h2>
            
            <div className="space-y-6 pt-12">
              <BulletItem 
                icon={ShieldCheck} 
                title="Agente IA para WhatsApp 24/7" 
                desc="Tus clientes siempre atendidos, sin esperas y con respuestas precisas." 
              />
              <BulletItem 
                icon={Brain} 
                title="Base de conocimiento personalizada" 
                desc="Entrena a tu agente con tus propios documentos, webs y catálogo." 
              />
              <BulletItem 
                icon={Bot} 
                title="Gestión de contactos inteligente" 
                desc="Triage automático y escalada a humanos solo cuando es necesario." 
              />
              <BulletItem 
                icon={Globe} 
                title="Omnicanalidad en el ecosistema de Meta" 
                desc="Conectá WhatsApp, Instagram y Facebook para gestionar todos tus leads de Meta Ads en un solo lugar." 
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[var(--text-tertiary-dark)] text-sm font-medium">
          © 2026 Imalá Vox • Potenciando negocios con IA.
        </div>
      </div>

      {/* PANEL DERECHO: FORMULARIOS */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 group w-fit">
            <div className="size-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Image src="/icons/logo transparente vox.png" alt="Logo" width={40} height={40} className="rounded-md object-contain" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-[var(--text-primary-light)]">Imalá Vox</h1>
          </Link>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[var(--bg-input)] p-1 h-12 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Iniciar sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold text-[var(--text-secondary-light)]">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="ejemplo@negocio.com" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white focus:ring-[var(--accent)] rounded-xl"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="pass" className="text-sm font-bold text-[var(--text-secondary-light)]">Contraseña</Label>
                      <button type="button" className="text-[11px] font-bold text-[var(--accent-active)] hover:underline">Olvide mi clave</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="pass" 
                        type="password" 
                        placeholder="••••••••" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white focus:ring-[var(--accent)] rounded-xl"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold text-md rounded-xl shadow-lg shadow-[var(--accent)]/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Ingresar <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--border-light)]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-[var(--text-tertiary-light)]">
                  <span className="bg-[var(--bg-main)] px-4">O continuar con</span>
                </div>
              </div>

              <Button 
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-11 bg-white border-[var(--border-light)] hover:bg-gray-50 rounded-xl font-bold flex items-center gap-3 transition-all"
              >
                <SVGGoogle />
                Continuar con Google
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-6">
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-sm font-bold text-[var(--text-secondary-light)]">Nombre Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="reg-name" 
                        placeholder="Tu nombre" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white rounded-xl"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-bold text-[var(--text-secondary-light)]">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="reg-email" 
                        type="email" 
                        placeholder="ejemplo@negocio.com" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white rounded-xl"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-pass" className="text-sm font-bold text-[var(--text-secondary-light)]">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="reg-pass" 
                        type="password" 
                        placeholder="Mínimo 8 caracteres" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white rounded-xl"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-sm font-bold text-[var(--text-secondary-light)]">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="reg-confirm" 
                        type="password" 
                        placeholder="Repite tu contraseña" 
                        required 
                        className="pl-10 h-11 border-[var(--border-light)] bg-white rounded-xl"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold text-md rounded-xl shadow-lg shadow-[var(--accent)]/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Comenzar ahora <CheckCircle2 className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--border-light)]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-[var(--text-tertiary-light)]">
                  <span className="bg-[var(--bg-main)] px-4">O continuar con</span>
                </div>
              </div>

              <Button 
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-11 bg-white border-[var(--border-light)] hover:bg-gray-50 rounded-xl font-bold flex items-center gap-3 transition-all"
              >
                <SVGGoogle />
                Crear con Google
              </Button>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-[var(--text-tertiary-light)] font-medium leading-relaxed">
            Al continuar, aceptas nuestros <Link href="/terms" className="underline text-[var(--text-secondary-light)] hover:text-[var(--accent-active)] transition-colors">Términos de Servicio</Link> <br />
            y la <Link href="/privacy" className="underline text-[var(--text-secondary-light)] hover:text-[var(--accent-active)] transition-colors">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function BulletItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar-hover)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)]/50 transition-colors">
        <Icon className="w-5 h-5 text-[var(--accent)]" />
      </div>
      <div>
        <h4 className="text-md font-bold text-[var(--text-primary-dark)] mb-0.5">{title}</h4>
        <p className="text-sm text-[var(--text-secondary-dark)] leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function SVGGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  );
}
