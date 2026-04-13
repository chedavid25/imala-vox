"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatPlaygroundAction } from "@/app/actions/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TestChatProps {
  wsId: string;
  agentId: string;
}

export function TestChat({ wsId, agentId }: TestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

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
      // Llamada a la Server Action
      const result = await chatPlaygroundAction(
        wsId,
        agentId,
        userMessage,
        messages.slice(-10) // Enviamos solo los últimos 10 para contexto (ahorro de tokens)
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
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary-light)]">Chat de Prueba</h3>
            <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Modo Simulación (Sin persistencia)</p>
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

      {/* área de Mensajes */}
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
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                m.role === "user" ? "bg-[var(--text-primary-light)] text-white" : "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
              )}>
                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                m.role === "user" 
                  ? "bg-[var(--bg-input)] text-[var(--text-primary-light)] rounded-tr-none" 
                  : "bg-white border border-[var(--border-light)] text-[var(--text-primary-light)] rounded-tl-none font-medium"
              )}>
                {m.content}
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-[var(--border-light)] p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
              <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-tight">La IA está pensando...</span>
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
            className="absolute right-1 w-10 h-10 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-[11px] text-center mt-3 text-[var(--text-tertiary-dark)] font-medium uppercase tracking-[0.04em] opacity-80">
            CLAUDE SONNET 4.6 &bull; PROMPT CACHING ENABLED
        </p>
      </div>
    </div>
  );
}
