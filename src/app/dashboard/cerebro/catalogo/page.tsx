"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";

export default function CatalogoPage() {  
  return (  
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-12 text-center space-y-6">  
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center">  
        <LayoutGrid className="w-8 h-8 text-[var(--text-tertiary-light)]" />  
      </div>  
      <div className="space-y-2">  
        <h2 className="text-xl font-bold text-[var(--text-primary-light)]">Catálogo de Objetos</h2>  
        <p className="text-sm text-[var(--text-tertiary-light)] max-w-sm">  
          Próximamente podrás gestionar tu catálogo de propiedades y productos,  
          con scraping automático de portales inmobiliarios.  
        </p>  
      </div>  
      <span className="px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs font-bold text-[var(--accent)] uppercase tracking-wider">  
        En desarrollo  
      </span>  
    </div>  
  );  
}
