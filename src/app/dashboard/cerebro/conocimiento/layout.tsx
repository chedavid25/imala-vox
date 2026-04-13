"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Type, Globe, BookOpen } from "lucide-react";

export default function ConocimientoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Archivos", href: "/dashboard/cerebro/conocimiento/archivos", icon: FileText },
    { label: "Textos Planos", href: "/dashboard/cerebro/conocimiento/textos", icon: Type },
    { label: "Sitios Web", href: "/dashboard/cerebro/conocimiento/webs", icon: Globe },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
          <BookOpen className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Workspace Knowledge</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Base de Conocimiento</h1>
        <p className="text-sm text-[var(--text-tertiary-light)]">
          Administra el pool global de recursos compartidos para todos tus agentes.
        </p>
      </div>

      <div className="border-b border-[var(--border-light)]">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 relative",
                  isActive
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}
