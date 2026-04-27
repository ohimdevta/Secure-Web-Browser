/* ============================================
   NovaBrowser — AI Assistant
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
    document.getElementById('aiPanel').classList.add('nova-ai--open');
  }

  close() {
    this.isOpen = false;
    document.getElementById('aiPanel').classList.remove('nova-ai--open');
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
    msgEl.className = `nova-ai__message nova-ai__message--${role}`;
    msgEl.innerHTML = `
      <div class="nova-ai__message-avatar">${role === 'ai' ? '✨' : '👤'}</div>
      <div class="nova-ai__message-content">${this.formatContent(content)}</div>
    `;
    
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  formatContent(text) {
    // Basic markdown-like formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--nova-font-mono); font-size: 12px;">$1</code>');
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  showTyping() {
    this.isTyping = true;
    const container = document.getElementById('aiMessages');
    const typingEl = document.createElement('div');
    typingEl.className = 'nova-ai__message nova-ai__message--ai';
    typingEl.id = 'aiTyping';
    typingEl.innerHTML = `
      <div class="nova-ai__message-avatar">✨</div>
      <div class="nova-ai__typing">
        <div class="nova-ai__typing-dot"></div>
        <div class="nova-ai__typing-dot"></div>
        <div class="nova-ai__typing-dot"></div>
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
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const lower = message.toLowerCase();

    // Context-aware responses
    if (lower.includes('summarize') || lower.includes('summary')) {
      return `📝 **Page Summary**\n\nI'd analyze the current page content and provide a concise summary highlighting:\n\n• **Key points** from the article\n• Important **statistics** or data\n• The main **conclusion** or takeaway\n\n*In the full version, I'll use NLP to extract and summarize actual page content in real-time.*`;
    }

    if (lower.includes('translate')) {
      return `🌐 **Translation Ready**\n\nI can translate the current page into 100+ languages. Here are the most popular:\n\n• Spanish 🇪🇸\n• French 🇫🇷\n• German 🇩🇪\n• Japanese 🇯🇵\n• Chinese 🇨🇳\n\nJust tell me the target language and I'll translate instantly!`;
    }

    if (lower.includes('similar') || lower.includes('recommend')) {
      return `🔍 **Similar Sites**\n\nBased on the current page's content and your browsing patterns, I'd recommend:\n\n1. **Related articles** on the same topic\n2. **Alternative sources** for comparison\n3. **Deep dives** into subtopics\n\n*This feature uses collaborative filtering and content analysis.*`;
    }

    if (lower.includes('what can') || lower.includes('capabilities') || lower.includes('help')) {
      return `🚀 **Nova AI Capabilities**\n\nI can help you with:\n\n• 📝 **Summarize** any webpage\n• 🌐 **Translate** pages instantly\n• 🔍 **Find** similar content\n• 💡 **Explain** complex topics\n• 🔬 **Research** any subject\n• ✍️ **Write** emails, messages\n• 🧮 **Calculate** & analyze data\n• 🛡️ **Check** site security\n• 📊 **Compare** products/services\n\nJust ask me anything!`;
    }

    if (lower.includes('explain')) {
      return `💡 **Explanation Mode**\n\nI'll break down complex topics into simple, digestible parts:\n\n1. **Core concept** — the basic idea\n2. **How it works** — the mechanism\n3. **Why it matters** — real-world impact\n4. **Examples** — practical applications\n\nWhat would you like me to explain?`;
    }

    if (lower.includes('research')) {
      return `🔬 **Research Assistant**\n\nI can conduct deep research on any topic:\n\n• Gather information from **multiple sources**\n• Cross-reference **facts and data**\n• Provide **citations** and references\n• Generate a **structured report**\n\nWhat topic should I research?`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `👋 Hey there! Great to see you!\n\nI'm Nova AI, your intelligent browsing companion. I can help you navigate, research, summarize, translate, and so much more.\n\nWhat would you like to do today?`;
    }

    if (lower.includes('game') || lower.includes('play')) {
      return `🎮 **Game Center**\n\nWant to take a break? We have awesome offline games:\n\n• 🚀 **Anti-Gravity Runner** — Dodge asteroids in space\n• 🧩 **Nova Puzzle** — Match colors & clear blocks\n• ⚔️ **Space Strategy** — Tower defense in space\n\nI can launch any of them for you!`;
    }

    if (lower.includes('theme') || lower.includes('dark') || lower.includes('color')) {
      return `🎨 **Theme Customization**\n\nYou can change the browser theme anytime:\n\n• 🌙 **Midnight** — Classic dark purple\n• 🌌 **Aurora** — Cool blue vibes\n• 🌅 **Sunset** — Warm orange/red\n• 🌲 **Forest** — Natural green\n• 🔮 **Cosmos** — Deep purple galaxy\n• 💻 **Cyber** — Matrix green\n\nOr enable **Dynamic Theme** to automatically adapt to the time of day!`;
    }

    // Default response
    const responses = [
      `I understand you're asking about "${message}". Let me think about that...\n\nIn the full version, I'd connect to a language model to provide detailed, accurate responses. For now, I can help you with:\n\n• Page summarization\n• Translation\n• Research\n• Finding similar content\n\nTry asking me about any of these!`,
      `Great question! 🤔\n\nWhile I'm currently in demo mode, the full Nova AI will be able to:\n\n• **Understand context** from your current page\n• **Access real-time** information\n• **Learn** from your preferences\n• **Assist** with complex tasks\n\nIs there anything specific I can help with right now?`,
      `Thanks for trying me out! 🌟\n\nI'm Nova AI — designed to make your browsing smarter. Try asking me to:\n\n• \`Summarize this page\`\n• \`Translate to Spanish\`\n• \`Find similar sites\`\n• \`Explain [topic]\`\n\nI'm always here to help!`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
