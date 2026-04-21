import React from "react";
import { Shield, Lock, Eye, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-5xl font-black tracking-tightest leading-tight">
            Política de <span className="text-[var(--accent)]">Privacidad</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary-light)] font-medium max-w-2xl">
            En Imalá Vox, la seguridad de tus datos y la de tus clientes es nuestra máxima prioridad. 
            Este documento explica qué información recolectamos y cómo la protegemos.
          </p>
        </div>

        <div className="grid gap-12 text-[var(--text-secondary-light)] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <Lock className="w-5 h-5 text-[var(--accent)]" />
              1. Información que Recolectamos
            </h2>
            <p>
              Para proporcionar el servicio de Imalá Vox, recolectamos información básica de contacto 
              (nombre, email, teléfono) y datos necesarios para la integración con Meta (Facebook Messenger, 
              Instagram Direct y Lead Ads).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <Eye className="w-5 h-5 text-[var(--accent)]" />
              2. Uso de los Datos de Meta
            </h2>
            <p>
              Nuestra aplicación utiliza los permisos de Meta para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recibir y responder mensajes de tus clientes a través de nuestra plataforma CRM.</li>
              <li>Capturar automáticamente los clientes potenciales (Leads) generados en tus formularios de anuncios.</li>
              <li>Sincronizar el estado de tus conversaciones para brindarte analíticas precisas.</li>
            </ul>
            <p className="font-bold text-[var(--text-primary-light)]">
              IMPORTANTE: Nunca compartimos tus datos ni los de tus clientes con terceros. Tu información es privada y exclusivamente tuya.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--border-light)] pt-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)]">
              3. ¿Por cuánto tiempo guardamos los datos?
            </h2>
            <p>
              Guardamos la información de las interacciones mientras tu cuenta esté activa o según sea necesario 
              para cumplir con nuestras obligaciones legales. Puedes solicitar la eliminación de tus datos en 
              cualquier momento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary-light)] flex items-center gap-3">
              <Mail className="w-5 h-5 text-[var(--accent)]" />
              4. Contacto
            </h2>
            <p>
              Si tienes dudas sobre esta política, puedes escribirnos a: 
              <br />
              <span className="font-bold text-[var(--accent)] mt-2 block">contacto@imala.com.ar</span>
            </p>
          </section>

          <div className="pt-20 text-xs text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest text-center">
            Última actualización: Abril 2026 • Imalá Vox
          </div>
        </div>
      </main>
      
      {/* Footer Minimalista */}
      <footer className="border-t border-[var(--border-light)] py-12 bg-white/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-[var(--text-tertiary-light)]">
            © {new Date().getFullYear()} Imalá Vox. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
