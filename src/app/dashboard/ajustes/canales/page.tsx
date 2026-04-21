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
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { eliminarCanal, sincronizarWebhooks, configurarCanalIA } from "@/app/actions/channels";

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
];

export default function CanalesPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [canales, setCanales] = useState<(Canal & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanal, setSelectedCanal] = useState<(Canal & { id: string }) | null>(null);
  const [agentes, setAgentes] = useState<{ id: string; nombre: string; rolAgente: string }[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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
      const res = await sincronizarWebhooks(currentWorkspaceId, selectedCanal.id);
      if (res.success) {
        toast.success("Webhooks sincronizados en Meta");
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--accent)]">Canales de Atención</h1>
          <p className="text-[var(--text-secondary-light)] mt-2">
            Administra tus conexiones con Facebook, Instagram y WhatsApp.
          </p>
        </div>
        <Button 
          onClick={handleOAuthConnect}
          className="rounded-2xl bg-[var(--accent)] font-bold px-6 h-12 shadow-lg shadow-[var(--accent)]/20 hover:brightness-110 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Conectar nueva cuenta de Meta
        </Button>
      </div>

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
                <Button onClick={handleOAuthConnect} variant="outline" className="rounded-xl border-[var(--accent)] text-[var(--accent)] font-bold">
                  Comenzar vinculación con Meta
                </Button>
              </div>
            ) : (
              canales.map((canal) => {
                const config = CANALES_CONFIG.find(c => c.tipo === canal.tipo) || CANALES_CONFIG[0];
                const isConnected = canal.status === 'connected';

                return (
                  <div 
                    key={canal.id}
                    className={cn(
                      "group relative flex flex-col p-6 rounded-3xl border transition-all duration-300",
                      isConnected 
                        ? "bg-white border-[var(--accent)]/30 shadow-sm" 
                        : "bg-[var(--bg-card)]/50 border-[var(--border-light)] grayscale opacity-80 hover:grayscale-0 hover:opacity-100 hover:bg-white"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div 
                        className="p-3 rounded-2xl"
                        style={{ backgroundColor: isConnected ? `${config.color}15` : '#f3f4f6' }}
                      >
                        <config.icon className="w-6 h-6" style={{ color: isConnected ? config.color : '#9ca3af' }} />
                      </div>
                      {isConnected ? (
                        <Badge className="bg-green-50 text-green-700 border-green-100 px-3 py-1 text-[10px] uppercase font-black">
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[var(--text-tertiary-light)] border-[var(--border-light)] px-3 py-1 text-[10px] uppercase font-bold">
                          {canal.status === 'disconnected' ? 'Desconectado' : canal.status}
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 mb-8">
                      <h3 className="font-bold text-[15px]">{canal.nombre || config.nombre}</h3>
                      <div className="space-y-1">
                        <p className="text-[11px] text-[var(--text-secondary-light)] font-medium truncate">
                           {canal.cuenta || (canal.tipo === 'facebook' ? 'Página de Facebook' : 'Cuenta vinculada')}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", canal.webhookVerified ? "bg-green-500" : "bg-amber-500")} />
                          <span className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase">
                             {canal.webhookVerified ? "Webhooks OK" : "Sincro Pendiente"}
                          </span>
                          {canal.aiEnabled && (
                            <Badge className="ml-auto bg-[var(--accent)]/5 text-[var(--accent)] border-none text-[8px] h-4 scale-90">
                              IA ACTIVA
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedCanal(canal);
                          setIsConfigModalOpen(true);
                        }}
                        className="flex-1 h-9 text-[11px] font-bold rounded-xl border-[var(--border-light-strong)]"
                      >
                        Configurar
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-9 w-9 rounded-xl hover:bg-[var(--bg-input)] flex items-center justify-center transition-colors">
                          <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl min-w-[200px]">
                          <DropdownMenuItem 
                            onClick={() => handleDelete(canal.id)}
                            className="text-red-600 font-bold"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar definitivamente
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
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Meta Page ID</Label>
                  <div className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-light)]">
                    <code className="text-xs font-mono flex-1 truncate">{selectedCanal.metaPageId}</code>
                    <button onClick={() => { navigator.clipboard.writeText(selectedCanal.metaPageId || ''); toast.success("Copiado"); }}>
                      <Copy className="w-4 h-4 text-[var(--text-tertiary-light)] hover:text-[var(--accent)]" />
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
                  <Label className="text-[10px] uppercase font-bold text-[var(--text-tertiary-light)]">Agente Asignado</Label>
                  <Select 
                    disabled={isSavingConfig || !selectedCanal.aiEnabled}
                    value={selectedCanal.agenteId || ""}
                    onValueChange={(val) => handleUpdateAIConfig(!!selectedCanal.aiEnabled, val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Seleccionar un agente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentes.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex flex-col items-start py-0.5">
                            <span className="font-bold text-xs">{a.nombre}</span>
                            <span className="text-[9px] text-[var(--text-tertiary-light)]">{a.rolAgente}</span>
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
                    className="w-full h-11 rounded-2xl font-bold border-[var(--accent)] text-[var(--accent)]"
                  >
                    {isSyncing ? <Loader2 className="animate-spin" /> : "Sincronizar Webhooks en Meta"}
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
