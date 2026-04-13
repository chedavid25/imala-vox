"use client";

import React from "react";
import { Globe, Search, Loader2, Play, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function ScraperPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Scraper de Contenido</h1>
        <p className="text-sm text-[var(--text-tertiary-light)]">Extrae información profunda de sitios web para entrenar a tu IA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary-light)]">Lanzar nuevo escaneo</h3>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                  <Input 
                    placeholder="https://ejemplo.com/precios" 
                    className="pl-10 bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl"
                  />
                </div>
                <Button className="bg-[var(--accent)] text-[var(--accent-text)] px-6">Empezar</Button>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-light)] space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary-light)]">
                <span>Estado actual</span>
                <span className="text-[var(--accent)]">En reposo</span>
              </div>
              <div className="h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] w-0" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary-light)] flex items-center gap-2 px-2">
              <Loader2 className="w-4 h-4 text-[var(--accent)]" />
              Escaneos realizados recientemente
            </h3>
            <div className="grid gap-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] p-4 rounded-2xl flex items-center justify-between opacity-50 grayscale">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                    <span className="text-xs font-medium">https://demo.com/pages/{i}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Completado</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Configuración Scraper</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Profundidad (depth)</span>
                <span className="text-[var(--accent)]">Lvl 2</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Timeout</span>
                <span className="text-[var(--accent)]">30s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold border",
      className
    )}>
      {children}
    </span>
  );
}
