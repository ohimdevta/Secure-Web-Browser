/* ============================================
   NovaBrowser — Theme Engine
   AI-powered dynamic theming
   ============================================ */

class ThemeEngine {
  constructor() {
    this.themes = ['midnight', 'aurora', 'sunset', 'forest', 'cosmos', 'cyber'];
    this.currentTheme = 'midnight';
    this.isDynamic = true;
    this.dynamicInterval = null;
  }

  init() {
    const saved = localStorage.getItem('nova-theme');
    const dynamicPref = localStorage.getItem('nova-dynamic-theme');
    
    if (dynamicPref !== null) {
      this.isDynamic = dynamicPref === 'true';
    }

    if (saved && !this.isDynamic) {
      this.setTheme(saved, false);
    } else if (this.isDynamic) {
      this.applyDynamicTheme();
      this.dynamicInterval = setInterval(() => this.applyDynamicTheme(), 60000);
    }

    this.updateToggleUI();
  }

  setTheme(theme, save = true) {
    if (!this.themes.includes(theme)) return;
    
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update swatches
    document.querySelectorAll('.nova-theme-swatch').forEach(s => {
      s.classList.toggle('nova-theme-swatch--active', s.dataset.theme === theme);
    });

    if (save) {
      localStorage.setItem('nova-theme', theme);
      this.isDynamic = false;
      localStorage.setItem('nova-dynamic-theme', 'false');
      this.updateToggleUI();
      if (this.dynamicInterval) {
        clearInterval(this.dynamicInterval);
        this.dynamicInterval = null;
      }
    }
  }

  applyDynamicTheme() {
    const hour = new Date().getHours();
    let theme;

    if (hour >= 6 && hour < 10) {
      theme = 'aurora';       // Morning - cool, refreshing
    } else if (hour >= 10 && hour < 14) {
      theme = 'forest';       // Midday - focused, natural
    } else if (hour >= 14 && hour < 17) {
      theme = 'cosmos';       // Afternoon - creative, energetic
    } else if (hour >= 17 && hour < 20) {
      theme = 'sunset';       // Evening - warm, winding down
    } else if (hour >= 20 && hour < 23) {
      theme = 'midnight';     // Night - dark, comfortable
    } else {
      theme = 'cyber';        // Late night - minimal eye strain
    }

    this.setTheme(theme, false);
  }

  toggleDynamic() {
    this.isDynamic = !this.isDynamic;
    localStorage.setItem('nova-dynamic-theme', String(this.isDynamic));
    
    if (this.isDynamic) {
      this.applyDynamicTheme();
      this.dynamicInterval = setInterval(() => this.applyDynamicTheme(), 60000);
    } else {
      if (this.dynamicInterval) {
        clearInterval(this.dynamicInterval);
        this.dynamicInterval = null;
      }
    }
    
    this.updateToggleUI();
  }

  updateToggleUI() {
    const toggle = document.getElementById('dynamicThemeToggle');
    if (toggle) {
      toggle.classList.toggle('nova-toggle--active', this.isDynamic);
    }
  }

  getTheme() {
    return this.currentTheme;
  }
}
