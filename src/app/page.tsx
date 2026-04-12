import React from "react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="space-y-1">
        <h2 className="text-[32px] font-bold text-[var(--text-primary-light)] tracking-tight">
          Hola, David
        </h2>
        <p className="text-lg text-[var(--text-secondary-light)]">
          Impulsa tu atención al cliente con agentes inteligentes.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard 
          title="Conversaciones IA" 
          value="156" 
          total="2,000" 
          percentage={7.8} 
        />
        <StatsCard 
          title="Contactos CRM" 
          value="432" 
          total="5,000" 
          percentage={8.6} 
        />
      </div>

      <div className="mt-12">
        <h3 className="text-lg font-semibold text-[var(--text-primary-light)] mb-4">
          Acciones rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction title="Nuevo Agente" description="Configura una nueva personalidad" />
          <QuickAction title="Cargar Recurso" description="Agrega PDFs o URLs al cerebro" />
          <QuickAction title="Ver Catálogo" description="Gestiona tus objetos y propiedades" />
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, total, percentage }: { title: string, value: string, total: string, percentage: number }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-6 rounded-xl">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-[13px] font-medium text-[var(--text-secondary-light)] uppercase tracking-wider">
          {title}
        </h4>
        <span className="text-xs font-medium text-[var(--success)]">+12% vs ayer</span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-[var(--text-primary-light)]">{value}</span>
        <span className="text-sm text-[var(--text-tertiary-light)]">/ {total}</span>
      </div>
      <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--success)] rounded-full" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-4 rounded-xl hover:border-[var(--border-light-strong)] cursor-pointer transition-colors group">
      <h4 className="text-sm font-semibold text-[var(--text-primary-light)] group-hover:text-[var(--accent-text)] transition-colors">
        {title}
      </h4>
      <p className="text-[13px] text-[var(--text-secondary-light)]">{description}</p>
    </div>
  );
}
