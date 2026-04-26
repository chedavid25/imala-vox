"use client";

import React from "react";

export function FloatingWhatsApp() {
  const phoneNumber = "5493513376865";
  const message = "¡Hola David! Vengo de la web y me gustaría saber más sobre Imalá Vox.";
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[100] flex items-center justify-center group"
      aria-label="Contactar por WhatsApp"
    >
      {/* Tooltip / Label */}
      <div className="absolute right-full mr-4 bg-white px-4 py-2 rounded-2xl shadow-xl border border-[#E5E5E3] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pointer-events-none whitespace-nowrap">
        <p className="text-sm font-bold text-[#1A1A18]">Chatear con David</p>
      </div>

      {/* Botón */}
      <div className="relative">
        {/* Efecto de Pulso Animado */}
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 group-hover:opacity-0 transition-opacity"></div>
        
        <div className="relative size-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-all duration-300">
          <img src="https://cdn.simpleicons.org/whatsapp/white" alt="WhatsApp" className="w-7 h-7" />
        </div>
      </div>
    </a>
  );
}
