"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, 
  ChevronLeft, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Palette,
  MessageSquare,
  Settings2,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  Zap,
  Eye,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { COLLECTIONS, Canal, Agente } from "@/lib/types/firestore";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WebConfig {
  dominios: string[];
  headerText: string;
  welcomeMessage: string;
  showWelcomeMessage: boolean;
  colorHeader: string;
  colorButton: string;
  logoHeaderUrl: string;
  autoOpenDelay: number;
  openAutomatically: boolean;
  agenteId?: string;
}

export default function WebChannelPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [canalWeb, setCanalWeb] = useState<Canal | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedMode, setEmbedMode] = useState<'script' | 'shortcode'>('script');

  const [config, setConfig] = useState<WebConfig>({
    dominios: [],
    headerText: "Imalá Vox",
    welcomeMessage: "¡Hola! 👋 Estoy online, ¿en qué te puedo ayudar?",
    showWelcomeMessage: true,
    colorHeader: "#1A1A18",
    colorButton: "#C8FF00",
    logoHeaderUrl: "",
    autoOpenDelay: 5,
    openAutomatically: false,
    agenteId: "",
  });

  const handleAgenteChange = (val: string | null) => {
    setConfig((prev: WebConfig) => ({ ...prev, agenteId: val || "" }));
  };

  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    if (!currentWorkspaceId) return;

    // Cargar agentes
    const unsubAgentes = onSnapshot(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES), (snap) => {
      setAgentes(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Agente[]);
    });

    // Cargar canal web
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES),
      where("tipo", "==", "web")
    );

    const unsubCanal = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const canal = { ...snap.docs[0].data(), id: snap.docs[0].id } as Canal;
        setCanalWeb(canal);
        if (canal.configWeb) {
          setConfig({
            dominios: canal.configWeb.dominios || [],
            headerText: canal.configWeb.headerText || "Imalá Vox",
            welcomeMessage: canal.configWeb.welcomeMessage || "",
            showWelcomeMessage: canal.configWeb.showWelcomeMessage ?? true,
            colorHeader: canal.configWeb.colorHeader || "#1A1A18",
            colorButton: canal.configWeb.colorButton || "#C8FF00",
            logoHeaderUrl: canal.configWeb.logoHeaderUrl || "",
            autoOpenDelay: canal.configWeb.autoOpenDelay || 5,
            openAutomatically: !!canal.configWeb.openAutomatically,
            agenteId: canal.agenteId || "",
          });
        }
      }
      setLoading(false);
    });

    return () => {
      unsubAgentes();
      unsubCanal();
    };
  }, [currentWorkspaceId]);

  const handleSave = async () => {
    if (!currentWorkspaceId) return;

    try {
      const canalData: Partial<Canal> = {
        tipo: 'web',
        nombre: 'Chat Web (Widget)',
        cuenta: config.dominios[0] || 'Web Widget',
        status: 'connected',
        webhookVerified: true,
        aiEnabled: !!config.agenteId,
        agenteId: config.agenteId || null,
        configWeb: {
          dominios: config.dominios,
          headerText: config.headerText,
          welcomeMessage: config.welcomeMessage,
          showWelcomeMessage: config.showWelcomeMessage,
          colorHeader: config.colorHeader,
          colorButton: config.colorButton,
          logoHeaderUrl: config.logoHeaderUrl,
          autoOpenDelay: config.autoOpenDelay,
          openAutomatically: config.openAutomatically,
        },
        actualizadoEl: serverTimestamp() as any,
        creadoEl: canalWeb?.creadoEl || serverTimestamp() as any
      };

      if (canalWeb?.id) {
        await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES, canalWeb.id), canalData);
      } else {
        const newRef = doc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES));
        await setDoc(newRef, { ...canalData, creadoEl: serverTimestamp() });
      }

      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la configuración");
    }
  };

  const addDomain = () => {
    if (!newDomain) return;
    if (config.dominios.includes(newDomain)) return;
    setConfig(prev => ({ ...prev, dominios: [...prev.dominios, newDomain] }));
    setNewDomain("");
  };

  const removeDomain = (domain: string) => {
    setConfig(prev => ({ ...prev, dominios: prev.dominios.filter(d => d !== domain) }));
  };

  const host = typeof window !== 'undefined' ? window.location.origin : 'https://cdn.imalavox.com';
  
  const embedCode = `<!-- Imalá Vox Widget -->
<script src="${host}/widget.js" async></script>
<script>
  window.ImalaVox = {
    workspaceId: "${currentWorkspaceId}",
    agentId: "${config.agenteId || ''}"
  };
</script>`;

  const shortcode = `[imalavox id="${currentWorkspaceId}" agente="${config.agenteId || ''}"]`;

  const copyCode = () => {
    const textToCopy = embedMode === 'script' ? embedCode : shortcode;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Código copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => router.push("/dashboard/ajustes/canales")}
            className="flex items-center gap-2 text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] transition-colors text-xs font-bold uppercase tracking-widest group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a Canales
          </button>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[var(--accent-active)]" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Canal: Chat Web</h1>
              </div>
              <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Configura el widget de chat para tu sitio web.</p>
            </div>
            
            <Button 
              onClick={handleSave}
              className="rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[11px] uppercase tracking-widest px-8 h-12 shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* DOMINIOS */}
            <section className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-[var(--accent-active)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary-light)] uppercase tracking-widest">Seguridad y Dominios</h2>
              </div>
              
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">¿En qué dominio estará el chat?</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://tu-sitio-web.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none focus:ring-2 focus:ring-[var(--accent)]/20 font-medium"
                  />
                  <Button 
                    onClick={addDomain}
                    className="h-12 px-6 rounded-2xl bg-[var(--bg-sidebar)] text-white font-bold text-xs hover:bg-black transition-all"
                  >
                    Añadir
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {config.dominios.map(domain => (
                    <div key={domain} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold">
                      {domain}
                      <button onClick={() => removeDomain(domain)}>
                        <Trash2 className="w-3 h-3 text-emerald-400 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  ))}
                  {config.dominios.length === 0 && (
                    <p className="text-[11px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                      ⚠️ Agrega al menos un dominio para que el widget funcione.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* CÓDIGO EMBED */}
            <section className="bg-[var(--bg-sidebar)] border border-[var(--border-dark)] rounded-[32px] p-8 shadow-2xl space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Zap className="w-48 h-48 text-[var(--accent)]" />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setEmbedMode('script')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        embedMode === 'script' ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg" : "text-white/40 hover:text-white"
                      )}
                    >
                      Script Universal
                    </button>
                    <button 
                      onClick={() => setEmbedMode('shortcode')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        embedMode === 'shortcode' ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg" : "text-white/40 hover:text-white"
                      )}
                    >
                      WordPress Shortcode
                    </button>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={copyCode}
                  className="text-[var(--accent)] hover:bg-[var(--accent)]/10 font-bold text-xs h-9 rounded-xl px-4"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>

              <div className="relative z-10">
                <pre className="bg-black/40 rounded-2xl p-6 font-mono text-[11px] text-[var(--text-secondary-dark)] overflow-x-auto border border-white/5 custom-scrollbar leading-relaxed min-h-[80px] flex items-center">
                  {embedMode === 'script' ? embedCode : shortcode}
                </pre>
              </div>
              
              <p className="text-[11px] text-[var(--text-tertiary-dark)] font-medium relative z-10">
                {embedMode === 'script' 
                  ? "Copia este código y pégalo justo antes de cerrar la etiqueta </body> en tu sitio web."
                  : "Usa este shortcode en cualquier página o widget de tu WordPress (Requiere el plugin de Imalá Vox)."}
              </p>
            </section>

            {/* COMPORTAMIENTO */}
            <section className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <Bot className="w-5 h-5 text-[var(--accent-active)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary-light)] uppercase tracking-widest">Agente y Comportamiento</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Agente Responsable</Label>
                  <Select 
                    value={config.agenteId || null} 
                    onValueChange={handleAgenteChange}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none font-bold text-sm px-6">
                      <SelectValue placeholder="Selecciona un agente..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl bg-white p-2">
                      {agentes.map(a => (
                        <SelectItem key={a.id} value={a.id!} className="rounded-xl py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[13px]">{a.nombre}</span>
                            <span className="text-[10px] text-[var(--text-tertiary-light)] uppercase tracking-tight">{a.rolAgente}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Abrir automáticamente</Label>
                      <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">Se despliega solo después de unos segundos.</p>
                    </div>
                    <Switch 
                      checked={config.openAutomatically}
                      onCheckedChange={(val: boolean) => setConfig((prev: WebConfig) => ({ ...prev, openAutomatically: val }))}
                    />
                  </div>

                  {config.openAutomatically && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                      <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary-light)]">
                        <span>Retraso de apertura</span>
                        <span className="text-[var(--bg-sidebar)] bg-[var(--accent)]/20 px-2 py-0.5 rounded-lg">{config.autoOpenDelay} segundos</span>
                      </div>
                      <input 
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={config.autoOpenDelay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setConfig((prev: WebConfig) => ({ ...prev, autoOpenDelay: val }));
                        }}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--bg-sidebar)] hover:accent-[var(--accent-active)] transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* COLUMNA DERECHA: PERSONALIZACIÓN & PREVIEW */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* ESTILO */}
            <section className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 shadow-sm space-y-8 sticky top-8">
              <div className="flex items-center gap-3 mb-2">
                <Palette className="w-5 h-5 text-[var(--accent-active)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary-light)] uppercase tracking-widest">Estilo Visual</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Texto del Encabezado</Label>
                  <Input 
                    value={config.headerText}
                    onChange={(e) => setConfig((prev: WebConfig) => ({ ...prev, headerText: e.target.value }))}
                    className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none font-bold text-sm px-6"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Mensaje de Bienvenida</Label>
                      <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">Activa un saludo inicial automático.</p>
                    </div>
                    <Switch 
                      checked={config.showWelcomeMessage}
                      onCheckedChange={(val: boolean) => setConfig((prev: WebConfig) => ({ ...prev, showWelcomeMessage: val }))}
                    />
                  </div>

                  {config.showWelcomeMessage && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                      <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Texto del Mensaje</Label>
                      <Input 
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig((prev: WebConfig) => ({ ...prev, welcomeMessage: e.target.value }))}
                        className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none font-bold text-sm px-6"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
                  <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Logo del Chat</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] border-2 border-dashed border-[var(--border-light)] flex items-center justify-center overflow-hidden">
                      {config.logoHeaderUrl ? (
                        <img src={config.logoHeaderUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[var(--text-tertiary-light)]" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setConfig((prev: WebConfig) => ({ ...prev, logoHeaderUrl: url }));
                          }
                        }}
                      />
                      <Button 
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 rounded-xl border-[var(--border-light)] font-bold text-xs"
                      >
                        Subir Imagen
                      </Button>
                      <p className="text-[9px] text-[var(--text-tertiary-light)] font-medium">Recomendado: 128x128px PNG o JPG.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--border-light)]">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Color Header</Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative group">
                        <div 
                          className="w-12 h-12 rounded-2xl border border-[var(--border-light)] shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: config.colorHeader }}
                        />
                        <input 
                          type="color" 
                          value={config.colorHeader}
                          onChange={(e) => setConfig((prev: WebConfig) => ({ ...prev, colorHeader: e.target.value }))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        value={config.colorHeader}
                        onChange={(e) => setConfig(prev => ({ ...prev, colorHeader: e.target.value }))}
                        className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none font-mono text-xs px-4"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Color Botón</Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative group">
                        <div 
                          className="w-12 h-12 rounded-2xl border border-[var(--border-light)] shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: config.colorButton }}
                        />
                        <input 
                          type="color" 
                          value={config.colorButton}
                          onChange={(e) => setConfig((prev: WebConfig) => ({ ...prev, colorButton: e.target.value }))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        value={config.colorButton}
                        onChange={(e) => setConfig(prev => ({ ...prev, colorButton: e.target.value }))}
                        className="h-12 rounded-2xl bg-[var(--bg-input)]/50 border-none font-mono text-xs px-4"
                      />
                    </div>
                  </div>
                </div>

                {/* PREVIEW DEL CHAT (DENTRO DE LA CARD) */}
                <div className="pt-8 border-t border-[var(--border-light)] space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">Vista Previa</Label>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] font-black uppercase">En línea</Badge>
                  </div>
                  
                  {/* SIMULADOR DE CHAT */}
                  <div className="w-full h-[320px] rounded-3xl bg-[var(--bg-main)] border border-[var(--border-light)] overflow-hidden shadow-inner flex flex-col">
                    {/* Header del chat simulado */}
                    <div 
                      className="p-5 text-white flex items-center gap-3 transition-colors duration-500"
                      style={{ backgroundColor: config.colorHeader }}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
                        {config.logoHeaderUrl ? (
                          <img src={config.logoHeaderUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold leading-none">{config.headerText}</p>
                        <p className="text-[8px] font-medium opacity-80 mt-1">Suele responder al instante</p>
                      </div>
                    </div>
                    
                    {/* Cuerpo del chat simulado */}
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto no-scrollbar">
                      {config.showWelcomeMessage && config.welcomeMessage && (
                        <div className="bg-white border border-[var(--border-light)] p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] animate-in fade-in slide-in-from-left-2 duration-500">
                          <p className="text-[11px] text-[var(--text-primary-light)] font-medium leading-relaxed">
                            {config.welcomeMessage}
                          </p>
                          <p className="text-[8px] text-[var(--text-tertiary-light)] font-bold mt-1 uppercase">12:00</p>
                        </div>
                      )}
                      <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] ml-auto">
                        <p className="text-[11px] text-[var(--text-primary-light)] font-medium leading-relaxed italic opacity-50">
                          Escribe tu mensaje...
                        </p>
                      </div>
                    </div>

                    {/* Footer del chat simulado */}
                    <div className="p-3 bg-white border-t border-[var(--border-light)] flex items-center gap-2">
                      <div className="flex-1 h-8 rounded-full bg-[var(--bg-input)]/50 px-4 flex items-center">
                        <span className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Escribir...</span>
                      </div>
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-500"
                        style={{ backgroundColor: config.colorButton }}
                      >
                        <Zap className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN FLOTANTE SIMULADO */}
                  <div className="flex justify-end pr-4">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-black/10 hover:scale-110 transition-all cursor-pointer"
                      style={{ backgroundColor: config.colorButton }}
                    >
                      <MessageSquare className="w-6 h-6 text-[var(--accent-text)]" />
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>

        </div>

      </div>
    </div>
  );
}
