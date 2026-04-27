"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check, X, ChevronDown, Menu, MessageSquare, Bot, Users,
  Zap, Globe, ArrowRight, Star, Brain, GitBranch, Inbox,
  Target, LayoutGrid, Megaphone, Shield, Clock, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { Reveal } from "@/components/ui/Reveal";

// ─────────────────────────────────────────────
// MOCKUP: Browser chrome wrapper
// ─────────────────────────────────────────────
function BrowserChrome({ children, url = "app.imalavox.com" }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
      <div className="bg-[#161615] px-4 py-2.5 flex items-center gap-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 bg-white/5 rounded-full h-5 flex items-center justify-center">
          <span className="text-[10px] text-white/30 font-medium">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// MOCKUP: Inbox / bandeja de entrada
// ─────────────────────────────────────────────
function InboxMockup() {
  const convs = [
    { name: "María García", msg: "Hola! Tienen disponible el...", time: "ahora", channel: "WA", unread: true, active: true },
    { name: "Carlos López", msg: "¿Cuánto cuesta el plan pro?", time: "2m", channel: "IG", unread: true },
    { name: "Ana Martínez", msg: "Perfecto, lo confirmo 👍", time: "8m", channel: "WA" },
    { name: "Pedro Ruiz", msg: "Gracias por la info!", time: "15m", channel: "FB" },
  ];
  return (
    <BrowserChrome>
      <div className="flex h-[320px] bg-[#1F1F1E] overflow-hidden">
        {/* Mini sidebar */}
        <div className="w-14 bg-[#161615] border-r border-white/5 flex flex-col items-center py-3 gap-3 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#C8FF00] flex items-center justify-center mb-1">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          {[Inbox, Target, Users, LayoutGrid].map((Icon, i) => (
            <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", i === 0 ? "bg-[#2A2A28] text-[#C8FF00]" : "text-[#555552]")}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          ))}
        </div>
        {/* Lista conversaciones */}
        <div className="w-44 border-r border-white/5 overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-white/5">
            <div className="bg-white/5 rounded-lg h-6 flex items-center px-2">
              <span className="text-[9px] text-white/30">Buscar...</span>
            </div>
          </div>
          {convs.map((c, i) => (
            <div key={i} className={cn("px-3 py-2 border-b border-white/5 flex items-start gap-2 cursor-pointer", c.active && "bg-[#2A2A28]")}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8FF00]/30 to-[#C8FF00]/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-[#C8FF00] mt-0.5">
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/80 truncate">{c.name}</span>
                  <span className="text-[8px] text-white/30 shrink-0 ml-1">{c.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[9px] text-white/40 truncate">{c.msg}</span>
                  {c.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] shrink-0 ml-1" />}
                </div>
                <span className={cn("text-[7px] font-black px-1 py-0.5 rounded mt-0.5 inline-block",
                  c.channel === "WA" ? "bg-green-500/20 text-green-400" :
                  c.channel === "IG" ? "bg-pink-500/20 text-pink-400" :
                  "bg-blue-500/20 text-blue-400"
                )}>{c.channel}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Chat view */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#C8FF00]/20 flex items-center justify-center text-[9px] font-bold text-[#C8FF00]">M</div>
            <span className="text-[11px] font-bold text-white/80">María García</span>
            <span className="ml-auto text-[8px] bg-[#C8FF00]/10 text-[#C8FF00] px-2 py-0.5 rounded-full font-bold">IA Activa</span>
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-hidden">
            <div className="flex justify-end">
              <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/20 rounded-2xl rounded-tr-sm px-3 py-1.5 max-w-[70%]">
                <p className="text-[9px] text-[#C8FF00]">Hola! Tienen disponible el servicio para mi empresa?</p>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="w-5 h-5 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                <Bot className="w-2.5 h-2.5 text-black" />
              </div>
              <div className="bg-[#2A2A28] border border-white/5 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[75%]">
                <p className="text-[9px] text-white/80">¡Hola María! Claro que sí 😊 Tenemos planes desde $35/mes. ¿Para qué tipo de negocio lo necesitás?</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/20 rounded-2xl rounded-tr-sm px-3 py-1.5 max-w-[70%]">
                <p className="text-[9px] text-[#C8FF00]">Tengo una tienda de ropa, con Instagram y WhatsApp</p>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="w-5 h-5 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                <Bot className="w-2.5 h-2.5 text-black" />
              </div>
              <div className="bg-[#2A2A28] border border-white/5 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[75%]">
                <div className="flex gap-1 items-center">
                  <div className="w-1 h-1 rounded-full bg-[#C8FF00] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1 h-1 rounded-full bg-[#C8FF00] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1 h-1 rounded-full bg-[#C8FF00] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ─────────────────────────────────────────────
// MOCKUP: CRM Leads
// ─────────────────────────────────────────────
function LeadsMockup() {
  const leads = [
    { name: "Sofía Rodríguez", source: "Meta Ads", stage: "Nuevo", channel: "IG", value: "$45.000" },
    { name: "Juan Pérez", source: "WhatsApp", stage: "En seguimiento", channel: "WA", value: "$28.000" },
    { name: "Laura Díaz", source: "Meta Ads", stage: "Calificado", channel: "FB", value: "$72.000" },
    { name: "Marcos Villa", source: "Instagram", stage: "Cerrado ✓", channel: "IG", value: "$55.000" },
  ];
  return (
    <BrowserChrome url="app.imalavox.com/leads">
      <div className="bg-[#F5F5F4] h-[300px] overflow-hidden">
        <div className="bg-white border-b border-[#E5E5E3] px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#1A1A18]">Leads · 24 activos</span>
          <div className="flex gap-2">
            <span className="text-[9px] bg-[#C8FF00] text-black font-black px-2 py-1 rounded-lg">+ Nuevo Lead</span>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="grid grid-cols-5 px-4 py-1.5 text-[8px] font-black text-[#A3A39E] uppercase tracking-wider border-b border-[#E5E5E3]">
            <span>Nombre</span><span>Fuente</span><span>Etapa</span><span>Canal</span><span>Valor</span>
          </div>
          {leads.map((l, i) => (
            <div key={i} className="grid grid-cols-5 px-4 py-2 border-b border-[#E5E5E3] items-center hover:bg-[#F5F5F4]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1F1F1E] flex items-center justify-center text-[8px] text-[#C8FF00] font-bold">{l.name.charAt(0)}</div>
                <span className="text-[9px] font-bold text-[#1A1A18] truncate">{l.name}</span>
              </div>
              <span className="text-[9px] text-[#6B6B67]">{l.source}</span>
              <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full w-fit",
                l.stage === "Cerrado ✓" ? "bg-emerald-100 text-emerald-700" :
                l.stage === "Calificado" ? "bg-blue-100 text-blue-700" :
                l.stage === "En seguimiento" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              )}>{l.stage}</span>
              <span className={cn("text-[7px] font-black px-1 rounded",
                l.channel === "WA" ? "bg-green-100 text-green-700" :
                l.channel === "IG" ? "bg-pink-100 text-pink-700" :
                "bg-blue-100 text-blue-700"
              )}>{l.channel}</span>
              <span className="text-[9px] font-bold text-[#1A1A18]">{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

// ─────────────────────────────────────────────
// MOCKUP: Knowledge Base
// ─────────────────────────────────────────────
function KnowledgeMockup() {
  const files = [
    { name: "Catálogo de productos 2025.pdf", type: "PDF", size: "2.4 MB", status: "Activo" },
    { name: "Preguntas frecuentes.txt", type: "Texto", size: "45 KB", status: "Activo" },
    { name: "www.mitienda.com.ar", type: "Web", size: "—", status: "Activo" },
    { name: "Políticas de envío.pdf", type: "PDF", size: "180 KB", status: "Activo" },
  ];
  return (
    <BrowserChrome url="app.imalavox.com/cerebro">
      <div className="bg-[#1F1F1E] h-[280px] overflow-hidden p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#C8FF00]" />
            <span className="text-[11px] font-bold text-white/80">Base de Conocimiento</span>
          </div>
          <span className="text-[8px] bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 px-2 py-0.5 rounded-full font-bold">4 fuentes activas</span>
        </div>
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-[#2A2A28] border border-white/5 rounded-xl px-3 py-2">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[7px] font-black shrink-0",
              f.type === "PDF" ? "bg-red-500/20 text-red-400" :
              f.type === "Web" ? "bg-blue-500/20 text-blue-400" :
              "bg-purple-500/20 text-purple-400"
            )}>{f.type}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-white/80 truncate">{f.name}</p>
              <p className="text-[8px] text-white/30">{f.size}</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00]" />
              <span className="text-[8px] text-[#C8FF00] font-bold">{f.status}</span>
            </div>
          </div>
        ))}
      </div>
    </BrowserChrome>
  );
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#1F1F1E]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icons/icon-192.png" alt="Imalá Vox" width={32} height={32} className="rounded-xl" />
          <span className="text-white font-bold text-lg tracking-tight">Imalá Vox</span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Funciones", href: "#funciones" },
            { label: "Precios", href: "#precios" },
            { label: "Canales", href: "#canales" },
            { label: "FAQ", href: "#faq" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard/operacion/inbox"
              className="bg-[#C8FF00] text-black text-sm font-black px-5 py-2 rounded-xl hover:bg-[#B8EF00] transition-all active:scale-95 shadow-lg shadow-[#C8FF00]/20 flex items-center gap-2"
            >
              Ir al dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/auth" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
                Iniciar sesión
              </Link>
              <Link href="/auth" className="bg-[#C8FF00] text-black text-sm font-black px-5 py-2 rounded-xl hover:bg-[#B8EF00] transition-all active:scale-95 shadow-lg shadow-[#C8FF00]/20">
                Probar gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMenuOpen(v => !v)}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#1F1F1E] border-t border-white/5 px-6 py-4 space-y-4">
          {[{ label: "Funciones", href: "#funciones" }, { label: "Precios", href: "#precios" }, { label: "FAQ", href: "#faq" }].map(l => (
            <a key={l.href} href={l.href} className="block text-sm text-white/70 hover:text-white" onClick={() => setMenuOpen(false)}>{l.label}</a>
          ))}
          <div className="pt-2 space-y-2">
            {isLoggedIn ? (
              <Link href="/dashboard/operacion/inbox" className="block text-center py-2.5 text-sm font-black bg-[#C8FF00] text-black rounded-xl">
                Ir al dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth" className="block text-center py-2.5 text-sm font-medium text-white/60 border border-white/10 rounded-xl">Iniciar sesión</Link>
                <Link href="/auth" className="block text-center py-2.5 text-sm font-black bg-[#C8FF00] text-black rounded-xl">Probar gratis</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function HeroSection() {
  return (
    <section id="inicio" className="relative bg-[#1F1F1E] min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Grid de puntos de fondo */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, #C8FF00 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />
      {/* Glow central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C8FF00] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <Reveal animation="fade-in-up" delay={100}>
          <div className="inline-flex items-center gap-2 bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00] text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            <Bot className="w-3.5 h-3.5" />
            Agentes IA para WhatsApp, Instagram y Facebook
          </div>
        </Reveal>

        {/* Titular */}
        <Reveal animation="fade-in-up" delay={200}>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-4xl">
            Tus clientes escriben<br />
            a las 3am.{" "}
            <span className="text-[#C8FF00]">Tu negocio<br />
            les responde.</span>
          </h1>
        </Reveal>

        {/* Subtítulo */}
        <Reveal animation="fade-in-up" delay={300}>
          <p className="text-lg md:text-xl text-white/55 max-w-2xl leading-relaxed mb-10 font-medium">
            Imalá Vox crea agentes de inteligencia artificial que atienden, califican y venden por vos —
            en todos tus canales, las 24 horas, sin que tengas que estar presente.
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal animation="fade-in-up" delay={400}>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <Link
              href="/auth"
              className="w-full sm:w-auto bg-[#C8FF00] text-black font-black px-8 py-4 rounded-2xl text-base hover:bg-[#B8EF00] transition-all active:scale-95 shadow-2xl shadow-[#C8FF00]/20 flex items-center gap-2 justify-center"
            >
              Empezar gratis — 7 días
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#funciones"
              className="w-full sm:w-auto border border-white/15 text-white/70 font-bold px-8 py-4 rounded-2xl text-base hover:border-white/30 hover:text-white transition-all flex items-center gap-2 justify-center"
            >
              Ver funciones
            </a>
          </div>
        </Reveal>

        {/* Mockup con stats flotantes */}
        <Reveal animation="fade-in-up" delay={500} className="relative w-full max-w-4xl">
          {/* Stats flotantes */}
          <div className="absolute -top-4 -left-4 md:-left-8 z-20 bg-[#1F1F1E] border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl hidden sm:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8FF00]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#C8FF00]" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 font-medium">Tiempo de respuesta</p>
              <p className="text-sm font-black text-white">&lt; 2 segundos</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 md:-right-8 z-20 bg-[#1F1F1E] border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl hidden sm:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8FF00]/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#C8FF00]" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 font-medium">Disponibilidad</p>
              <p className="text-sm font-black text-white">24/7 todos los días</p>
            </div>
          </div>
          <InboxMockup />
          <p className="text-xs text-white/25 mt-4 font-medium">Sin tarjeta de crédito · Configuración en menos de 1 hora</p>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SOCIAL PROOF
// ─────────────────────────────────────────────
function SocialProofSection() {
  const stats = [
    { value: "24/7", label: "Disponibilidad" },
    { value: "< 2s", label: "Respuesta" },
    { value: "4", label: "Canales" },
  ];
  return (
    <section className="bg-white border-y border-[#E5E5E3] py-20">
      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* Título Resaltado */}
        <Reveal animation="fade-in-up">
          <div className="inline-block bg-[#1A1A18] px-6 py-2 rounded-full mb-12 shadow-xl shadow-black/10">
            <p className="text-[10px] font-black text-[#C8FF00] uppercase tracking-[0.3em]">
              Tu negocio conectado a todo el ecosistema de Meta
            </p>
          </div>
        </Reveal>

        {/* Logos Oficiales a Color */}
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 mb-20">
          {[
            { img: "whatsapp/25D366", label: "WhatsApp Business" },
            { img: "instagram/E4405F", label: "Instagram" },
            { img: "facebook/1877F2", label: "Facebook" },
            { img: "meta/0668E1", label: "Meta Leads" },
          ].map((logo, i) => (
            <Reveal key={i} animation="zoom-in" delay={i * 100}>
              <div className="flex items-center gap-3 group cursor-pointer">
                <img src={`https://cdn.simpleicons.org/${logo.img}`} alt={logo.label} className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-[#1A1A18] tracking-tight">{logo.label}</span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stats en Fondo Oscuro */}
        <Reveal animation="fade-in-up" delay={200}>
          <div className="bg-[#1F1F1E] rounded-[3rem] p-12 max-w-4xl mx-auto shadow-[0_40px_100px_rgba(0,0,0,0.15)]">
            <div className="grid grid-cols-3 gap-8 items-center">
              {stats.map((s, i) => (
                <div key={i} className="space-y-3">
                  <p className={cn(
                    "text-4xl md:text-6xl font-black",
                    s.value === "4" ? "text-[#C8FF00] [text-shadow:0_0_30px_rgba(200,255,0,0.4)]" : "text-white"
                  )}>
                    {s.value}
                  </p>
                  <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// PROBLEMA
// ─────────────────────────────────────────────
function ProblemSection() {
  const pains = [
    {
      icon: MessageSquare,
      title: "Mensajes sin responder",
      desc: "Un cliente que espera más de 5 minutos tiene 10 veces menos chances de comprar. Y vos tenés decenas de chats abiertos al mismo tiempo.",
    },
    {
      icon: Clock,
      title: "Tu horario, su límite",
      desc: "Tu negocio cierra. Las consultas no. Cada noche perdés oportunidades que tus competidores —que ya usan IA— sí aprovechan.",
    },
    {
      icon: Zap,
      title: "Demasiados canales",
      desc: "WhatsApp, Instagram y Facebook al mismo tiempo, sin un sistema. El caos hace que leads calificados se te pierdan entre las notificaciones.",
    },
  ];
  return (
    <section className="bg-[#1F1F1E] py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-white/10" />
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-black text-[#C8FF00]/60 uppercase tracking-widest">El problema</span>
          <h2 className="text-3xl md:text-5xl font-black text-white mt-3 leading-tight">
            Gestionar mensajes manualmente<br />
            <span className="text-white/40">te está costando clientes</span>
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pains.map((p, i) => (
            <Reveal key={i} animation="fade-in-up" delay={i * 150}>
              <div className="bg-[#2A2A28] border border-white/5 rounded-3xl p-8 h-full space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#C8FF00]/10 border border-[#C8FF00]/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-[#C8FF00]" />
                </div>
                <h3 className="text-lg font-bold text-white">{p.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed font-medium">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SOLUCIÓN — 3 pilares
// ─────────────────────────────────────────────
function SolutionSection() {
  const pillars = [
    { icon: Inbox, tag: "Capturá", title: "Todos tus canales, una sola bandeja", desc: "WhatsApp, Instagram y Facebook unificados. Nunca más pierdas un mensaje por estar en la app equivocada. Tu equipo trabaja desde un solo lugar." },
    { icon: Bot, tag: "Convertí", title: "El agente que vende mientras dormís", desc: "Entrenalo con tu catálogo, precios y objeciones frecuentes. Responde dudas, sugiere productos y cierra ventas solo — sin horario ni descanso." },
    { icon: Target, tag: "Fidelizá", title: "Seguimiento automático con cara humana", desc: "Difusiones personalizadas, seguimiento de leads de Meta Ads y tareas automáticas para que ningún cliente quede en el olvido." },
  ];
  return (
    <section id="solucion" className="bg-[#F5F5F4] py-24 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-black text-[#A3A39E] uppercase tracking-widest">La solución</span>
          <h2 className="text-3xl md:text-5xl font-black text-[#1A1A18] mt-3 leading-tight">
            Un agente que conoce tu negocio<br />
            <span className="text-[#C8FF00]">mejor que nadie</span>
          </h2>
          <p className="text-base text-[#6B6B67] mt-4 max-w-xl mx-auto font-medium">
            Entrenás a Imalá Vox con tu información una sola vez. Él hace el resto.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <Reveal key={i} animation="zoom-in" delay={i * 150}>
              <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 h-full space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#1F1F1E] flex items-center justify-center">
                    <p.icon className="w-4.5 h-4.5 text-[#C8FF00]" style={{ width: 18, height: 18 }} />
                  </div>
                  <span className="text-xs font-black text-[#A3A39E] uppercase tracking-widest">{p.tag}</span>
                </div>
                <h3 className="text-lg font-bold text-[#1A1A18] leading-snug">{p.title}</h3>
                <p className="text-sm text-[#6B6B67] leading-relaxed font-medium">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FEATURES — alternadas
// ─────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      id: "agentes",
      dark: false,
      tag: "Agentes IA",
      title: "Entrenalo con tu información en minutos",
      desc: "Subí PDFs, links de tu web y textos propios. El agente aprende tu negocio, tus precios, tus políticas. Vos controlás qué sabe y cómo responde.",
      bullets: ["PDF, sitios web, textos propios", "Respuestas en el tono de tu marca", "Actualización de conocimiento en tiempo real"],
      mockup: <KnowledgeMockup />,
    },
    {
      id: "crm",
      dark: true,
      tag: "CRM Integrado",
      title: "Tu pipeline de ventas, sin herramientas extra",
      desc: "Leads capturados desde Meta Ads, gestión de contactos, tareas y seguimiento — todo dentro de Imalá Vox. Sin pagar por otro CRM.",
      bullets: ["Leads desde campañas de Facebook e Instagram", "Contactos con historial completo", "Tareas y recordatorios automáticos"],
      mockup: <LeadsMockup />,
    },
    {
      id: "difusion",
      dark: false,
      tag: "Difusión Masiva",
      title: "Llegá a todos tus clientes con un click",
      desc: "Mandá campañas de WhatsApp a listas segmentadas por etiquetas. Ofertas, novedades, recordatorios. El agente gestiona las respuestas automáticamente.",
      bullets: ["Segmentación por etiquetas personalizadas", "Programación de envíos", "Respuestas gestionadas por el agente IA"],
      mockup: (
        <BrowserChrome url="app.imalavox.com/difusion">
          <div className="bg-[#F5F5F4] h-[260px] p-5 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1A18]">Nueva Difusión</span>
              <span className="text-[9px] bg-[#C8FF00] text-black font-black px-2 py-1 rounded-lg">Enviar ahora</span>
            </div>
            {[
              { label: "Nombre", value: "Promo Fin de Semana 🔥" },
              { label: "Audiencia", value: "Clientes activos (342 contactos)" },
              { label: "Canal", value: "WhatsApp Business" },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-[#E5E5E3] rounded-xl p-3">
                <p className="text-[8px] text-[#A3A39E] font-bold uppercase tracking-wider mb-1">{f.label}</p>
                <p className="text-[10px] font-bold text-[#1A1A18]">{f.value}</p>
              </div>
            ))}
            <div className="bg-white border border-[#E5E5E3] rounded-xl p-3">
              <p className="text-[8px] text-[#A3A39E] font-bold uppercase tracking-wider mb-1">Mensaje</p>
              <p className="text-[9px] text-[#6B6B67]">Hola {"{{nombre}}"} 👋 Este fin de semana tenemos 20% de descuento en toda la tienda. ¡Solo por 48hs!</p>
            </div>
          </div>
        </BrowserChrome>
      ),
    },
  ];

  return (
    <section id="funciones" className="scroll-mt-16">
      {features.map((f, i) => (
        <div key={f.id} className={cn("py-24", f.dark ? "bg-[#1F1F1E]" : "bg-white")}>
          <div className="max-w-7xl mx-auto px-6">
            <div className={cn("flex flex-col gap-12 items-center", i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row")}>
              {/* Texto */}
              <Reveal animation={i % 2 === 0 ? "fade-in-left" : "fade-in-right"} className="flex-1 space-y-6">
                <span className={cn("text-xs font-black uppercase tracking-widest", f.dark ? "text-[#C8FF00]/60" : "text-[#A3A39E]")}>
                  {f.tag}
                </span>
                <h2 className={cn("text-3xl md:text-4xl font-black leading-tight", f.dark ? "text-white" : "text-[#1A1A18]")}>
                  {f.title}
                </h2>
                <p className={cn("text-base leading-relaxed font-medium", f.dark ? "text-white/50" : "text-[#6B6B67]")}>
                  {f.desc}
                </p>
                <ul className="space-y-3">
                  {f.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(200,255,0,0.2)]">
                        <Check className="w-3 h-3 text-[#1A1A18]" strokeWidth={4} />
                      </div>
                      <span className={cn("text-sm font-bold", f.dark ? "text-white/70" : "text-[#1A1A18]")}>{b}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              {/* Mockup */}
              <Reveal animation="zoom-in" delay={200} className="flex-1 w-full max-w-lg">
                {f.mockup}
              </Reveal>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ─────────────────────────────────────────────
// CANALES
// ─────────────────────────────────────────────
function ChannelsSection() {
  const channels = [
    {
      icon: "https://cdn.simpleicons.org/whatsapp/25D366",
      name: "WhatsApp Business",
      desc: "El canal #1 de consultas en Argentina y Latam. Respuestas automáticas, mensajes ricos con imágenes y catálogo, y seguimiento completo de cada conversación.",
      badge: "Más usado",
    },
    {
      icon: "https://cdn.simpleicons.org/instagram/E4405F",
      name: "Instagram DMs",
      desc: "Capturá los leads que llegan por tus stories, publicaciones y perfil. El agente responde en segundos y los convierte en clientes antes de que se enfríen.",
      badge: null,
    },
    {
      icon: "https://cdn.simpleicons.org/facebook/1877F2",
      name: "Facebook Messenger",
      desc: "Automatizá las respuestas de tu página de Facebook. Sincronizá tus chats y mantené el historial completo de cada cliente en un solo lugar.",
      badge: null,
    },
    {
      icon: "https://cdn.simpleicons.org/meta/0668E1",
      name: "Meta Leads",
      desc: "Sincronización directa con tus campañas de anuncios. Capturá y procesá cada formulario de Meta Ads al instante para que no se enfríe ningún lead.",
      badge: "Nuevo",
    },
  ];
  return (
    <section id="canales" className="scroll-mt-16 bg-[#F5F5F4] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-16">
          <span className="text-xs font-black text-[#A3A39E] uppercase tracking-widest">Canales incluidos en todos los planes</span>
          <h2 className="text-3xl md:text-5xl font-black text-[#1A1A18] mt-3 leading-tight">
            Donde ya están tus clientes
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.map((c, i) => (
            <Reveal key={i} animation="fade-in-up" delay={i * 100}>
              <div className="bg-white border border-[#E5E5E3] rounded-3xl p-8 h-full space-y-4 relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                {c.badge && (
                  <div className={cn(
                    "absolute top-6 right-6 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                    c.badge === "Nuevo" ? "bg-black text-[#C8FF00]" : "bg-[#C8FF00] text-black"
                  )}>
                    {c.badge}
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-[#F5F5F4] flex items-center justify-center">
                  <img src={c.icon} alt={c.name} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A18]">{c.name}</h3>
                <p className="text-sm text-[#6B6B67] leading-relaxed font-medium">{c.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────
type Plan = 'starter' | 'pro' | 'agencia';

const PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  starter: { monthly: 35, yearly: 29 },
  pro:     { monthly: 79, yearly: 66 },
  agencia: { monthly: 179, yearly: 149 },
};

type PlanFeatureGroup = { label: string; items: string[]; locked?: boolean };
const PRICING_FEATURES: Record<Plan, { tag?: string; inheritsFrom?: string; groups: PlanFeatureGroup[] }> = {
  starter: {
    groups: [
      { label: "IA & Agentes", items: ["1 Agente Inteligente", "1.000 conversaciones/mes", "Base de conocimiento (PDF, webs)"] },
      { label: "Canales", items: ["WhatsApp · Instagram · Facebook"] },
      { label: "CRM", items: ["1.500 contactos CRM", "Leads, Tareas y Contactos", "Etiquetas y segmentación"] },
      { label: "No incluido", locked: true, items: ["Catálogo de productos", "Difusión masiva", "Meta Ads · Captura de leads", "Workflows"] },
    ],
  },
  pro: {
    tag: "Más popular",
    inheritsFrom: "Starter",
    groups: [
      { label: "IA & Agentes", items: ["Hasta 3 Agentes Inteligentes", "3.000 conversaciones/mes", "5.000 contactos CRM"] },
      { label: "Marketing", items: ["Catálogo de productos (200 items)", "Difusión masiva (hasta 1.000/envío)", "Meta Ads · Leads de campañas"] },
      { label: "No incluido", locked: true, items: ["Workflows automatizados"] },
    ],
  },
  agencia: {
    inheritsFrom: "Pro",
    groups: [
      { label: "IA & Agentes", items: ["Hasta 10 Agentes Inteligentes", "10.000 conversaciones/mes", "Contactos ilimitados"] },
      { label: "Marketing ampliado", items: ["Catálogo ilimitado de productos", "Difusión masiva sin límite"] },
      { label: "Automatización", items: ["Workflows automatizados"] },
    ],
  },
};

function PricingSection() {
  const [isAnual, setIsAnual] = useState(false);
  const plans: Plan[] = ["starter", "pro", "agencia"];

  return (
    <section id="precios" className="scroll-mt-16 bg-[#1F1F1E] py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8FF00] opacity-[0.03] blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <Reveal className="text-center mb-12">
          <span className="text-xs font-black text-[#C8FF00]/60 uppercase tracking-widest">Precios</span>
          <h2 className="text-3xl md:text-5xl font-black text-white mt-3 leading-tight">
            Elegí tu plan
          </h2>
          <p className="text-base text-white/40 mt-3 font-medium">
            Sin contratos. Sin tarjeta para empezar. Cancelás cuando querés.
          </p>

          {/* Toggle mensual / anual */}
          <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mt-8">
            <button
              onClick={() => setIsAnual(false)}
              className={cn("px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                !isAnual ? "bg-[#C8FF00] text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >Mensual</button>
            <button
              onClick={() => setIsAnual(true)}
              className={cn("px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                isAnual ? "bg-[#C8FF00] text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Anual
              <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">−20%</span>
            </button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const price = isAnual ? PRICES[p].yearly : PRICES[p].monthly;
            const display = PRICING_FEATURES[p];
            const isPro = p === "pro";
            return (
              <Reveal key={p} animation="fade-in-up" delay={i * 150}>
                <div className={cn(
                  "rounded-3xl flex flex-col h-full relative overflow-hidden",
                  isPro
                    ? "bg-[#C8FF00] shadow-2xl shadow-[#C8FF00]/10 scale-[1.03]"
                    : "bg-[#2A2A28] border border-white/5"
                )}>
                  {display.tag && (
                    <div className={cn("text-center py-2 text-[9px] font-black uppercase tracking-widest",
                      isPro ? "bg-black/10 text-black/60" : "bg-[#C8FF00]/10 text-[#C8FF00]"
                    )}>
                      {display.tag}
                    </div>
                  )}
                  <div className="p-8 space-y-1">
                    <h3 className={cn("text-xs font-black uppercase tracking-widest", isPro ? "text-black/50" : "text-white/40")}>
                      {p}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={cn("text-4xl font-black", isPro ? "text-black" : "text-white")}>${price}</span>
                      <span className={cn("text-xs font-bold uppercase", isPro ? "text-black/40" : "text-white/30")}>USD/mes</span>
                    </div>
                    {isAnual && (
                      <p className={cn("text-[10px] font-bold", isPro ? "text-black/50" : "text-white/30")}>
                        Facturado anualmente
                      </p>
                    )}
                  </div>

                  <div className={cn("flex-1 px-8 pb-8 space-y-3 border-t", isPro ? "border-black/10" : "border-white/5")}>
                    <div className="pt-5 space-y-3">
                      {display.inheritsFrom && (
                        <div className={cn("flex items-center gap-2 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                          isPro ? "bg-black/10 border-black/10 text-black/50" : "bg-[#C8FF00]/5 border-[#C8FF00]/10 text-[#C8FF00]/60"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isPro ? "bg-black/30" : "bg-[#C8FF00]/40")} />
                          Todo el {display.inheritsFrom}, más:
                        </div>
                      )}
                      {display.groups.map((g, gi) => (
                        <div key={gi} className="space-y-1.5">
                          <p className={cn("text-[9px] font-black uppercase tracking-widest px-1",
                            g.locked ? (isPro ? "text-black/25" : "text-white/15") : (isPro ? "text-black/40" : "text-white/30")
                          )}>{g.label}</p>
                          {g.items.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2">
                              {g.locked ? (
                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                  isPro ? "bg-black/5 border-black/10" : "bg-white/5 border-white/5"
                                )}>
                                  <X className={cn("w-2.5 h-2.5", isPro ? "text-black/25" : "text-white/15")} />
                                </div>
                              ) : (
                                <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                                  isPro ? "bg-black" : "bg-[#C8FF00]"
                                )}>
                                  <Check className={cn("w-2.5 h-2.5", isPro ? "text-[#C8FF00]" : "text-[#1A1A18]")} strokeWidth={4} />
                                </div>
                              )}
                              <span className={cn("text-[11px] font-bold",
                                g.locked
                                  ? (isPro ? "text-black/25 line-through decoration-black/20 decoration-1" : "text-white/20 line-through decoration-white/10 decoration-1")
                                  : (isPro ? "text-black/80" : "text-white/70")
                              )}>{item}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-8 pb-8">
                    <Link
                      href="/auth"
                      className={cn(
                        "w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                        isPro
                          ? "bg-[#1F1F1E] text-[#C8FF00] hover:bg-[#161615] shadow-xl shadow-black/20"
                          : "bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00] hover:bg-[#C8FF00]/20"
                      )}
                    >
                      Probar gratis 7 días
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="text-center text-xs text-white/25 mt-8 font-medium">
          Precios en USD · Cobrado en ARS al dólar blue del día · Sin tarjeta para la prueba gratuita
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
const FAQS = [
  { q: "¿Necesito conocimientos técnicos para configurarlo?", a: "No. La configuración es visual e intuitiva. En menos de una hora tenés tu agente funcionando con tu información. Si necesitás ayuda, nuestro equipo te acompaña en el proceso." },
  { q: "¿El agente suena como un bot o como una persona?", a: "Depende de cómo lo configurés. Podés darle nombre, personalidad y un tono específico. La mayoría de los clientes no se dan cuenta de que es IA hasta que les decís." },
  { q: "¿Qué pasa si el agente no sabe responder algo?", a: "El agente puede escalar automáticamente la conversación a un humano cuando detecta que no tiene la respuesta. Vos definís las reglas de escalada." },
  { q: "¿Puedo conectar mi WhatsApp actual?", a: "Sí, usando la API oficial de WhatsApp Business. Te guiamos paso a paso en todo el proceso de conexión, que lleva menos de 30 minutos." },
  { q: "¿Cómo se cobran los precios en Argentina?", a: "Los precios base son en USD pero se cobran en ARS usando la cotización blue del día (con ajuste trimestral para mayor estabilidad). Se procesan vía MercadoPago." },
  { q: "¿Puedo cancelar cuando quiero?", a: "Sí, sin penalidades ni letras chicas. Cancelás desde el panel y tu plan se mantiene activo hasta el fin del período pago. Tus datos se guardan 30 días después." },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="scroll-mt-16 bg-white py-24">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <span className="text-xs font-black text-[#A3A39E] uppercase tracking-widest">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A1A18] mt-3">Preguntas frecuentes</h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} animation="fade-in-up" delay={i * 50}>
              <div className="border border-[#E5E5E3] rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#F5F5F4] transition-colors"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="text-sm font-bold text-[#1A1A18] pr-4">{f.q}</span>
                  <ChevronDown className={cn("w-4 h-4 text-[#A3A39E] shrink-0 transition-transform", open === i && "rotate-180")} />
                </button>
                {open === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-[#6B6B67] leading-relaxed font-medium">{f.a}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CTA FINAL
// ─────────────────────────────────────────────
function FinalCTASection() {
  return (
    <section className="bg-[#1F1F1E] py-32 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "radial-gradient(circle, #C8FF00 1px, transparent 1px)",
        backgroundSize: "28px 28px"
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C8FF00] opacity-[0.05] blur-[120px] rounded-full pointer-events-none" />
      <Reveal className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
          Tu próximo cliente<br />
          ya te está escribiendo.<br />
          <span className="text-[#C8FF00]">¿Le respondés vos<br />o tu agente?</span>
        </h2>
        <p className="text-base text-white/45 max-w-xl mx-auto font-medium">
          Empezá gratis hoy. Sin tarjeta. Tu agente puede estar activo en menos de una hora.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth"
            className="w-full sm:w-auto bg-[#C8FF00] text-black font-black px-10 py-5 rounded-2xl text-base hover:bg-[#B8EF00] transition-all active:scale-95 shadow-2xl shadow-[#C8FF00]/20 flex items-center gap-3 justify-center"
          >
            <Sparkles className="w-5 h-5" />
            Crear mi agente gratis
          </Link>
        </div>
        <p className="text-xs text-white/25 font-medium">
          7 días de prueba · Sin tarjeta · Cancelás cuando querés
        </p>
      </Reveal>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function FooterSection() {
  return (
    <footer className="bg-[#161615] border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <Image src="/icons/icon-192.png" alt="Imalá Vox" width={28} height={28} className="rounded-xl" />
              <span className="text-white font-bold">Imalá Vox</span>
            </div>
            <p className="text-xs text-white/35 leading-relaxed font-medium max-w-[200px]">
              Agentes de IA para WhatsApp, Instagram y Facebook. Hecho en Argentina.
            </p>
          </div>
          {/* Producto */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">Producto</p>
            {["Funciones", "Precios", "Canales", "Integraciones"].map(l => (
              <a key={l} href="#" className="block text-xs text-white/45 hover:text-white transition-colors font-medium">{l}</a>
            ))}
          </div>
          {/* Legal */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">Legal</p>
            {[
              { label: "Términos y condiciones", href: "/terms" },
              { label: "Política de privacidad", href: "/privacy" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="block text-xs text-white/45 hover:text-white transition-colors font-medium">{l.label}</Link>
            ))}
          </div>
          {/* Contacto */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest">Contacto</p>
            <a href="mailto:contacto@imala.com.ar" className="block text-xs text-white/45 hover:text-white transition-colors font-medium">contacto@imala.com.ar</a>
            <Link href="/auth" className="inline-flex items-center gap-1.5 text-xs text-[#C8FF00] font-black hover:text-[#B8EF00] transition-colors">
              Iniciar sesión <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-white/20 font-medium">© 2026 Imalá Vox · Todos los derechos reservados</p>
          <p className="text-[10px] text-white/20 font-medium">Hecho con ❤️ en Argentina 🇦🇷</p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "var(--font-geist-sans, var(--font-sans))" }}>
      <Navbar />
      <HeroSection />
      <SocialProofSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ChannelsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
      <FloatingWhatsApp />
    </div>
  );
}
