/* ============================================
   NovaBrowser — Voice Navigation
   Speech recognition for hands-free browsing
   ============================================ */

class VoiceNavigation {
  constructor() {
    this.isListening = false;
    this.recognition = null;
    this.supported = false;
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.supported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.handleCommand(transcript);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateUI();
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.updateUI();
        if (event.error !== 'aborted') {
          novaApp.showToast('Voice recognition error: ' + event.error, '🎤');
        }
      };
    }

    // Bind buttons
    document.getElementById('voiceSearchBtn').addEventListener('click', () => this.startListening());
    document.getElementById('searchVoiceBtn').addEventListener('click', () => this.startListening());
    document.getElementById('aiVoiceBtn').addEventListener('click', () => this.startListeningForAI());
  }

  startListening() {
    if (!this.supported) {
      novaApp.showToast('Voice recognition not supported in this browser', '🎤');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      this.updateUI();
      novaApp.showToast('Listening... Speak now', '🎤');
    } catch (e) {
      this.isListening = false;
      novaApp.showToast('Could not start voice recognition', '🎤');
    }
  }

  startListeningForAI() {
    if (!this.supported) {
      novaApp.showToast('Voice recognition not supported', '🎤');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      return;
    }

    try {
      this.isListening = true;
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiInput').value = transcript;
        novaApp.aiAssistant.sendMessage(transcript);
        
        // Reset handler
        this.recognition.onresult = (e) => {
          this.handleCommand(e.results[0][0].transcript);
        };
      };

      this.recognition.start();
      novaApp.showToast('Listening for AI input...', '🎤');
    } catch (e) {
      this.isListening = false;
    }
  }

  handleCommand(transcript) {
    const lower = transcript.toLowerCase().trim();
    novaApp.showToast(`Heard: "${transcript}"`, '🎤');

    // Navigation commands
    if (lower.includes('new tab')) {
      novaApp.tabManager.createTab();
    } else if (lower.includes('close tab')) {
      novaApp.tabManager.closeTab(novaApp.tabManager.activeTabId);
    } else if (lower.includes('game') || lower.includes('play')) {
      novaApp.openGameCenter();
    } else if (lower.includes('settings') || lower.includes('preferences')) {
      novaApp.openSettings();
    } else if (lower.includes('focus mode') || lower.includes('reading mode')) {
      novaApp.toggleFocusMode();
    } else if (lower.includes('assistant') || lower.includes('ai') || lower.includes('help')) {
      novaApp.toggleAI();
    } else if (lower.includes('search for') || lower.includes('look up')) {
      const query = lower.replace(/search for|look up/g, '').trim();
      if (query) {
        document.getElementById('urlInput').value = query;
        novaApp.showToast(`Searching for: ${query}`, '🔍');
      }
    } else {
      // Default: treat as search query
      document.getElementById('urlInput').value = transcript;
      document.getElementById('searchInput').value = transcript;
    }
  }

  updateUI() {
    const btns = [
      document.getElementById('voiceSearchBtn'),
      document.getElementById('searchVoiceBtn')
    ];
    
    btns.forEach(btn => {
      if (this.isListening) {
        btn.style.color = 'var(--nova-accent-danger)';
        btn.style.animation = 'nova-pulse 1s infinite';
      } else {
        btn.style.color = '';
        btn.style.animation = '';
      }
    });
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
}
