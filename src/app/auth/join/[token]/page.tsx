"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
  Timestamp 
} from "firebase/firestore";
import { aceptarInvitacionAction } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import { COLLECTIONS } from "@/lib/types/firestore";

export default function JoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const token = params.token as string;
  const wsId = searchParams.get("wsId");
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchInvitation = async () => {
      try {
        let inviteData = null;

        if (wsId) {
          // Búsqueda directa (Mucho más robusta y no requiere índices)
          const docRef = doc(db, COLLECTIONS.ESPACIOS, wsId, "invitaciones", token);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().status === "pendiente") {
            inviteData = snap.data();
          }
        } else {
          // Fallback a búsqueda global (requiere índices de Firestore)
          const q = query(
            collectionGroup(db, "invitaciones"),
            where("token", "==", token),
            where("status", "==", "pendiente")
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            inviteData = snap.docs[0].data();
          }
        }
        
        if (!inviteData) {
          toast.error("Invitación no encontrada o ya utilizada.");
          setLoading(false);
          return;
        }

        // Verificar si venció
        if (inviteData.venceEl && inviteData.venceEl.toDate() < new Date()) {
          toast.error("La invitación ha expirado.");
          setLoading(false);
          return;
        }

        setInvitation(inviteData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching invite:", error);
        toast.error("Error al cargar la invitación");
        setLoading(false);
      }
    };

    fetchInvitation();
    return () => unsubscribe();
  }, [token, wsId]);

  const handleJoin = async () => {
    if (!user || !token) return;

    setProcessing(true);
    try {
      const res = await aceptarInvitacionAction(token, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0]
      }, wsId || undefined);

      if (res.success) {
        toast.success("¡Bienvenido al equipo!");
        router.push("/dashboard/operacion/inbox");
      } else {
        toast.error(res.error || "No se pudo unir al espacio.");
      }
    } catch (error) {
      toast.error("Error al procesar la unión");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-6">
        <Card className="max-w-md w-full border-[var(--border-light)] bg-[var(--bg-card)] rounded-[2.5rem] p-8 text-center">
           <div className="size-20 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6">
              <Users className="size-10" />
           </div>
           <CardTitle className="text-2xl font-black text-[var(--text-primary-light)]">Invitación Inválida</CardTitle>
           <CardDescription className="mt-4 font-medium leading-relaxed">
             Esta invitación no existe, ha expirado o ya fue utilizada. Por favor, solicita una nueva invitación al administrador del espacio.
           </CardDescription>
           <Button 
             className="w-full mt-10 rounded-2xl h-14 font-black uppercase tracking-widest bg-[var(--bg-input)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-primary-light)] border border-[var(--border-light)]"
             onClick={() => router.push("/auth")}
           >
             Volver al Login
           </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-6">
      <Card className="max-w-md w-full border-[var(--border-light)] bg-[var(--bg-card)] rounded-[3rem] p-10 shadow-2xl shadow-black/20 text-center animate-in zoom-in-95 duration-500">
         <div className="size-24 rounded-[2.5rem] bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-8 border-4 border-[var(--accent)]/20 shadow-[0_0_50px_rgba(200,255,0,0.1)]">
            <Users className="size-10" />
         </div>
         
         <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">Invitación de Equipo</span>
            <CardTitle className="text-3xl font-black text-[var(--text-primary-light)] italic leading-tight">
               ¡Te invitaron a {invitation.wsName}!
            </CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-tertiary-light)] pt-2">
               Vas a unirte como <span className="text-[var(--text-secondary-light)]">{invitation.role}</span>
            </CardDescription>
         </div>

         <div className="mt-10 p-6 bg-[var(--bg-input)] rounded-3xl border border-[var(--border-light)] text-left">
            <div className="flex items-center gap-4">
               {user ? (
                 <>
                   <div className="size-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center font-black text-black">
                     {user.email?.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Unirse como</p>
                      <p className="text-sm font-black text-[var(--text-primary-light)] truncate">{user.email}</p>
                   </div>
                   <CheckCircle2 className="size-5 text-emerald-500" />
                 </>
               ) : (
                 <div className="flex-1 text-center py-2">
                    <p className="text-xs font-bold text-[var(--text-tertiary-light)]">Debes iniciar sesión con tu cuenta para aceptar la invitación.</p>
                 </div>
               )}
            </div>
         </div>

         <div className="mt-10 space-y-4">
            {user ? (
              <Button 
                onClick={handleJoin}
                disabled={processing}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-sm uppercase tracking-[0.1em] h-16 rounded-[1.5rem] shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-95"
              >
                {processing ? <Loader2 className="animate-spin mr-2" /> : "Aceptar y Entrar"}
                {!processing && <ChevronRight className="ml-2 w-5 h-5" />}
              </Button>
            ) : (
              <Button 
                onClick={() => router.push(`/auth?redirect=/auth/join/${token}`)}
                className="w-full bg-white text-black hover:bg-white/90 font-black text-sm uppercase tracking-widest h-16 rounded-[1.5rem] shadow-xl"
              >
                Iniciar Sesión Primero
              </Button>
            )}
            
            <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">
              Al unirte, aceptas los términos de servicio del espacio.
            </p>
         </div>
      </Card>
    </div>
  );
}
