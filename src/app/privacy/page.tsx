import React from "react";
import { Shield, Lock, Eye, Mail, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1A1A18] font-sans selection:bg-[#C8FF00] selection:text-black">
      {/* Navbar Minimalista */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5E3]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl bg-[#C8FF00] flex items-center justify-center shadow-lg shadow-[#C8FF00]/20 group-hover:scale-105 transition-transform">
              <Image src="/icons/icon-192.png" alt="Logo" width={20} height={20} className="rounded-md" />
            </div>
            <span className="font-black text-sm tracking-tight">Imalá Vox</span>
          </Link>
          <Link 
            href="/"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#A3A39E] hover:text-[#C8FF00] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* HERO AREA */}
        <div className="space-y-6 mb-20 text-center md:text-left">
          <div className="inline-flex size-20 bg-[#C8FF00] rounded-[2.5rem] items-center justify-center shadow-2xl shadow-[#C8FF00]/30 rotate-3">
            <Shield className="w-10 h-10 text-black" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.1]">
              Política de <span className="text-[#C8FF00] [text-shadow:0_0_30px_rgba(200,255,0,0.3)]">Privacidad</span>
            </h1>
            <p className="text-lg text-[#6B6B67] font-medium max-w-2xl leading-relaxed">
              En Imalá Vox, la seguridad de tus datos es nuestra obsesión. 
              Este documento detalla cómo protegemos tu información y la de tus clientes.
            </p>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="space-y-16">
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">1. Información que Recolectamos</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Para proporcionar el servicio de Imalá Vox, recolectamos información básica de contacto 
                (nombre, email, teléfono) y datos necesarios para la integración con Meta (Facebook Messenger, 
                Instagram Direct y Lead Ads). Toda esta información se cifra bajo los más altos estándares de seguridad.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">2. Uso de los Datos de Meta</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm space-y-6">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Nuestra aplicación utiliza las APIs oficiales de Meta para automatizar tu flujo de ventas:
              </p>
              <ul className="space-y-4">
                {[
                  "Responder mensajes de clientes en tiempo real",
                  "Captura inteligente de Leads desde anuncios",
                  "Sincronización de estados y analíticas"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-black" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-[#1A1A18]">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-black rounded-2xl p-6 border-l-4 border-[#C8FF00]">
                <p className="text-xs font-black text-[#C8FF00] uppercase tracking-widest mb-1">Compromiso Inviolable</p>
                <p className="text-sm text-white/70 font-medium">
                  Nunca compartimos tus datos con terceros. Tu información es exclusivamente tuya y se usa solo para potenciar tu CRM.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="text-[#C8FF00]">/</span> 3. Retención de Datos
            </h2>
            <p className="text-[#6B6B67] leading-relaxed font-medium pl-6">
              Guardamos la información mientras tu cuenta esté activa. Si decides irte, puedes solicitar 
              la eliminación total de tus registros en cualquier momento. Cumplimos estrictamente con la 
              protección de datos personales.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">4. Soporte y Consultas</h2>
            </div>
            <div className="bg-[#C8FF00] rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm font-black text-black/40 uppercase tracking-widest mb-1">¿Dudas sobre privacidad?</p>
                <p className="text-xl font-black text-black">Escribinos directamente</p>
              </div>
              <a 
                href="mailto:contacto@imala.com.ar" 
                className="bg-black text-[#C8FF00] px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
              >
                contacto@imala.com.ar
              </a>
            </div>
          </section>

          <div className="pt-20 pb-10 text-center">
            <p className="text-[10px] text-[#A3A39E] font-black uppercase tracking-[0.2em]">
              Última actualización: Abril 2026 • Imalá Vox
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER NEGRO (ESTILO LANDING) */}
      <footer className="bg-[#161615] py-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[#C8FF00] flex items-center justify-center">
              <Image src="/icons/icon-192.png" alt="Logo" width={24} height={24} className="rounded-lg" />
            </div>
            <span className="text-white font-black text-xl tracking-tighter">Imalá Vox</span>
          </div>
          <div className="flex gap-8">
            <Link href="/terms" className="text-xs font-bold text-white/30 hover:text-[#C8FF00] transition-colors uppercase tracking-widest">Términos</Link>
            <Link href="/" className="text-xs font-bold text-white/30 hover:text-[#C8FF00] transition-colors uppercase tracking-widest">Inicio</Link>
          </div>
          <p className="text-[10px] text-white/20 font-medium">© {new Date().getFullYear()} Imalá Vox · Hecho con ❤️ en Argentina</p>
        </div>
      </footer>
    </div>
  );
}
