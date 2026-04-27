/* ============================================
   NovaBrowser — Main Application Controller
   With Chromium Webview Engine Integration
   ============================================ */

class NovaBrowserApp {
  constructor() {
    this.themeEngine = new ThemeEngine();
    this.tabManager = new TabManager();
    this.commandPalette = new CommandPalette();
    this.aiAssistant = new AIAssistant();
    this.focusMode = new FocusMode();
    this.voiceNav = new VoiceNavigation();
    this.security = new Security();

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
    this.voiceNav.init();
    this.security.init();

    this.bindGlobalEvents();
    this.setupShortcuts();
    this.setupNewTabPage();
    this.startClock();
    this.simulateStartup();

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

    console.log('%c🚀 NovaBrowser v1.0 — Chromium Engine Active', 'color: #6c5ce7; font-size: 14px; font-weight: bold;');
  }

  // ── Webview Engine ──────────────────────────────

  createWebview(tabId, url) {
    // Remove existing webview for this tab
    this.destroyWebview(tabId);

    const container = document.getElementById('webviewContainer');
    const webview = document.createElement('webview');
    webview.id = 'webview-' + tabId;
    webview.setAttribute('autosize', 'on');
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', 'persist:nova');
    webview.style.cssText = 'width:100%;height:100%;border:none;display:none;';
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
        document.title = e.title + ' — NovaBrowser';
      }
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
    // Hide all webviews
    Object.values(this.webviews).forEach(wv => { wv.style.display = 'none'; });

    const container = document.getElementById('webviewContainer');
    const wv = this.webviews[tabId];
    if (wv) {
      container.style.display = 'block';
      wv.style.display = 'flex';
    } else {
      container.style.display = 'none';
    }
  }

  hideAllWebviews() {
    document.getElementById('webviewContainer').style.display = 'none';
    Object.values(this.webviews).forEach(wv => { wv.style.display = 'none'; });
  }

  updateNavButtons(tabId) {
    const wv = this.webviews[tabId];
    if (wv) {
      const backBtn = document.getElementById('backBtn');
      const fwdBtn = document.getElementById('forwardBtn');
      backBtn.classList.toggle('nova-navbar__btn--disabled', !wv.canGoBack());
      fwdBtn.classList.toggle('nova-navbar__btn--disabled', !wv.canGoForward());
    }
  }

  updateSecurityIcon(url) {
    const icon = document.getElementById('securityIcon');
    if (url.startsWith('https://')) {
      icon.textContent = '🔒';
      icon.className = 'nova-urlbar__security nova-urlbar__security--secure';
    } else if (url.startsWith('http://')) {
      icon.textContent = '⚠';
      icon.className = 'nova-urlbar__security nova-urlbar__security--insecure';
    } else {
      icon.textContent = '🔒';
      icon.className = 'nova-urlbar__security';
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
    if (url.startsWith('nova://')) {
      const page = url.replace('nova://', '');
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
    const wv = this.webviews[this.tabManager.activeTabId];
    if (wv && wv.canGoBack()) wv.goBack();
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
      document.getElementById('gameCenter').classList.add('nova-games--active');
      document.getElementById('urlInput').value = 'nova://games';
    } else if (tab.type === 'settings') {
      document.getElementById('settingsPage').classList.add('nova-settings--active');
      document.getElementById('urlInput').value = 'nova://settings';
    } else if (tab.type === 'game-playing') {
      document.getElementById('gameView').classList.add('nova-game-view--active');
      document.getElementById('urlInput').value = 'nova://games';
    } else {
      document.getElementById('newTabPage').classList.add('nova-newtab--active');
      document.getElementById('urlInput').value = '';
    }
  }

  // Hide all internal pages using CSS classes (never use inline style.display)
  hideAllInternalPages() {
    document.getElementById('newTabPage').classList.remove('nova-newtab--active');
    document.getElementById('gameCenter').classList.remove('nova-games--active');
    document.getElementById('settingsPage').classList.remove('nova-settings--active');
    document.getElementById('gameView').classList.remove('nova-game-view--active');
  }

  // ── Event Binding ──────────────────────────────

  bindGlobalEvents() {
    const urlInput = document.getElementById('urlInput');
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.navigate(urlInput.value);
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.navigate(searchInput.value);
    });

    document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    document.getElementById('forwardBtn').addEventListener('click', () => this.goForward());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
    document.getElementById('homeBtn').addEventListener('click', () => this.goHome());

    document.getElementById('focusModeBtn').addEventListener('click', () => this.focusMode.toggle());
    document.getElementById('splitViewBtn').addEventListener('click', () => this.showToast('Split view — drag a tab to the side', '⊟'));
    document.getElementById('aiAssistantBtn').addEventListener('click', () => this.aiAssistant.toggle());
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        const u = document.getElementById('urlInput'); u.focus(); u.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault(); this.aiAssistant.toggle();
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
    const shortcuts = [
      { icon: '🔍', label: 'Google', url: 'https://google.com' },
      { icon: '📺', label: 'YouTube', url: 'https://youtube.com' },
      { icon: '🐙', label: 'GitHub', url: 'https://github.com' },
      { icon: '📰', label: 'Reddit', url: 'https://reddit.com' },
      { icon: '🐦', label: 'Twitter', url: 'https://twitter.com' },
      { icon: '📧', label: 'Gmail', url: 'https://gmail.com' },
    ];
    const container = document.getElementById('shortcuts');
    shortcuts.forEach(s => {
      const el = document.createElement('div');
      el.className = 'nova-shortcut';
      el.onclick = () => this.navigate(s.url);
      el.innerHTML = `<div class="nova-shortcut__icon">${s.icon}</div><span class="nova-shortcut__label">${s.label}</span>`;
      container.appendChild(el);
    });
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
    btn.style.color = is ? '' : 'var(--nova-accent-warm)';
    this.showToast(is ? 'Bookmark removed' : 'Page bookmarked!', is ? '☆' : '★');
  }

  openSettings() {
    const existing = this.tabManager.tabs.find(t => t.type === 'settings');
    if (existing) this.tabManager.switchToTab(existing.id);
    else this.tabManager.createTab('Settings', 'settings', 'nova://settings', '⚙');
  }

  openGameCenter() {
    const existing = this.tabManager.tabs.find(t => t.type === 'games');
    if (existing) this.tabManager.switchToTab(existing.id);
    else this.tabManager.createTab('Game Center', 'games', 'nova://games', '🎮');
  }

  closeGameCenter() { this.goHome(); }

  launchGame(type) {
    if (this.currentGame) { this.currentGame.destroy(); this.currentGame = null; }
    const canvas = document.getElementById('gameCanvas');
    const names = { runner: 'Anti-Gravity Runner', puzzle: 'Nova Puzzle', strategy: 'Space Strategy' };
    const icons = { runner: '🚀', puzzle: '🧩', strategy: '⚔️' };
    document.getElementById('gameTitle').textContent = names[type] || 'Game';
    document.getElementById('gameOver').classList.remove('nova-game-over--visible');
    document.getElementById('gamePause').classList.remove('nova-game-pause--visible');
    const tab = this.tabManager.getActiveTab();
    if (tab) { tab.type = 'game-playing'; tab.title = names[type]; this.tabManager.updateTabTitle(tab.id, names[type], icons[type]); this.tabManager.switchToTab(tab.id); }
    switch (type) {
      case 'runner': this.currentGame = new AntiGravityRunner(); break;
      case 'puzzle': this.currentGame = new NovaPuzzle(); break;
      case 'strategy': this.currentGame = new SpaceStrategy(); break;
    }
    if (this.currentGame) requestAnimationFrame(() => this.currentGame.init(canvas));
  }

  exitGame() { if (this.currentGame) { this.currentGame.destroy(); this.currentGame = null; } this.openGameCenter(); }

  // ── Context Menu ──────────────────────────────

  showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    menu.classList.add('nova-context-menu--visible');
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
  }
  hideContextMenu() { document.getElementById('contextMenu').classList.remove('nova-context-menu--visible'); }
  contextAction(action) {
    this.hideContextMenu();
    const actions = { back: () => this.goBack(), forward: () => this.goForward(), refresh: () => this.refresh(), bookmark: () => this.toggleBookmark(), focus: () => this.focusMode.toggle(), ai: () => this.aiAssistant.toggle(), inspect: () => { const wv = this.webviews[this.tabManager.activeTabId]; if (wv) wv.openDevTools(); } };
    if (actions[action]) actions[action]();
  }

  // ── Toast ──────────────────────────────────────

  showToast(message, icon = 'ℹ️') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'nova-toast';
    t.innerHTML = `<span class="nova-toast__icon">${icon}</span><span class="nova-toast__message">${message}</span><button class="nova-toast__close" onclick="this.parentElement.remove()">✕</button>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  updateMemory() {
    const total = Math.floor(80 + this.tabManager.tabs.length * (20 + Math.random() * 30) + Object.keys(this.webviews).length * 40);
    document.getElementById('memoryUsage').querySelector('span').textContent = `Memory: ${total} MB`;
  }
}

// ── Initialize ──
const novaApp = new NovaBrowserApp();
document.addEventListener('DOMContentLoaded', () => {
  novaApp.init();
  setInterval(() => novaApp.updateMemory(), 3000);
});
