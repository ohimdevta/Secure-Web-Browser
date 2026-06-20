/* ============================================
   Search Bharat - Focus Mode
   Distraction-free reading experience
   ============================================ */

class FocusMode {
  constructor() {
    this.isActive = false;
  }

  init() {
    // Listen for navbar hover in focus mode
    const navbar = document.getElementById('navBar');
    navbar.addEventListener('mouseenter', () => {
      if (this.isActive) {
        navbar.style.opacity = '1';
        navbar.style.transform = 'translateY(0)';
      }
    });
  }

  toggle() {
    this.isActive = !this.isActive;
    const browser = document.getElementById('bharatBrowser');
    
    if (this.isActive) {
      browser.classList.add('bharat-browser--focus-mode');
      bharatApp.showToast('Focus Mode enabled — UI hidden for distraction-free browsing', '👁');
    } else {
      browser.classList.remove('bharat-browser--focus-mode');
      bharatApp.showToast('Focus Mode disabled', '👁');
    }
  }

  isEnabled() {
    return this.isActive;
  }
}
