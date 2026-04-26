import React from "react";
import { FileText, CheckCircle, Globe, ShieldQuestion, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio",
};

export default function TermsPage() {
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
          <div className="inline-flex size-20 bg-[#C8FF00] rounded-[2.5rem] items-center justify-center shadow-2xl shadow-[#C8FF00]/30 -rotate-3">
            <FileText className="w-10 h-10 text-black" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tightest leading-[1.1]">
              Términos de <span className="text-[#C8FF00] [text-shadow:0_0_30px_rgba(200,255,0,0.3)]">Servicio</span>
            </h1>
            <p className="text-lg text-[#6B6B67] font-medium max-w-2xl leading-relaxed">
              Al utilizar Imalá Vox, te unes a una plataforma diseñada para el crecimiento ético y escalable. 
              Estas reglas aseguran la mejor experiencia para todos.
            </p>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="space-y-16">
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">1. Aceptación del Servicio</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Imalá Vox proporciona una interfaz avanzada para la gestión de clientes y automatización con IA. 
                Al registrarte, aceptas usar estas herramientas acorde a las políticas oficiales de Meta Platforms, Inc. 
                y a nuestra visión de comunicación responsable.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">2. Uso Responsable</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm space-y-6">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Sos responsable de todas las comunicaciones enviadas. Para mantener la calidad del servicio, 
                no se permite:
              </p>
              <ul className="space-y-4">
                {[
                  "Envío de SPAM o mensajes masivos no autorizados",
                  "Difusión de contenido ilegal o acosador",
                  "Vulneración de seguridad o ingeniería inversa"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#C8FF00]" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-[#1A1A18]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <ShieldQuestion className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">3. Propiedad Intelectual</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Todo el ecosistema de Imalá Vox (software, algoritmos de IA, interfaces y marca) es propiedad exclusiva. 
                El acceso al servicio es una suscripción de uso, no una transferencia de tecnología.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-black flex items-center justify-center shrink-0">
                <ShieldQuestion className="w-5 h-5 text-[#C8FF00]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">4. APIs Oficiales y Bloqueos</h2>
            </div>
            <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 shadow-sm space-y-4">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Imalá Vox opera exclusivamente a través de las <span className="text-[#1A1A18] font-bold">APIs oficiales de Meta Platforms, Inc.</span> Esto garantiza el mayor nivel de estabilidad y seguridad posible.
              </p>
              <div className="bg-[#F5F5F4] border-l-4 border-[#C8FF00] rounded-2xl p-6">
                <p className="text-[#6B6B67] text-sm font-bold leading-relaxed">
                  El cumplimiento de las políticas de uso de WhatsApp, Facebook e Instagram es responsabilidad exclusiva del usuario. Imalá Vox no se responsabiliza por suspensiones, bloqueos o limitaciones impuestas por Meta derivadas de un uso inadecuado o reportes de terceros.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="text-[#C8FF00]">/</span> 5. Limitación de Responsabilidad
            </h2>
            <div className="pl-6 border-l-2 border-[#E5E5E3] space-y-4">
              <p className="text-[#6B6B67] leading-relaxed font-medium">
                Actuamos como procesadores de datos. No nos hacemos responsables por fallos técnicos imprevistos 
                en servicios de terceros (Meta, WhatsApp, AWS) que puedan afectar la operación del CRM.
              </p>
            </div>
          </section>

          <div className="pt-20 pb-10 text-center">
            <p className="text-[10px] text-[#A3A39E] font-black uppercase tracking-[0.2em]">
              Vigente desde: Abril 2026 • Imalá Vox
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
            <Link href="/privacy" className="text-xs font-bold text-white/30 hover:text-[#C8FF00] transition-colors uppercase tracking-widest">Privacidad</Link>
            <Link href="/" className="text-xs font-bold text-white/30 hover:text-[#C8FF00] transition-colors uppercase tracking-widest">Inicio</Link>
          </div>
          <p className="text-[10px] text-white/20 font-medium">© {new Date().getFullYear()} Imalá Vox · Innovando desde Argentina</p>
        </div>
      </footer>
    </div>
  );
}
