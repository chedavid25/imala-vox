"use client";

import { useState, useEffect } from "react";

export function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Definimos el breakpoint estándar de mobile/tablet
    const mq = window.matchMedia("(max-width: 767px)");
    
    // Función para actualizar el estado
    const checkMobile = () => setIsMobile(mq.matches);
    
    // Ejecutar al montar
    checkMobile();
    
    // Escuchar cambios
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
