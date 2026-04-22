"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("PWA: Error al registrar Service Worker:", err);
      });
    }
  }, []);
  return null;
}
