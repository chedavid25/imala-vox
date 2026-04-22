"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Target,
  CheckSquare,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { MasBottomSheet } from "@/components/mobile/shared/MasBottomSheet";
import { useConversaciones } from "@/hooks/useConversaciones";

const TABS = [
  {
    id: "inbox",
    label: "Bandeja",
    icon: MessageCircle,
    path: "/dashboard/operacion/inbox",
  },
  {
    id: "leads",
    label: "Leads",
    icon: Target,
    path: "/dashboard/operacion/leads",
  },
  {
    id: "tareas",
    label: "Tareas",
    icon: CheckSquare,
    path: "/dashboard/operacion/tareas",
  },
  {
    id: "contactos",
    label: "Contactos",
    icon: Users,
    path: "/dashboard/operacion/contactos",
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [masOpen, setMasOpen] = useState(false);
  const { conversaciones } = useConversaciones();

  const unreadCount = conversaciones?.filter((c) => (c.unreadCount ?? 0) > 0).length || 0;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center bg-[#1F1F1E] border-t border-[#2A2A28] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        style={{
          height: "calc(64px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative active:scale-95 transition-all"
            >
              <div className="relative">
                <Icon
                  size={24}
                  className={isActive ? "text-[#C8FF00]" : "text-[#6B6B67]"}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.id === "inbox" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider ${
                  isActive ? "text-[#C8FF00]" : "text-[#6B6B67]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setMasOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 active:scale-95 transition-all"
        >
          <MoreHorizontal size={24} className="text-[#6B6B67]" strokeWidth={2} />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B6B67]">Más</span>
        </button>
      </div>

      <MasBottomSheet open={masOpen} onClose={() => setMasOpen(false)} />
    </>
  );
}
