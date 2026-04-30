(function() {
  if (window.ImalaVoxWidget) return;
  window.ImalaVoxWidget = true;

  const configParams = window.ImalaVox || {};
  const workspaceId = configParams.workspaceId;
  if (!workspaceId) return;

  // 1. CREAR ESTRUCTURA BÁSICA (Invisible hasta cargar config)
  const container = document.createElement('div');
  container.id = 'imalavox-container';
  container.style.display = 'none';
  document.body.appendChild(container);

  // 2. CARGAR CONFIGURACIÓN DESDE LA API
  async function initWidget() {
    try {
      const host = window.ImalaVoxHost || ''; // Permitir override del host si es necesario
      const response = await fetch(`${host}/api/widget/config?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error("Config not found");
      
      const data = await response.json();
      const cfg = data.config;
      
      if (!cfg) return;

      // 3. INYECTAR ESTILOS DINÁMICOS
      const style = document.createElement('style');
      style.innerHTML = `
        #imalavox-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: block !important;
        }
        #imalavox-button {
          width: 60px; height: 60px; border-radius: 30px;
          background: ${cfg.colorButton || '#C8FF00'};
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #imalavox-button:hover { transform: scale(1.1); }
        #imalavox-button svg { width: 28px; height: 28px; color: #1A1A18; }
        
        #imalavox-window {
          position: absolute; bottom: 80px; right: 0;
          width: 380px; height: 600px; max-height: calc(100vh - 120px);
          background: white; border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          display: none; flex-direction: column; overflow: hidden;
          transform-origin: bottom right; transition: all 0.3s ease;
          opacity: 0; transform: scale(0.9);
        }
        #imalavox-window.open { display: flex; opacity: 1; transform: scale(1); }
        
        .imalavox-header { padding: 20px; background: ${cfg.colorHeader || '#1A1A18'}; color: white; display: flex; align-items: center; gap: 12px; }
        .imalavox-header-logo { width: 40px; height: 40px; border-radius: 20px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .imalavox-header-logo img { width: 100%; height: 100%; object-fit: cover; }
        .imalavox-header-text h3 { margin: 0; font-size: 14px; font-weight: 700; }
        .imalavox-header-text p { margin: 2px 0 0; font-size: 10px; opacity: 0.7; }
        
        .imalavox-messages { flex: 1; padding: 20px; background: #F8F9FA; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .imalavox-msg { max-width: 85%; padding: 12px 16px; border-radius: 18px; font-size: 13px; line-height: 1.5; }
        .imalavox-msg-bot { background: white; color: #1A1A18; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        
        .imalavox-input-area { padding: 15px; background: white; border-top: 1px solid #EEE; display: flex; gap: 10px; }
        .imalavox-input { flex: 1; border: none; background: #F1F3F5; padding: 10px 15px; border-radius: 20px; font-size: 13px; outline: none; }
        .imalavox-send { width: 36px; height: 36px; border-radius: 18px; background: ${cfg.colorButton || '#C8FF00'}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        
        @media (max-width: 480px) {
          #imalavox-window { width: calc(100vw - 40px); height: calc(100vh - 100px); bottom: 70px; }
        }
      `;
      document.head.appendChild(style);

      // 4. CONSTRUIR UI
      container.innerHTML = `
        <div id="imalavox-window">
          <div class="imalavox-header">
            <div class="imalavox-header-logo">
              ${cfg.logoHeaderUrl ? `<img src="${cfg.logoHeaderUrl}" />` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>`}
            </div>
            <div class="imalavox-header-text">
              <h3>${cfg.headerText || 'Imalá Vox'}</h3>
              <p>Online</p>
            </div>
          </div>
          <div class="imalavox-messages" id="imalavox-chat-messages"></div>
          <div class="imalavox-input-area">
            <input type="text" class="imalavox-input" id="imalavox-chat-input" placeholder="Escribe un mensaje...">
            <button class="imalavox-send" id="imalavox-chat-send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 14-7-7 14-2-7-5-2Z"></path><path d="m19 5-7 7"></path></svg>
            </button>
          </div>
        </div>
        <div id="imalavox-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
      `;

      // 5. EVENTOS
      const btn = document.getElementById('imalavox-button');
      const win = document.getElementById('imalavox-window');
      const msgBox = document.getElementById('imalavox-chat-messages');
      const input = document.getElementById('imalavox-chat-input');
      const send = document.getElementById('imalavox-chat-send');

      const toggleChat = () => {
        win.classList.toggle('open');
        if (win.classList.contains('open')) input.focus();
      };

      btn.onclick = toggleChat;

      const addMessage = (text, isBot = true) => {
        const m = document.createElement('div');
        m.className = `imalavox-msg ${isBot ? 'imalavox-msg-bot' : 'imalavox-msg-user'}`;
        m.textContent = text;
        msgBox.appendChild(m);
        msgBox.scrollTop = msgBox.scrollHeight;
      };

      // Mensaje de bienvenida
      if (cfg.showWelcomeMessage && cfg.welcomeMessage) {
        setTimeout(() => addMessage(cfg.welcomeMessage), 1000);
      }

      // Apertura automática
      if (cfg.openAutomatically) {
        setTimeout(() => {
          if (!win.classList.contains('open')) toggleChat();
        }, (cfg.autoOpenDelay || 5) * 1000);
      }

      // Manejo de envío (Simulado por ahora)
      const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, false);
        input.value = '';
        
        // Simular respuesta
        setTimeout(() => {
          addMessage("Gracias por tu mensaje. Un agente te contactará pronto.");
        }, 1000);
      };

      send.onclick = handleSend;
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

    } catch (e) {
      console.error("Imalá Vox Error:", e);
    }
  }

  initWidget();
})();
