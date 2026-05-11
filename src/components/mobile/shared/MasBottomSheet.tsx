"use client";

import React, { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { MobileNotificacionesSheet } from "./MobileNotificacionesSheet";
import { MobileSeguridadSheet } from "./MobileSeguridadSheet";
import { MobileEtiquetasSheet } from "./MobileEtiquetasSheet";
import { LogOut, Settings, Shield, Bell, HelpCircle, ChevronRight, Tags } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MasBottomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const user = auth.currentUser;

  const [showNotifs, setShowNotifs] = useState(false);
  const [showSeguridad, setShowSeguridad] = useState(false);
  const [showEtiquetas, setShowEtiquetas] = useState(false);

  const handleSignOut = async () => {
    onClose();
    await signOut(auth);
    router.push("/auth");
  };

  const navigate = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} maxHeight="92dvh">
        <div className="space-y-5 pb-8">

          {/* Perfil Card */}
          <button
            onClick={() => navigate("/dashboard/perfil")}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 active:bg-slate-100 transition-colors text-left"
          >
            <div className="size-14 rounded-full bg-slate-900 flex items-center justify-center text-[var(--accent)] font-bold text-2xl shadow-lg shadow-slate-900/20 shrink-0">
              {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-base truncate">{user?.displayName || "Usuario"}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest truncate">{user?.email}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>

          {/* Configuración */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] px-1 mb-2">Configuración</p>

            <button
              onClick={() => navigate("/dashboard/ajustes")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                <Settings size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">Ajustes del CRM</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            <button
              onClick={() => setShowEtiquetas(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                <Tags size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">Etiquetas y Categorías</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            <button
              onClick={() => setShowNotifs(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                <Bell size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">Notificaciones</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            <button
              onClick={() => setShowSeguridad(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                <Shield size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">Seguridad</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </div>

          {/* Soporte */}
          <div className="space-y-1 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] px-1 mb-2">Soporte</p>
            <button
              onClick={() => { onClose(); window.open("mailto:contacto@imala.com.ar", "_blank"); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-blue-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-active:bg-blue-500 group-active:text-white transition-colors">
                <HelpCircle size={20} />
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-slate-700 text-sm tracking-tight block">Centro de Ayuda</span>
                <span className="text-[10px] text-slate-400">contacto@imala.com.ar</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </div>

          {/* Cerrar Sesión */}
          <div className="border-t border-slate-100 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 font-bold active:bg-rose-50 active:scale-[0.98] transition-all"
            >
              <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <LogOut size={20} />
              </div>
              <span className="tracking-tight text-sm">Cerrar Sesión</span>
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.3em]">Imalá Vox v2.4.0</p>
          </div>
        </div>
      </BottomSheet>

      <MobileNotificacionesSheet open={showNotifs} onClose={() => setShowNotifs(false)} />
      <MobileSeguridadSheet open={showSeguridad} onClose={() => setShowSeguridad(false)} />
      <MobileEtiquetasSheet open={showEtiquetas} onClose={() => setShowEtiquetas(false)} />
    </>
  );
}
