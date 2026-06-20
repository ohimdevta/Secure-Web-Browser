/* ============================================
   Search Bharat - Main Application Controller
   With Chromium Webview Engine Integration
   ============================================ */

class SearchBharatApp {
  constructor() {
    this.themeEngine = new ThemeEngine();
    this.tabManager = new TabManager();
    this.commandPalette = new CommandPalette();
    this.aiAssistant = new AIAssistant();
    this.focusMode = new FocusMode();

    this.security = new Security();
    this.privacyManager = new PrivacyManager();
    this.historyManager = new HistoryManager();

    this.currentGame = null;
    this.isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

    // Webview management: tabId -> webview element
    this.webviews = {};
    this.trackersBlocked = 0;
    this.adsBlocked = 0;
  }

  async init() {
    this.themeEngine.init();
    this.tabManager.init();
    this.commandPalette.init();
    this.aiAssistant.init();
    this.focusMode.init();

    this.security.init();
    this.privacyManager.init();
    this.historyManager.init();

    this.bindGlobalEvents();
    this.setupShortcuts();
    this.setupNewTabPage();
    this.startClock();
    this.simulateStartup();
    
    // Load API Key if exists
    const storedKey = localStorage.getItem('bharat-ai-key');
    if (storedKey) {
      const el = document.getElementById('geminiApiKeyInput');
      if (el) el.value = storedKey;
    }

    // Wire up Electron window controls
    if (this.isElectron) {
      document.getElementById('winMinBtn').onclick = () => window.electronAPI.minimize();
      document.getElementById('winMaxBtn').onclick = () => window.electronAPI.maximize();
      document.getElementById('winCloseBtn').onclick = () => window.electronAPI.close();
      window.electronAPI.onTrackerBlocked((url) => {
        this.trackersBlocked++;
        const el = document.getElementById('trackersBlocked');
        if (el) el.textContent = this.trackersBlocked.toLocaleString();
      });
    }

    console.log('%c🚀 Search Bharat v1.0 — Chromium Engine Active', 'color: #6c5ce7; font-size: 14px; font-weight: bold;');
  }

  // ── Webview Engine ──────────────────────────────

  createWebview(tabId, url) {
    // Remove existing webview for this tab
    this.destroyWebview(tabId);

    const tab = this.tabManager.tabs.find(t => t.id === tabId);
    const partition = tab && tab.isIncognito ? 'incognito' : 'persist:bharat';
    
    const container = document.getElementById('webviewContainer');
    const webview = document.createElement('webview');
    webview.id = 'webview-' + tabId;
    webview.setAttribute('autosize', 'on');
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', partition);
    webview.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;visibility:hidden;z-index:1;';
    webview.src = url;

    container.appendChild(webview);
    this.webviews[tabId] = webview;

    // ── Chromium Renderer Events ──

    webview.addEventListener('did-start-loading', () => {
      this.showLoadingBar(true);
      document.getElementById('statusText').textContent = 'Loading...';
      document.getElementById('refreshBtn').textContent = '✕';
    });

    webview.addEventListener('did-stop-loading', () => {
      this.showLoadingBar(false);
      document.getElementById('statusText').textContent = 'Ready';
      document.getElementById('refreshBtn').textContent = '⟳';
      this.updateNavButtons(tabId);
    });

    webview.addEventListener('page-title-updated', (e) => {
      this.tabManager.updateTabTitle(tabId, e.title, '🌐');
      if (tabId === this.tabManager.activeTabId) {
        document.title = e.title + ' — Search Bharat';
      }
      // Record in history (only if NOT incognito)
      const tab = this.tabManager.tabs.find(t => t.id === tabId);
      this.historyManager.addEntry(e.title, webview.getURL(), 'web', tab ? tab.isIncognito : false);
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        const tab = this.tabManager.tabs.find(t => t.id === tabId);
        if (tab) tab.faviconUrl = e.favicons[0];
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      if (tabId === this.tabManager.activeTabId) {
        document.getElementById('urlInput').value = e.url;
        this.updateSecurityIcon(e.url);
      }
      const tab = this.tabManager.tabs.find(t => t.id === tabId);
      if (tab) tab.url = e.url;
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (e.isMainFrame && tabId === this.tabManager.activeTabId) {
        document.getElementById('urlInput').value = e.url;
      }
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) return; // Aborted, ignore
      this.showLoadingBar(false);
      webview.loadURL('data:text/html,' + encodeURIComponent(`
        <html><head><style>
          body{background:#0a0a1a;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;}
          h1{font-size:48px;margin:0;opacity:0.3;}
          p{color:#888;margin-top:16px;font-size:16px;}
          code{background:#1a1a2e;padding:4px 8px;border-radius:4px;font-size:14px;}
          a{color:#6c5ce7;text-decoration:none;margin-top:12px;}
        </style></head><body>
          <h1>⚠</h1>
          <p>Could not load <code>${e.validatedURL || ''}</code></p>
          <p style="font-size:13px;color:#555;">Error ${e.errorCode}: ${e.errorDescription}</p>
          <a href="#" onclick="history.back()">← Go back</a>
        </body></html>
      `));
    });

    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      this.openUrlInNewTab(e.url);
    });

    return webview;
  }

  destroyWebview(tabId) {
    const wv = this.webviews[tabId];
    if (wv) {
      wv.remove();
      delete this.webviews[tabId];
    }
  }

  showWebview(tabId) {
    const container = document.getElementById('webviewContainer');
    container.style.display = 'block';

    // Hide all webviews using visibility
    Object.values(this.webviews).forEach(wv => { 
      wv.style.visibility = 'hidden'; 
      wv.style.zIndex = '1';
    });

    const wv = this.webviews[tabId];
    if (wv) {
      wv.style.visibility = 'visible';
      wv.style.zIndex = '2';
    }
  }

  hideAllWebviews() {
    document.getElementById('webviewContainer').style.display = 'none';
    Object.values(this.webviews).forEach(wv => { 
      wv.style.visibility = 'hidden'; 
      wv.style.zIndex = '1';
    });
  }

  updateNavButtons(tabId) {
    const tab = this.tabManager.tabs.find(t => t.id === tabId);
    const wv = this.webviews[tabId];
    const backBtn = document.getElementById('backBtn');
    const fwdBtn = document.getElementById('forwardBtn');
    
    if (backBtn && fwdBtn) {
      if (tab && tab.type !== 'newtab') {
        backBtn.classList.remove('bharat-navbar__btn--disabled');
      } else {
        backBtn.classList.add('bharat-navbar__btn--disabled');
      }
      
      if (wv && wv.canGoForward()) {
        fwdBtn.classList.remove('bharat-navbar__btn--disabled');
      } else {
        fwdBtn.classList.add('bharat-navbar__btn--disabled');
      }
    }
  }

  updateSecurityIcon(url) {
    const icon = document.getElementById('securityIcon');
    if (url.startsWith('https://')) {
      icon.textContent = '🔒';
      icon.className = 'bharat-urlbar__security bharat-urlbar__security--secure';
    } else if (url.startsWith('http://')) {
      icon.textContent = '⚠';
      icon.className = 'bharat-urlbar__security bharat-urlbar__security--insecure';
    } else {
      icon.textContent = '🔒';
      icon.className = 'bharat-urlbar__security';
    }
  }

  showLoadingBar(show) {
    const bar = document.getElementById('loadingBar');
    if (show) {
      bar.style.display = 'block';
      bar.style.opacity = '1';
      bar.style.width = '0%';
      let progress = 0;
      clearInterval(this._loadInterval);
      this._loadInterval = setInterval(() => {
        progress += Math.random() * 15 + 3;
        if (progress >= 90) { clearInterval(this._loadInterval); progress = 90; }
        bar.style.width = progress + '%';
      }, 200);
    } else {
      clearInterval(this._loadInterval);
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => { bar.style.display = 'none'; bar.style.opacity = '1'; }, 300);
      }, 150);
    }
  }

  // ── Navigation ──────────────────────────────────

  navigate(input) {
    if (!input.trim()) return;
    let url = input.trim();

    // Internal pages
    if (url.startsWith('bharat://')) {
      const page = url.replace('bharat://', '');
      if (page === 'games') { this.openGameCenter(); return; }
      if (page === 'settings') { this.openSettings(); return; }
      return;
    }

    // Determine if URL or search
    const isUrl = /^(https?:\/\/|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/.test(url) ||
                  (url.includes('.') && !url.includes(' '));

    if (isUrl) {
      if (!url.startsWith('http')) url = 'https://' + url;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
      const tab = this.tabManager.getActiveTab();
      this.historyManager.addEntry(input, url, 'search', tab ? tab.isIncognito : false);
    }

    document.getElementById('urlInput').value = url;

    // Get or create webview for active tab
    const tabId = this.tabManager.activeTabId;
    const tab = this.tabManager.getActiveTab();

    if (tab) {
      tab.type = 'web';
      tab.url = url;
    }

    // Hide internal pages, show webview
    this.hideAllInternalPages();

    if (this.isElectron) {
      let wv = this.webviews[tabId];
      if (!wv) {
        wv = this.createWebview(tabId, url);
      } else {
        wv.loadURL(url);
      }
      this.showWebview(tabId);
    } else {
      // Fallback: open in iframe for non-Electron
      this.navigateWithIframe(tabId, url);
    }

    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    this.tabManager.updateTabTitle(tabId, domain, '🌐');
  }

  navigateWithIframe(tabId, url) {
    // Fallback for running outside Electron
    let container = document.getElementById('webviewContainer');
    container.style.display = 'block';
    container.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:none;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`;
  }

  openUrlInNewTab(url) {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    const tabId = this.tabManager.createTab(domain, 'web', url, '🌐');
    if (this.isElectron) {
      this.createWebview(tabId, url);
      this.showWebview(tabId);
    }
  }

  goBack() {
    const tabId = this.tabManager.activeTabId;
    const tab = this.tabManager.getActiveTab();
    const wv = this.webviews[tabId];

    if (wv && wv.canGoBack()) {
      wv.goBack();
    } else if (tab && tab.type !== 'newtab') {
      // If no webview history or we are on an internal page, go back to New Tab
      this.goHome();
    }
  }

  goForward() {
    const wv = this.webviews[this.tabManager.activeTabId];
    if (wv && wv.canGoForward()) wv.goForward();
  }

  refresh() {
    const wv = this.webviews[this.tabManager.activeTabId];
    if (wv) {
      if (wv.isLoading()) wv.stop();
      else wv.reload();
    }
  }

  goHome() {
    const tab = this.tabManager.getActiveTab();
    if (tab) {
      tab.type = 'newtab';
      tab.url = '';
      tab.title = 'New Tab';
      tab.favicon = '🌐';
      this.destroyWebview(tab.id);
      this.hideAllWebviews();
      this.tabManager.switchToTab(tab.id);
      this.tabManager.updateTabTitle(tab.id, 'New Tab', '🌐');
      document.getElementById('urlInput').value = '';
    }
  }

  // Called by TabManager when switching tabs
  onTabSwitch(tabId) {
    const tab = this.tabManager.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Hide everything first
    this.hideAllInternalPages();
    this.hideAllWebviews();

    if (tab.type === 'web' && this.webviews[tabId]) {
      this.showWebview(tabId);
      document.getElementById('urlInput').value = tab.url || '';
      this.updateSecurityIcon(tab.url || '');
      this.updateNavButtons(tabId);
    } else if (tab.type === 'games') {
      document.getElementById('gameCenter').classList.add('bharat-games--active');
      document.getElementById('urlInput').value = 'bharat://games';
    } else if (tab.type === 'settings') {
      document.getElementById('settingsPage').classList.add('bharat-settings--active');
      document.getElementById('urlInput').value = 'bharat://settings';
    } else if (tab.type === 'game-playing') {
      document.getElementById('gameView').classList.add('bharat-game-view--active');
      document.getElementById('urlInput').value = 'bharat://games';
    } else if (tab.type === 'history') {
      document.getElementById('historyPage').classList.add('bharat-history--active');
      document.getElementById('urlInput').value = 'bharat://history';
      this.historyManager.renderHistory();
    } else {
      document.getElementById('newTabPage').classList.add('bharat-newtab--active');
      document.getElementById('urlInput').value = '';
    }

    // Update Incognito UI State
    const urlBar = document.getElementById('urlBar');
    const securityIcon = document.getElementById('securityIcon');
    if (tab.isIncognito) {
      urlBar.classList.add('bharat-urlbar--incognito');
      securityIcon.textContent = '🕵️';
      securityIcon.title = 'Private Browsing Mode';
    } else {
      urlBar.classList.remove('bharat-urlbar--incognito');
      this.updateSecurityIcon(tab.url || '');
    }
  }

  // Hide all internal pages using CSS classes (never use inline style.display)
  hideAllInternalPages() {
    document.getElementById('newTabPage').classList.remove('bharat-newtab--active');
    document.getElementById('gameCenter').classList.remove('bharat-games--active');
    document.getElementById('settingsPage').classList.remove('bharat-settings--active');
    document.getElementById('historyPage').classList.remove('bharat-history--active');
    document.getElementById('gameView').classList.remove('bharat-game-view--active');
  }

  // ── Search Suggestions ───────────────────────

  async fetchSuggestions(query) {
    if (!query.trim()) {
      this.hideSuggestions();
      return;
    }
    
    // Determine if it's a direct URL
    const isUrl = /^(https?:\/\/|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/.test(query) || (query.includes('.') && !query.includes(' '));
    
    const dropdown = document.getElementById('searchSuggestions');
    dropdown.innerHTML = '';
    dropdown.style.display = 'flex';

    if (isUrl) {
      this.renderSuggestion(query, '🌐', 'Go to URL');
      return;
    }

    this.renderSuggestion(query, '🔍', 'Search Google');

    try {
      // Use duckduckgo autocomplete API as it doesn't require complex CORS handling
      const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`);
      const data = await res.json();
      const suggestions = data[1] || [];
      
      suggestions.slice(0, 5).forEach(s => {
        if (s !== query) this.renderSuggestion(s, '🔍', 'Search');
      });
    } catch (e) {
      // Fallback if API fails
    }
  }

  renderSuggestion(text, icon, type) {
    const dropdown = document.getElementById('searchSuggestions');
    const div = document.createElement('div');
    div.className = 'bharat-search-suggestion';
    div.innerHTML = `
      <span class="bharat-search-suggestion-icon">${icon}</span>
      <span class="bharat-search-suggestion-text">${text}</span>
      <span style="font-size: 0.7rem; color: #888;">${type}</span>
    `;
    div.onmousedown = () => {
      document.getElementById('urlInput').value = text;
      this.hideSuggestions();
      this.navigate(text);
    };
    dropdown.appendChild(div);
  }

  hideSuggestions() {
    const dropdown = document.getElementById('searchSuggestions');
    if (dropdown) dropdown.style.display = 'none';
  }

  // ── Event Binding ──────────────────────────────

  bindGlobalEvents() {
    const urlInput = document.getElementById('urlInput');
    let searchTimeout;

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.hideSuggestions();
        this.navigate(urlInput.value);
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });

    urlInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.fetchSuggestions(urlInput.value), 250);
    });

    urlInput.addEventListener('focus', () => urlInput.select());
    urlInput.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 200));

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.navigate(searchInput.value);
    });
    
    // Make the new tab search icon clickable
    const newTabSearchIcon = document.querySelector('.bharat-newtab__searchbar-icon');
    if (newTabSearchIcon) {
      newTabSearchIcon.style.cursor = 'pointer';
      newTabSearchIcon.addEventListener('click', () => {
        if (searchInput.value) this.navigate(searchInput.value);
      });
    }



    document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    document.getElementById('forwardBtn').addEventListener('click', () => this.goForward());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
    document.getElementById('homeBtn').addEventListener('click', () => this.goHome());

    document.getElementById('focusModeBtn').addEventListener('click', () => this.focusMode.toggle());
    document.getElementById('splitViewBtn').addEventListener('click', () => this.showToast('Split view — drag a tab to the side', '⊟'));
    document.getElementById('aiAssistantBtn').addEventListener('click', () => this.aiAssistant.toggle());
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('historyBtn').addEventListener('click', () => this.openHistory());
    document.getElementById('menuBtn').addEventListener('click', () => this.commandPalette.show());
    document.getElementById('bookmarkBtn').addEventListener('click', () => this.toggleBookmark());

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });
    document.addEventListener('click', () => this.hideContextMenu());

    document.getElementById('tabs3DView').addEventListener('click', (e) => {
      if (e.target.id === 'tabs3DView') this.tabManager.toggle3DView();
    });

    window.addEventListener('resize', () => {
      if (this.currentGame) this.currentGame.resize();
    });
  }

  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault(); this.commandPalette.toggle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault(); this.tabManager.createTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        this.destroyWebview(this.tabManager.activeTabId);
        this.tabManager.closeTab(this.tabManager.activeTabId);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.openIncognitoTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        const u = document.getElementById('urlInput'); u.focus(); u.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault(); this.aiAssistant.toggle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault(); this.openHistory();
      }
      if (e.key === 'Escape') {
        if (this.commandPalette.isVisible) this.commandPalette.hide();
        else if (this.aiAssistant.isOpen) this.aiAssistant.close();
        else if (this.tabManager.is3DViewOpen) this.tabManager.toggle3DView();
        else if (this.focusMode.isEnabled()) this.focusMode.toggle();
      }
      if (e.key === 'F11') { e.preventDefault(); this.focusMode.toggle(); }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const tabs = this.tabManager.tabs;
        const idx = tabs.findIndex(t => t.id === this.tabManager.activeTabId);
        const next = (idx + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
        this.tabManager.switchToTab(tabs[next].id);
      }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const i = parseInt(e.key) - 1;
        if (this.tabManager.tabs[i]) this.tabManager.switchToTab(this.tabManager.tabs[i].id);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault(); this.refresh();
      }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this.goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this.goForward(); }
    });
  }

  // ── New Tab Page ──────────────────────────────

  setupNewTabPage() {
    this.renderShortcuts();
  }

  renderShortcuts() {
    const defaultShortcuts = [
      { icon: '🔍', label: 'Google', url: 'https://google.com' },
      { icon: '📺', label: 'YouTube', url: 'https://youtube.com' },
      { icon: '🐙', label: 'GitHub', url: 'https://github.com' },
      { icon: '📰', label: 'Reddit', url: 'https://reddit.com' },
      { icon: '🐦', label: 'Twitter', url: 'https://twitter.com' },
      { icon: '📧', label: 'Gmail', url: 'https://gmail.com' },
      { icon: '📸', label: 'Instagram', url: 'https://instagram.com' },
      { icon: '👻', label: 'Snapchat', url: 'https://snapchat.com' },
    ];
    
    let shortcuts;
    try {
      const saved = localStorage.getItem('bharat-shortcuts');
      shortcuts = saved ? JSON.parse(saved) : defaultShortcuts;
    } catch {
      shortcuts = defaultShortcuts;
    }

    const container = document.getElementById('shortcuts');
    container.innerHTML = ''; // clear existing
    
    shortcuts.forEach(s => {
      const el = document.createElement('div');
      el.className = 'bharat-shortcut';
      el.onclick = () => this.navigate(s.url);
      el.innerHTML = `<div class="bharat-shortcut__icon">${s.icon}</div><span class="bharat-shortcut__label">${s.label}</span>`;
      container.appendChild(el);
    });

    // Add '+' button
    const addBtn = document.createElement('div');
    addBtn.className = 'bharat-shortcut';
    addBtn.onclick = () => this.addCustomShortcut();
    addBtn.innerHTML = `<div class="bharat-shortcut__icon" style="background: rgba(255,255,255,0.05); color: #888;">➕</div><span class="bharat-shortcut__label">Add Link</span>`;
    container.appendChild(addBtn);
  }

  addCustomShortcut() {
    const modal = document.getElementById('addShortcutModal');
    if(modal) {
      document.getElementById('shortcutNameInput').value = '';
      document.getElementById('shortcutUrlInput').value = '';
      document.getElementById('shortcutIconInput').value = '';
      modal.classList.add('bharat-modal--active');
    }
  }

  closeAddShortcutModal() {
    const modal = document.getElementById('addShortcutModal');
    if(modal) {
      modal.classList.remove('bharat-modal--active');
    }
  }

  saveCustomShortcut() {
    const label = document.getElementById('shortcutNameInput').value.trim();
    let url = document.getElementById('shortcutUrlInput').value.trim();
    const icon = document.getElementById('shortcutIconInput').value.trim() || '🌐';

    if (!label || !url) return;
    if (!url.startsWith('http')) url = 'https://' + url;

    const defaultShortcuts = [
      { icon: '🔍', label: 'Google', url: 'https://google.com' },
      { icon: '📺', label: 'YouTube', url: 'https://youtube.com' },
      { icon: '🐙', label: 'GitHub', url: 'https://github.com' },
      { icon: '📰', label: 'Reddit', url: 'https://reddit.com' },
      { icon: '🐦', label: 'Twitter', url: 'https://twitter.com' },
      { icon: '📧', label: 'Gmail', url: 'https://gmail.com' },
      { icon: '📸', label: 'Instagram', url: 'https://instagram.com' },
      { icon: '👻', label: 'Snapchat', url: 'https://snapchat.com' },
    ];

    let shortcuts;
    try {
      const saved = localStorage.getItem('bharat-shortcuts');
      shortcuts = saved ? JSON.parse(saved) : defaultShortcuts;
    } catch {
      shortcuts = defaultShortcuts;
    }

    shortcuts.push({ icon, label, url });
    localStorage.setItem('bharat-shortcuts', JSON.stringify(shortcuts));
    this.renderShortcuts();
    this.closeAddShortcutModal();
  }

  startClock() {
    const update = () => {
      const now = new Date();
      document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const h = now.getHours();
      document.getElementById('greeting').textContent =
        h < 6 ? '🌙 Burning the midnight oil' : h < 12 ? '☀️ Good morning' :
        h < 17 ? '🌤 Good afternoon' : h < 21 ? '🌅 Good evening' : '🌙 Good night';
    };
    update();
    setInterval(update, 1000);
  }

  simulateStartup() {
    const bar = document.getElementById('loadingBar');
    bar.style.display = 'block';
    let p = 0;
    const i = setInterval(() => {
      p += Math.random() * 30 + 10;
      if (p >= 100) {
        bar.style.width = '100%';
        setTimeout(() => { bar.style.opacity = '0'; setTimeout(() => { bar.style.display = 'none'; bar.style.opacity = '1'; }, 300); }, 200);
        clearInterval(i);
      } else bar.style.width = p + '%';
    }, 100);
  }

  // ── Feature Toggles ──────────────────────────

  toggleAI() { this.aiAssistant.toggle(); }
  aiSuggest(text) { if (!this.aiAssistant.isOpen) this.aiAssistant.open(); this.aiAssistant.sendMessage(text); }

  toggleBookmark() {
    const btn = document.getElementById('bookmarkBtn');
    const is = btn.textContent === '★';
    btn.textContent = is ? '☆' : '★';
    btn.style.color = is ? '' : 'var(--bharat-accent-warm)';
    this.showToast(is ? 'Bookmark removed' : 'Page bookmarked!', is ? '☆' : '★');
  }

  openSettings() {
    const existing = this.tabManager.tabs.find(t => t.type === 'settings');
    if (existing) this.tabManager.switchToTab(existing.id);
    else this.tabManager.createTab('Settings', 'settings', 'bharat://settings', '⚙');
  }

  openHistory() {
    const existing = this.tabManager.tabs.find(t => t.type === 'history');
    if (existing) this.tabManager.switchToTab(existing.id);
    else this.tabManager.createTab('History', 'history', 'bharat://history', '🕒');
  }

  openGameCenter() {
    const existing = this.tabManager.tabs.find(t => t.type === 'games');
    if (existing) this.tabManager.switchToTab(existing.id);
    else this.tabManager.createTab('Game Center', 'games', 'bharat://games', '🎮');
  }

  closeGameCenter() { this.goHome(); }

  launchGame(type) {
    if (this.currentGame) { this.currentGame.destroy(); this.currentGame = null; }
    const canvas = document.getElementById('gameCanvas');
    const names = { runner: 'Anti-Gravity Runner', puzzle: 'Bharat Puzzle', strategy: 'Space Strategy' };
    const icons = { runner: '🚀', puzzle: '🧩', strategy: '⚔️' };
    document.getElementById('gameTitle').textContent = names[type] || 'Game';
    document.getElementById('gameOver').classList.remove('bharat-game-over--visible');
    document.getElementById('gamePause').classList.remove('bharat-game-pause--visible');
    const tab = this.tabManager.getActiveTab();
    if (tab) { tab.type = 'game-playing'; tab.title = names[type]; this.tabManager.updateTabTitle(tab.id, names[type], icons[type]); this.tabManager.switchToTab(tab.id); }
    switch (type) {
      case 'runner': this.currentGame = new AntiGravityRunner(); break;
      case 'puzzle': this.currentGame = new BharatPuzzle(); break;
      case 'strategy': this.currentGame = new SpaceStrategy(); break;
    }
    if (this.currentGame) requestAnimationFrame(() => this.currentGame.init(canvas));
  }

  exitGame() { if (this.currentGame) { this.currentGame.destroy(); this.currentGame = null; } this.openGameCenter(); }

  // ── Context Menu ──────────────────────────────

  showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    menu.classList.add('bharat-context-menu--visible');
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
  }
  hideContextMenu() { document.getElementById('contextMenu').classList.remove('bharat-context-menu--visible'); }
  contextAction(action) {
    this.hideContextMenu();
    const actions = { back: () => this.goBack(), forward: () => this.goForward(), refresh: () => this.refresh(), bookmark: () => this.toggleBookmark(), focus: () => this.focusMode.toggle(), ai: () => this.aiAssistant.toggle(), inspect: () => { const wv = this.webviews[this.tabManager.activeTabId]; if (wv) wv.openDevTools(); } };
    if (actions[action]) actions[action]();
  }

  // ── Toast ──────────────────────────────────────

  showToast(message, icon = 'ℹ️') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'bharat-toast';
    t.innerHTML = `<span class="bharat-toast__icon">${icon}</span><span class="bharat-toast__message">${message}</span><button class="bharat-toast__close" onclick="this.parentElement.remove()">✕</button>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  updateMemory() {
    // Fake memory calc
    const total = Math.floor(80 + this.tabManager.tabs.length * (20 + Math.random() * 30) + Object.keys(this.webviews).length * 40);
    document.getElementById('memoryUsage').querySelector('span').textContent = `Memory: ${total} MB`;
  }
  
  // ── AI Integration ──────────────────────────────
  
  saveApiKey() {
    const input = document.getElementById('geminiApiKeyInput');
    const key = input.value.trim();
    if (key) {
      localStorage.setItem('bharat-ai-key', key);
      this.showToast('✨ Gemini API Key Saved Successfully!');
    } else {
      localStorage.removeItem('bharat-ai-key');
      this.showToast('⚠️ API Key removed.');
    }
  }

  // ── Privacy & Extensions delegates ──────────

  toggleVPN() { this.privacyManager.toggleVPN(); }
  setVPNLocation(el) { this.privacyManager.setVPNLocation(el); }
  toggleExtension(name) { this.privacyManager.toggleExtension(name); }
  togglePrivacy(name) { this.privacyManager.togglePrivacy(name); }
  changePassword() { this.privacyManager.changePassword(); }

  openIncognitoTab() {
    this.tabManager.createTab('Private Tab', 'newtab', '', '🕵️', true);
    this.showToast('🕵️ Incognito Mode Active — No history will be saved', '🔒');
  }

  async takeScreenshot() {
    if (!this.isElectron) {
      this.showToast('Screenshots require the desktop app', '⚠️');
      return;
    }

    // Flash effect for visual feedback
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;opacity:0.7;z-index:99999;pointer-events:none;transition:opacity 0.3s ease;';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 50);
    setTimeout(() => flash.remove(), 350);

    const btn = document.getElementById('screenshotBtn');
    if (btn) btn.classList.add('bharat-statusbar__screenshot-btn--saving');

    try {
      const result = await window.electronAPI.takeScreenshot();
      if (result.success) {
        this.showToast(`📸 Screenshot saved to Desktop — ${result.fileName}`, '📸');
      } else {
        this.showToast('⚠️ Screenshot failed: ' + (result.error || 'Unknown error'), '⚠️');
      }
    } catch (e) {
      this.showToast('⚠️ Screenshot failed', '⚠️');
    }

    if (btn) {
      setTimeout(() => btn.classList.remove('bharat-statusbar__screenshot-btn--saving'), 1000);
    }
  }
}

// ── Initialize ──
window.bharatApp = new SearchBharatApp();
document.addEventListener('DOMContentLoaded', () => {
  window.bharatApp.init();
  setInterval(() => window.bharatApp.updateMemory(), 3000);
});
