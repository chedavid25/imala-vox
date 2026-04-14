"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Store, 
  Briefcase, 
  MoreHorizontal, 
  Loader2,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { COLLECTIONS } from "@/lib/types/firestore";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [rubro, setRubro] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
      } else {
        setUserName(user.displayName?.split(" ")[0] || "en Imalá Vox");

        // Verificar si ya tiene workspace para evitar duplicados
        try {
          const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
          const q = query(
            collection(db, COLLECTIONS.ESPACIOS),
            where('propietarioUid', '==', user.uid),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Ya tiene workspace, redirigir al dashboard
            router.push('/dashboard/operacion/inbox');
            return;
          }
        } catch (err) {
          console.error('Error verificando workspace:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleComenzar = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user || !empresaNombre || !rubro) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);

    try {
      // Calcular fechas (7 días desde ahora)
      const ahora = new Date();
      const terminaPrueba = new Date();
      terminaPrueba.setDate(ahora.getDate() + 7);

      // Primer día del mes siguiente para reinicio de uso
      const mesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

      // Crear el Espacio de Trabajo
      await addDoc(collection(db, COLLECTIONS.ESPACIOS), {
        nombre: empresaNombre,
        propietarioEmail: user.email,
        propietarioUid: user.uid,
        rubro: rubro,
        plan: 'pro', // Comienza con Trial Pro
        estado: 'prueba',
        pruebaTerminaEl: Timestamp.fromDate(terminaPrueba),
        periodoVigenteHasta: Timestamp.fromDate(terminaPrueba),
        uso: { 
          convCount: 0, 
          contactCount: 0, 
          objectCount: 0 
        },
        usoReiniciaEl: Timestamp.fromDate(mesSiguiente),
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });

      toast.success("¡Espacio configurado! Bienvenido.");
      router.push("/dashboard/operacion/inbox");
    } catch (error: any) {
      console.error("Error onboarding:", error);
      toast.error("Ocurrió un error al crear tu espacio de trabajo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] rounded-full blur-[150px] opacity-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[var(--accent)] rounded-full blur-[120px] opacity-10" />

      <div className="w-full max-w-xl text-center space-y-4 mb-10 z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--accent-active)] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> ¡Hola, {userName}!
        </h2>
        <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary-light)] tracking-tighter">
            Configurá tu <span className="text-[var(--accent-active)]">espacio.</span>
        </h1>
        <p className="text-[var(--text-tertiary-light)] text-md font-medium max-w-md mx-auto">
            Definí la identidad de tu negocio para que el agente IA <br /> pueda interactuar de forma natural.
        </p>
      </div>

      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2rem] p-8 shadow-2xl shadow-black/5 z-10 animate-in zoom-in-95 duration-700 delay-100">
        <form onSubmit={handleComenzar} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-[var(--text-secondary-light)] ml-1">Nombre de tu empresa o negocio</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-4.5 h-4.5 text-[var(--text-tertiary-light)]" />
              <Input 
                id="empresa" 
                placeholder="Ej: Inmobiliaria Central" 
                required 
                className="pl-10 h-12 border-[var(--border-light)] bg-white rounded-2xl focus:ring-2 focus:ring-[var(--accent)] transition-all"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-[var(--text-secondary-light)] ml-1">¿A qué rubro pertenece?</Label>
            <Select value={rubro} onValueChange={(v) => setRubro(v ?? '')}>
              <SelectTrigger className="h-12 border-[var(--border-light)] bg-white rounded-2xl flex items-center pr-4">
                <SelectValue placeholder="Selecciona tu actividad" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-[var(--border-light)] shadow-xl">
                <SelectItem value="inmobiliaria" className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-[var(--accent)]/10">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Inmobiliaria
                  </div>
                </SelectItem>
                <SelectItem value="comercio" className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-[var(--accent)]/10">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="w-4 h-4" /> Comercio
                  </div>
                </SelectItem>
                <SelectItem value="servicios" className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-[var(--accent)]/10">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Servicios
                  </div>
                </SelectItem>
                <SelectItem value="otro" className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-[var(--accent)]/10">
                  <div className="flex items-center gap-2">
                    <MoreHorizontal className="w-4 h-4" /> Otro
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-md rounded-2xl shadow-lg shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <span className="flex items-center gap-2">Comenzar prueba gratuita <ChevronRight className="w-5 h-5" /></span>
                )}
            </Button>
            <p className="text-center text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest mt-4 opacity-70">
                Pruébalo gratis • Sin tarjeta de crédito
            </p>
          </div>
        </form>
      </div>

      <div className="mt-12 text-[var(--text-tertiary-light)] text-[11px] font-bold uppercase tracking-widest opacity-40 z-10">
        Impulsado por motores de IA de próxima generación.
      </div>
    </div>
  );
}
