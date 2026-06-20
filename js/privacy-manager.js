/* ============================================
   Search Bharat - Privacy & Extensions Manager
   Lock Screen, VPN, Extensions, Privacy Controls
   ============================================ */

class PrivacyManager {
  constructor() {
    this.vpnConnected = false;
    this.vpnLocation = 'us';
    this.extensions = {
      darkMode: false,
      adBlock: true,
      privacyGuard: true,
      httpsEverywhere: true,
      scriptBlocker: false,
      cookieManager: false,
    };
    this.privacy = {
      fingerprint: true,
      webrtc: true,
      doh: true,
      dnt: true,
      passwordLock: true,
    };
  }

  init() {
    this.loadSettings();
    this.initLockScreen();
    this.detectIP();
    this.syncExtensionUI();
    this.syncPrivacyUI();
  }

  // ── Lock Screen ──────────────────────────────

  initLockScreen() {
    const lockEnabled = this.privacy.passwordLock;
    const storedHash = localStorage.getItem('bharat-lock-hash');
    const lockScreen = document.getElementById('lockScreen');

    if (!lockEnabled || !storedHash) {
      // If no password is set yet, show setup hint
      if (!storedHash && lockEnabled) {
        document.getElementById('lockSetupHint').style.display = 'block';
      } else {
        // No lock, hide lock screen
        lockScreen.classList.add('bharat-lockscreen--hidden');
        document.getElementById('lockSetupHint').style.display = 'none';
      }
      if (!lockEnabled) {
        lockScreen.classList.add('bharat-lockscreen--hidden');
      }
    } else {
      document.getElementById('lockSetupHint').style.display = 'none';
    }

    // Bind events
    document.getElementById('lockSubmitBtn').addEventListener('click', () => this.handleLockSubmit());
    document.getElementById('lockPasswordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLockSubmit();
    });

    // Focus the input
    setTimeout(() => {
      const input = document.getElementById('lockPasswordInput');
      if (lockScreen && !lockScreen.classList.contains('bharat-lockscreen--hidden')) {
        input.focus();
      }
    }, 500);
  }

  handleLockSubmit() {
    const input = document.getElementById('lockPasswordInput');
    const password = input.value.trim();
    if (!password) return;

    const storedHash = localStorage.getItem('bharat-lock-hash');

    if (!storedHash) {
      // First time setup — save new password
      localStorage.setItem('bharat-lock-hash', this.hashPassword(password));
      document.getElementById('lockScreen').classList.add('bharat-lockscreen--hidden');
      this.showToast('🔒 Password set successfully!');
    } else {
      // Verify password
      if (this.hashPassword(password) === storedHash) {
        document.getElementById('lockScreen').classList.add('bharat-lockscreen--hidden');
      } else {
        document.getElementById('lockError').textContent = '❌ Wrong password. Try again.';
        input.value = '';
        input.style.borderColor = '#ff6b6b';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
      }
    }
  }

  hashPassword(str) {
    // Simple hash — adequate for local browser lock
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'bh_' + Math.abs(hash).toString(36);
  }

  changePassword() {
    const oldPass = prompt('Enter your current password:');
    if (!oldPass) return;

    const storedHash = localStorage.getItem('bharat-lock-hash');
    if (storedHash && this.hashPassword(oldPass) !== storedHash) {
      alert('❌ Current password is incorrect!');
      return;
    }

    const newPass = prompt('Enter new password:');
    if (!newPass) return;

    const confirmPass = prompt('Confirm new password:');
    if (newPass !== confirmPass) {
      alert('❌ Passwords do not match!');
      return;
    }

    localStorage.setItem('bharat-lock-hash', this.hashPassword(newPass));
    this.showToast('✅ Password changed successfully!');
  }

  // ── VPN ──────────────────────────────────────

  async detectIP() {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      document.getElementById('vpnIpDisplay').textContent = `IP: ${data.ip}`;
    } catch {
      document.getElementById('vpnIpDisplay').textContent = 'IP: Unable to detect';
    }
  }

  async toggleVPN() {
    if (this.vpnConnected) {
      // Disconnect
      this.vpnConnected = false;
      this.updateVPNUI('off');
      
      if (window.electronAPI && window.electronAPI.clearProxy) {
        window.electronAPI.clearProxy();
      }
      
      this.showToast('⚠️ VPN Disconnected — Your real IP is visible');
      setTimeout(() => this.detectIP(), 500);
    } else {
      // Connect
      this.vpnConnected = true;
      this.updateVPNUI('connecting');
      
      this.showToast('📡 Connecting to Secure VPN...');
      
      try {
        if (window.electronAPI && window.electronAPI.setProxy) {
          const result = await window.electronAPI.setProxy(this.vpnLocation);
          if (result && result.success) {
            this.updateVPNUI('on');
            this.showToast('🛡️ VPN Connected — Your IP is hidden');
            // Refresh IP display after connection
            setTimeout(() => this.detectIP(), 1000);
          } else {
            throw new Error(result ? result.error : 'Connection failed');
          }
        }
      } catch (err) {
        this.vpnConnected = false;
        this.updateVPNUI('off');
        this.showToast('❌ VPN Connection Failed. Try again.');
        console.error('VPN Error:', err);
        this.detectIP();
      }
    }
  }

  updateVPNUI(state) {
    const shield = document.getElementById('vpnShield');
    const label = document.getElementById('vpnStatusLabel');
    const btn = document.getElementById('vpnToggleBtn');
    const ipDisplay = document.getElementById('vpnIpDisplay');

    if (state === 'connecting') {
      shield.className = 'bharat-vpn-panel__shield bharat-vpn-panel__shield--connecting';
      label.textContent = 'Connecting...';
      btn.disabled = true;
      btn.innerHTML = '⏳ Connecting...';
      ipDisplay.textContent = 'IP: Detecting...';
    } else if (state === 'on') {
      shield.className = 'bharat-vpn-panel__shield bharat-vpn-panel__shield--on';
      label.textContent = `VPN Connected — ${this.vpnLocation.toUpperCase()}`;
      btn.disabled = false;
      btn.className = 'bharat-vpn-panel__btn bharat-vpn-panel__btn--disconnect';
      btn.innerHTML = '🔌 Disconnect VPN';
    } else {
      shield.className = 'bharat-vpn-panel__shield bharat-vpn-panel__shield--off';
      label.textContent = 'VPN Disconnected';
      btn.disabled = false;
      btn.className = 'bharat-vpn-panel__btn bharat-vpn-panel__btn--connect';
      btn.innerHTML = '🔌 Connect VPN';
    }
  }

  async setVPNLocation(el) {
    document.querySelectorAll('.bharat-vpn-panel__location').forEach(l => {
      l.classList.remove('bharat-vpn-panel__location--active');
    });
    el.classList.add('bharat-vpn-panel__location--active');
    this.vpnLocation = el.dataset.proxy;

    if (this.vpnConnected) {
      // Reconnect with new location
      this.vpnConnected = false; // Trigger reconnect logic
      this.toggleVPN();
    }
  }

  r(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }

  // ── Extensions ───────────────────────────────

  toggleExtension(name) {
    this.extensions[name] = !this.extensions[name];
    const active = this.extensions[name];

    const toggleMap = {
      darkMode: 'extDarkModeToggle',
      adBlock: 'extAdBlockToggle',
      privacyGuard: 'extPrivacyToggle',
      httpsEverywhere: 'extHttpsToggle',
      scriptBlocker: 'extScriptToggle',
      cookieManager: 'extCookieToggle',
    };

    const statusMap = {
      darkMode: 'extDarkModeStatus',
      adBlock: 'extAdBlockStatus',
      privacyGuard: 'extPrivacyStatus',
      httpsEverywhere: 'extHttpsStatus',
      scriptBlocker: 'extScriptStatus',
      cookieManager: 'extCookieStatus',
    };

    const toggle = document.getElementById(toggleMap[name]);
    const status = document.getElementById(statusMap[name]);
    if (toggle) toggle.classList.toggle('bharat-toggle--active', active);
    if (status) {
      status.textContent = active ? 'Active' : 'Disabled';
      status.className = 'bharat-extension-card__status ' +
        (active ? 'bharat-extension-card__status--active' : 'bharat-extension-card__status--inactive');
    }

    // Apply extension effect
    if (name === 'darkMode') {
      this.applyDarkMode(active);
    }

    this.saveSettings();
    this.showToast(`${active ? '✅' : '⭕'} ${name} ${active ? 'enabled' : 'disabled'}`);
  }

  applyDarkMode(active) {
    // Inject dark mode CSS into active webviews
    const webviews = document.querySelectorAll('webview');
    const css = `
      html { filter: invert(0.9) hue-rotate(180deg) !important; }
      img, video, canvas, svg { filter: invert(1) hue-rotate(-180deg) !important; }
    `;
    webviews.forEach(wv => {
      if (active) {
        wv.insertCSS(css).catch(() => {});
      } else {
        wv.removeInsertedCSS && wv.removeInsertedCSS(css).catch(() => {});
      }
    });
  }

  syncExtensionUI() {
    Object.keys(this.extensions).forEach(name => {
      const toggleMap = {
        darkMode: 'extDarkModeToggle',
        adBlock: 'extAdBlockToggle',
        privacyGuard: 'extPrivacyToggle',
        httpsEverywhere: 'extHttpsToggle',
        scriptBlocker: 'extScriptToggle',
        cookieManager: 'extCookieToggle',
      };
      const statusMap = {
        darkMode: 'extDarkModeStatus',
        adBlock: 'extAdBlockStatus',
        privacyGuard: 'extPrivacyStatus',
        httpsEverywhere: 'extHttpsStatus',
        scriptBlocker: 'extScriptStatus',
        cookieManager: 'extCookieStatus',
      };

      const toggle = document.getElementById(toggleMap[name]);
      const status = document.getElementById(statusMap[name]);
      const active = this.extensions[name];
      if (toggle) toggle.classList.toggle('bharat-toggle--active', active);
      if (status) {
        status.textContent = active ? 'Active' : 'Disabled';
        status.className = 'bharat-extension-card__status ' +
          (active ? 'bharat-extension-card__status--active' : 'bharat-extension-card__status--inactive');
      }
    });
  }

  // ── Privacy Controls ─────────────────────────

  togglePrivacy(name) {
    this.privacy[name] = !this.privacy[name];
    const active = this.privacy[name];

    const toggleMap = {
      fingerprint: 'fingerprintToggle',
      webrtc: 'webrtcToggle',
      doh: 'dohToggle',
      dnt: 'dntToggle',
      passwordLock: 'passwordLockToggle',
    };

    const toggle = document.getElementById(toggleMap[name]);
    if (toggle) toggle.classList.toggle('bharat-toggle--active', active);

    // Special handling
    if (name === 'passwordLock' && !active) {
      localStorage.removeItem('bharat-lock-hash');
      this.showToast('🔓 Password lock disabled');
    } else if (name === 'passwordLock' && active) {
      const pw = prompt('Set a new lock password:');
      if (pw) {
        localStorage.setItem('bharat-lock-hash', this.hashPassword(pw));
        this.showToast('🔒 Password lock enabled');
      } else {
        this.privacy.passwordLock = false;
        if (toggle) toggle.classList.remove('bharat-toggle--active');
      }
    }

    if (name === 'webrtc' && window.electronAPI && window.electronAPI.setWebRTC) {
      window.electronAPI.setWebRTC(!active); // disable WebRTC when protection is on
    }

    this.saveSettings();
  }

  syncPrivacyUI() {
    Object.keys(this.privacy).forEach(name => {
      const toggleMap = {
        fingerprint: 'fingerprintToggle',
        webrtc: 'webrtcToggle',
        doh: 'dohToggle',
        dnt: 'dntToggle',
        passwordLock: 'passwordLockToggle',
      };
      const toggle = document.getElementById(toggleMap[name]);
      if (toggle) toggle.classList.toggle('bharat-toggle--active', this.privacy[name]);
    });
  }

  // ── Persistence ──────────────────────────────

  saveSettings() {
    localStorage.setItem('bharat-extensions', JSON.stringify(this.extensions));
    localStorage.setItem('bharat-privacy', JSON.stringify(this.privacy));
  }

  loadSettings() {
    try {
      const ext = localStorage.getItem('bharat-extensions');
      if (ext) this.extensions = { ...this.extensions, ...JSON.parse(ext) };
      const priv = localStorage.getItem('bharat-privacy');
      if (priv) this.privacy = { ...this.privacy, ...JSON.parse(priv) };
    } catch {}
  }

  showToast(msg) {
    if (window.bharatApp && window.bharatApp.showToast) {
      window.bharatApp.showToast(msg);
    }
  }
}
