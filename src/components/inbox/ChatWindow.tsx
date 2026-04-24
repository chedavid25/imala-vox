"use client";

import React, { useState, useRef, useEffect } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Smile, Sparkles, CheckCircle2, UserPlus, MoreVertical, MessageCircle, ChevronDown, CheckCircle, Clock, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, onSnapshot, query, Timestamp, addDoc } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Trash2, BellOff, CheckCircle as CheckIcon } from "lucide-react";
import { deleteDoc } from "firebase/firestore";
import { pedirSugerenciaIAAction } from "@/app/actions/ai";
import { listarPlantillasWA, enviarPlantillaWA, PlantillaWA } from "@/app/actions/channels";
import { getDoc } from "firebase/firestore";
import { Contacto } from "@/lib/types/firestore";
import { Loader2 } from "lucide-react";

interface ChatWindowProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string, isInternal?: boolean) => void;
}

export function ChatWindow({ conversacion, mensajes, onSendMessage }: ChatWindowProps) {
  const { contactos } = useContactos();
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<'public' | 'internal'>('public');
  const [miembros, setMiembros] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);
  const [plantillas, setPlantillas] = useState<PlantillaWA[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaWA | null>(null);
  const [variableValues, setVariableValues] = useState<string[]>([]);
  const [enviandoPlantilla, setEnviandoPlantilla] = useState(false);

  const selectedContact = contactos.find(c => c.id === conversacion?.contactoId);
  const contactName = selectedContact?.nombre || conversacion?.contactoNombre || "Desconocido";
  const contactFoto = selectedContact?.avatarUrl || null;

  const isWhatsApp = conversacion?.canal === 'whatsapp';
  const ultimoMensajeClienteDate = conversacion?.ultimoMensajeCliente?.toDate?.();
  const isWindowExpired = isWhatsApp && (
    !ultimoMensajeClienteDate || Date.now() - ultimoMensajeClienteDate.getTime() > 24 * 60 * 60 * 1000
  );
  const horasRestantes = ultimoMensajeClienteDate
    ? Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - ultimoMensajeClienteDate.getTime())) / (60 * 60 * 1000)))
    : 0;

  // Cargar agentes y humanos para reasignación
  useEffect(() => {
    if (!currentWorkspaceId) return;
    
    // 1. Cargar Agentes IA
    const agentesRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES);
    const unsubAgentes = onSnapshot(query(agentesRef), (snap) => {
      const agentesData = snap.docs.map(doc => ({ 
        id: doc.id, 
        nombre: `${doc.data().nombre} (IA)`,
        tipo: 'ai'
      }));
      
      // 2. Cargar Miembros Humanos
      const membersRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "miembros");
      onSnapshot(query(membersRef), (mSnap) => {
        const miembrosData = mSnap.docs.map(doc => ({ 
          id: doc.id, 
          nombre: doc.data().nombre || doc.data().displayName || "Miembro",
          tipo: 'humano'
        }));

        // 3. Añadir al Usuario Actual
        const currentUser = auth.currentUser;
        const currentData = currentUser ? [{
          id: currentUser.uid,
          nombre: `${currentUser.displayName || currentUser.email?.split('@')[0] || "Yo"} (Tú)`,
          tipo: 'humano'
        }] : [];

        // Combinar todo
        setMiembros([...currentData, ...miembrosData, ...agentesData]);
      });
    });

    return () => unsubAgentes();
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, mode === 'internal');
    setInputText("");
  };

  const handleResolve = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, {
        estado: 'resuelto',
        actualizadoEl: Timestamp.now()
      });
      toast.success("Conversación marcada como resuelta");
    } catch (error) {
      toast.error("Error al resolver la conversación");
    }
  };

  const handleReassign = async (miembroId: string, nombre: string) => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, {
        asignadoA: miembroId,
        asignadoANombre: nombre,
        actualizadoEl: Timestamp.now()
      });
      toast.success(`Conversación reasignada a ${nombre}`);
    } catch (error) {
      toast.error("Error al reasignar");
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    if (!confirm("¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.")) return;
    
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await deleteDoc(convRef);
      toast.success("Conversación eliminada");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const handleMarkUnread = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { unreadCount: 1 });
      toast.success("Marcada como no leída");
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const handleRequestSuggestion = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    
    setIsRequestingSuggestion(true);
    try {
      const res = await pedirSugerenciaIAAction(currentWorkspaceId, conversacion.id);
      if (res.success) {
        toast.success("Sugerencia solicitada a la IA");
      } else {
        toast.error(res.error || "No se pudo generar la sugerencia");
      }
    } catch (error) {
      toast.error("Error al conectar con la IA");
    } finally {
      setIsRequestingSuggestion(false);
    }
  };

  const handleResumeIA = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { 
        modoIA: 'auto',
        actualizadoEl: Timestamp.now()
      });
      toast.success("IA reanudada (Modo Automático)");
    } catch (error) {
      toast.error("Error al reanudar la IA");
    }
  };

  const extraerVariables = (plantilla: PlantillaWA): number => {
    const body = plantilla.components.find(c => c.type === 'BODY');
    if (!body?.text) return 0;
    const matches = body.text.match(/\{\{(\d+)\}\}/g);
    return matches ? Math.max(...matches.map(m => parseInt(m.replace(/\D/g, '')))) : 0;
  };

  const handleSeleccionarPlantilla = (p: PlantillaWA) => {
    setSelectedPlantilla(p);
    const cantidad = extraerVariables(p);
    setVariableValues(Array(cantidad).fill(''));
  };

  const handleCargarPlantillas = async () => {
    if (!currentWorkspaceId || !conversacion?.canalId) return;
    setLoadingPlantillas(true);
    try {
      const res = await listarPlantillasWA(currentWorkspaceId, conversacion.canalId);
      if (res.success && res.plantillas) {
        setPlantillas(res.plantillas);
        if (res.plantillas.length === 0) toast.info("No hay plantillas aprobadas en esta cuenta de WhatsApp.");
      } else {
        toast.error(res.error || "No se pudieron cargar las plantillas");
      }
    } finally {
      setLoadingPlantillas(false);
    }
  };

  const handleEnviarPlantilla = async () => {
    if (!currentWorkspaceId || !conversacion || !selectedPlantilla) return;
    const cantVars = extraerVariables(selectedPlantilla);
    if (cantVars > 0 && variableValues.some(v => !v.trim())) {
      toast.error("Completá todos los campos de la plantilla antes de enviar.");
      return;
    }

    setEnviandoPlantilla(true);
    try {
      const contactSnap = await getDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, conversacion.contactoId));
      if (!contactSnap.exists()) throw new Error("Contacto no encontrado");
      const contactData = contactSnap.data() as Contacto;
      const destinatario = (contactData as any).metaId || contactData.telefono;
      if (!destinatario) throw new Error("No se pudo determinar el destinatario");

      const res = await enviarPlantillaWA(
        currentWorkspaceId,
        conversacion.canalId,
        destinatario,
        selectedPlantilla.name,
        selectedPlantilla.language,
        variableValues
      );

      if (!res.success) {
        toast.error(`Error al enviar plantilla: ${res.error}`);
        return;
      }

      // Guardar en Firestore como mensaje del operador
      const body = selectedPlantilla.components.find(c => c.type === 'BODY');
      let textoEnviado = body?.text || `[Plantilla: ${selectedPlantilla.name}]`;
      variableValues.forEach((v, i) => {
        textoEnviado = textoEnviado.replace(`{{${i + 1}}}`, v);
      });

      const messagesRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id, COLLECTIONS.MENSAJES);
      await addDoc(messagesRef, {
        text: textoEnviado,
        from: 'operator',
        creadoEl: Timestamp.now(),
        metadata: { isTemplate: true, templateName: selectedPlantilla.name }
      });
      await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id), {
        ultimoMensaje: textoEnviado,
        ultimaActividad: Timestamp.now()
      });

      toast.success("Plantilla enviada correctamente");
      setSelectedPlantilla(null);
      setVariableValues([]);
      setPlantillas([]);
    } catch (e: any) {
      toast.error(e.message || "Error al enviar la plantilla");
    } finally {
      setEnviandoPlantilla(false);
    }
  };

  if (!conversacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-main)]">
        <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center mb-6 shadow-sm">
          <MessageCircle className="w-8 h-8 text-[var(--text-tertiary-light)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary-light)] mb-2">Buzón de Entrada Omnicanal</h3>
        <p className="text-sm text-[var(--text-secondary-light)] max-w-sm">
          Selecciona una conversación a la izquierda para comenzar a gestionar el contacto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-card)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center font-bold text-sm shadow-sm relative overflow-hidden">
            {contactFoto ? (
              <img src={contactFoto} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              contactName.charAt(0).toUpperCase()
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--text-primary-light)] tracking-tight">
                {contactName}
              </h3>
              <CanalBadge canal={conversacion.canal || 'whatsapp'} showIcon={false} className="scale-90" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[var(--text-tertiary-light)] font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                En línea
              </span>
              <span className="text-[11px] text-[var(--text-tertiary-light)]">•</span>
              <IndicadorIA 
                status={
                  conversacion.modoIA === 'pausado' ? 'pausado' : 
                  (conversacion.modoIA === 'auto' || conversacion.modoIA === 'copiloto') ? 'activo' : 'pausado'
                } 
                className="scale-75 origin-left" 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(conversacion.modoIA !== 'auto' && conversacion.modoIA !== 'copiloto') && (
            <Button
              size="sm"
              onClick={handleResumeIA}
              className="h-8 gap-1.5 font-black text-[10px] bg-purple-600/10 text-purple-600 border border-purple-200 hover:bg-purple-600 hover:text-white transition-all animate-in fade-in zoom-in duration-300"
            >
              <Sparkles className="w-3 h-3" />
              REANUDAR IA
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md font-bold text-xs bg-[var(--bg-input)] border border-[var(--border-light)] hover:bg-[var(--bg-main)] text-[var(--text-primary-light)] transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
              <UserPlus className="w-3.5 h-3.5" />
              {conversacion.asignadoANombre || "Reasignar"}
              <ChevronDown className="w-3 h-3 opacity-50 transition-transform data-[open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[var(--bg-card)] border-[var(--border-light)] p-1">
              <div className="px-2 py-1.5 text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Agentes Disponibles</div>
              {miembros.map((m) => (
                <DropdownMenuItem 
                  key={m.id} 
                  onClick={() => handleReassign(m.uid || m.id, m.nombre)}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary-light)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] cursor-pointer rounded-lg m-0.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[10px] border border-[var(--border-light)]">
                    {m.nombre.charAt(0)}
                  </div>
                  {m.nombre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="default" 
            size="sm" 
            onClick={handleResolve}
            className={cn(
              "h-8 gap-1.5 font-bold text-xs shadow-lg transition-all",
              conversacion.estado === 'resuelto' 
                ? "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30" 
                : "bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)]"
            )}
          >
            {conversacion.estado === 'resuelto' ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {conversacion.estado === 'resuelto' ? 'Resuelta' : 'Resolver'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-[var(--bg-input)] rounded-md transition-colors text-[var(--text-tertiary-light)] outline-none">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--bg-card)] border-[var(--border-light)] p-1">
              <DropdownMenuItem 
                onClick={handleMarkUnread}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md hover:bg-[var(--bg-main)] cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                Marcar como no leído
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--border-light)] mx-1 my-1" />
              <DropdownMenuItem 
                onClick={handleDeleteConversation}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Conversación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages View */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-main)]/30 no-scrollbar"
      >
        {mensajes.map((msg, idx) => {
          const isNote = msg.metadata?.isInternalNote || msg.from === 'system';
          const isMe = msg.from === 'operator';
          
          return (
            <div key={msg.id || idx} className={cn(
              "flex w-full",
              isMe ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "max-w-[70%] space-y-1",
                isMe ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm",
                  isNote 
                    ? "bg-[#FEFCE8] border border-yellow-200 text-yellow-800" 
                    : isMe 
                      ? "bg-[var(--accent)] text-[var(--accent-text)] font-semibold rounded-tr-none" 
                      : "bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary-light)] rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 px-1 text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-wider">
                  {isNote ? "NOTA INTERNA" : isMe ? "AGENTE IMALÁ" : "CLIENTE"}
                  <span>•</span>
                  {msg.creadoEl ? new Date(msg.creadoEl.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer Area */}
      <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-card)] space-y-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] flex-shrink-0">
        
        {/* Banner ventana 24hs WhatsApp */}
        {isWhatsApp && isWindowExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-[12px] font-black text-amber-800 uppercase tracking-wide">Ventana de 24hs expirada</p>
              <p className="text-[12px] text-amber-700 leading-relaxed">
                WhatsApp no permite enviar mensajes libres fuera de las 24hs. Para retomar la conversación, <span className="font-bold">escribile primero desde WhatsApp Business en tu celular</span>. Cuando el cliente responda, podrás continuar desde aquí.
              </p>
              <p className="text-[11px] text-amber-600 font-medium">
                Las notas internas siguen disponibles mientras esperás.
              </p>
            </div>
          </div>
        )}
        {isWhatsApp && !isWindowExpired && horasRestantes <= 6 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2.5 animate-in fade-in">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <p className="text-[11px] text-blue-700 font-medium">
              Ventana WhatsApp: quedan <span className="font-bold">{horasRestantes}h</span> para responder libremente.
            </p>
          </div>
        )}

        {/* Sugerencia Copiloto */}
        {conversacion.sugerenciaIA && (
          <div className="bg-gradient-to-r from-purple-50 to-purple-100/30 border border-purple-200/80 p-3 rounded-[12px] flex flex-col gap-2 relative shadow-sm animate-in slide-in-from-bottom-2 fade-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 fill-purple-500/20" />
              <span className="text-[10px] font-bold text-purple-600 tracking-wider">BORRADOR DEL COPILOTO</span>
            </div>
            <p className="text-[13px] text-purple-900/90 leading-relaxed pl-5 whitespace-pre-wrap">{conversacion.sugerenciaIA}</p>
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="h-7 text-purple-700/70 hover:text-purple-900 hover:bg-purple-200/50 text-xs transition-colors" onClick={async () => {
                if (!currentWorkspaceId || !conversacion?.id) return;
                await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id), { sugerenciaIA: null });
              }}>Descartar</Button>
              <Button size="sm" className="h-7 bg-purple-600 text-white hover:bg-purple-700 text-xs shadow-sm transition-all shadow-purple-500/20" onClick={async () => {
                setInputText(conversacion.sugerenciaIA);
                setMode('public');
                if (!currentWorkspaceId || !conversacion?.id) return;
                await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id), { sugerenciaIA: null });
              }}>Usar Texto</Button>
            </div>
          </div>
        )}
        {/* Composer Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-input)] p-0.5 rounded-lg w-fit border border-[var(--border-light)]">
          <button 
            onClick={() => setMode('public')}
            className={cn(
              "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all",
              mode === 'public' ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-sm" : "text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
            )}
          >
            MENSAJE PÚBLICO
          </button>
          <button 
            onClick={() => setMode('internal')}
            className={cn(
              "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all",
              mode === 'internal' ? "bg-yellow-100/50 text-yellow-700 shadow-sm" : "text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
            )}
          >
            NOTA INTERNA
          </button>
        </div>

        {/* Input Box */}
        {mode === 'public' && isWindowExpired ? (
          /* Selector de Plantillas (ventana 24hs cerrada) */
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)] overflow-hidden">
            {plantillas.length === 0 ? (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                  <span className="text-[13px] text-[var(--text-secondary-light)]">Enviar una plantilla aprobada por Meta</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCargarPlantillas}
                  disabled={loadingPlantillas}
                  className="h-8 gap-1.5 font-black text-[10px] uppercase text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 rounded-lg"
                >
                  {loadingPlantillas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Ver plantillas
                </Button>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Lista de plantillas */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                  {plantillas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSeleccionarPlantilla(p)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                        selectedPlantilla?.id === p.id
                          ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                          : "bg-[var(--bg-card)] border-[var(--border-light)] hover:border-[var(--accent)]/20 text-[var(--text-primary-light)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold truncate">{p.name}</span>
                        <span className="text-[9px] font-black uppercase shrink-0 px-1.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-tertiary-light)]">{p.language}</span>
                      </div>
                      {p.components.find(c => c.type === 'BODY')?.text && (
                        <p className="text-[11px] text-[var(--text-tertiary-light)] mt-1 truncate">
                          {p.components.find(c => c.type === 'BODY')!.text}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Variables dinámicas */}
                {selectedPlantilla && extraerVariables(selectedPlantilla) > 0 && (
                  <div className="space-y-2 pt-1 border-t border-[var(--border-light)]">
                    <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-wider">Completar variables</p>
                    {variableValues.map((v, i) => (
                      <input
                        key={i}
                        type="text"
                        placeholder={`Variable {{${i + 1}}}`}
                        value={v}
                        onChange={e => {
                          const next = [...variableValues];
                          next[i] = e.target.value;
                          setVariableValues(next);
                        }}
                        className="w-full px-3 py-2 text-[13px] rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-primary-light)] placeholder:text-[var(--text-tertiary-light)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Botón enviar plantilla */}
            {plantillas.length > 0 && (
              <div className="px-3 pb-3 flex justify-end">
                <Button
                  onClick={handleEnviarPlantilla}
                  disabled={!selectedPlantilla || enviandoPlantilla || (extraerVariables(selectedPlantilla!) > 0 && variableValues.some(v => !v.trim()))}
                  className="h-9 px-5 gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/20 transition-all"
                >
                  {enviandoPlantilla ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar plantilla
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "rounded-xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--accent)]/20 overflow-hidden",
            mode === 'internal' ? "bg-yellow-50/30 border-yellow-200" : "bg-[var(--bg-input)] border-[var(--border-light)]"
          )}>
            <Textarea
              placeholder={mode === 'internal' ? "Escribe una nota interna para tu equipo..." : "Responde al cliente..."}
              className="border-none bg-transparent focus-visible:ring-0 resize-none min-h-[90px] p-4 text-[14px] leading-relaxed no-scrollbar"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="px-4 py-3 flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-card)]/50">
              <div className="flex items-center gap-1.5">
                <button className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-tertiary-light)] transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-tertiary-light)] transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRequestSuggestion}
                  disabled={isRequestingSuggestion}
                  className="h-8 gap-1.5 font-black text-[10px] text-[var(--accent)] bg-[var(--bg-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white px-4 rounded-full border border-[var(--accent)]/20 shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isRequestingSuggestion ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 fill-[var(--accent)]/20" />
                  )}
                  ASISTENTE IA
                </Button>
              </div>

              <Button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className={cn(
                  "h-9 px-5 gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl",
                  mode === 'internal'
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200"
                    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-[var(--accent)]/20"
                )}
              >
                <Send className="w-3.5 h-3.5" />
                {mode === 'internal' ? 'Guardar Nota' : 'Enviar mensaje'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
