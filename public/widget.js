(function() {
  if (window.ImalaVoxWidget) return;
  window.ImalaVoxWidget = true;

  const script = document.currentScript;
  const scriptUrl = new URL(script.src);
  const host = scriptUrl.origin;

  const configParams = window.ImalaVox || {};
  const workspaceId = configParams.workspaceId;
  if (!workspaceId) return;

  const container = document.createElement('div');
  container.id = 'imalavox-container';
  container.style.display = 'none';
  document.body.appendChild(container);

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
      style.innerHTML = `
        #imalavox-container {
          position: fixed; bottom: 24px; right: 24px;
          z-index: 999999;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          display: block !important;
        }
        
        #imalavox-button {
          width: 64px; height: 64px; border-radius: 22px;
          background: ${accentColor};
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.1);
        }
        #imalavox-button:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
        #imalavox-button svg { width: 28px; height: 28px; color: #1A1A18; }
        
        #imalavox-window {
          position: absolute; bottom: 85px; right: 0;
          width: 400px; height: 620px; max-height: calc(100vh - 140px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: none; flex-direction: column; overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
          transform-origin: bottom right; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          opacity: 0; transform: translateY(20px) scale(0.95);
        }
        #imalavox-window.open { display: flex; opacity: 1; transform: translateY(0) scale(1); }
        
        .imalavox-header { 
          padding: 24px; 
          background: ${headerColor}; 
          color: white; 
          display: flex; 
          align-items: center; 
          gap: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .imalavox-header-logo { 
          width: 48px; height: 48px; border-radius: 16px; 
          background: rgba(255,255,255,0.1); 
          display: flex; align-items: center; justify-content: center; 
          overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
        }
        .imalavox-header-logo img { width: 100%; height: 100%; object-fit: cover; }
        .imalavox-header-text h3 { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
        .imalavox-header-text p { margin: 2px 0 0; font-size: 11px; font-weight: 600; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .imalavox-messages { flex: 1; padding: 24px; background: #F8F9FB; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .imalavox-msg { max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14px; line-height: 1.5; font-weight: 500; }
        .imalavox-msg-bot { 
          background: white; color: #1A1A18; align-self: flex-start; 
          border-bottom-left-radius: 6px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
        }
        .imalavox-msg-user { 
          background: ${accentColor}; color: #1A1A18; align-self: flex-end; 
          border-bottom-right-radius: 6px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
        }
        
        .imalavox-input-area { 
          padding: 20px; background: white; 
          display: flex; gap: 12px; align-items: center;
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        .imalavox-input { 
          flex: 1; border: 1px solid rgba(0,0,0,0.05); 
          background: #F1F3F7; padding: 12px 20px; 
          border-radius: 18px; font-size: 14px; font-weight: 500;
          outline: none; transition: all 0.2s;
        }
        .imalavox-input:focus { background: white; border-color: ${accentColor}; box-shadow: 0 0 0 4px ${accentColor}20; }
        
        .imalavox-send { 
          width: 44px; height: 44px; border-radius: 14px; 
          background: ${accentColor}; border: none; 
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .imalavox-send:hover { transform: scale(1.05); }
        .imalavox-send svg { width: 20px; height: 20px; color: #1A1A18; }
        
        @media (max-width: 480px) {
          #imalavox-window { width: calc(100vw - 32px); height: calc(100vh - 120px); bottom: 80px; right: -8px; }
        }
      `;
      document.head.appendChild(style);

      container.innerHTML = `
        <div id="imalavox-window">
          <div class="imalavox-header">
            <div class="imalavox-header-logo">
              ${cfg.logoHeaderUrl ? `<img src="${cfg.logoHeaderUrl}" />` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>`}
            </div>
            <div class="imalavox-header-text">
              <h3>${cfg.headerText || 'Imalá Vox'}</h3>
              <p>Online Now</p>
            </div>
          </div>
          <div class="imalavox-messages" id="imalavox-chat-messages"></div>
          <div class="imalavox-input-area">
            <input type="text" class="imalavox-input" id="imalavox-chat-input" placeholder="Type a message...">
            <button class="imalavox-send" id="imalavox-chat-send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-7 14-2-7-5-2Z"></path><path d="m19 5-7 7"></path></svg>
            </button>
          </div>
        </div>
        <div id="imalavox-button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
      `;

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

      if (cfg.showWelcomeMessage && cfg.welcomeMessage) {
        setTimeout(() => addMessage(cfg.welcomeMessage), 800);
      }

      if (cfg.openAutomatically) {
        setTimeout(() => { if (!win.classList.contains('open')) toggleChat(); }, (cfg.autoOpenDelay || 5) * 1000);
      }

      const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, false);
        input.value = '';
        setTimeout(() => addMessage("I'm processing your request... an agent will be with you shortly."), 1200);
      };

      send.onclick = handleSend;
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

    } catch (e) {
      console.error("Imalá Vox Error:", e);
    }
  }

  initWidget();
})();
