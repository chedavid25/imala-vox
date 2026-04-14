import React, { useState, useRef, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Send, 
  User, 
  Bot, 
  Sparkles, 
  Check, 
  X, 
  Loader2,
  Zap,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";

interface ChatWindowProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string) => void;
  onLoadMore?: () => void;
}

export function ChatWindow({ conversacion, mensajes, onSendMessage, onLoadMore }: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [sugerenciaIa, setSugerenciaIa] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const virtuosoRef = useRef<any>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
    setSugerenciaIa(null);
  };

  const { currentWorkspaceId } = useWorkspaceStore();

  const handleToggleIA = async (active: boolean) => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { 
        aiActive: active,
        actualizadoEl: new Date()
      });
      toast.success(active ? "Agente IA activado" : "Agente IA desactivado");
    } catch (error) {
      console.error("Error al cambiar estado IA:", error);
      toast.error("No se pudo cambiar el estado de la IA");
    }
  };

  const aceptarSugerencia = () => {
    if (sugerenciaIa) {
      setInputText(sugerenciaIa);
      setSugerenciaIa(null);
    }
  };

  if (!conversacion) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-tertiary-light)]">
        Selecciona una conversación para comenzar
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-card)]">
      {/* Header del Chat */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-light)] px-6 flex items-center justify-between shrink-0 bg-[var(--bg-card)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center border border-[var(--border-light)]">
            <User className="w-6 h-6 text-[var(--text-tertiary-light)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary-light)]">
              {conversacion.contactoNombre || "Desconocido"}
            </h3>
            <div className="flex items-center gap-2">
              <CanalBadge canal={conversacion.canal || 'whatsapp'} className="scale-75 origin-left" />
              <div className="flex items-center gap-1.5 ml-1">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", conversacion.aiActive ? "bg-[var(--success)]" : "bg-[var(--text-tertiary-light)]")} />
                <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider">
                  {conversacion.aiActive ? "IA Activa" : "Solo Humano"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[var(--bg-input)]/50 px-4 py-2 rounded-2xl border border-[var(--border-light)]">
           <div className="flex items-center gap-2">
              {conversacion.modoIA === 'auto' ? <Zap className="w-3.5 h-3.5 text-[var(--accent)]" /> : <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />}
              <span className="text-[10px] font-bold text-[var(--text-secondary-light)] uppercase tracking-tight">
                Modo: {conversacion.modoIA || 'Copiloto'}
              </span>
           </div>
           <div className="w-px h-4 bg-[var(--border-light)]" />
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase">IA</span>
              <Switch 
                checked={conversacion.aiActive}
                onCheckedChange={handleToggleIA}
              />
           </div>
        </div>
      </header>

      {/* Ventana de Mensajes con Scroll Infinito */}
      <div className="flex-1 min-h-0">
        <Virtuoso
          ref={virtuosoRef}
          data={mensajes}
          initialTopMostItemIndex={mensajes.length - 1}
          firstItemIndex={10000 - mensajes.length} // Necesario para "prepend" items
          startReached={onLoadMore}
          itemContent={(index, msg) => (
            <MessageItem key={msg.id} message={msg} />
          )}
          style={{ height: '100%' }}
          followOutput="smooth"
        />
      </div>

      {/* Composer de Mensajes con Sugerencia de IA */}
      <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-card)] space-y-3">
        
        {/* Sugerencia de Copiloto IA */}
        {conversacion.aiActive && (conversacion.modoIA === 'copiloto' || !conversacion.modoIA) && (
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
            {isGenerating ? (
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl shadow-sm">
                 <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                 <span className="text-xs font-medium text-[var(--text-secondary-light)] italic">Claude está pensando una respuesta...</span>
              </div>
            ) : (
              <div className="p-4 bg-[var(--bg-input)] border border-[var(--accent)]/20 rounded-2xl relative group shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[var(--accent)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sugerencia Inteligente</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSugerenciaIa(null)} className="p-1 hover:bg-white rounded-md transition-colors"><X className="w-3 h-3 text-[var(--text-tertiary-light)]" /></button>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--text-primary-light)] leading-relaxed mb-3">
                  {sugerenciaIa || "No hay sugerencias nuevas. Envía un mensaje para activar la IA."}
                </p>
                {sugerenciaIa && (
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={aceptarSugerencia}
                      className="bg-[var(--accent)] text-[var(--accent-text)] text-[11px] h-7 font-bold px-3 rounded-xl"
                    >
                      <Check className="w-3 h-3 mr-1.5" />
                      Usar sugerencia
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 bg-[var(--bg-input)] rounded-2xl px-4 py-1.5 border border-[var(--border-light)] focus-within:border-[var(--accent)]/50 transition-all shadow-inner">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Responder como humano..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-10 font-medium"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="rounded-xl w-9 h-9 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shrink-0 shadow-md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: any }) {
  const isBot = message.from === 'bot';
  const isOperator = message.from === 'operator';
  const isUser = message.from === 'user';

  return (
    <div className={cn(
      "flex w-full mb-4 px-6",
      isUser ? "justify-start" : "justify-end"
    )}>
      <div className={cn(
        "max-w-[80%] flex flex-col",
        isUser ? "items-start" : "items-end"
      )}>
        <div className={cn(
          "px-4 py-2 rounded-2xl text-[13px] shadow-sm",
          isUser 
            ? "bg-[var(--bg-input)] text-[var(--text-primary-light)] rounded-tl-none" 
            : "bg-[var(--accent)] text-[var(--accent-text)] rounded-tr-none font-medium"
        )}>
          {message.text}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          {isBot && (
            <div className="flex items-center justify-center w-4 h-4 rounded bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 text-[var(--accent)]">
              <Bot className="w-2.5 h-2.5" />
            </div>
          )}
          <span className="text-[10px] text-[var(--text-tertiary-light)] font-medium">
            {format(message.creadoEl?.toDate() || new Date(), 'HH:mm', { locale: es })}
          </span>
        </div>
      </div>
    </div>
  );
}
