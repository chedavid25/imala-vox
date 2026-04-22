"use client";

import React from "react";
import { BottomSheet } from "./BottomSheet";
import { LogOut, User, Settings, Shield, Bell, HelpCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function MasBottomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  const menuItems = [
    { icon: User, label: "Mi Perfil", path: "/dashboard/perfil", color: "text-slate-700" },
    { icon: Settings, label: "Ajustes del CRM", path: "/dashboard/ajustes", color: "text-slate-700" },
    { icon: Bell, label: "Notificaciones", path: "#", color: "text-slate-700" },
    { icon: Shield, label: "Seguridad", path: "#", color: "text-slate-700" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Centro de Control">
      <div className="p-5 space-y-6 pb-10">
        {/* Perfil Card */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100">
          <div className="size-14 rounded-full bg-slate-900 flex items-center justify-center text-[var(--accent)] font-bold text-2xl shadow-lg shadow-slate-900/20">
            {user?.displayName?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-base">{user?.displayName || "Usuario"}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{user?.email}</p>
          </div>
          <button className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
            <ArrowUpRight size={18} />
          </button>
        </div>

        {/* Grupo de Opciones */}
        <div className="space-y-1.5">
          {menuItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => {
                if (item.path !== "#") router.push(item.path);
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors group"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-active:bg-[var(--accent)] group-active:text-black transition-colors">
                <item.icon size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">{item.label}</span>
              <div className="text-slate-200">
                 <ArrowUpRight size={14} className="rotate-45" />
              </div>
            </button>
          ))}
        </div>

        {/* Soporte y Ayuda */}
        <div className="pt-4 border-t border-slate-100">
           <button className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors">
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                 <HelpCircle size={20} />
              </div>
              <span className="font-semibold text-slate-700 text-sm flex-1 text-left tracking-tight">Centro de Ayuda</span>
           </button>
        </div>
        
        {/* Cerrar Sesión */}
        <div className="pt-2">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 font-bold active:bg-rose-50 active:scale-[0.98] transition-all"
          >
            <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <LogOut size={20} />
            </div>
            <span className="tracking-tight">Cerrar Sesión</span>
          </button>
        </div>

        <div className="text-center pt-4">
           <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.3em]">Imalá Vox v2.4.0</p>
        </div>
      </div>
    </BottomSheet>
  );
}
