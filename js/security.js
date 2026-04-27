/* ============================================
   NovaBrowser — Security Module
   Privacy dashboard and protection features
   ============================================ */

class Security {
  constructor() {
    this.trackersBlocked = 2847;
    this.adsBlocked = 1293;
    this.httpsUpgrades = 456;
    this.settings = {
      trackerBlocker: true,
      adBlocker: true,
      httpsEnforcement: true,
      phishingDetection: true
    };
  }

  init() {
    this.loadSettings();
    this.bindToggles();
    this.startSimulation();
  }

  loadSettings() {
    const saved = localStorage.getItem('nova-security');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch (e) { /* use defaults */ }
    }

    // Update toggle UI
    this.updateToggles();
  }

  saveSettings() {
    localStorage.setItem('nova-security', JSON.stringify(this.settings));
  }

  bindToggles() {
    const toggles = {
      'trackerToggle': 'trackerBlocker',
      'adToggle': 'adBlocker',
      'httpsToggle': 'httpsEnforcement',
      'phishingToggle': 'phishingDetection'
    };

    Object.entries(toggles).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          this.settings[key] = !this.settings[key];
          el.classList.toggle('nova-toggle--active', this.settings[key]);
          this.saveSettings();
          
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          novaApp.showToast(
            `${label} ${this.settings[key] ? 'enabled' : 'disabled'}`,
            this.settings[key] ? '🛡️' : '⚠️'
          );
        });
      }
    });

    // Other toggles (non-security)
    ['suspendToggle', 'gpuToggle', 'preloadToggle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          el.classList.toggle('nova-toggle--active');
        });
      }
    });
  }

  updateToggles() {
    const map = {
      'trackerToggle': 'trackerBlocker',
      'adToggle': 'adBlocker',
      'httpsToggle': 'httpsEnforcement',
      'phishingToggle': 'phishingDetection'
    };

    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('nova-toggle--active', this.settings[key]);
      }
    });
  }

  startSimulation() {
    // Simulate blocking activity
    setInterval(() => {
      if (this.settings.trackerBlocker) {
        this.trackersBlocked += Math.floor(Math.random() * 3);
        this.updateStat('trackersBlocked', this.trackersBlocked);
      }
      if (this.settings.adBlocker) {
        this.adsBlocked += Math.floor(Math.random() * 2);
        this.updateStat('adsBlocked', this.adsBlocked);
      }
    }, 5000);
  }

  updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value.toLocaleString();
    }
  }

  checkURL(url) {
    // Simple phishing detection simulation
    const suspicious = ['phish', 'fake', 'login-verify', 'secure-update'];
    const isSuspicious = suspicious.some(s => url.toLowerCase().includes(s));
    
    if (isSuspicious && this.settings.phishingDetection) {
      return {
        safe: false,
        reason: 'This URL matches known phishing patterns'
      };
    }

    return { safe: true };
  }
}
