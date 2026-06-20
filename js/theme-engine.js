/* ============================================
   Search Bharat - Theme Engine
   AI-powered dynamic theming
   ============================================ */

class ThemeEngine {
  constructor() {
    this.themes = ['indian-flag', 'india-map', 'bharat-mata', 'greenery-of-india', 'mountains-of-india'];
    this.currentTheme = 'indian-flag';
    this.isDynamic = true;
    this.dynamicInterval = null;
  }

  init() {
    const saved = localStorage.getItem('bharat-theme');
    const dynamicPref = localStorage.getItem('bharat-dynamic-theme');
    
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
    document.querySelectorAll('.bharat-theme-swatch').forEach(s => {
      s.classList.toggle('bharat-theme-swatch--active', s.dataset.theme === theme);
    });

    // ── Swap background video with crossfade ──
    const video = document.getElementById('themeBgVideo');
    if (video) {
      video.classList.add('bharat-video-fade');
      setTimeout(() => {
        video.src = `videos/${theme}.mp4`;
        video.load();
        video.play().catch(() => {}); // ignore autoplay policy errors
        video.classList.remove('bharat-video-fade');
      }, 400);
    }

    if (save) {
      localStorage.setItem('bharat-theme', theme);
      this.isDynamic = false;
      localStorage.setItem('bharat-dynamic-theme', 'false');
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
      theme = 'greenery-of-india';       // Morning - fresh and bright
    } else if (hour >= 10 && hour < 14) {
      theme = 'indian-flag';             // Midday - patriotic and vibrant
    } else if (hour >= 14 && hour < 18) {
      theme = 'bharat-mata';             // Afternoon - warm and golden
    } else if (hour >= 18 && hour < 21) {
      theme = 'india-map';               // Evening - majestic and calm
    } else {
      theme = 'mountains-of-india';      // Night - cool and icy
    }

    this.setTheme(theme, false);
  }

  toggleDynamic() {
    this.isDynamic = !this.isDynamic;
    localStorage.setItem('bharat-dynamic-theme', String(this.isDynamic));
    
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
      toggle.classList.toggle('bharat-toggle--active', this.isDynamic);
    }
  }

  getTheme() {
    return this.currentTheme;
  }
}
