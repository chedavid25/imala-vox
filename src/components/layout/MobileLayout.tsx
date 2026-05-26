"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomTabBar } from "./BottomTabBar";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  
  // En vista de conversación abierta ocultamos la barra para dar más espacio al chat
  // Suponiendo que la ruta es /dashboard/operacion/inbox/[id]
  const isConversationOpen = pathname.startsWith("/dashboard/operacion/inbox/") && pathname.split("/").length > 4;

  const tabBarHeight = "calc(64px + env(safe-area-inset-bottom))";

  return (
    <div
      className="flex flex-col w-full bg-[var(--bg-main)] overflow-hidden"
      style={{
        height: "100dvh",           // dvh para iOS Safari (evita problemas con la barra de navegación)
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Área de contenido */}
      <div 
        className="flex-1 overflow-y-auto flex flex-col min-h-0"
        style={{
          paddingBottom: isConversationOpen ? 0 : tabBarHeight,
        }}
      >
        {children}
      </div>

      {/* Navegación Inferior */}
      {!isConversationOpen && <BottomTabBar />}
    </div>
  );
}
