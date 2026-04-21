import React from "react";
import { FileText, CheckCircle, Globe, ShieldQuestion, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary-light)] font-sans selection:bg-[var(--accent)] selection:text-white">
      {/* Header Decorativo */}
      <div className="h-2 bg-gradient-to-r from-[var(--accent)] via-purple-500 to-pink-500 w-full" />
      
      <main className="max-w-4xl mx-auto px-6 py-20">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </Link>

        <div className="space-y-4 mb-16">
          <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-3xl flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-5xl font-black tracking-tightest leading-tight">
            Términos de <span className="text-[var(--accent)]">Servicio</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary-light)] font-medium max-w-2xl">
            Al utilizar Imalá Vox, aceptas cumplir con estas reglas y pautas diseñadas para 
            mantener la integridad y seguridad de nuestra plataforma CRM.
          </p>
        </div>

        <div className="grid gap-12 text-[var(--text-secondary-light)] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--accent)]" />
              1. Aceptación del Servicio
            </h2>
            <p>
              Imalá Vox proporciona una interfaz para la gestión de clientes y mensajería a través de 
              integraciones oficiales de Meta. Al registrarte, te comprometes a usar estas herramientas 
              de manera ética y acorde a las políticas de Meta Platforms, Inc.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <Globe className="w-5 h-5 text-[var(--accent)]" />
              2. Uso Responsable
            </h2>
            <p>
              El usuario es responsable de todas las comunicaciones enviadas a través de Imalá Vox. 
              No se permite el uso de la plataforma para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>El envío de spam o mensajes masivos no solicitados.</li>
              <li>La difusión de contenido ilegal, acosador o difamatorio.</li>
              <li>Intentar vulnerar la seguridad de otros usuarios o de la plataforma.</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-[var(--border-light)] pt-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <ShieldQuestion className="w-5 h-5 text-[var(--accent)]" />
              3. Propiedad Intelectual
            </h2>
            <p>
              Todos los componentes de Imalá Vox (software, diseño, logos, algoritmos de IA) son 
              propiedad exclusiva de Imalá Vox o sus licenciantes. El uso del servicio no otorga 
              derechos de propiedad sobre la tecnología subyacente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)]">
              4. Limitación de Responsabilidad
            </h2>
            <p>
              Imalá Vox actúa como un procesador de datos intermedio. No nos hacemos responsables 
              por interrupciones imprevistas en los servicios de terceros (como Meta, WhatsApp o 
              proveedores de hosting) que puedan afectar la operación del CRM.
            </p>
          </section>

          <div className="pt-20 text-xs text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest text-center">
            Vigente desde: Abril 2026 • Imalá Vox
          </div>
        </div>
      </main>
      
      {/* Footer Minimalista */}
      <footer className="border-t border-[var(--border-light)] py-12 bg-white/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-[var(--text-tertiary-light)]">
            © {new Date().getFullYear()} Imalá Vox. Gestionado por expertos.
          </p>
        </div>
      </footer>
    </div>
  );
}
