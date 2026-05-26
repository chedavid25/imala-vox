"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Instagram,
  Plus,
  Loader2,
  MoreVertical,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  Trash2,
  HelpCircle,
  ChevronDown,
  Lightbulb,
  Globe,
  Eye,
  EyeOff,
  Info,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  actualizarTokenAcceso,
  obtenerTokenCanal
} from "@/app/actions/channels";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.435 5.63 1.436h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.15 5.51 3.03 7.42V22l2.76-1.52c1.3.36 2.7.55 4.21.55 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.2 12.3l-2.4-2.5-4.6 2.5 5.1-5.4 2.4 2.5 4.6-2.5-5.1 5.4z"/>
  </svg>
);

const MetaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M16.63 7.82c-1.35 0-2.43.61-3.1 1.63-.67-1.02-1.75-1.63-3.1-1.63-2.14 0-3.87 1.83-3.87 4.08s1.73 4.08 3.87 4.08c1.35 0 2.43-.61 3.1-1.63.67 1.02 1.75 1.63 3.1 1.63 2.14 0 3.87-1.83 3.87-4.08s-1.73-4.08-3.87-4.08zm-6.2 6.56c-1.33 0-2.42-1.11-2.42-2.48s1.09-2.48 2.42-2.48 2.42 1.11 2.42 2.48-1.09 2.48-2.42 2.48zm6.2 0c-1.33 0-2.42-1.11-2.42-2.48s1.09-2.48 2.42-2.48 2.42 1.11 2.42 2.48-1.09 2.48-2.42 2.48z"/>
  </svg>
);

const CANALES_CONFIG = [
  {
    tipo: 'whatsapp' as const,
    nombre: 'WhatsApp Business',
    color: '#25D366',
    icon: WhatsAppIcon,
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
    icon: MessengerIcon,
  },
  {
    tipo: 'web' as const,
    nombre: 'Chat Web (Widget)',
    color: '#3B82F6',
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
  const [isConnectingEmbedded, setIsConnectingEmbedded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isWAHelpModalOpen, setIsWAHelpModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFbSdkReady, setIsFbSdkReady] = useState(false);
  const wabaDataRef = useRef<{ phoneNumberId?: string; wabaId?: string }>({});
  const isSubmittingRef = useRef<boolean>(false);

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram' | 'facebook' | 'leads' | 'web'>('whatsapp');

  // Estados para actualización de token
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState<boolean | 'visible'>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cargar FB SDK para Embedded Signup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });
      setIsFbSdkReady(true);
      console.log("[WA-DEBUG] FB SDK inicializado");
    };

    const handleMessage = (event: MessageEvent) => {
      // Solo procesamos mensajes del popup oficial de Meta con datos del Embedded Signup
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      try {
        let data: any = event.data;
        if (typeof data === 'string') {
          // El SDK manda muchos mensajes internos no-JSON (cb=...), los ignoramos
          if (!data.startsWith('{')) return;
          data = JSON.parse(data);
        }
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        console.log("[WA-DEBUG] Evento Embedded Signup:", data);
        if (data?.event === 'FINISH') {
          wabaDataRef.current = {
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
          };
          console.log("[WA-DEBUG] IDs capturados:", wabaDataRef.current);
        } else if (data?.event === 'CANCEL') {
          console.log("[WA-DEBUG] Usuario canceló el flujo");
          setIsConnectingEmbedded(false);
        } else if (data?.event === 'ERROR') {
          console.error("[WA-DEBUG] Error en Embedded Signup:", data.data);
          toast.error(`Error en el flujo: ${data.data?.error_message || 'desconocido'}`);
          setIsConnectingEmbedded(false);
        }
      } catch (err) {
        console.error("[WA-DEBUG] Error parseando mensaje de Meta:", err);
      }
    };

    window.addEventListener('message', handleMessage);

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    } else if ((window as any).FB) {
      setIsFbSdkReady(true);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const ayudaCanales = {
    titulo: "¿Cómo conectar tus canales de atención?",
    descripcion: "Los canales permiten que Imalá Vox reciba y envíe mensajes de tus clientes. WhatsApp se conecta con un clic vía Meta. Instagram y Facebook se vinculan con OAuth.",
    recomendacion: "Para Instagram y Facebook, asegurate de ser Administrador de la Página. Para WhatsApp, solo necesitás una cuenta de Facebook y tu número.",
    items: [
      { titulo: "WhatsApp", detalle: "Conexión directa con Meta vía un popup seguro. No necesitás tokens ni configuraciones técnicas." },
      { titulo: "Meta OAuth", detalle: "Iniciá sesión con Facebook para conectar tus Páginas e Instagram de forma automática." },
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

  const triggerBackendSignup = async (code: string) => {
    if (!currentWorkspaceId) return;
    const { phoneNumberId, wabaId } = wabaDataRef.current;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      // El SDK de Meta asocia el code a la URL donde se invocó FB.login().
      // El backend debe usar exactamente esa URL al intercambiar el code.
      const pageUrl = `${window.location.origin}${window.location.pathname}`;
      const res = await fetch('/api/auth/meta/whatsapp-embedded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          phoneNumberId,
          wabaId,
          wsId: currentWorkspaceId,
          pageUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("¡WhatsApp conectado! Entrá a 'Configurar' para activar la IA.");
      } else {
        toast.error(data.error || "No se pudo conectar WhatsApp");
      }
    } catch {
      toast.error("Error de red al conectar WhatsApp");
    } finally {
      setIsConnectingEmbedded(false);
      isSubmittingRef.current = false;
      wabaDataRef.current = {};
    }
  };

  const handleEmbeddedSignup = () => {
    if (!currentWorkspaceId) return;
    const configId = process.env.NEXT_PUBLIC_META_WA_CONFIG_ID;
    if (!configId) {
      toast.error("Configuración de Embedded Signup no disponible. Contactá al soporte.");
      return;
    }

    const FB = (window as any).FB;
    if (!FB || !isFbSdkReady) {
      toast.error("El SDK de Facebook aún se está cargando. Esperá unos segundos y reintentá.");
      return;
    }

    wabaDataRef.current = {};
    isSubmittingRef.current = false;
    setIsConnectingEmbedded(true);

    FB.login(
      (response: any) => {
        console.log("[WA-DEBUG] Respuesta FB.login:", response);
        if (response.authResponse?.code) {
          triggerBackendSignup(response.authResponse.code);
        } else {
          console.log("[WA-DEBUG] El usuario canceló o no autorizó el flujo");
          setIsConnectingEmbedded(false);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      }
    );
  };

  const handleOAuthConnect = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/meta/callback`;
    
    // Scopes base necesarios para identificar páginas
    const baseScopes = ['pages_show_list', 'pages_read_engagement'];
    
    // Scopes específicos según la pestaña activa
    let specificScopes: string[] = [];
    
    if (activeTab === 'instagram') {
      specificScopes = [
        'instagram_basic', 
        'instagram_manage_messages', 
        'instagram_manage_insights',
        'pages_messaging',
        'pages_manage_metadata'
      ];
    } else if (activeTab === 'facebook') {
      specificScopes = ['pages_messaging', 'pages_manage_metadata'];
    } else if (activeTab === 'whatsapp') {
      specificScopes = [
        'whatsapp_business_management', 
        'whatsapp_business_messaging', 
        'business_management',
        'pages_show_list',
        'pages_read_engagement'
      ];
    } else if (activeTab === 'leads') {
      specificScopes = [
        'leads_retrieval', 
        'ads_read', 
        'ads_management', 
        'pages_show_list', 
        'pages_manage_metadata', 
        'pages_read_engagement',
        'business_management'
      ];
    } else {
      // Por si acaso, si no hay pestaña específica (o 'all'), pedimos los básicos de mensajería
      specificScopes = ['pages_messaging', 'instagram_manage_messages'];
    }

    const scope = [...new Set([...baseScopes, ...specificScopes])].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${currentWorkspaceId}&auth_type=rerequest`;
    window.location.href = authUrl;
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

  const handleUpdateToken = async () => {
    if (!currentWorkspaceId || !selectedCanal || !newToken.trim()) return;
    setIsUpdatingToken(true);
    try {
      const res = await actualizarTokenAcceso(currentWorkspaceId, selectedCanal.id, newToken.trim());
      if (res.success) {
        toast.success("Token de acceso actualizado correctamente");
        setShowTokenInput(false);
        setNewToken('');
      } else {
        toast.error(res.error || "No se pudo actualizar el token");
      }
    } catch (error) {
      toast.error("Error de red");
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const handleLoadCurrentToken = async () => {
    if (!currentWorkspaceId || !selectedCanal) return;
    try {
      const res = await obtenerTokenCanal(currentWorkspaceId, selectedCanal.id);
      if (res.success && res.token) {
        setNewToken(res.token);
      }
    } catch (e) {
      console.error("No se pudo cargar el token actual");
    }
  };

  // Filtrar canales según la pestaña activa
  const canalesFiltrados = canales.filter(c => {
    if (activeTab === 'leads') return c.tipo === 'facebook'; // Leads vive dentro de la página de FB
    return c.tipo === activeTab;
  });

  if (!isMounted || !currentWorkspaceId) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-[var(--text-tertiary-light)]" />
              <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Ajustes del Sistema</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Canales de Atención</h1>
            <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Administra tus conexiones con Facebook, Instagram y WhatsApp.</p>
          </div>

          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all shrink-0 h-11",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)] shadow-sm"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            ¿Cómo conectar?
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>
        </div>

        {/* Sistema de Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)]/50 shadow-inner">
          {[
            { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366' },
            { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
            { id: 'facebook', label: 'Messenger', icon: MessengerIcon, color: '#1877F2' },
            { id: 'leads', label: 'Meta Ads', icon: MetaIcon, color: '#0668E1' },
            { id: 'web', label: 'Chat Web', icon: Globe, color: '#3B82F6' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-white text-[var(--text-primary-light)] shadow-lg shadow-black/5 scale-[1.02] z-10" 
                  : "text-[var(--text-secondary-light)] hover:bg-white/50 hover:text-[var(--text-primary-light)]"
              )}
            >
              <tab.icon className="w-4 h-4" style={{ color: activeTab === tab.id ? tab.color : 'currentColor' }} />
              {tab.label}
              {canales.filter(c => tab.id === 'leads' ? c.tipo === 'facebook' : c.tipo === tab.id).length > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
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
        <div className="space-y-12 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Guía de Requisitos Dinámica */}
          <div className="bg-white rounded-[32px] border border-[var(--border-light)] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[var(--border-light)] bg-[var(--bg-input)]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border-light)] flex items-center justify-center shadow-sm">
                  <Info className="w-4 h-4 text-[var(--accent-active)]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary-light)]">Requisitos de Conexión</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-white border border-[var(--border-light)] text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase">Paso 1 de 2</div>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-primary-light)]">Antes de conectar, verifica lo siguiente:</h4>
                <ul className="space-y-3">
                  {(activeTab === 'whatsapp' ? [
                    "Tener una cuenta de Facebook activa (personal o de empresa).",
                    "Un número de teléfono disponible para verificar (puede ser el que ya usás en WhatsApp Business).",
                    "El número no puede estar registrado en WhatsApp personal — solo en WhatsApp Business.",
                    "Imalá Vox no afecta tu app de WhatsApp Business del celular."
                  ] : activeTab === 'instagram' ? [
                    "Usar una cuenta de Instagram de tipo Empresa o Creador.",
                    "Tener la cuenta vinculada a una Página de Facebook.",
                    "Activar 'Permitir acceso a mensajes' en los ajustes de Instagram.",
                    "Ser Administrador de la página de Facebook vinculada."
                  ] : activeTab === 'facebook' ? [
                    "Ser Administrador de la Página de Facebook.",
                    "La página debe estar publicada y ser visible para todos.",
                    "Tener la mensajería activada en la configuración de la página."
                  ] : activeTab === 'leads' ? [
                    "Debes tener formularios de clientes potenciales activos.",
                    "Ser Administrador de la cuenta comercial (Business Manager).",
                    "Tu página de Facebook debe estar vinculada a dicha cuenta."
                  ] : [
                    "Tener acceso para insertar código en tu sitio web.",
                    "Configurar los dominios autorizados para el chat.",
                    "Asignar un agente de IA para atender a las visitas."
                  ]).map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-[13px] text-[var(--text-secondary-light)] font-medium leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--bg-sidebar)] rounded-2xl p-6 flex flex-col justify-between border border-[var(--accent)]/10">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] opacity-70">¿Todo listo?</p>
                  <h4 className="text-lg font-bold text-white tracking-tight leading-tight">
                    {activeTab === 'leads' ? 'Empieza a recibir prospectos hoy mismo.' : 
                     activeTab === 'web' ? 'Instala el widget en tu web en segundos.' :
                     'Dale vida a tu atención al cliente con IA.'}
                  </h4>
                  <p className="text-sm text-[var(--text-tertiary-light)] font-medium">
                    Una vez conectado, podrás asignar un agente de IA para que responda automáticamente 24/7.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {activeTab === 'whatsapp' ? (
                    <>
                      <Button
                        onClick={handleEmbeddedSignup}
                        disabled={isConnectingEmbedded}
                        className="w-full rounded-xl bg-[#25D366] hover:bg-[#22c55e] text-white font-black text-[11px] uppercase tracking-widest h-12 shadow-xl shadow-[#25D366]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isConnectingEmbedded
                          ? <Loader2 className="animate-spin w-4 h-4" />
                          : <><MetaIcon className="w-4 h-4 fill-white" /> Conectar WhatsApp con Meta</>}
                      </Button>
                      <button
                        onClick={() => setIsWAHelpModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#25D366]/70 hover:text-[#25D366] transition-colors text-center"
                      >
                        <HelpCircle className="w-3 h-3" />
                        ¿Cómo funciona la conexión?
                      </button>
                    </>
                  ) : activeTab === 'web' ? (
                    <Button 
                      onClick={() => router.push('/dashboard/ajustes/canales/web')} 
                      className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[11px] uppercase tracking-widest h-12 shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-95"
                    >
                      Configurar Widget Ahora
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleOAuthConnect} 
                      className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[11px] uppercase tracking-widest h-12 shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Vincular con Meta
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Listado de canales */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
              <h3 className="text-sm font-bold text-[var(--text-primary-light)] uppercase tracking-tight">Conexiones Activas</h3>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canalesFiltrados.length === 0 ? (
              <div className="col-span-full p-20 text-center border-2 border-dashed border-[var(--border-light)] rounded-3xl space-y-4 bg-white/50">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-input)] flex items-center justify-center mx-auto mb-4 border border-[var(--border-light)]">
                   {activeTab === 'whatsapp' ? <WhatsAppIcon className="w-8 h-8 text-slate-300" /> :
                    activeTab === 'instagram' ? <Instagram className="w-8 h-8 text-slate-300" /> :
                    activeTab === 'leads' ? <MetaIcon className="w-8 h-8 text-slate-300" /> :
                    activeTab === 'facebook' ? <MessengerIcon className="w-8 h-8 text-slate-300" /> :
                    <Globe className="w-8 h-8 text-slate-300" />}
                </div>
                <p className="text-sm font-bold text-[var(--text-secondary-light)]">No hay conexiones en esta pestaña.</p>
                <p className="text-[10px] text-[var(--text-tertiary-light)] uppercase tracking-widest font-black">Hace clic arriba para conectar un nuevo canal.</p>
              </div>
            ) : (
              canalesFiltrados.map((canal) => {
                const config = CANALES_CONFIG.find(c => c.tipo === canal.tipo) || CANALES_CONFIG[0];
                const isConnected = canal.status === 'connected';

                return (
                  <div 
                    key={canal.id}
                    className={cn(
                      "group relative flex flex-col p-7 rounded-[32px] border transition-all duration-300",
                      isConnected 
                        ? "bg-white border-[var(--border-light)] shadow-sm hover:shadow-xl hover:shadow-black/5" 
                        : "bg-[var(--bg-card)]/50 border-[var(--border-light)] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 hover:bg-white"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div 
                        className="p-3.5 rounded-2xl shadow-sm border border-white"
                        style={{ backgroundColor: isConnected ? (activeTab === 'leads' ? '#0668E110' : `${config.color}10`) : '#f3f4f6' }}
                      >
                        {activeTab === 'leads' ? (
                          <MetaIcon className="w-6 h-6 text-[#0668E1]" />
                        ) : (
                          <config.icon className="w-6 h-6" style={{ color: isConnected ? config.color : '#9ca3af' }} />
                        )}
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
                      <h3 className="font-bold text-[16px] text-[var(--text-primary-light)] tracking-tight">
                        {activeTab === 'leads' ? `Leads: ${canal.nombre}` : (canal.nombre || config.nombre)}
                      </h3>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest truncate opacity-70">
                           {canal.cuenta || (canal.tipo === 'facebook' ? 'Página de Facebook' : 'Cuenta vinculada')}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", canal.webhookVerified ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500")} />
                          <span className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase tracking-wider">
                             {canal.webhookVerified ? "Webhooks OK" : "Sincro Pendiente"}
                          </span>
                          {canal.aiEnabled && activeTab !== 'leads' && (
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
                        className="flex-1 h-10 text-[11px] font-black uppercase tracking-wider rounded-xl border-[var(--border-light)] bg-white hover:bg-[var(--bg-input)] hover:border-[var(--border-light-strong)] transition-all"
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
      </div>
    )}

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
                      <SelectValue placeholder="Seleccionar un agente...">
                         {selectedCanal.agenteId ? agentes.find(a => a.id === selectedCanal.agenteId)?.nombre : "Seleccionar un agente..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl bg-white w-[var(--radix-select-trigger-width)]">
                      {agentes.map(a => (
                        <SelectItem key={a.id} value={a.id} className="rounded-xl py-2.5">
                          <span className="font-bold text-[13px]">{a.nombre}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSyncWebhooks}
                    disabled={isSyncing}
                    className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/10 transition-all active:scale-95"
                  >
                    {isSyncing ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      selectedCanal.tipo === 'whatsapp' ? "Verificar número de WhatsApp" : "Sincronizar Webhooks en Meta"
                    )}
                  </Button>
                </div>

                {selectedCanal.tipo !== 'web' && (
                  <div className="pt-2 border-t border-[var(--border-light)] mt-4">
                    {!showTokenInput ? (
                      <button 
                        onClick={() => {
                          setShowTokenInput(true);
                          handleLoadCurrentToken();
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)] transition-colors flex items-center gap-1.5"
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        ¿Token expirado? Actualizar Token
                      </button>
                    ) : (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-black text-[var(--text-tertiary-light)] ml-1">Nuevo Access Token</Label>
                          <div className="relative group/input">
                            <Input
                              type={showTokenInput === 'visible' ? "text" : "password"}
                              placeholder="Pegá el nuevo token de Meta..."
                              value={newToken}
                              onChange={(e) => setNewToken(e.target.value)}
                              className="h-10 rounded-xl bg-slate-50 border-none px-4 pr-20 text-[11px] font-bold"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(newToken);
                                  toast.success("Token copiado");
                                }}
                                disabled={!newToken}
                                className="p-1.5 hover:bg-white rounded-lg text-[var(--text-tertiary-light)] transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setShowTokenInput(showTokenInput === 'visible' ? true : 'visible')}
                                className="p-1.5 hover:bg-white rounded-lg text-[var(--text-tertiary-light)] transition-colors"
                              >
                                {showTokenInput === 'visible' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleUpdateToken}
                            disabled={isUpdatingToken || !newToken.trim()}
                            className="flex-1 h-10 rounded-xl bg-[var(--text-primary-light)] text-white text-[10px] font-black uppercase tracking-widest"
                          >
                            {isUpdatingToken ? <Loader2 className="animate-spin w-4 h-4" /> : "Guardar Token"}
                          </Button>
                          <Button 
                            variant="ghost"
                            onClick={() => {
                              setShowTokenInput(false);
                              setNewToken('');
                            }}
                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal guía completa WhatsApp manual */}
      <Dialog open={isWAHelpModalOpen} onOpenChange={setIsWAHelpModalOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border-none bg-white shadow-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white px-10 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Guía completa: conectar WhatsApp Business</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-0.5">
                  Seguí estos pasos desde cero. Tardás aproximadamente 15 minutos la primera vez.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-10 py-8 space-y-8">

            {/* Aviso principal */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[12px] font-black text-emerald-800 uppercase tracking-widest">Tu app de WhatsApp no se ve afectada</p>
                <p className="text-[13px] text-emerald-700 font-medium leading-relaxed">
                  Conectar tu número <span className="font-black">no elimina ni modifica</span> tu app de WhatsApp Business del celular. Vas a poder seguir usándola con normalidad.
                </p>
              </div>
            </div>

            {/* Qué necesitás */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Lo único que necesitás</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: "👤", titulo: "Una cuenta de Facebook", detalle: "Personal o de empresa. Con eso alcanza para autenticarte con Meta." },
                  { icon: "📱", titulo: "Un número de teléfono", detalle: "Puede ser tu número actual de WhatsApp Business, uno nuevo, o de VoIP." },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="space-y-1">
                      <p className="text-[12px] font-black text-slate-800">{item.titulo}</p>
                      <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{item.detalle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Paso 1 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">1</div>
                <h3 className="text-base font-bold text-slate-900">Hacé clic en "Conectar WhatsApp con Meta"</h3>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
                  Cerrá este panel y hacé clic en el botón verde <span className="font-black text-slate-900">"Conectar WhatsApp con Meta"</span>. Se va a abrir una ventana emergente de Meta — es el proceso oficial y seguro de Meta para conectar tu número.
                </p>
              </div>
            </section>

            {/* Paso 2 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">2</div>
                <h3 className="text-base font-bold text-slate-900">Iniciá sesión con Facebook en el popup</h3>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
                  En la ventana que aparece, iniciá sesión con tu cuenta de Facebook. Si ya estás logueado en el navegador, Meta puede saltearse este paso automáticamente.
                </p>
              </div>
            </section>

            {/* Paso 3 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">3</div>
                <h3 className="text-base font-bold text-slate-900">Seleccioná o creá tu cuenta de WhatsApp Business</h3>
              </div>
              <div className="ml-10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <p className="text-[11px] font-black text-slate-700 uppercase">Ya tengo cuenta de WhatsApp Business</p>
                    <p className="text-[12px] text-slate-600 font-medium">El popup la muestra directamente. Solo la seleccionás y listo.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <p className="text-[11px] font-black text-slate-700 uppercase">Es mi primera vez</p>
                    <p className="text-[12px] text-slate-600 font-medium">Meta te guía para crear la cuenta de WhatsApp Business dentro del mismo popup.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Paso 4 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">4</div>
                <h3 className="text-base font-bold text-slate-900">Agregá y verificá tu número de teléfono</h3>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
                  Si tu número aún no está registrado en la API, el popup te pide que lo ingreses y lo verifiques con un código SMS o llamada. Si ya está registrado, Meta lo detecta solo.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-blue-700 font-medium leading-relaxed">
                    <span className="font-black">¿Tu número ya está en WhatsApp Business App?</span> Podés usarlo igual. Imalá Vox accede vía API sin desinstalar ni afectar tu app del celular.
                  </p>
                </div>
              </div>
            </section>

            {/* Paso 5 */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#25D366] text-white text-[11px] font-black flex items-center justify-center shrink-0">✓</div>
                <h3 className="text-base font-bold text-slate-900">¡Listo! Configurá el agente de IA</h3>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
                  Una vez que cerrás el popup de Meta, Imalá Vox recibe el acceso automáticamente y crea el canal. Vas a ver el número en la lista de "Conexiones Activas". Desde ahí hacé clic en <span className="font-black text-slate-900">"Configurar"</span> para asignarle un agente de IA.
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-6">
              <Button
                onClick={() => { setIsWAHelpModalOpen(false); handleEmbeddedSignup(); }}
                className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-[#25D366] hover:bg-[#22c55e] text-white shadow-xl shadow-[#25D366]/20 transition-all active:scale-95"
              >
                Entendido — Conectar ahora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
