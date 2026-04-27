/* ============================================
   NovaBrowser — Tab Manager
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
      if (window.novaApp) window.novaApp.exitGame();
    });
    document.getElementById('gameRetryBtn').addEventListener('click', () => {
      if (window.novaApp && window.novaApp.currentGame) {
        window.novaApp.currentGame.restart();
      }
    });
    document.getElementById('gameExitBtn').addEventListener('click', () => {
      if (window.novaApp) window.novaApp.exitGame();
    });
  }

  createTab(title = 'New Tab', type = 'newtab', url = '', favicon = '🌐') {
    const id = ++this.tabIdCounter;
    const tab = {
      id,
      title,
      type,
      url,
      favicon,
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
    tabEl.className = 'nova-tab';
    tabEl.dataset.tabId = tab.id;
    tabEl.draggable = true;
    tabEl.innerHTML = `
      <div class="nova-tab__favicon">${tab.favicon}</div>
      <span class="nova-tab__title">${tab.title}</span>
      <button class="nova-tab__close" data-close="${tab.id}">✕</button>
    `;

    // Click to switch
    tabEl.addEventListener('click', (e) => {
      if (!e.target.closest('.nova-tab__close')) {
        this.switchToTab(tab.id);
      }
    });

    // Close button
    tabEl.querySelector('.nova-tab__close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    // Drag events
    tabEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', tab.id);
      tabEl.classList.add('nova-tab--dragging');
    });

    tabEl.addEventListener('dragend', () => {
      tabEl.classList.remove('nova-tab--dragging');
      document.querySelectorAll('.nova-tab--drag-over').forEach(t => t.classList.remove('nova-tab--drag-over'));
    });

    tabEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      tabEl.classList.add('nova-tab--drag-over');
    });

    tabEl.addEventListener('dragleave', () => {
      tabEl.classList.remove('nova-tab--drag-over');
    });

    tabEl.addEventListener('drop', (e) => {
      e.preventDefault();
      tabEl.classList.remove('nova-tab--drag-over');
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
    document.querySelectorAll('.nova-tab').forEach(t => {
      t.classList.toggle('nova-tab--active', parseInt(t.dataset.tabId) === id);
    });

    // Delegate content visibility to app controller (handles webviews)
    if (window.novaApp && window.novaApp.onTabSwitch) {
      window.novaApp.onTabSwitch(id);
    } else {
      // Fallback: basic visibility toggle using CSS classes
      document.getElementById('newTabPage').classList.remove('nova-newtab--active');
      document.getElementById('gameCenter').classList.remove('nova-games--active');
      document.getElementById('settingsPage').classList.remove('nova-settings--active');
      document.getElementById('gameView').classList.remove('nova-game-view--active');

      if (tab.type === 'newtab') document.getElementById('newTabPage').classList.add('nova-newtab--active');
      else if (tab.type === 'games') document.getElementById('gameCenter').classList.add('nova-games--active');
      else if (tab.type === 'settings') document.getElementById('settingsPage').classList.add('nova-settings--active');
      else if (tab.type === 'game-playing') document.getElementById('gameView').classList.add('nova-game-view--active');
    }

    this.startSuspensionTimers();
  }

  closeTab(id) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    // Destroy associated webview (kills Chromium renderer process)
    if (window.novaApp && window.novaApp.destroyWebview) {
      window.novaApp.destroyWebview(id);
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
    document.querySelectorAll('.nova-tab').forEach(t => {
      t.classList.toggle('nova-tab--active', parseInt(t.dataset.tabId) === this.activeTabId);
    });
  }

  updateTabTitle(id, title, favicon) {
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    if (title) tab.title = title;
    if (favicon) tab.favicon = favicon;

    const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
    if (tabEl) {
      if (title) tabEl.querySelector('.nova-tab__title').textContent = title;
      if (favicon) tabEl.querySelector('.nova-tab__favicon').textContent = favicon;
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
      tabEl.classList.add('nova-tab--suspended');
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
      view.classList.add('nova-3d-tabs--visible');
    } else {
      view.classList.remove('nova-3d-tabs--visible');
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
      card.className = `nova-3d-tab-card ${tab.id === this.activeTabId ? 'nova-3d-tab-card--active' : ''}`;
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <div class="nova-3d-tab-card__preview" style="background: linear-gradient(135deg, ${colors[i % colors.length]}22, ${colors[(i + 1) % colors.length]}11);">
          <span style="font-size: 48px; opacity: 0.3;">${tab.favicon}</span>
          <div class="nova-3d-tab-card__preview-gradient"></div>
        </div>
        <div class="nova-3d-tab-card__info">
          <div class="nova-3d-tab-card__favicon">${tab.favicon}</div>
          <div class="nova-3d-tab-card__title">${tab.title}</div>
          <button class="nova-3d-tab-card__close" data-close3d="${tab.id}">✕</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.nova-3d-tab-card__close')) {
          this.switchToTab(tab.id);
          this.toggle3DView();
        }
      });

      card.querySelector('.nova-3d-tab-card__close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
        this.render3DView();
      });

      container.appendChild(card);
    });

    // Add "New Tab" card
    const newCard = document.createElement('div');
    newCard.className = 'nova-3d-tab-card';
    newCard.style.border = '2px dashed rgba(255,255,255,0.1)';
    newCard.style.display = 'flex';
    newCard.style.alignItems = 'center';
    newCard.style.justifyContent = 'center';
    newCard.innerHTML = `
      <div style="text-align: center; color: var(--nova-text-tertiary);">
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
