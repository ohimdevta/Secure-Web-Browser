/* ============================================
   Search Bharat - AI Assistant
   Integrated AI chat interface
   ============================================ */

class AIAssistant {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isTyping = false;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('aiCloseBtn').addEventListener('click', () => this.close());
    document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());
    
    const textarea = document.getElementById('aiInput');
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
  }

  open() {
    this.isOpen = true;
    document.getElementById('aiPanel').classList.add('bharat-ai--open');
  }

  close() {
    this.isOpen = false;
    document.getElementById('aiPanel').classList.remove('bharat-ai--open');
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  async sendMessage(text) {
    const textarea = document.getElementById('aiInput');
    const message = text || textarea.value.trim();
    if (!message || this.isTyping) return;

    textarea.value = '';
    textarea.style.height = 'auto';

    // Add user message
    this.addMessage('user', message);

    // Show typing indicator
    this.showTyping();

    // Simulate AI response
    const response = await this.generateResponse(message);
    
    this.hideTyping();
    this.addMessage('ai', response);
  }

  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
    
    const container = document.getElementById('aiMessages');
    const msgEl = document.createElement('div');
    msgEl.className = `bharat-ai__message bharat-ai__message--${role}`;
    msgEl.innerHTML = `
      <div class="bharat-ai__message-avatar">${role === 'ai' ? '✨' : '👤'}</div>
      <div class="bharat-ai__message-content">${this.formatContent(content)}</div>
    `;
    
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  formatContent(text) {
    // Markdown formatting for Gemini responses
    text = text.replace(/### (.*?)\n/g, '<h4 style="margin: 8px 0; color: #fff;">$1</h4>');
    text = text.replace(/## (.*?)\n/g, '<h3 style="margin: 10px 0; color: var(--bharat-accent-primary);">$1</h3>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 12px; margin: 8px 0;"><code>$1</code></pre>');
    text = text.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');
    text = text.replace(/\n\* (.*?)/g, '<br>• $1');
    text = text.replace(/\n- (.*?)/g, '<br>• $1');
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  showTyping() {
    this.isTyping = true;
    const container = document.getElementById('aiMessages');
    const typingEl = document.createElement('div');
    typingEl.className = 'bharat-ai__message bharat-ai__message--ai';
    typingEl.id = 'aiTyping';
    typingEl.innerHTML = `
      <div class="bharat-ai__message-avatar">✨</div>
      <div class="bharat-ai__typing">
        <div class="bharat-ai__typing-dot"></div>
        <div class="bharat-ai__typing-dot"></div>
        <div class="bharat-ai__typing-dot"></div>
      </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  }

  hideTyping() {
    this.isTyping = false;
    const typing = document.getElementById('aiTyping');
    if (typing) typing.remove();
  }

  async generateResponse(message) {
    const apiKey = localStorage.getItem('bharat-ai-key');
    
    // If no API key is provided, show the setup message
    if (!apiKey) {
      return `⚠️ **API Key Required**\n\nTo unlock the full power of Bharat AI, please enter your Google Gemini API Key in the **Settings (⚙) > AI Configuration** section.\n\n*You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).*`;
    }

    try {
      // Build the system prompt
      const systemPrompt = `You are Bharat AI, a highly intelligent, fast, and helpful AI assistant built directly into the Search Bharat browser. You should be concise, extremely helpful, and use emojis occasionally to keep the conversation engaging. Format your responses using markdown.`;
      
      const payload = {
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          ...this.messages.filter(m => m.role !== 'system').slice(-5).map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      };

      const cleanKey = encodeURIComponent(apiKey.trim());
      const modelsToTry = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro-latest'];
      let res;
      let errText = '';
      
      for (const model of modelsToTry) {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) break;
        
        errText = await res.text();
        // If it's an API key error, don't bother retrying other models
        if (res.status === 400 && errText.includes('API key not valid')) {
          break;
        }
      }

      if (!res.ok) {
        console.error('Gemini API Error:', errText);
        try {
          const err = JSON.parse(errText);
          if (res.status === 400 && err.error && err.error.message.includes('API key not valid')) {
            return `❌ **Invalid API Key**\n\nThe Gemini API key provided is invalid. Please double-check it in Settings.`;
          }
        } catch(e) {}
        
        // Debugging: Fetch available models
        let debugModels = '';
        try {
          const mRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
          const mData = await mRes.json();
          if (mData.models) {
            debugModels = '\\n\\n**Available Models:** ' + mData.models.map(m => m.name.split('/')[1]).filter(n => n.includes('gemini')).join(', ');
          } else {
             debugModels = '\\n\\n**Available Models Check Failed:** ' + JSON.stringify(mData);
          }
        } catch(e) {
             debugModels = '\\n\\n**Could not fetch models:** ' + e.message;
        }

        return `❌ **API Error**\n\nHTTP ${res.status}: ${errText}${debugModels}\n\n*If the available models list doesn't include gemini-1.5-flash, your API key might be from Vertex AI or restricted.*`;
      }

      const data = await res.json();
      
      if (data.candidates && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        return `I couldn't process that request properly. Please try asking in a different way!`;
      }

    } catch (e) {
      console.error('AI Request Failed:', e);
      return `🔌 **Connection Error**\n\nI couldn't reach the AI servers. Error details: \`${e.message}\`\n\n*If you have the Search Bharat VPN connected, try disconnecting it as the proxy might be offline.*`;
    }
  }
}
