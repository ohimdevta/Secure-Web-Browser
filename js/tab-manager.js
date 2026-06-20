/* ============================================
   Search Bharat - Tab Manager
   Multi-tab management with 3D view
   ============================================ */

class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabIdCounter = 0;
    this.suspendTimeout = 5 * 60 * 1000; // 5 minutes
    this.is3DViewOpen = false;
  }

  init() {
    this.createTab('New Tab', 'newtab');
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('newTabBtn').addEventListener('click', () => this.createTab());
    document.getElementById('toggle3DTabs').addEventListener('click', () => this.toggle3DView());
    document.getElementById('gameBackBtn').addEventListener('click', () => {
      if (window.bharatApp) window.bharatApp.exitGame();
    });
    document.getElementById('gameRetryBtn').addEventListener('click', () => {
      if (window.bharatApp && window.bharatApp.currentGame) {
        window.bharatApp.currentGame.restart();
      }
    });
    document.getElementById('gameExitBtn').addEventListener('click', () => {
      if (window.bharatApp) window.bharatApp.exitGame();
    });
  }

  createTab(title = 'New Tab', type = 'newtab', url = '', favicon = '🌐', isIncognito = false) {
    const id = ++this.tabIdCounter;
    const tab = {
      id,
      title,
      type,
      url,
      favicon,
      isIncognito,
      status: 'ready',
      suspended: false,
      pinned: false,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.tabs.push(tab);
    this.renderTab(tab);
    this.switchToTab(id);
    this.updateTabCount();

    return id;
  }

  renderTab(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = `bharat-tab ${tab.isIncognito ? 'bharat-tab--incognito' : ''}`;
    tabEl.dataset.tabId = tab.id;
    tabEl.draggable = true;
    tabEl.innerHTML = `
      <div class="bharat-tab__favicon">${tab.isIncognito ? '🕵️' : tab.favicon}</div>
      <span class="bharat-tab__title">${tab.title}</span>
      <button class="bharat-tab__close" data-close="${tab.id}">✕</button>
    `;

    // Click to switch
    tabEl.addEventListener('click', (e) => {
      if (!e.target.closest('.bharat-tab__close')) {
        this.switchToTab(tab.id);
      }
    });

    // Close button
    tabEl.querySelector('.bharat-tab__close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    // Drag events
    tabEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', tab.id);
      tabEl.classList.add('bharat-tab--dragging');
    });

    tabEl.addEventListener('dragend', () => {
      tabEl.classList.remove('bharat-tab--dragging');
      document.querySelectorAll('.bharat-tab--drag-over').forEach(t => t.classList.remove('bharat-tab--drag-over'));
    });

    tabEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      tabEl.classList.add('bharat-tab--drag-over');
    });

    tabEl.addEventListener('dragleave', () => {
      tabEl.classList.remove('bharat-tab--drag-over');
    });

    tabEl.addEventListener('drop', (e) => {
      e.preventDefault();
      tabEl.classList.remove('bharat-tab--drag-over');
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
      this.reorderTab(draggedId, tab.id);
    });

    // Middle click to close
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        this.closeTab(tab.id);
      }
    });

    document.getElementById('tabScroll').appendChild(tabEl);
  }

  switchToTab(id) {
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    this.activeTabId = id;
    tab.lastAccessed = Date.now();
    tab.suspended = false;

    // Update tab UI
    document.querySelectorAll('.bharat-tab').forEach(t => {
      t.classList.toggle('bharat-tab--active', parseInt(t.dataset.tabId) === id);
    });

    // Delegate content visibility to app controller (handles webviews)
    if (window.bharatApp && window.bharatApp.onTabSwitch) {
      window.bharatApp.onTabSwitch(id);
    } else {
      // Fallback: basic visibility toggle using CSS classes
      document.getElementById('newTabPage').classList.remove('bharat-newtab--active');
      document.getElementById('gameCenter').classList.remove('bharat-games--active');
      document.getElementById('settingsPage').classList.remove('bharat-settings--active');
      document.getElementById('gameView').classList.remove('bharat-game-view--active');

      if (tab.type === 'newtab') document.getElementById('newTabPage').classList.add('bharat-newtab--active');
      else if (tab.type === 'games') document.getElementById('gameCenter').classList.add('bharat-games--active');
      else if (tab.type === 'settings') document.getElementById('settingsPage').classList.add('bharat-settings--active');
      else if (tab.type === 'game-playing') document.getElementById('gameView').classList.add('bharat-game-view--active');
    }

    this.startSuspensionTimers();
  }

  closeTab(id) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    // Destroy associated webview (kills Chromium renderer process)
    if (window.bharatApp && window.bharatApp.destroyWebview) {
      window.bharatApp.destroyWebview(id);
    }

    this.tabs.splice(index, 1);

    // Remove DOM element with animation
    const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
    if (tabEl) {
      tabEl.style.transform = 'scaleX(0)';
      tabEl.style.opacity = '0';
      tabEl.style.maxWidth = '0';
      tabEl.style.padding = '0';
      tabEl.style.margin = '0';
      setTimeout(() => tabEl.remove(), 200);
    }

    // If closing active tab, switch to another
    if (this.activeTabId === id) {
      if (this.tabs.length > 0) {
        const nextTab = this.tabs[Math.min(index, this.tabs.length - 1)];
        this.switchToTab(nextTab.id);
      } else {
        this.createTab();
      }
    }

    this.updateTabCount();
  }

  reorderTab(fromId, toId) {
    const fromIndex = this.tabs.findIndex(t => t.id === fromId);
    const toIndex = this.tabs.findIndex(t => t.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const [tab] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, tab);
    
    // Re-render tab bar
    this.rerenderTabBar();
  }

  rerenderTabBar() {
    const scroll = document.getElementById('tabScroll');
    scroll.innerHTML = '';
    this.tabs.forEach(tab => this.renderTab(tab));
    // Re-apply active state
    document.querySelectorAll('.bharat-tab').forEach(t => {
      t.classList.toggle('bharat-tab--active', parseInt(t.dataset.tabId) === this.activeTabId);
    });
  }

  updateTabTitle(id, title, favicon) {
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    if (title) tab.title = title;
    if (favicon) tab.favicon = favicon;

    const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
    if (tabEl) {
      if (title) tabEl.querySelector('.bharat-tab__title').textContent = title;
      if (favicon) tabEl.querySelector('.bharat-tab__favicon').textContent = favicon;
    }
  }

  startSuspensionTimers() {
    this.tabs.forEach(tab => {
      if (tab.id !== this.activeTabId && !tab.suspended && !tab.pinned) {
        const idle = Date.now() - tab.lastAccessed;
        if (idle > this.suspendTimeout) {
          this.suspendTab(tab.id);
        }
      }
    });
  }

  suspendTab(id) {
    const tab = this.tabs.find(t => t.id === id);
    if (!tab || tab.pinned) return;

    tab.suspended = true;
    const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
    if (tabEl) {
      tabEl.classList.add('bharat-tab--suspended');
    }
  }

  updateTabCount() {
    const count = this.tabs.length;
    const el = document.getElementById('tabCount');
    if (el) {
      el.querySelector('span').textContent = `${count} tab${count !== 1 ? 's' : ''}`;
    }
  }

  // 3D Tab View
  toggle3DView() {
    this.is3DViewOpen = !this.is3DViewOpen;
    const view = document.getElementById('tabs3DView');
    
    if (this.is3DViewOpen) {
      this.render3DView();
      view.classList.add('bharat-3d-tabs--visible');
    } else {
      view.classList.remove('bharat-3d-tabs--visible');
    }
  }

  render3DView() {
    const container = document.getElementById('tabs3DContainer');
    const countEl = document.getElementById('tabs3DCount');

    countEl.textContent = `${this.tabs.length} tab${this.tabs.length !== 1 ? 's' : ''} open`;
    container.innerHTML = '';

    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#00b894', '#e056fd'];

    this.tabs.forEach((tab, i) => {
      const card = document.createElement('div');
      card.className = `bharat-3d-tab-card ${tab.id === this.activeTabId ? 'bharat-3d-tab-card--active' : ''}`;
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <div class="bharat-3d-tab-card__preview" style="background: linear-gradient(135deg, ${colors[i % colors.length]}22, ${colors[(i + 1) % colors.length]}11);">
          <span style="font-size: 48px; opacity: 0.3;">${tab.favicon}</span>
          <div class="bharat-3d-tab-card__preview-gradient"></div>
        </div>
        <div class="bharat-3d-tab-card__info">
          <div class="bharat-3d-tab-card__favicon">${tab.favicon}</div>
          <div class="bharat-3d-tab-card__title">${tab.title}</div>
          <button class="bharat-3d-tab-card__close" data-close3d="${tab.id}">✕</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.bharat-3d-tab-card__close')) {
          this.switchToTab(tab.id);
          this.toggle3DView();
        }
      });

      card.querySelector('.bharat-3d-tab-card__close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
        this.render3DView();
      });

      container.appendChild(card);
    });

    // Add "New Tab" card
    const newCard = document.createElement('div');
    newCard.className = 'bharat-3d-tab-card';
    newCard.style.border = '2px dashed rgba(255,255,255,0.1)';
    newCard.style.display = 'flex';
    newCard.style.alignItems = 'center';
    newCard.style.justifyContent = 'center';
    newCard.innerHTML = `
      <div style="text-align: center; color: var(--bharat-text-tertiary);">
        <div style="font-size: 32px; margin-bottom: 8px;">+</div>
        <div style="font-size: 12px;">New Tab</div>
      </div>
    `;
    newCard.addEventListener('click', () => {
      this.createTab();
      this.toggle3DView();
    });
    container.appendChild(newCard);
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }
}
