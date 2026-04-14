"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCw, AlertCircle, FileText, Image as ImageIcon, FileVideo, FileAudio, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatPlaygroundAction } from "@/app/actions/ai";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TestChatProps {
  wsId: string;
  agentId: string;
}

// Detecta patrones [nombre.ext] en el texto y los separa en partes
function parseMessageContent(content: string, recursos: (RecursoConocimiento & { id: string })[]) {
  const parts: { type: "text" | "resource"; text: string; recurso?: RecursoConocimiento & { id: string } }[] = [];
  const regex = /\[([^\]]+\.\w+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Texto antes del match
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }

    // Buscar el recurso por nombre de archivo
    const fileName = match[1];
    const recurso = recursos.find(r =>
      r.archivoNombre?.toLowerCase() === fileName.toLowerCase() ||
      r.titulo?.toLowerCase() === fileName.toLowerCase()
    );

    parts.push({ type: "resource", text: fileName, recurso });
    lastIndex = match.index + match[0].length;
  }

  // Texto restante
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return parts;
}

function getIconByName(fileName: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext || '')) return ImageIcon;
  if (['mp4','mov','avi','webm'].includes(ext || '')) return FileVideo;
  if (['mp3','wav','ogg','m4a'].includes(ext || '')) return FileAudio;
  return FileText;
}

function ResourceChip({ fileName, recurso }: { fileName: string; recurso?: RecursoConocimiento & { id: string } }) {
  const Icon = getIconByName(fileName);
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  const hasUrl = !!recurso?.archivoUrl;

  if (!hasUrl) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-light)] text-[11px] font-bold text-[var(--text-secondary-light)] mx-0.5">
        <Icon className="w-3 h-3" />
        {fileName}
      </span>
    );
  }

  return (
    <a
      href={recurso!.archivoUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all mx-0.5 shadow-sm cursor-pointer"
      title={`Abrir ${fileName}`}
    >
      <Icon className="w-3 h-3" />
      {fileName}
      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{ext}</span>
    </a>
  );
}

function MessageContent({ content, recursos }: { content: string; recursos: (RecursoConocimiento & { id: string })[] }) {
  const parts = parseMessageContent(content, recursos);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "text") return <span key={i}>{part.text}</span>;
        return <ResourceChip key={i} fileName={part.text} recurso={part.recurso} />;
      })}
    </span>
  );
}

export function TestChat({ wsId, agentId }: TestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recursos, setRecursos] = useState<(RecursoConocimiento & { id: string })[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar recursos multimedia del workspace para parsear links en el chat
  useEffect(() => {
    if (!wsId) return;
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "recurso")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecursos(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });
    return () => unsub();
  }, [wsId]);

  // Auto-scroll al final cuando hay mensajes nuevos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      const result = await chatPlaygroundAction(
        wsId,
        agentId,
        userMessage,
        messages.slice(-10)
      );

      if (result.success && result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      } else {
        setError(result.error || "La IA no pudo responder.");
      }
    } catch (err) {
      setError("Error de conexión con el motor de IA.");
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[600px] bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-xl shadow-black/5 relative group">
      {/* Header del Chat */}
      <div className="p-4 bg-[var(--bg-input)]/50 border-b border-[var(--border-light)] flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary-light)]">Chat de Prueba</h3>
            <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Modo Simulación · Los recursos aparecen como links clicables</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={clearChat}
          className="w-8 h-8 rounded-full hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-all"
          title="Limpiar chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Área de Mensajes */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center">
                <Bot className="w-6 h-6 text-[var(--text-tertiary-light)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-tertiary-light)] max-w-[200px]">
              Escribe algo para probar las instrucciones y el conocimiento del agente.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={i} 
              className={cn(
                "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                m.role === "user" 
                  ? "bg-[var(--text-primary-light)] text-white" 
                  : "bg-[var(--bg-sidebar)] border border-[var(--accent)]/40 text-[var(--accent)]"
              )}>
                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                m.role === "user" 
                  ? "bg-[var(--bg-input)] text-[var(--text-primary-light)] rounded-tr-none" 
                  : "bg-white border border-[var(--border-light)] text-[var(--text-primary-light)] rounded-tl-none font-medium"
              )}>
                {m.role === "assistant"
                  ? <MessageContent content={m.content} recursos={recursos} />
                  : m.content
                }
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--accent)]/40 flex items-center justify-center shrink-0 text-[var(--accent)]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-[var(--border-light)] p-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
              <span className="text-[11px] font-medium text-[var(--text-secondary-light)] italic tracking-tight">Asistente está escribiendo...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-600 items-center">
            <AlertCircle className="w-4 h-4" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}
      </div>

      {/* Input de Mensaje */}
      <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-light)]">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center gap-2"
        >
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Haz una pregunta técnica..."
            className="flex-1 bg-[var(--bg-input)] border-none rounded-2xl h-12 pr-12 focus-visible:ring-1 focus-visible:ring-[var(--accent)]/50 transition-all shadow-inner"
          />
          <Button 
            disabled={!input.trim() || isTyping}
            type="submit"
            size="icon"
            className="absolute right-1 w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-[11px] text-center mt-3 text-[var(--text-tertiary-dark)] font-medium uppercase tracking-[0.04em] opacity-80">
            CLAUDE SONNET 4.6 &bull; PROMPT CACHING ENABLED
        </p>
      </div>
    </div>
  );
}
