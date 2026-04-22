"use client";

import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  MessageSquare,
  Smartphone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PhoneActionMenuProps {
  phoneNumber: string;
  contactoId?: string | null;
  nombre?: string;
  className?: string;
}

export function PhoneActionMenu({ phoneNumber, contactoId, nombre, className }: PhoneActionMenuProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  const handleCall = () => {
    window.location.href = `tel:${phoneNumber.replace(/\s+/g, '')}`;
  };

  const handleWhatsAppCRM = () => {
    if (!contactoId) {
      toast.info("Primero debés convertir el lead a contacto para iniciar una conversación gestionada.");
      return;
    }
    router.push(`/dashboard/operacion/inbox?contactoId=${contactoId}`);
  };

  const handleWhatsAppDirect = () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "text-[var(--text-primary-light)] font-bold hover:text-[var(--accent)] transition-colors text-left",
            className
          )}
        >
          {phoneNumber}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2 shadow-xl border-none bg-white">
        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2">
          Acciones para {nombre || 'Contacto'}
        </DropdownMenuLabel>
        
        {isMobile && (
          <DropdownMenuItem 
            onClick={handleCall}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Phone className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">Llamar ahora</span>
              <span className="text-[10px] opacity-70">Directo al celular</span>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem 
          onClick={handleWhatsAppCRM}
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-emerald-50 text-emerald-600 transition-colors"
        >
          <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold">Inbox WhatsApp</span>
            <span className="text-[10px] opacity-70">Gestionado por IA</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-slate-50" />

        <DropdownMenuItem 
          onClick={handleWhatsAppDirect}
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors opacity-70"
        >
          <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <ExternalLink className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold">WhatsApp Directo</span>
            <span className="text-[10px] opacity-70">Abrir wa.me</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
