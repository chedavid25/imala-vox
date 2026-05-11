"use client";

import React, { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Shield, Mail, Key, CheckCircle2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileSeguridadSheet({ open, onClose }: Props) {
  const user = auth.currentUser;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSent(true);
      toast.success("Email enviado — revisá tu bandeja");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar el email");
    } finally {
      setSending(false);
    }
  };

  const lastLogin = user?.metadata?.lastSignInTime
    ? format(new Date(user.metadata.lastSignInTime), "d MMM yyyy · HH:mm", { locale: es })
    : null;

  const createdAt = user?.metadata?.creationTime
    ? format(new Date(user.metadata.creationTime), "d MMM yyyy", { locale: es })
    : null;

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="80dvh">
      <div className="space-y-5 pb-8">
        <div className="px-1 pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Seguridad</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Gestioná el acceso a tu cuenta</p>
        </div>

        {/* Info cuenta */}
        <div className="space-y-2">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
            <div className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email de acceso</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.email || "—"}</p>
            </div>
          </div>

          {lastLogin && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
              <div className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Clock size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Último acceso</p>
                <p className="text-sm font-semibold text-slate-700">{lastLogin}</p>
              </div>
            </div>
          )}

          {createdAt && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
              <div className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Shield size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cuenta creada</p>
                <p className="text-sm font-semibold text-slate-700">{createdAt}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] px-1">Contraseña</p>
          {sent ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Email enviado</p>
                <p className="text-xs text-emerald-600">Revisá {user?.email} para cambiar tu contraseña.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handlePasswordReset}
              disabled={sending}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-700">Cambiar contraseña</p>
                <p className="text-[11px] text-slate-400">Te enviamos un link a tu email</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
