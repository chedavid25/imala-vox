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
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { Reveal } from "@/components/ui/Reveal";
import { PLAN_LIMITS } from "@/lib/planLimits";

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
                <p className="text-[9px] text-white/80">¡Hola María! Claro que sí 😊 Tenemos planes desde $39/mes. ¿Para qué tipo de negocio lo necesitás?</p>
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
// MOCKUP: Catálogo Inteligente
// ─────────────────────────────────────────────
function CatalogMockup() {
  const products = [
    { name: "Remera oversize básica", price: "ARS 18.500", status: "Disponible", color: "bg-rose-200" },
    { name: "Jean slim fit azul", price: "ARS 32.000", status: "Disponible", color: "bg-blue-200" },
    { name: "Vestido floral verano", price: "ARS 27.900", status: "Reservado", color: "bg-purple-200" },
    { name: "Campera de cuero negro", price: "ARS 89.000", status: "Disponible", color: "bg-slate-300" },
    { name: "Short deportivo", price: "ARS 12.500", status: "Disponible", color: "bg-green-200" },
    { name: "Blusa de seda off-white", price: "ARS 41.000", status: "Vendido", color: "bg-amber-100" },
  ];
  return (
    <BrowserChrome url="app.imalavox.com/cerebro/catalogo">
      <div className="bg-[#F5F5F4] h-[340px] overflow-hidden">
        <div className="bg-white border-b border-[#E5E5E3] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1A1A18]">Catálogo</span>
            <span className="text-[8px] bg-[#C8FF00] text-black font-black px-2 py-0.5 rounded-full">300 productos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-[#A3A39E] font-medium">Extraído de mitienda.com.ar</span>
            <div className="flex items-center gap-1 text-[7px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </div>
          </div>
        </div>
        <div className="p-3 grid grid-cols-3 gap-2 overflow-hidden">
          {products.map((p, i) => (
            <div key={i} className="bg-white border border-[#E5E5E3] rounded-xl overflow-hidden">
              <div className={cn("h-14 w-full", p.color)} />
              <div className="p-2 space-y-1">
                <p className="text-[8px] font-bold text-[#1A1A18] truncate leading-tight">{p.name}</p>
                <p className="text-[9px] font-black text-[#1A1A18]">{p.price}</p>
                <span className={cn(
                  "text-[7px] font-black px-1.5 py-0.5 rounded-full inline-block",
                  p.status === "Disponible" ? "bg-emerald-100 text-emerald-700" :
                  p.status === "Reservado" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                )}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-[#E5E5E3] bg-white flex items-center gap-2">
          <Globe className="w-3 h-3 text-[#A3A39E]" />
          <span className="text-[8px] text-[#A3A39E] font-medium">Última sincronización: hace 2 horas · Próxima: en 22 horas</span>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ─────────────────────────────────────────────
// MOCKUP: Web Chat Widget
// ─────────────────────────────────────────────
function WebChatMockup() {
  return (
    <BrowserChrome url="mitienda.com.ar">
      <div className="relative bg-[#F5F5F4] h-[320px] overflow-hidden">
        {/* Simulación del sitio web */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-lg bg-[#1F1F1E]" />
            <div className="h-2.5 w-24 bg-[#D5D5D3] rounded-full" />
            <div className="ml-auto flex gap-2">
              {[48, 32, 40].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-[#D5D5D3]" style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className="bg-[#1F1F1E] rounded-2xl h-24 flex items-center justify-center px-6">
            <div className="space-y-2 w-full">
              <div className="h-3 w-3/4 bg-white/10 rounded-full" />
              <div className="h-2.5 w-1/2 bg-white/6 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E5E5E3] rounded-xl h-16" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-[#D5D5D3] rounded-full w-full" />
            <div className="h-2 bg-[#D5D5D3] rounded-full w-5/6" />
            <div className="h-2 bg-[#D5D5D3] rounded-full w-2/3" />
          </div>
        </div>

        {/* Widget de chat flotante */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          {/* Ventana del chat */}
          <div className="w-52 bg-white rounded-2xl shadow-2xl border border-[#E5E5E3] overflow-hidden">
            {/* Header del widget */}
            <div className="bg-[#1F1F1E] px-3 py-2.5 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-black" />
              </div>
              <div>
                <p className="text-[9px] font-black text-white leading-none">Asistente Virtual</p>
                <p className="text-[7px] text-[#C8FF00] font-bold mt-0.5">● En línea ahora</p>
              </div>
            </div>
            {/* Mensajes */}
            <div className="p-2.5 space-y-2 bg-[#F9F9F8]">
              <div className="flex gap-1.5 items-end">
                <div className="w-4 h-4 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                  <Bot className="w-2 h-2 text-black" />
                </div>
                <div className="bg-white border border-[#E5E5E3] rounded-xl rounded-bl-sm px-2 py-1.5 max-w-[80%] shadow-sm">
                  <p className="text-[8px] text-[#1A1A18] leading-relaxed">¡Hola! 👋 ¿En qué puedo ayudarte hoy?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#1F1F1E] rounded-xl rounded-br-sm px-2 py-1.5 max-w-[80%]">
                  <p className="text-[8px] text-white leading-relaxed">¿Hacen envíos a Córdoba?</p>
                </div>
              </div>
              <div className="flex gap-1.5 items-end">
                <div className="w-4 h-4 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0">
                  <Bot className="w-2 h-2 text-black" />
                </div>
                <div className="bg-white border border-[#E5E5E3] rounded-xl rounded-bl-sm px-2 py-1.5 max-w-[80%] shadow-sm">
                  <p className="text-[8px] text-[#1A1A18] leading-relaxed">¡Sí! Enviamos a todo el país. El costo a Córdoba es $3.500 🚚</p>
                </div>
              </div>
            </div>
            {/* Input */}
            <div className="px-2.5 py-2 border-t border-[#E5E5E3] flex items-center gap-1.5 bg-white">
              <div className="flex-1 bg-[#F5F5F4] rounded-lg px-2 py-1">
                <p className="text-[8px] text-[#A3A39E]">Escribí tu consulta...</p>
              </div>
              <div className="w-5 h-5 rounded-lg bg-[#C8FF00] flex items-center justify-center shrink-0">
                <ArrowRight className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
          </div>

          {/* Botón flotante del widget */}
          <div className="w-10 h-10 rounded-full bg-[#1F1F1E] shadow-2xl flex items-center justify-center border-2 border-[#C8FF00]">
            <MessageSquare className="w-4 h-4 text-[#C8FF00]" />
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ─────────────────────────────────────────────
// BRAND ICONS (inline SVGs — avoids CDN requests)
// ─────────────────────────────────────────────
function BrandIcon({ brand, className }: { brand: "whatsapp" | "instagram" | "facebook" | "meta"; className?: string }) {
  const icons: Record<string, React.ReactElement> = {
    whatsapp: <svg viewBox="0 0 24 24" fill="#25D366" className={className}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
    instagram: <svg viewBox="0 0 24 24" fill="#E4405F" className={className}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    facebook: <svg viewBox="0 0 24 24" fill="#1877F2" className={className}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    meta: <svg viewBox="0 0 24 24" fill="#0668E1" className={className}><path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.186.28.445.695.708 1.13l.283.479.575.096c.598 1.233.876 1.78 1.205 2.232.408.564.82.849 1.449.849 1.092 0 1.971-.396 2.682-1.168 1.079-1.149 1.76-2.997 1.76-4.697 0-1.49-.6-3.15-1.61-4.404-.988-1.228-2.258-1.898-3.616-1.898-1.406 0-2.696.778-3.72 2.05-.348.42-.64.845-.9 1.27-.204-.3-.427-.6-.669-.877C9.607 4.803 8.31 4.03 6.915 4.03Zm0 1.568c.84 0 1.668.5 2.46 1.454.469.57.782 1.159.97 1.64.22-.384.488-.795.8-1.194.776-1.006 1.761-1.9 3.008-1.9 1.017 0 1.981.52 2.755 1.491.81 1.009 1.291 2.38 1.291 3.667 0 1.396-.541 2.908-1.39 3.805-.516.55-1.077.793-1.653.793-.386 0-.601-.144-.878-.54-.33-.46-.612-1.011-1.173-2.179l-.39-.772-.456-.866c-.552-.906-1.232-1.947-2.26-1.947-.627 0-1.125.456-1.635 1.245-1.177 1.808-1.845 2.882-2.449 3.695C6.6 17.64 5.852 18 5.236 18c-1.201 0-1.941-.483-2.435-1.328a3.736 3.736 0 0 1-.267-.553 5.01 5.01 0 0 1-.215-.737c-.123-.539-.176-1.064-.176-1.933 0-2.339.643-4.805 1.778-6.396C4.74 5.97 5.85 5.598 6.915 5.598Z"/></svg>,
  };
  return icons[brand] ?? null;
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
    let unsub: (() => void) | undefined;
    Promise.all([import("@/lib/firebase"), import("firebase/auth")]).then(
      ([{ auth }, { onAuthStateChanged }]) => {
        unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
      }
    );
    return () => unsub?.();
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#1F1F1E]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-xl" />
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
        <button aria-label="Abrir menú" className="md:hidden text-white/60 hover:text-white" onClick={() => setMenuOpen(v => !v)}>
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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <Reveal animation="fade-in-up" delay={100} className="w-full flex justify-center">
          <div className="inline-flex items-center gap-2 bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00] text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-widest max-w-full text-center">
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Agentes IA para todos tus canales</span>
            <span className="hidden sm:inline">Agentes IA para WhatsApp, Instagram y Facebook</span>
          </div>
        </Reveal>

        {/* Titular */}
        <Reveal animation="fade-in-up" delay={200} className="w-full">
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto text-center">
            Tus clientes escriben<br />
            a las 3am.{" "}
            <span className="text-[#C8FF00]">Tu negocio<br />
            les responde.</span>
          </h1>
        </Reveal>

        {/* Subtítulo */}
        <Reveal animation="fade-in-up" delay={300} className="w-full">
          <p className="text-lg md:text-xl text-white/55 max-w-2xl leading-relaxed mb-10 font-medium mx-auto text-center">
            Imalá Vox crea agentes de inteligencia artificial que atienden, califican y venden por vos —
            en todos tus canales, las 24 horas, sin que tengas que estar presente.
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal animation="fade-in-up" delay={400} className="w-full flex justify-center">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
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
          {([
            { brand: "whatsapp", label: "WhatsApp Business" },
            { brand: "instagram", label: "Instagram" },
            { brand: "facebook", label: "Facebook" },
            { brand: "meta", label: "Meta Leads" },
          ] as { brand: "whatsapp" | "instagram" | "facebook" | "meta"; label: string }[]).map((logo, i) => (
            <Reveal key={i} animation="zoom-in" delay={i * 100}>
              <div className="flex items-center gap-3 group cursor-pointer">
                <BrandIcon brand={logo.brand} className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-[#1A1A18] tracking-tight">{logo.label}</span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stats en Fondo Oscuro */}
        <Reveal animation="fade-in-up" delay={200}>
          <div className="bg-[#1F1F1E] rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 max-w-4xl mx-auto shadow-[0_40px_100px_rgba(0,0,0,0.15)]">
            <div className="grid grid-cols-3 gap-4 md:gap-8 items-center">
              {stats.map((s, i) => (
                <div key={i} className="space-y-3">
                  <p className={cn(
                    "text-3xl md:text-6xl font-black",
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
            <span className="inline-block bg-[#1A1A18] text-[#C8FF00] px-3 py-1 rounded-xl">mejor que nadie</span>
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
    {
      id: "catalogo",
      dark: true,
      tag: "Catálogo Inteligente",
      title: "Tu inventario siempre actualizado, sin carga manual",
      desc: "Ingresás la URL de tu tienda o inmobiliaria y el sistema extrae todos tus productos o propiedades automáticamente. El agente los conoce y los ofrece en cada conversación.",
      bullets: ["Scraping automático desde tu sitio web", "Re-sincronización periódica sin intervención", "El agente menciona productos según la consulta"],
      mockup: <CatalogMockup />,
    },
    {
      id: "webchat",
      dark: false,
      tag: "Chat en vivo",
      title: "Tu agente también vive en tu sitio web",
      desc: "Insertá una línea de código y tu agente IA aparece como widget en cualquier página de tu web. Los visitantes consultan ahí y el agente responde igual que en WhatsApp — sin que salgan del sitio.",
      bullets: ["Un snippet de código, listo en 2 minutos", "Mismo agente que atiende WhatsApp e Instagram", "Conversaciones unificadas en el inbox"],
      mockup: <WebChatMockup />,
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
  const channels: { brand: "whatsapp" | "instagram" | "facebook" | "meta"; name: string; desc: string; badge: string | null }[] = [
    {
      brand: "whatsapp",
      name: "WhatsApp Business",
      desc: "El canal #1 de consultas en Argentina y Latam. Respuestas automáticas, mensajes ricos con imágenes y catálogo, y seguimiento completo de cada conversación.",
      badge: "Más usado",
    },
    {
      brand: "instagram",
      name: "Instagram DMs",
      desc: "Capturá los leads que llegan por tus stories, publicaciones y perfil. El agente responde en segundos y los convierte en clientes antes de que se enfríen.",
      badge: null,
    },
    {
      brand: "facebook",
      name: "Facebook Messenger",
      desc: "Automatizá las respuestas de tu página de Facebook. Sincronizá tus chats y mantené el historial completo de cada cliente en un solo lugar.",
      badge: null,
    },
    {
      brand: "meta",
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
                  <BrandIcon brand={c.brand} className="w-6 h-6" />
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


type PlanFeatureGroup = { label: string; items: string[]; locked?: boolean };
const PRICING_FEATURES: Record<Plan, { tag?: string; inheritsFrom?: string; groups: PlanFeatureGroup[] }> = {
  starter: {
    groups: [
      {
        label: "IA & Agentes",
        items: [
          "1 Agente Inteligente",
          "800 conversaciones IA/mes",
          "Base de conocimiento (PDF, webs, textos)",
          "3 fuentes de conocimiento",
        ],
      },
      {
        label: "Canales",
        items: ["1 número WhatsApp · Instagram · Facebook", "Captura de leads de Meta Ads"],
      },
      {
        label: "CRM",
        items: ["500 contactos", "Pipeline básico", "Leads, Tareas y Etiquetas"],
      },
      {
        label: "No incluido",
        locked: true,
        items: [
          "Catálogo de productos / propiedades",
          "Difusión masiva",
          "Workflows automatizados",
          "Chat en vivo para sitio web",
        ],
      },
    ],
  },
  pro: {
    tag: "Más popular",
    inheritsFrom: "Starter",
    groups: [
      {
        label: "IA & Agentes",
        items: [
          "2 Agentes Inteligentes con roles distintos",
          "2.000 conversaciones IA/mes",
          "Fuentes de conocimiento ilimitadas",
        ],
      },
      {
        label: "Catálogo",
        items: [
          "Catálogo de productos / propiedades (300 ítems)",
          "Scraping automático desde tu sitio web",
        ],
      },
      {
        label: "Marketing",
        items: [
          "2 números WhatsApp",
          "Difusión masiva hasta 2.000 contactos/envío",
          "Contactos ilimitados",
        ],
      },
      {
        label: "No incluido",
        locked: true,
        items: ["Workflows automatizados", "Chat en vivo para sitio web"],
      },
    ],
  },
  agencia: {
    inheritsFrom: "Pro",
    groups: [
      {
        label: "IA & Agentes",
        items: [
          "10 Agentes Inteligentes especializados",
          "10.000 conversaciones IA/mes",
          "5 usuarios del panel",
        ],
      },
      {
        label: "Catálogo & Canales",
        items: [
          "Catálogo ilimitado con re-sincronización automática",
          "5 números WhatsApp",
          "Chat en vivo para tu sitio web",
        ],
      },
      {
        label: "Automatización",
        items: ["Workflows automatizados", "Asignación automática de chats", "API access"],
      },
    ],
  },
};

function PricingCompareTable({ isAnual }: { isAnual: boolean }) {
  type CellValue = string | boolean | null;

  interface TableRow {
    label: string;
    starter: CellValue;
    pro: CellValue;
    agencia: CellValue;
    highlight?: boolean;
    description?: string;
  }

  const rows: TableRow[] = [
    { label: "Precio mensual", starter: "$39 USD", pro: "$69 USD", agencia: "$179 USD" },
    { label: "Precio anual (por mes)", starter: "$33 USD", pro: "$59 USD", agencia: "$152 USD", description: "Pagás un año por adelantado y el precio mensual baja. No es el total anual." },
    { label: "Prueba gratuita", starter: "7 días", pro: "7 días", agencia: "7 días", description: "Probás el plan completo sin tarjeta. Al vencer elegís si suscribirse o no." },

    { label: "▸ IA & Agentes", starter: "", pro: "", agencia: "", highlight: true },
    { label: "Agentes IA", starter: "1", pro: "2", agencia: "10", description: "Cada agente tiene su propio nombre, personalidad, instrucciones y canales asignados. Podés tener uno para ventas y otro para soporte, por ejemplo." },
    { label: "Conversaciones IA/mes", starter: "800", pro: "2.000", agencia: "10.000", description: "Cada contacto que escribe cuenta como una sesión diaria. Si la misma persona manda 10 mensajes en el día, cuenta como 1 sola conversación." },
    { label: "Base de conocimiento", starter: true, pro: true, agencia: true, description: "El agente aprende desde archivos PDF, textos propios y sitios web. Usa esa info para responder con precisión." },
    { label: "Fuentes de conocimiento", starter: "3", pro: "Ilimitadas", agencia: "Ilimitadas", description: "Cada PDF, texto o sitio web que le cargás al agente es una fuente. Más fuentes = más información disponible para responder." },
    { label: "Tono y personalidad del agente", starter: true, pro: true, agencia: true, description: "Definís cómo habla el agente: su nombre, si es formal o informal, qué temas puede tocar y cuáles no." },
    { label: "Transferencia a agente humano", starter: true, pro: true, agencia: true, description: "Cuando el agente no puede resolver algo, avisa y pasa la conversación a una persona de tu equipo." },
    { label: "Workflows automatizados", starter: false, pro: false, agencia: true, description: "Secuencias de mensajes y acciones que se disparan solas ante eventos: primer mensaje, sin respuesta, vencimiento de tarea, etc." },

    { label: "▸ Catálogo", starter: "", pro: "", agencia: "", highlight: true },
    { label: "Catálogo de productos / propiedades", starter: false, pro: true, agencia: true, description: "El agente conoce tu inventario y puede mencionar productos o propiedades relevantes dentro de la conversación." },
    { label: "Ítems en catálogo", starter: "—", pro: "300", agencia: "Ilimitados", description: "Cantidad máxima de productos o propiedades que podés tener cargados y activos al mismo tiempo." },
    { label: "Scraping automático desde sitio web", starter: false, pro: true, agencia: true, description: "Ingresás la URL de tu tienda o inmobiliaria y el sistema extrae los productos o propiedades automáticamente, sin carga manual." },
    { label: "Re-sincronización periódica del catálogo", starter: false, pro: false, agencia: true, description: "El catálogo se actualiza solo de forma periódica. Si cambiás un precio o añadís un ítem en tu web, se refleja sin que hagas nada." },

    { label: "▸ Canales", starter: "", pro: "", agencia: "", highlight: true },
    { label: "WhatsApp Business", starter: "1 número", pro: "2 números", agencia: "5 números", description: "Cantidad de líneas de WhatsApp Business que podés conectar. Cada número puede tener su propio agente asignado." },
    { label: "Instagram DMs", starter: true, pro: true, agencia: true, description: "El agente responde automáticamente los mensajes directos que lleguen a tu cuenta de Instagram." },
    { label: "Facebook Messenger", starter: true, pro: true, agencia: true, description: "El agente gestiona los mensajes de tu página de Facebook, igual que en WhatsApp." },
    { label: "Meta Leads (anuncios)", starter: true, pro: true, agencia: true, description: "Cada vez que alguien completa un formulario de tus campañas de Meta Ads, el lead entra directo al CRM sin intervención manual." },
    { label: "Chat en vivo para sitio web", starter: false, pro: false, agencia: true, description: "Un widget de chat que insertás en tu web. Los visitantes chatean ahí y el agente los atiende igual que en WhatsApp." },

    { label: "▸ CRM", starter: "", pro: "", agencia: "", highlight: true },
    { label: "Contactos", starter: "500", pro: "Ilimitados", agencia: "Ilimitados", description: "Personas guardadas en tu base de contactos. Incluye historial de conversaciones, etiquetas y datos personalizados." },
    { label: "Pipeline de ventas", starter: "Básico", pro: "Personalizable", agencia: "Personalizable + automático", description: "Tablero visual para ver en qué etapa está cada oportunidad de venta. En Agencia los contactos avanzan de etapa solos según sus acciones." },
    { label: "Etiquetas y segmentación", starter: true, pro: true, agencia: true, description: "Clasificás contactos con etiquetas propias (ej: 'cliente vip', 'zona norte') para filtrar y enviar campañas específicas." },
    { label: "Tareas y recordatorios", starter: true, pro: true, agencia: true, description: "Agendás seguimientos manuales con fecha y hora. El sistema te avisa para que ningún contacto quede sin respuesta." },
    { label: "Asignación automática de chats", starter: false, pro: false, agencia: true, description: "Los chats entrantes se reparten solos entre los operadores humanos disponibles según reglas que vos configurás." },

    { label: "▸ Marketing", starter: "", pro: "", agencia: "", highlight: true },
    { label: "Difusión masiva", starter: false, pro: true, agencia: true, description: "Enviás un mensaje de WhatsApp a una lista de contactos de una sola vez. Útil para promociones, novedades o recordatorios." },
    { label: "Contactos por envío", starter: "—", pro: "2.000", agencia: "Ilimitados", description: "Máximo de destinatarios que podés incluir en una sola campaña de difusión." },
    { label: "Programación de campañas", starter: false, pro: true, agencia: true, description: "Configurás el envío para una fecha y hora específica. La campaña sale sola sin que tengas que estar presente." },

    { label: "▸ Equipo & Acceso", starter: "", pro: "", agencia: "", highlight: true },
    { label: "Usuarios del panel", starter: "1", pro: "1", agencia: "5", description: "Personas de tu equipo que pueden entrar al dashboard con su propio usuario y gestionar conversaciones." },
    { label: "API access", starter: false, pro: false, agencia: true, description: "Conectás Imalá Vox con tus propias herramientas o sistemas externos mediante nuestra API." },
    { label: "Soporte", starter: "Email", pro: "Email + chat", agencia: "Prioritario", description: "Canal por el que podés contactar al equipo de Imalá Vox ante dudas o problemas." },
  ];

  const renderCell = (val: CellValue, _isPro: boolean) => {
    if (val === true) {
      return (
        <div className="w-5 h-5 rounded-full bg-[#C8FF00] flex items-center justify-center mx-auto">
          <Check className="w-3 h-3 text-black" strokeWidth={3} />
        </div>
      );
    }
    if (val === false) return <X className="w-3.5 h-3.5 text-white/15 mx-auto" />;
    if (val === "" || val === null) return null;
    return <span className="text-sm font-bold text-white/60">{val}</span>;
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-2">
    <div className="min-w-[560px] rounded-3xl overflow-hidden border border-white/8">
      <div className="grid grid-cols-4 bg-[#1F1F1E]">
        <div className="px-5 py-4 text-[10px] font-black text-white/25 uppercase tracking-widest">Función</div>
        {(["starter", "pro", "agencia"] as Plan[]).map((p) => {
          const price = isAnual ? PLAN_LIMITS[p].priceYearly : PLAN_LIMITS[p].priceMonthly;
          const isPro = p === "pro";
          return (
            <div key={p} className={cn("px-4 py-4 text-center", isPro && "bg-[#C8FF00]")}>
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-0.5", isPro ? "text-black/50" : "text-white/30")}>{p}</p>
              <p className={cn("text-lg font-black", isPro ? "text-black" : "text-white")}>
                ${price}
                <span className={cn("text-[10px] font-bold ml-0.5", isPro ? "text-black/40" : "text-white/30")}>/mes</span>
              </p>
            </div>
          );
        })}
      </div>

      {rows.map((row, i) => {
        if (row.highlight) {
          return (
            <div key={i} className="grid grid-cols-4 bg-[#1F1F1E] border-t border-white/5">
              <div className="px-5 py-2.5 col-span-4">
                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">{row.label.replace("▸ ", "")}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="grid grid-cols-4 border-t border-white/5 bg-[#2A2A28] hover:bg-[#2F2F2D] transition-colors">
            <div className="px-5 py-3 flex items-center gap-2">
              <span className="text-sm font-medium text-white/50">{row.label}</span>
              {row.description && (
                <div className="relative group/tip shrink-0">
                  <button className="w-3.5 h-3.5 rounded-full border border-white/20 text-white/30 hover:text-white/70 hover:border-white/50 transition-colors flex items-center justify-center text-[8px] font-black leading-none">?</button>
                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#161615] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/60 leading-relaxed font-medium hidden group-hover/tip:block z-50 shadow-2xl pointer-events-none">
                    {row.description}
                    <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#161615]" />
                  </div>
                </div>
              )}
            </div>
            {(["starter", "pro", "agencia"] as Plan[]).map((p) => (
              <div key={p} className="px-4 py-3 flex items-center justify-center">
                {renderCell(row[p], false)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
    </div>
  );
}

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  starter: "Para el profesional independiente o negocio que está empezando.",
  pro: "Para el negocio activo que necesita vender y atender en automático.",
  agencia: "Para negocios con operación continua y alto volumen de consultas.",
};

function PricingSection() {
  const [isAnual, setIsAnual] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
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
              <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">−15%</span>
            </button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const price = isAnual ? PLAN_LIMITS[p].priceYearly : PLAN_LIMITS[p].priceMonthly;
            const display = PRICING_FEATURES[p];
            const isPro = p === "pro";
            return (
              <Reveal key={p} animation="fade-in-up" delay={i * 150}>
                <div className={cn(
                  "rounded-3xl flex flex-col h-full relative overflow-hidden",
                  isPro
                    ? "bg-[#C8FF00] shadow-2xl shadow-[#C8FF00]/10 md:scale-[1.03]"
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
                    <p className={cn("text-xs font-medium mt-2 leading-relaxed", isPro ? "text-black/50" : "text-white/35")}>
                      {PLAN_DESCRIPTIONS[p]}
                    </p>
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
                          <p className={cn("text-[10px] font-black uppercase tracking-widest px-1",
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
                              <span className={cn("text-[13px] font-bold",
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

        {/* Botón expandir comparativa */}
        <div className="flex justify-center mt-10 mb-2">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="flex items-center gap-2 text-xs font-black text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest border border-white/10 hover:border-white/20 px-5 py-3 rounded-2xl"
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{showCompare ? "Ocultar comparativa" : "Ver comparativa completa de funciones"}</span>
            <span className="sm:hidden">{showCompare ? "Ocultar" : "Comparar planes"}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", showCompare && "rotate-180")} />
          </button>
        </div>

        {/* Tabla comparativa */}
        {showCompare && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <PricingCompareTable isAnual={isAnual} />
          </div>
        )}

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
              <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-xl" />
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
