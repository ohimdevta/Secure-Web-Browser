/* ============================================
   Search Bharat - History Manager
   Records and manages browsing/search history
   ============================================ */

class HistoryManager {
  constructor() {
    this.history = [];
    this.storageKey = 'bharat-history';
    this.maxEntries = 1000;
  }

  init() {
    this.loadHistory();
    this.bindEvents();
  }

  bindEvents() {
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterHistory(e.target.value));
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.history = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.history = [];
    }
  }

  saveHistory() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.history));
  }

  addEntry(title, url, type = 'web', isPrivate = false) {
    // Don't record internal pages, empty URLs, or private sessions
    if (isPrivate || !url || url.startsWith('bharat://') || url === 'about:blank') return;

    const entry = {
      id: Date.now(),
      title: title || url,
      url: url,
      type: type, // 'web' or 'search'
      timestamp: Date.now()
    };

    // Remove duplicate of the same URL if it exists (bring to top)
    this.history = this.history.filter(h => h.url !== url);
    
    this.history.unshift(entry);

    // Limit size
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries);
    }

    this.saveHistory();
  }

  getHistory() {
    return this.history;
  }

  deleteEntry(id) {
    this.history = this.history.filter(h => h.id !== id);
    this.saveHistory();
    this.renderHistory();
  }

  clearAll() {
    if (confirm('Are you sure you want to clear all browsing history?')) {
      this.history = [];
      this.saveHistory();
      this.renderHistory();
      if (window.bharatApp) window.bharatApp.showToast('History cleared', '🕒');
    }
  }

  filterHistory(query) {
    const q = query.toLowerCase();
    const filtered = this.history.filter(h => 
      h.title.toLowerCase().includes(q) || 
      h.url.toLowerCase().includes(q)
    );
    this.renderHistory(filtered);
  }

  renderHistory(data = this.history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = `
        <div class="bharat-history__empty">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🕒</div>
          <p>No history found</p>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = {};
    data.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString(undefined, { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });

    let html = '';
    Object.keys(groups).forEach(date => {
      html += `<div class="bharat-history__date-group">${date}</div>`;
      groups[date].forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString(undefined, { 
          hour: '2-digit', minute: '2-digit' 
        });
        const icon = entry.type === 'search' ? '🔍' : '🌐';
        
        html += `
          <div class="bharat-history-item" onclick="bharatApp.navigate('${entry.url}')">
            <div class="bharat-history-item__icon">${icon}</div>
            <div class="bharat-history-item__content">
              <div class="bharat-history-item__title">${this.escapeHtml(entry.title)}</div>
              <div class="bharat-history-item__url">${this.escapeHtml(entry.url)}</div>
            </div>
            <div class="bharat-history-item__time">${time}</div>
            <button class="bharat-history-item__delete" onclick="event.stopPropagation(); bharatApp.historyManager.deleteEntry(${entry.id})">✕</button>
          </div>
        `;
      });
    });

    container.innerHTML = html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
