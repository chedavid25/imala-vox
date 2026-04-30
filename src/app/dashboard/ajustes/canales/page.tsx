"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Instagram, 
  MessageCircle, 
  Plus, 
  Loader2,
  MoreVertical,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  UserCheck,
  Trash2,
  HelpCircle,
  ChevronDown,
  Lightbulb,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, Canal } from "@/lib/types/firestore";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { 
  eliminarCanal, 
  sincronizarWebhooks, 
  sincronizarWebhooksWhatsApp,
  configurarCanalIA,
  conectarCanalManual
} from "@/app/actions/channels";

const CANALES_CONFIG = [
  {
    tipo: 'whatsapp' as const,
    nombre: 'WhatsApp Business',
    color: '#25D366',
    icon: MessageSquare,
  },
  {
    tipo: 'instagram' as const,
    nombre: 'Instagram Direct',
    color: '#E1306C',
    icon: Instagram,
  },
  {
    tipo: 'facebook' as const,
    nombre: 'Facebook Messenger',
    color: '#1877F2',
    icon: MessageCircle,
  },
  {
    tipo: 'web' as const,
    nombre: 'Chat Web (Widget)',
    color: '#C8FF00',
    icon: Globe,
  },
];

export default function CanalesPage() {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [canales, setCanales] = useState<(Canal & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanal, setSelectedCanal] = useState<(Canal & { id: string }) | null>(null);
  const [agentes, setAgentes] = useState<{ id: string; nombre: string; rolAgente: string }[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Estado para el modal de conexión WhatsApp
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waDisplayName, setWaDisplayName] = useState('');
  const [isConnectingWA, setIsConnectingWA] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const ayudaCanales = {
    titulo: "¿Cómo conectar tus canales de atención?",
    descripcion: "Los canales permiten que Imalá Vox reciba y envíe mensajes de tus clientes. Puedes conectar WhatsApp mediante API o tus páginas de Facebook e Instagram vía Meta OAuth.",
    recomendacion: "Para WhatsApp, asegúrate de usar un 'Access Token Permanente'. Los tokens temporales expiran en 24 horas y el agente dejará de responder.",
    items: [
      { titulo: "WhatsApp API", detalle: "Requiere el ID del número y un Token. Es ideal para cuentas oficiales y soporte masivo." },
      { titulo: "Meta OAuth", detalle: "Inicia sesión con Facebook para conectar tus Páginas y cuentas de Instagram de forma automática." },
      { titulo: "Webhooks", detalle: "Es el 'enlace' que avisa al sistema cuando llega un mensaje. Deben estar en estado 'OK' para funcionar." },
    ]
  };

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES);
    const unsubscribe = onSnapshot(q, (snap) => {
      setCanales(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando canales:", error);
      setLoading(false);
      toast.error("Error al sincronizar canales");
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES);
    const unsubscribe = onSnapshot(q, (snap) => {
      setAgentes(snap.docs.map(d => ({ 
        id: d.id, 
        nombre: d.data().nombre,
        rolAgente: d.data().rolAgente
      })));
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success("¡Meta OAuth completado! Tus canales se están sincronizando.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('error')) {
      toast.error(`Error de conexión: ${params.get('error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOAuthConnect = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/meta/callback`;
    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_messaging',
      'leads_retrieval',
      'ads_management',
      'business_management',
      'instagram_basic',
      'instagram_manage_messages',
      'ads_read'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${currentWorkspaceId}`;
    window.location.href = authUrl;
  };

  const handleConnectWhatsApp = async () => {
    if (!currentWorkspaceId) return;
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) {
      toast.error("El Phone Number ID y el Access Token son obligatorios");
      return;
    }

    setIsConnectingWA(true);
    try {
      const res = await conectarCanalManual(currentWorkspaceId, {
        tipo: 'whatsapp',
        nombre: waDisplayName.trim() || 'WhatsApp Business',
        cuenta: waPhoneNumberId.trim(),
        metaPhoneNumberId: waPhoneNumberId.trim(),
        accessToken: waAccessToken.trim(),
      });

      if (res.success) {
        toast.success("Canal de WhatsApp conectado. Ahora verificá los webhooks desde 'Configurar'.");
        setIsWAModalOpen(false);
        setWaPhoneNumberId('');
        setWaAccessToken('');
        setWaDisplayName('');
      } else {
        toast.error(res.error || "No se pudo conectar el canal");
      }
    } catch (error) {
      toast.error("Error de red al conectar WhatsApp");
    } finally {
      setIsConnectingWA(false);
    }
  };

  const handleDelete = async (canalId: string) => {
    if (!currentWorkspaceId) return;
    if (!confirm("¿Deseas eliminar permanentemente esta conexión y todos sus datos?")) return;

    try {
      const res = await eliminarCanal(currentWorkspaceId, canalId);
      if (res.success) {
        toast.success("Canal eliminado permanentemente");
      } else {
        toast.error(res.error || "No se pudo eliminar el canal");
      }
    } catch (error) {
      toast.error("Error al eliminar canal");
    }
  };

  const handleSyncWebhooks = async () => {
    if (!currentWorkspaceId || !selectedCanal) return;
    setIsSyncing(true);
    try {
      let res;
      if (selectedCanal.tipo === 'whatsapp') {
        res = await sincronizarWebhooksWhatsApp(currentWorkspaceId, selectedCanal.id);
      } else {
        res = await sincronizarWebhooks(currentWorkspaceId, selectedCanal.id);
      }
      if (res.success) {
        toast.success(selectedCanal.tipo === 'whatsapp' ? "Número de WhatsApp verificado correctamente" : "Webhooks sincronizados en Meta");
        setIsConfigModalOpen(false);
      } else {
        toast.error(res.error || "Error al sincronizar");
      }
    } catch (error) {
      toast.error("Error de red");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAIConfig = async (enabled: boolean, agenteId: string | null) => {
    if (!currentWorkspaceId || !selectedCanal) return;
    setIsSavingConfig(true);
    try {
      const res = await configurarCanalIA(currentWorkspaceId, selectedCanal.id, {
        aiEnabled: enabled,
        agenteId: agenteId
      });
      if (res.success) {
        toast.success("Configuración de IA actualizada");
        setSelectedCanal(prev => prev ? { ...prev, aiEnabled: enabled, agenteId: agenteId } : null);
      } else {
        toast.error(res.error || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error de red");
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (!currentWorkspaceId) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Ajustes del Sistema</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Canales de Atención</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Administra tus conexiones con Facebook, Instagram y WhatsApp.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            ¿Cómo conectar?
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>

          <Button
            onClick={() => setIsWAModalOpen(true)}
            variant="outline"
            className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-5 h-11 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 transition-all shadow-lg shadow-[#25D366]/10"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button 
            onClick={handleOAuthConnect}
            className="rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest px-6 h-11 shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Conectar Meta
          </Button>

          <Button
            onClick={() => router.push('/dashboard/ajustes/canales/web')}
            className="rounded-2xl bg-white border border-[var(--border-light)] text-[var(--text-primary-light)] font-black text-[10px] uppercase tracking-widest px-6 h-11 hover:bg-[var(--bg-input)] transition-all shadow-sm active:scale-95"
          >
            <Globe className="w-4 h-4 mr-2 text-[var(--accent-active)]" />
            Chat Web
          </Button>
        </div>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaCanales.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaCanales.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaCanales.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[12px] font-black text-amber-800 uppercase tracking-widest">Atención con los Tokens</p>
                <p className="text-[12px] text-amber-700 leading-relaxed font-medium">{ayudaCanales.recomendacion}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canales.length === 0 ? (
              <div className="col-span-full p-20 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl space-y-4 bg-white/50">
                <p className="text-sm text-[var(--text-tertiary-light)] font-medium">No hay canales conectados aún.</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Button onClick={() => setIsWAModalOpen(true)} variant="outline" className="rounded-xl border-[#25D366] text-[#25D366] font-bold">
                    Conectar WhatsApp
                  </Button>
                  <Button onClick={handleOAuthConnect} variant="outline" className="rounded-xl border-[var(--accent)] text-[var(--accent)] font-bold">
                    Conectar Facebook / Instagram
                  </Button>
                </div>
              </div>
            ) : (
              canales.map((canal) => {
                const config = CANALES_CONFIG.find(c => c.tipo === canal.tipo) || CANALES_CONFIG[0];
                const isConnected = canal.status === 'connected';

                return (
                  <div 
                    key={canal.id}
                    className={cn(
                      "group relative flex flex-col p-7 rounded-[32px] border transition-all duration-300",
                      isConnected 
                        ? "bg-white border-[var(--border-light)] shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5" 
                        : "bg-[var(--bg-card)]/50 border-[var(--border-light)] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 hover:bg-white"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div 
                        className="p-3.5 rounded-2xl shadow-sm border border-white"
                        style={{ backgroundColor: isConnected ? `${config.color}10` : '#f3f4f6' }}
                      >
                        <config.icon className="w-6 h-6" style={{ color: isConnected ? config.color : '#9ca3af' }} />
                      </div>
                      {isConnected ? (
                        <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                          Activo
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          {canal.status === 'disconnected' ? 'Off' : canal.status}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 mb-8">
                      <h3 className="font-bold text-[16px] text-[var(--text-primary-light)] tracking-tight">{canal.nombre || config.nombre}</h3>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest truncate opacity-70">
                           {canal.cuenta || (canal.tipo === 'facebook' ? 'Página de Facebook' : 'Cuenta vinculada')}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", canal.webhookVerified ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500")} />
                          <span className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase tracking-wider">
                             {canal.webhookVerified ? "Webhooks OK" : "Sincro Pendiente"}
                          </span>
                          {canal.aiEnabled && (
                            <div className="ml-auto bg-[var(--accent)] text-[var(--accent-text)] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter">
                              IA ON
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedCanal(canal);
                          setIsConfigModalOpen(true);
                        }}
                        className="flex-1 h-10 text-[11px] font-black uppercase tracking-wider rounded-xl border-[var(--border-light)] bg-white hover:bg-[var(--bg-input)] transition-all"
                      >
                        Configurar
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 rounded-xl bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] flex items-center justify-center transition-colors border border-[var(--border-light)]">
                          <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl min-w-[200px] p-2 bg-white border-slate-100 shadow-2xl">
                          <DropdownMenuItem 
                            onClick={() => handleDelete(canal.id)}
                            className="text-rose-600 font-black text-[11px] uppercase tracking-widest p-3 rounded-xl hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Canal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal conexión WhatsApp */}
      <Dialog open={isWAModalOpen} onOpenChange={setIsWAModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none bg-white shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-[#25D366]" />
              Conectar WhatsApp Business
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary-light)] text-sm">
              Necesitás el Phone Number ID y un System User Access Token de tu cuenta de WhatsApp Business API en el panel de Meta for Developers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">Phone Number ID *</Label>
              <Input
                placeholder="Ej: 123456789012345"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-none px-4 text-sm font-semibold"
              />
              <p className="text-[9px] text-[var(--text-tertiary-light)] px-1 font-medium">Encontralo en Meta for Developers → Tu App → WhatsApp → Configuración de la API</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">Access Token permanente *</Label>
              <Input
                placeholder="EAAxxxxxx..."
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                type="password"
                className="h-12 rounded-2xl bg-slate-50 border-none px-4 text-sm font-semibold"
              />
              <p className="text-[9px] text-[var(--text-tertiary-light)] px-1 font-medium">Generá un System User Token en Meta Business Suite → Configuración del negocio</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">Nombre para mostrar (opcional)</Label>
              <Input
                placeholder="Ej: Soporte WhatsApp"
                value={waDisplayName}
                onChange={(e) => setWaDisplayName(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-none px-4 text-sm font-semibold"
              />
            </div>

            <div className="p-5 rounded-[24px] bg-amber-50 border border-amber-100 space-y-2">
              <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Configuración en Meta:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-700 font-medium">
                <li>Webhook URL: <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">/api/webhooks/meta</code></li>
                <li>Verify Token: <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">imala-vox-webhook-2026</code></li>
                <li>Suscribirse al campo <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-black">messages</code></li>
              </ol>
            </div>

            <Button
              onClick={handleConnectWhatsApp}
              disabled={isConnectingWA || !waPhoneNumberId.trim() || !waAccessToken.trim()}
              className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-[#25D366] hover:bg-[#22c55e] text-white shadow-xl shadow-[#25D366]/20 transition-all active:scale-95"
            >
              {isConnectingWA ? <Loader2 className="animate-spin w-5 h-5" /> : "Conectar WhatsApp"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de configuración de canal (existente, con fix para WhatsApp) */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none bg-white shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-[var(--accent)]" />
              Estado del Canal
            </DialogTitle>
          </DialogHeader>

          {selectedCanal && (
            <div className="space-y-6 mt-6">
              <div className={cn(
                "p-4 rounded-2xl flex items-start gap-4 border",
                selectedCanal.webhookVerified ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
              )}>
                {selectedCanal.webhookVerified ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                <div className="space-y-1">
                  <h4 className={cn("text-xs font-black uppercase tracking-tighter", selectedCanal.webhookVerified ? "text-green-800" : "text-amber-800")}>
                    {selectedCanal.webhookVerified ? "Webhook Verificado" : "Webhook Pendiente"}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary-light)]">
                    {selectedCanal.webhookVerified ? "Meta está enviando datos correctamente." : "Debes sincronizar para recibir mensajes."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">
                    {selectedCanal.tipo === 'whatsapp' ? 'Phone Number ID' : 'Meta Page ID'}
                  </Label>
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border-none">
                    <code className="text-[13px] font-mono flex-1 truncate font-bold text-[var(--text-primary-light)]">
                      {selectedCanal.tipo === 'whatsapp' ? selectedCanal.metaPhoneNumberId : selectedCanal.metaPageId}
                    </code>
                    <button onClick={() => { 
                      const val = selectedCanal.tipo === 'whatsapp' ? selectedCanal.metaPhoneNumberId : selectedCanal.metaPageId;
                      navigator.clipboard.writeText(val || ''); 
                      toast.success("Copiado"); 
                    }}>
                      <Copy className="w-4 h-4 text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Respuesta Automática IA</Label>
                    <p className="text-[10px] text-[var(--text-secondary-light)]">Activa el agente para este canal.</p>
                  </div>
                  <Switch 
                    disabled={isSavingConfig}
                    checked={!!selectedCanal.aiEnabled}
                    onCheckedChange={(val) => handleUpdateAIConfig(val, selectedCanal.agenteId || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">Agente Asignado</Label>
                  <Select 
                    disabled={isSavingConfig || !selectedCanal.aiEnabled}
                    value={selectedCanal.agenteId || ""}
                    onValueChange={(val) => handleUpdateAIConfig(!!selectedCanal.aiEnabled, val)}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none px-4 font-semibold">
                      <SelectValue placeholder="Seleccionar un agente..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl bg-white">
                      {agentes.map(a => (
                        <SelectItem key={a.id} value={a.id} className="rounded-xl py-2.5">
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-[13px]">{a.nombre}</span>
                            <span className="text-[10px] text-[var(--text-tertiary-light)] font-medium uppercase tracking-tight">{a.rolAgente}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSyncWebhooks}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/5 transition-all"
                  >
                    {isSyncing ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      selectedCanal.tipo === 'whatsapp' ? "Verificar número de WhatsApp" : "Sincronizar Webhooks en Meta"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
