/* ============================================
   Search Bharat - Command Palette
   VS Code-style command launcher
   ============================================ */

class CommandPalette {
  constructor() {
    this.isVisible = false;
    this.selectedIndex = 0;
    this.filteredCommands = [];
    this.commands = [];
  }

  init() {
    this.registerCommands();
    this.bindEvents();
  }

  registerCommands() {
    this.commands = [
      { id: 'new-tab', icon: '➕', title: 'New Tab', desc: 'Open a new tab', shortcut: 'Ctrl+T', category: 'Navigation', action: () => bharatApp.tabManager.createTab() },
      { id: 'close-tab', icon: '✕', title: 'Close Tab', desc: 'Close current tab', shortcut: 'Ctrl+W', category: 'Navigation', action: () => bharatApp.tabManager.closeTab(bharatApp.tabManager.activeTabId) },
      { id: 'reopen-tab', icon: '↩', title: 'Reopen Closed Tab', desc: 'Restore last closed tab', shortcut: 'Ctrl+Shift+T', category: 'Navigation', action: () => bharatApp.showToast('Tab restored', '↩') },
      { id: '3d-tabs', icon: '⊞', title: '3D Tab View', desc: 'View all tabs in 3D space', category: 'Navigation', action: () => { this.hide(); bharatApp.tabManager.toggle3DView(); } },
      
      { id: 'focus-mode', icon: '👁', title: 'Toggle Focus Mode', desc: 'Distraction-free reading', shortcut: 'F11', category: 'View', action: () => { this.hide(); bharatApp.toggleFocusMode(); } },
      { id: 'split-view', icon: '⊟', title: 'Split View', desc: 'Split screen browsing', category: 'View', action: () => { this.hide(); bharatApp.showToast('Split view activated', '⊟'); } },
      { id: 'fullscreen', icon: '⛶', title: 'Toggle Fullscreen', desc: 'Enter/exit fullscreen', shortcut: 'F11', category: 'View', action: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() },
      
      { id: 'ai-assistant', icon: '✨', title: 'Open AI Assistant', desc: 'Chat with Bharat AI', shortcut: 'Ctrl+J', category: 'Tools', action: () => { this.hide(); bharatApp.toggleAI(); } },
      { id: 'voice-search', icon: '🎤', title: 'Voice Search', desc: 'Search with your voice', category: 'Tools', action: () => { this.hide(); bharatApp.voiceNav.startListening(); } },
      { id: 'games', icon: '🎮', title: 'Game Center', desc: 'Play offline games', category: 'Tools', action: () => { this.hide(); bharatApp.openGameCenter(); } },
      { id: 'screenshot', icon: '📸', title: 'Take Screenshot', desc: 'Capture current page', category: 'Tools', action: () => { this.hide(); bharatApp.showToast('Screenshot saved!', '📸'); } },
      
      { id: 'settings', icon: '⚙', title: 'Settings', desc: 'Browser settings', category: 'Settings', action: () => { this.hide(); bharatApp.openSettings(); } },
      { id: 'theme-midnight', icon: '🌙', title: 'Theme: Midnight', desc: 'Dark purple theme', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('midnight'); } },
      { id: 'theme-aurora', icon: '🌌', title: 'Theme: Aurora', desc: 'Blue northern lights', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('aurora'); } },
      { id: 'theme-sunset', icon: '🌅', title: 'Theme: Sunset', desc: 'Warm red tones', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('sunset'); } },
      { id: 'theme-forest', icon: '🌲', title: 'Theme: Forest', desc: 'Natural green', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('forest'); } },
      { id: 'theme-cosmos', icon: '🔮', title: 'Theme: Cosmos', desc: 'Purple galaxy', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('cosmos'); } },
      { id: 'theme-cyber', icon: '💻', title: 'Theme: Cyber', desc: 'Matrix green', category: 'Themes', action: () => { bharatApp.themeEngine.setTheme('cyber'); } },
      
      { id: 'clear-data', icon: '🗑', title: 'Clear Browsing Data', desc: 'Clear history, cache, cookies', category: 'Privacy', action: () => { this.hide(); bharatApp.showToast('Browsing data cleared', '🗑'); } },
      { id: 'incognito', icon: '🕶', title: 'New Incognito Tab', desc: 'Browse privately', shortcut: 'Ctrl+Shift+N', category: 'Privacy', action: () => { this.hide(); bharatApp.openIncognitoTab(); } },
      
      { id: 'bookmark-all', icon: '📑', title: 'Bookmark All Tabs', desc: 'Save all open tabs', category: 'Bookmarks', action: () => { this.hide(); bharatApp.showToast('All tabs bookmarked!', '📑'); } },
      { id: 'downloads', icon: '📥', title: 'Downloads', desc: 'View downloads', shortcut: 'Ctrl+J', category: 'Tools', action: () => { this.hide(); bharatApp.showToast('Downloads panel', '📥'); } },
      { id: 'history', icon: '🕐', title: 'History', desc: 'View browsing history', shortcut: 'Ctrl+H', category: 'Tools', action: () => { this.hide(); bharatApp.showToast('History panel', '🕐'); } },

      { id: 'runner-game', icon: '🚀', title: 'Play: Anti-Gravity Runner', desc: 'Endless runner in space', category: 'Games', action: () => { this.hide(); bharatApp.launchGame('runner'); } },
      { id: 'puzzle-game', icon: '🧩', title: 'Play: Bharat Puzzle', desc: 'Color matching puzzle', category: 'Games', action: () => { this.hide(); bharatApp.launchGame('puzzle'); } },
      { id: 'strategy-game', icon: '⚔️', title: 'Play: Space Strategy', desc: 'Tower defense in space', category: 'Games', action: () => { this.hide(); bharatApp.launchGame('strategy'); } },
    ];

    this.filteredCommands = [...this.commands];
  }

  bindEvents() {
    const input = document.getElementById('commandInput');
    const palette = document.getElementById('commandPalette');

    input.addEventListener('input', (e) => this.filter(e.target.value));
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.filteredCommands[this.selectedIndex]) {
          this.filteredCommands[this.selectedIndex].action();
          this.hide();
        }
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    palette.addEventListener('click', (e) => {
      if (e.target === palette) this.hide();
    });
  }

  show() {
    this.isVisible = true;
    this.selectedIndex = 0;
    this.filteredCommands = [...this.commands];
    
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    
    palette.classList.add('bharat-command-palette--visible');
    input.value = '';
    this.renderResults();
    
    requestAnimationFrame(() => input.focus());
  }

  hide() {
    this.isVisible = false;
    document.getElementById('commandPalette').classList.remove('bharat-command-palette--visible');
  }

  toggle() {
    this.isVisible ? this.hide() : this.show();
  }

  filter(query) {
    query = query.toLowerCase().trim();
    this.selectedIndex = 0;

    if (!query) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => {
        const searchStr = `${cmd.title} ${cmd.desc} ${cmd.category}`.toLowerCase();
        return searchStr.includes(query);
      });
    }

    this.renderResults();
  }

  renderResults() {
    const container = document.getElementById('commandResults');
    
    if (this.filteredCommands.length === 0) {
      container.innerHTML = '<div class="bharat-command-palette__empty">No commands found</div>';
      return;
    }

    // Group by category
    const groups = {};
    this.filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });

    let html = '';
    let globalIndex = 0;

    Object.entries(groups).forEach(([category, cmds]) => {
      html += `<div class="bharat-command-palette__group">`;
      html += `<div class="bharat-command-palette__group-label">${category}</div>`;
      
      cmds.forEach(cmd => {
        const isSelected = globalIndex === this.selectedIndex;
        html += `
          <div class="bharat-command-palette__item ${isSelected ? 'bharat-command-palette__item--selected' : ''}" 
               data-index="${globalIndex}" data-cmd-id="${cmd.id}">
            <div class="bharat-command-palette__item-icon">${cmd.icon}</div>
            <div class="bharat-command-palette__item-text">
              <div class="bharat-command-palette__item-title">${cmd.title}</div>
              <div class="bharat-command-palette__item-desc">${cmd.desc}</div>
            </div>
            ${cmd.shortcut ? `<div class="bharat-command-palette__item-shortcut">${cmd.shortcut.split('+').map(k => `<kbd>${k}</kbd>`).join('')}</div>` : ''}
          </div>
        `;
        globalIndex++;
      });

      html += `</div>`;
    });

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.bharat-command-palette__item').forEach(item => {
      item.addEventListener('click', () => {
        const cmdId = item.dataset.cmdId;
        const cmd = this.commands.find(c => c.id === cmdId);
        if (cmd) {
          cmd.action();
          this.hide();
        }
      });

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.updateSelection();
      });
    });
  }

  updateSelection() {
    document.querySelectorAll('.bharat-command-palette__item').forEach((item, i) => {
      item.classList.toggle('bharat-command-palette__item--selected', parseInt(item.dataset.index) === this.selectedIndex);
    });

    // Scroll into view
    const selected = document.querySelector('.bharat-command-palette__item--selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
