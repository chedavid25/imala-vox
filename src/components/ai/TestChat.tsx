"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCw, AlertCircle, FileText, Image as ImageIcon, FileVideo, FileAudio, ExternalLink, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatPlaygroundAction } from "@/app/actions/ai";
import { db } from "@/lib/firebase";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: {
    name: string;
    type: string;
    base64: string;
    previewUrl?: string;
  };
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(0);
  const messagesRef = useRef<Message[]>([]);
  const pendingQueueRef = useRef<Array<{ content: string; fileAttach?: { name: string; type: string; base64: string } }>>([]);
  const historyForBatchRef = useRef<Message[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRespuestaRef = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Cargar delayRespuesta del agente para usar como ventana de debounce
  useEffect(() => {
    if (!wsId || !agentId) return;
    const agentRef = doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.AGENTES, agentId);
    const unsub = onSnapshot(agentRef, (snap) => {
      delayRespuestaRef.current = snap.data()?.delayRespuesta || 0;
    });
    return () => unsub();
  }, [wsId, agentId]);

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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll al final cuando hay mensajes nuevos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 10MB");
      return;
    }
    
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });

  const procesarCola = async () => {
    const cola = [...pendingQueueRef.current];
    pendingQueueRef.current = [];
    debounceTimerRef.current = null;

    if (cola.length === 0) return;

    // Historia anterior al batch actual + mensajes intermedios (todos menos el último)
    const historyBeforeBatch = historyForBatchRef.current;
    const lastItem = cola[cola.length - 1];
    const middleItems = cola.slice(0, -1);

    const fullHistory = [
      ...historyBeforeBatch,
      ...middleItems.map((item) => ({ role: "user" as const, content: item.content, attachment: undefined })),
    ];

    pendingRef.current++;
    setIsTyping(true);

    try {
      const mappedHistory = fullHistory.map(({ role, content, attachment }) => {
        const att = attachment as Message["attachment"] | undefined;
        const isImage = att?.type?.startsWith("image/");
        return {
          role,
          content,
          attachment: att ? { name: att.name, type: att.type, base64: isImage ? att.base64 : "" } : undefined,
        };
      });

      const result = await chatPlaygroundAction(wsId, agentId, lastItem.content, mappedHistory.slice(-10), lastItem.fileAttach);

      if (result.success) {
        if (result.reply) {
          if (result.userMessageConsolidated) {
            // El servidor consolidó los mensajes del usuario: limpiar las burbujas intermedias
            setMessages((prevAll) => {
              const cleanMessages: Message[] = [];
              let groupingActive = false;

              for (let i = 0; i < prevAll.length; i++) {
                if (prevAll[i].role === "user") {
                  if (!groupingActive) {
                    groupingActive = true;
                    cleanMessages.push({ ...prevAll[i], content: result.userMessageConsolidated! });
                  }
                  // mensajes de usuario subsecuentes del mismo batch: omitir (ya consolidados)
                } else {
                  groupingActive = false;
                  cleanMessages.push(prevAll[i]);
                }
              }
              return [...cleanMessages, { role: "assistant", content: result.reply! }];
            });
          } else {
            setMessages((prevAll) => [...prevAll, { role: "assistant", content: result.reply! }]);
          }
        }
        // reply === null → cancelado por debounce del servidor, ignorar silenciosamente
      } else {
        setError(result.error || "La IA no pudo responder.");
      }
    } catch (err: any) {
      console.error("Error al enviar mensaje a la IA:", err);
      setError(`Error de conexión con el motor de IA: ${err?.message || String(err)}`);
    } finally {
      pendingRef.current--;
      if (pendingRef.current === 0) setIsTyping(false);
    }
  };

  const handleSend = async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    let fileAttach: { name: string; type: string; base64: string } | undefined;
    let localMsgAttachment: Message["attachment"] | undefined;

    if (selectedFile) {
      try {
        const base64 = await toBase64(selectedFile);
        fileAttach = { name: selectedFile.name, type: selectedFile.type, base64 };
        localMsgAttachment = { name: selectedFile.name, type: selectedFile.type, base64, previewUrl: filePreviewUrl || undefined };
      } catch {
        toast.error("Error al procesar el archivo adjunto.");
        return;
      }
    }

    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => inputRef.current?.focus(), 50);

    // Agregar mensaje a la UI inmediatamente
    const newMsg: Message = { role: "user", content: userMessage, attachment: localMsgAttachment };
    setMessages((prev) => [...prev, newMsg]);

    // Si es el primer mensaje del batch, capturar el historial previo
    if (pendingQueueRef.current.length === 0) {
      historyForBatchRef.current = messagesRef.current;
    }
    pendingQueueRef.current.push({ content: userMessage, fileAttach });

    // Reiniciar el timer: esperar 1s sin mensajes nuevos antes de llamar a la IA
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const debounceMs = delayRespuestaRef.current > 0 ? delayRespuestaRef.current * 1000 : 600;
    debounceTimerRef.current = setTimeout(procesarCola, debounceMs);
  };

  const clearChat = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    pendingQueueRef.current = [];
    historyForBatchRef.current = [];
    setMessages([]);
    setError(null);
    setIsTyping(false);
    pendingRef.current = 0;
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                "max-w-[80%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm space-y-2",
                m.role === "user" 
                  ? "bg-[var(--bg-input)] text-[var(--text-primary-light)] rounded-tr-none" 
                  : "bg-white border border-[var(--border-light)] text-[var(--text-primary-light)] rounded-tl-none font-medium"
              )}>
                {m.attachment && (
                  <div className="mb-2">
                    {m.attachment.type.startsWith("image/") ? (
                      <img 
                        src={m.attachment.previewUrl || `data:${m.attachment.type};base64,${m.attachment.base64}`} 
                        alt={m.attachment.name} 
                        className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-[var(--border-light)] shadow-sm"
                      />
                    ) : (
                      <div className="inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-white/50 border border-[var(--border-light)] text-xs font-semibold text-[var(--text-secondary-light)] shadow-sm">
                        <FileText className="w-4 h-4 text-[var(--accent)]" />
                        <span className="truncate max-w-[150px]">{m.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  {m.role === "assistant"
                    ? <MessageContent content={m.content} recursos={recursos} />
                    : m.content
                  }
                </div>
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
      <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-light)] space-y-3">
        {selectedFile && (
          <div className="flex items-center gap-3 p-2 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-2xl animate-in slide-in-from-bottom-2 fade-in max-w-fit pr-4">
            {filePreviewUrl ? (
              <img 
                src={filePreviewUrl} 
                alt="Vista previa" 
                className="w-10 h-10 rounded-lg object-cover border border-[var(--border-light)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-sidebar)] flex items-center justify-center text-[var(--accent)] border border-[var(--border-light)]">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--text-primary-light)] truncate max-w-[150px]">{selectedFile.name}</p>
              <p className="text-[9px] text-[var(--text-tertiary-light)] font-semibold uppercase">{selectedFile.type.split("/")[1] || "archivo"}</p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setFilePreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 hover:bg-[var(--bg-sidebar)] text-[var(--text-tertiary-light)] hover:text-red-500 rounded-lg transition-all ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSend}
          className="relative flex items-center gap-2"
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,.md,image/*"
            className="hidden"
          />
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-xl text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] shrink-0 transition-all border border-[var(--border-light)]"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input 
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedFile ? "Añadir un mensaje sobre el archivo..." : "Haz una pregunta técnica..."}
            className="flex-1 bg-[var(--bg-input)] border-none rounded-2xl h-12 pr-12 focus-visible:ring-1 focus-visible:ring-[var(--accent)]/50 transition-all shadow-inner"
          />
          <Button 
            disabled={!input.trim() && !selectedFile}
            type="submit"
            size="icon"
            className="absolute right-1 w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
