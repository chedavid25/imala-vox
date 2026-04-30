(function() {
  if (window.ImalaVoxWidget) return;
  window.ImalaVoxWidget = true;

  const script = document.currentScript;
  const scriptUrl = new URL(script.src);
  const host = scriptUrl.origin;

  const configParams = window.ImalaVox || {};
  const workspaceId = configParams.workspaceId;
  const agentId = configParams.agentId;
  if (!workspaceId) return;

  // 1. IDENTIFICACIÓN DEL USUARIO (Persistencia)
  let contactId = localStorage.getItem('imalavox_contact_id');
  if (!contactId) {
    contactId = 'web_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('imalavox_contact_id', contactId);
  }

  const hostElement = document.createElement('div');
  hostElement.id = 'imalavox-widget-root';
  document.body.appendChild(hostElement);
  const shadow = hostElement.attachShadow({ mode: 'open' });

  async function initWidget() {
    try {
      const response = await fetch(`${host}/api/widget/config?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error("Config not found");
      const data = await response.json();
      const cfg = data.config;
      if (!cfg) return;

      const accentColor = cfg.colorButton || '#C8FF00';
      const headerColor = cfg.colorHeader || '#1A1A18';

      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
          position: fixed; bottom: 24px; right: 24px;
          z-index: 999999999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        * { box-sizing: border-box; }
        #imalavox-button {
          width: 64px; height: 64px; border-radius: 22px;
          background: ${accentColor};
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.1);
        }
        #imalavox-button:hover { transform: scale(1.05) translateY(-2px); }
        #imalavox-button svg { width: 28px; height: 28px; color: #1A1A18; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        
        #imalavox-window {
          position: absolute; bottom: 85px; right: 0;
          width: 400px; height: 620px; max-height: calc(100vh - 140px);
          background: white; border-radius: 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: none; flex-direction: column; overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
          transform-origin: bottom right; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          opacity: 0; transform: translateY(20px) scale(0.95);
        }
        #imalavox-window.open { display: flex; opacity: 1; transform: translateY(0) scale(1); }
        
        .imalavox-header { padding: 24px; background: ${headerColor}; color: white; display: flex; align-items: center; gap: 16px; }
        .imalavox-header-logo { width: 48px; height: 48px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .imalavox-header-logo img { width: 100%; height: 100%; object-fit: cover; }
        .imalavox-header-text h3 { margin: 0; font-size: 16px; font-weight: 800; color: white; }
        .imalavox-header-text p { margin: 2px 0 0; font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; color: white; }
        
        .imalavox-messages { flex: 1; padding: 24px; background: #F8F9FB; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .imalavox-msg { max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14px; line-height: 1.5; font-weight: 500; }
        .imalavox-msg-bot { background: white; color: #1A1A18; align-self: flex-start; border-bottom-left-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .imalavox-msg-user { background: ${accentColor}; color: #1A1A18; align-self: flex-end; border-bottom-right-radius: 6px; }
        
        .imalavox-typing { font-size: 11px; color: #888; font-style: italic; margin-top: -8px; margin-left: 5px; display: none; }

        .imalavox-input-area { padding: 20px; background: white; display: flex; gap: 12px; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); }
        .imalavox-input { flex: 1; border: 1px solid rgba(0,0,0,0.08); background: #F1F3F7; padding: 12px 20px; border-radius: 18px; font-size: 14px; outline: none; }
        .imalavox-send { width: 44px; height: 44px; border-radius: 14px; background: #1A1A18; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .imalavox-send:hover { transform: scale(1.05); background: #333; }
        .imalavox-send svg { width: 20px; height: 20px; color: white; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        
        @media (max-width: 480px) {
          #imalavox-window { width: calc(100vw - 32px); height: calc(100vh - 120px); bottom: 80px; right: -8px; }
        }
      `;
      shadow.appendChild(style);

      const ui = document.createElement('div');
      ui.innerHTML = `
        <div id="imalavox-window">
          <div class="imalavox-header">
            <div class="imalavox-header-logo">
              ${cfg.logoHeaderUrl ? `<img src="${cfg.logoHeaderUrl}" />` : `<svg viewBox="0 0 24 24"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>`}
            </div>
            <div class="imalavox-header-text">
              <h3>${cfg.headerText || 'Imalá Vox'}</h3>
              <p>En línea ahora</p>
            </div>
          </div>
          <div class="imalavox-messages" id="imalavox-chat-messages"></div>
          <div id="imalavox-typing-indicator" class="imalavox-typing">Escribiendo...</div>
          <div class="imalavox-input-area">
            <input type="text" class="imalavox-input" id="imalavox-chat-input" placeholder="Escribe un mensaje...">
            <button class="imalavox-send" id="imalavox-chat-send">
              <svg viewBox="0 0 24 24"><path d="m5 12 14-7-7 14-2-7-5-2Z"></path><path d="m19 5-7 7"></path></svg>
            </button>
          </div>
        </div>
        <div id="imalavox-button">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
      `;
      shadow.appendChild(ui);

      const btn = shadow.getElementById('imalavox-button');
      const win = shadow.getElementById('imalavox-window');
      const msgBox = shadow.getElementById('imalavox-chat-messages');
      const input = shadow.getElementById('imalavox-chat-input');
      const send = shadow.getElementById('imalavox-chat-send');
      const typing = shadow.getElementById('imalavox-typing-indicator');

      const toggleChat = () => {
        const isOpen = win.classList.toggle('open');
        if (isOpen) input.focus();
      };
      btn.onclick = toggleChat;

      const addMessage = (text, isBot = true) => {
        const m = document.createElement('div');
        m.className = `imalavox-msg ${isBot ? 'imalavox-msg-bot' : 'imalavox-msg-user'}`;
        m.textContent = text;
        msgBox.appendChild(m);
        msgBox.scrollTop = msgBox.scrollHeight;
      };

      if (cfg.showWelcomeMessage && cfg.welcomeMessage) {
        setTimeout(() => addMessage(cfg.welcomeMessage), 800);
      }
      if (cfg.openAutomatically) {
        setTimeout(() => { if (!win.classList.contains('open')) toggleChat(); }, (cfg.autoOpenDelay || 5) * 1000);
      }

      const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, false);
        input.value = '';
        
        typing.style.display = 'block';
        msgBox.scrollTop = msgBox.scrollHeight;

        try {
          const res = await fetch(`${host}/api/widget/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              agentId: agentId || '',
              contactId,
              message: text
            })
          });
          const data = await res.json();
          typing.style.display = 'none';
          if (data.response) {
            addMessage(data.response, true);
          }
        } catch (e) {
          typing.style.display = 'none';
          addMessage("Lo siento, hubo un error de conexión. Inténtalo de nuevo.");
        }
      };

      send.onclick = handleSend;
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

    } catch (e) {
      console.error("Imalá Vox Error:", e);
    }
  }
  initWidget();
})();
