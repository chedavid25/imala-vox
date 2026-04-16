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
  Info,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, Canal } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { conectarCanalManual, desconectarCanal } from "@/app/actions/channels";

const CANALES_CONFIG = [
  {
    tipo: 'whatsapp' as const,
    nombre: 'WhatsApp Business',
    color: '#25D366',
    bgDark: '#128C7E',
    icon: MessageSquare,
  },
  {
    tipo: 'instagram' as const,
    nombre: 'Instagram Direct',
    color: '#E1306C',
    bgDark: '#C13584',
    icon: Instagram,
  },
  {
    tipo: 'facebook' as const,
    nombre: 'Facebook Messenger',
    color: '#1877F2',
    bgDark: '#0C5FCC',
    icon: MessageCircle,
  },
];

export default function CanalesPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [canales, setCanales] = useState<(Canal & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Seleccion, 2: Formulario, 3: Exito
  const [connecting, setConnecting] = useState(false);
  const [selectedType, setSelectedType] = useState<'whatsapp' | 'instagram' | 'facebook' | null>(null);
  
  // Datos del Webhook para mostrar al final
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tu-dominio.com'}/api/webhooks/meta`;
  const verifyToken = process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'imala-vox-webhook-2026';

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    cuenta: '',
    metaPageId: '',
    metaPhoneNumberId: '',
    metaInstagramId: '',
    accessToken: ''
  });

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

  const handleOpenConnect = (type?: 'whatsapp' | 'instagram' | 'facebook') => {
    setStep(1);
    if (type) {
      setSelectedType(type);
      setStep(2);
    }
    setIsModalOpen(true);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedType(null);
  };

  const handleConnectAction = async () => {
    if (!currentWorkspaceId || !selectedType) return;
    
    // Validaciones basicas
    if (!formData.nombre || !formData.cuenta || !formData.accessToken) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setConnecting(true);
    try {
      const result = await conectarCanalManual(currentWorkspaceId, {
        tipo: selectedType,
        ...formData
      });

      if (result.success) {
        setStep(3);
        toast.success("Canal vinculado exitosamente");
      } else {
        toast.error(result.error || "Ocurrió un error al vincular el canal");
      }
    } catch (error) {
      toast.error("Error de red o servidor al conectar");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (canalId: string) => {
    if (!currentWorkspaceId) return;
    
    if (!confirm("¿Estás seguro de desconectar este canal? Dejarás de recibir mensajes.")) return;

    try {
      const res = await desconectarCanal(currentWorkspaceId, canalId);
      if (res.success) {
        toast.success("Canal desconectado");
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      toast.error("Error al desconectar");
    }
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Copiado al portapapeles");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Canales de Comunicación</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Gestiona las conexiones activas de tu CRM.</p>
        </div>
        <Button 
          onClick={() => handleOpenConnect()} 
          className="bg-[var(--accent)] text-[var(--accent-text)] font-bold hover:bg-[var(--accent-hover)] shadow-sm shadow-[var(--accent)]/20 rounded-[var(--radius-md)] px-5 h-10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Conectar Canal
        </Button>
      </div>

      {/* Banner Modo Desarrollador */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl p-4 flex gap-3 outline outline-1 outline-[var(--accent)]/10">
        <Info className="w-5 h-5 text-[var(--info)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--text-primary-light)] mb-1">
            Conexión en modo desarrollador
          </p>
          <p className="text-xs text-[var(--text-secondary-light)]">
            Actualmente los canales se conectan ingresando los datos de tu App de Meta manualmente. 
            Próximamente: conexión con un clic via OAuth de Facebook.
          </p>
        </div>
      </div>

      {/* Grid de Canales */}
      <div className="grid grid-cols-1 gap-4">
        {CANALES_CONFIG.map((config) => {
          const real = canales.find(c => c.tipo === config.tipo);
          const isConnected = real?.status === 'connected';

          return (
            <div 
              key={config.tipo}
              className={cn(
                 "group transition-all duration-200 flex items-center justify-between",
                 isConnected 
                   ? "bg-[var(--bg-card)] border border-[var(--accent)]/25 rounded-2xl p-5 shadow-sm hover:border-[var(--accent)]/50" 
                   : "bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-5 opacity-70 hover:opacity-100"
              )}
            >
              {/* ZONA 1 — Ícono + Info */}
              <div className="flex items-center gap-4 min-w-0">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: isConnected ? config.color : '#D1D5DB' }}
                >
                  <config.icon className="w-7 h-7" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary-light)] truncate">
                      {real?.nombre || config.nombre}
                    </h3>
                    
                    {/* Badge de estado */}
                    {!isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary-light)]" />
                        Desconectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-sidebar)] border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                        En línea
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary-light)] font-medium truncate">
                    {real?.cuenta || 'Esperando vinculación...'}
                  </p>
                </div>
              </div>

              {/* ZONA 2 — Estado del sistema (solo conectado) */}
              {isConnected && (
                <div className="hidden sm:flex flex-col items-end gap-1 mx-6">
                  {real?.webhookVerified ? (
                    <span className="text-[10px] font-bold text-[var(--success)] uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3 animate-pulse" /> Sistema activo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[var(--warning)] uppercase flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Webhook pendiente
                    </span>
                  )}
                  <p className="text-[10px] text-[var(--text-tertiary-light)]">
                    Último pulso: ahora
                  </p>
                </div>
              )}

              {/* ZONA 3 — Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                {!isConnected ? (
                  <Button 
                    onClick={() => handleOpenConnect(config.tipo)}
                    className="h-9 px-5 text-[12px] font-bold rounded-xl bg-[var(--bg-sidebar)] text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--bg-sidebar-hover)] hover:border-[var(--accent)] transition-all shadow-sm"
                  >
                    Conectar
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="h-9 px-5 text-[12px] font-bold rounded-xl border-[var(--border-light-strong)] text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-all"
                  >
                    Configurar
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[var(--bg-input)]">
                      <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isConnected && (
                      <DropdownMenuItem 
                        onClick={() => handleDisconnect(real!.id)}
                        className="text-destructive font-semibold"
                      >
                        Desconectar Canal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>Ver registros</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zona Canal Personalizado */}
      <div className="border-2 border-dashed border-[var(--border-light-strong)] rounded-2xl p-8 text-center space-y-3 hover:border-[var(--accent)]/30 transition-colors bg-[var(--bg-card)]/30 mt-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] mx-auto flex items-center justify-center">
          <Plus className="w-5 h-5 text-[var(--text-tertiary-light)]" />
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary-light)]">
          ¿Necesitas un canal personalizado?
        </h4>
        <p className="text-xs text-[var(--text-secondary-light)] max-w-xs mx-auto">
          Podés conectar APIs personalizadas o webhooks para integrar cualquier sistema externo.
        </p>
        <button 
          className="text-xs font-bold text-[var(--text-primary-light)] underline underline-offset-2 hover:text-[var(--accent)] transition-colors"
          onClick={() => toast.info("Documentación en desarrollo")}
        >
          Ver documentación de API →
        </button>
      </div>

      {/* MODAL DE CONEXIÓN */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-card)] border-[var(--border-light)] overflow-hidden p-0 rounded-3xl">
          {step === 1 && (
            <div className="p-6 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold">Conectar nuevo canal</DialogTitle>
                <DialogDescription>Seleccioná el tipo de servicio que querés vincular.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                {CANALES_CONFIG.map((c) => (
                  <button
                    key={c.tipo}
                    onClick={() => { setSelectedType(c.tipo); setStep(2); }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-light)] hover:border-[var(--accent)]/50 transition-all hover:bg-[var(--bg-input)] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: c.color }}>
                        <c.icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-[var(--text-primary-light)]">{c.nombre}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary-light)] group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedType && (
            <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="flex flex-row items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-full">
                  <ChevronRight className="rotate-180 w-4 h-4" />
                </Button>
                <div>
                  <DialogTitle className="text-lg font-bold">Configurar {CANALES_CONFIG.find(c => c.tipo===selectedType)?.nombre}</DialogTitle>
                  <DialogDescription>Ingresá los credenciales de Meta Graph API.</DialogDescription>
                </div>
              </DialogHeader>

              {/* Banner Ayuda */}
              <div className="bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl p-4 text-sm text-[var(--text-secondary-light)]">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[var(--accent)]" /> ¿Dónde encuentro estos datos?
                </p>
                <p className="text-xs leading-relaxed">
                  En <strong>Meta for Developers</strong> → Tu App → {selectedType === 'whatsapp' ? 'WhatsApp' : 'Configuración'}.
                </p>
                <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-[var(--accent)] font-bold text-[10px] mt-2 flex items-center gap-1 hover:underline">
                  Abrir Meta Developer Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre" className="text-xs font-bold text-[var(--text-secondary-light)]">Nombre descriptivo</Label>
                  <Input 
                    id="nombre" 
                    placeholder='Ej: "WhatsApp Ventas"' 
                    value={formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cuenta" className="text-xs font-bold text-[var(--text-secondary-light)]">
                    {selectedType === 'whatsapp' ? 'Número de Teléfono' : 'Identificador de Cuenta (@usuario)'}
                  </Label>
                  <Input 
                    id="cuenta" 
                    placeholder={selectedType === 'whatsapp' ? '+54911...' : '@usuario'} 
                    value={formData.cuenta}
                    onChange={e => setFormData({...formData, cuenta: e.target.value})}
                  />
                </div>

                {selectedType === 'whatsapp' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="phoneId" className="text-xs font-bold text-[var(--text-secondary-light)] uppercase tracking-tight">Phone Number ID</Label>
                      <Input 
                        id="phoneId" 
                        placeholder="ID numérico de Meta" 
                        value={formData.metaPhoneNumberId}
                        onChange={e => setFormData({...formData, metaPhoneNumberId: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {(selectedType === 'facebook' || selectedType === 'instagram') && (
                  <div className="grid gap-2">
                    <Label htmlFor="pageId" className="text-xs font-bold text-[var(--text-secondary-light)] uppercase tracking-tight">Meta Page ID</Label>
                    <Input 
                      id="pageId" 
                      placeholder="ID de la Página vinculada" 
                      value={formData.metaPageId}
                      onChange={e => setFormData({...formData, metaPageId: e.target.value})}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="token" className="text-xs font-bold text-[var(--text-secondary-light)]">Meta Access Token (Permanente)</Label>
                  <Input 
                    id="token" 
                    type="password"
                    placeholder="EAA..." 
                    value={formData.accessToken}
                    onChange={e => setFormData({...formData, accessToken: e.target.value})}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  onClick={handleConnectAction}
                  disabled={connecting}
                  className="w-full bg-[var(--accent)] text-[var(--accent-text)] font-bold h-11 rounded-2xl"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular Canal'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="p-8 space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-[var(--success)]/10 text-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[var(--text-primary-light)]">¡Canal vinculado exitosamente!</h3>
                <p className="text-sm text-[var(--text-tertiary-light)]">El canal se encuentra conectado y listo para recibir datos.</p>
              </div>

              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-dark)] rounded-2xl p-5 space-y-4 text-left shadow-inner">
                <p className="text-[11px] font-bold text-[var(--text-primary-dark)] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> Último paso: Configurar Webhook
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--text-tertiary-dark)] uppercase">Callback URL</Label>
                    <div className="flex items-center gap-2 bg-[var(--bg-sidebar-deep)] rounded-xl p-3 border border-white/5 group">
                      <code className="text-[var(--accent)] text-[11px] flex-1 break-all font-mono">{webhookUrl}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10" onClick={() => copiarAlPortapapeles(webhookUrl)}>
                        <Copy className="w-3.5 h-3.5 text-white/50" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--text-tertiary-dark)] uppercase">Verify Token</Label>
                    <div className="flex items-center gap-2 bg-[var(--bg-sidebar-deep)] rounded-xl p-3 border border-white/5">
                      <code className="text-[var(--accent)] text-[11px] flex-1 font-mono">{verifyToken}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10" onClick={() => copiarAlPortapapeles(verifyToken)}>
                        <Copy className="w-3.5 h-3.5 text-white/50" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-white/30 italic flex items-center gap-1">
                  En Meta Console → Webhooks → Subscribe to: messages, leadgen
                </p>
              </div>

              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="w-full h-11 rounded-2xl border-[var(--border-light)]">
                Finalizar configuración
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
