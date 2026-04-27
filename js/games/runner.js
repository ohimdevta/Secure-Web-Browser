/* ============================================
   NovaBrowser — Anti-Gravity Runner Game
   Endless runner with space/anti-gravity theme
   ============================================ */

class AntiGravityRunner {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('nova-runner-best') || '0');
    this.speed = 3;
    this.gravity = 0;
    this.frameId = null;

    // Player
    this.player = { x: 80, y: 0, vy: 0, width: 30, height: 20, trail: [] };
    
    // World
    this.obstacles = [];
    this.particles = [];
    this.stars = [];
    this.powerups = [];
    this.obstacleTimer = 0;
    this.powerupTimer = 0;
    this.distance = 0;
    this.shaking = 0;
    
    // Controls
    this.keys = {};
    this.gravityDir = 1;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.generateStars();
    
    // Bind controls
    this._keydown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        if (!this.running) this.start();
      }
      if (e.code === 'Space') {
        this.gravityDir *= -1;
        this.spawnGravityFlipEffect();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    };
    this._keyup = (e) => { this.keys[e.code] = false; };
    this._touchstart = (e) => {
      e.preventDefault();
      if (!this.running) { this.start(); return; }
      this.gravityDir *= -1;
      this.spawnGravityFlipEffect();
    };

    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    this.canvas.addEventListener('touchstart', this._touchstart);
    this.canvas.addEventListener('click', () => {
      if (!this.running) this.start();
      else { this.gravityDir *= -1; this.spawnGravityFlipEffect(); }
    });

    // Show instructions
    this.drawStartScreen();
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    this.canvas.width = Math.min(wrapper.clientWidth - 40, 900);
    this.canvas.height = Math.min(wrapper.clientHeight - 40, 500);
    this.player.y = this.canvas.height / 2;
  }

  generateStars() {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1 + 0.5,
        brightness: Math.random()
      });
    }
  }

  start() {
    this.score = 0;
    this.speed = 3;
    this.distance = 0;
    this.obstacles = [];
    this.particles = [];
    this.powerups = [];
    this.player.y = this.canvas.height / 2;
    this.player.vy = 0;
    this.player.trail = [];
    this.gravityDir = 1;
    this.shaking = 0;
    this.obstacleTimer = 0;
    this.powerupTimer = 0;
    this.running = true;
    this.paused = false;
    
    document.getElementById('gameOver').classList.remove('nova-game-over--visible');
    document.getElementById('gamePause').classList.remove('nova-game-pause--visible');
    
    this.updateScoreUI();
    this.loop();
  }

  loop() {
    if (!this.running || this.paused) return;
    this.update();
    this.draw();
    this.frameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    this.distance += this.speed;
    this.score = Math.floor(this.distance / 10);
    this.speed = 3 + this.score / 200;

    // Gravity
    const gravForce = 0.35 * this.gravityDir;
    this.player.vy += gravForce;
    this.player.vy *= 0.98;
    
    if (this.keys['ArrowUp']) this.player.vy -= 0.5;
    if (this.keys['ArrowDown']) this.player.vy += 0.5;

    this.player.y += this.player.vy;

    // Trail
    this.player.trail.push({ x: this.player.x, y: this.player.y + this.player.height / 2, alpha: 1 });
    if (this.player.trail.length > 20) this.player.trail.shift();
    this.player.trail.forEach(t => t.alpha -= 0.05);

    // Bounds
    if (this.player.y < 0) { this.player.y = 0; this.player.vy = 1; }
    if (this.player.y + this.player.height > this.canvas.height) {
      this.player.y = this.canvas.height - this.player.height;
      this.player.vy = -1;
    }

    // Stars
    this.stars.forEach(s => {
      s.x -= s.speed * (this.speed / 3);
      if (s.x < 0) { s.x = this.canvas.width; s.y = Math.random() * this.canvas.height; }
    });

    // Obstacles
    this.obstacleTimer += this.speed;
    if (this.obstacleTimer > 120) {
      this.obstacleTimer = 0;
      this.spawnObstacle();
    }

    this.obstacles.forEach(o => { o.x -= this.speed; });
    this.obstacles = this.obstacles.filter(o => o.x + o.width > -50);

    // Powerups
    this.powerupTimer += this.speed;
    if (this.powerupTimer > 500) {
      this.powerupTimer = 0;
      this.spawnPowerup();
    }

    this.powerups.forEach(p => { p.x -= this.speed; p.angle += 0.05; });
    this.powerups = this.powerups.filter(p => p.x > -30);

    // Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      p.size *= 0.97;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // Shake decay
    if (this.shaking > 0) this.shaking *= 0.9;

    // Collision detection
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    for (const o of this.obstacles) {
      if (px + pw > o.x + 5 && px < o.x + o.width - 5 &&
          py + ph > o.y + 5 && py < o.y + o.height - 5) {
        this.gameOver();
        return;
      }
    }

    // Powerup collection
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (px + pw > p.x && px < p.x + 20 && py + ph > p.y && py < p.y + 20) {
        this.score += 50;
        this.spawnCollectEffect(p.x, p.y);
        this.powerups.splice(i, 1);
      }
    }

    this.updateScoreUI();
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Apply shake
    ctx.save();
    if (this.shaking > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.shaking,
        (Math.random() - 0.5) * this.shaking
      );
    }

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#05051a');
    grad.addColorStop(0.5, '#0a0a2e');
    grad.addColorStop(1, '#1a0533');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.forEach(s => {
      const b = 0.3 + Math.sin(Date.now() * 0.001 + s.brightness * 10) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${b})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color.replace('1)', `${p.alpha})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player trail
    this.player.trail.forEach((t, i) => {
      if (t.alpha <= 0) return;
      const gradient = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 8);
      gradient.addColorStop(0, `rgba(108, 92, 231, ${t.alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(108, 92, 231, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player (rocket ship)
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // Engine glow
    const engineGlow = ctx.createRadialGradient(px - 5, py + ph / 2, 0, px - 5, py + ph / 2, 20);
    engineGlow.addColorStop(0, 'rgba(108, 92, 231, 0.6)');
    engineGlow.addColorStop(0.5, 'rgba(253, 121, 168, 0.3)');
    engineGlow.addColorStop(1, 'rgba(108, 92, 231, 0)');
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.arc(px - 5, py + ph / 2, 20, 0, Math.PI * 2);
    ctx.fill();

    // Ship body
    ctx.fillStyle = '#a29bfe';
    ctx.beginPath();
    ctx.moveTo(px + pw, py + ph / 2);
    ctx.lineTo(px + 5, py);
    ctx.lineTo(px, py + 4);
    ctx.lineTo(px, py + ph - 4);
    ctx.lineTo(px + 5, py + ph);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#00cec9';
    ctx.beginPath();
    ctx.arc(px + pw * 0.6, py + ph / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Gravity indicator
    const indicatorY = this.gravityDir > 0 ? py + ph + 6 : py - 6;
    ctx.fillStyle = this.gravityDir > 0 ? '#ff6b6b' : '#00cec9';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.gravityDir > 0 ? '▼' : '▲', px + pw / 2, indicatorY + 4);

    // Obstacles
    this.obstacles.forEach(o => {
      const oGrad = ctx.createLinearGradient(o.x, o.y, o.x + o.width, o.y + o.height);
      if (o.type === 'asteroid') {
        oGrad.addColorStop(0, '#4a3f6b');
        oGrad.addColorStop(1, '#2d2747');
        ctx.fillStyle = oGrad;
        ctx.beginPath();
        ctx.arc(o.x + o.width / 2, o.y + o.height / 2, o.width / 2, 0, Math.PI * 2);
        ctx.fill();
        // Details
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(o.x + o.width * 0.3, o.y + o.height * 0.4, o.width * 0.15, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.type === 'beam-top' || o.type === 'beam-bottom') {
        oGrad.addColorStop(0, 'rgba(255, 107, 107, 0.6)');
        oGrad.addColorStop(1, 'rgba(255, 107, 107, 0.2)');
        ctx.fillStyle = oGrad;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        // Glow edge
        ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
        if (o.type === 'beam-top') {
          ctx.fillRect(o.x, o.y + o.height - 2, o.width, 2);
        } else {
          ctx.fillRect(o.x, o.y, o.width, 2);
        }
      } else {
        oGrad.addColorStop(0, '#6c5ce7');
        oGrad.addColorStop(1, '#3d2f7c');
        ctx.fillStyle = oGrad;
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = 'rgba(108, 92, 231, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
      }
    });

    // Powerups
    this.powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x + 10, p.y + 10);
      ctx.rotate(p.angle);
      
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
      glow.addColorStop(0, 'rgba(253, 203, 110, 0.4)');
      glow.addColorStop(1, 'rgba(253, 203, 110, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fdcb6e';
      // Star shape
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerAngle = angle + Math.PI / 5;
        if (i === 0) ctx.beginPath();
        ctx.lineTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
        ctx.lineTo(Math.cos(innerAngle) * 4, Math.sin(innerAngle) * 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Score overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '600 14px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Distance: ${this.score}m`, 15, 25);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('SPACE/TAP to flip gravity  •  ↑↓ to steer', 15, 45);

    ctx.restore();
  }

  drawStartScreen() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#05051a');
    grad.addColorStop(1, '#1a0533');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = '800 32px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 Anti-Gravity Runner', w / 2, h / 2 - 40);

    ctx.fillStyle = 'rgba(162, 155, 254, 0.8)';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('Flip gravity to navigate through space', w / 2, h / 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Press SPACE, click, or tap to start', w / 2, h / 2 + 40);

    if (this.bestScore > 0) {
      ctx.fillStyle = 'rgba(253, 203, 110, 0.7)';
      ctx.font = '600 14px "Outfit", sans-serif';
      ctx.fillText(`Best: ${this.bestScore}m`, w / 2, h / 2 + 70);
    }
  }

  spawnObstacle() {
    const h = this.canvas.height;
    const types = ['asteroid', 'beam-top', 'beam-bottom', 'block'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'asteroid') {
      const size = 25 + Math.random() * 30;
      this.obstacles.push({
        x: this.canvas.width + 20,
        y: Math.random() * (h - size),
        width: size,
        height: size,
        type: 'asteroid'
      });
    } else if (type === 'beam-top') {
      const beamH = 40 + Math.random() * 100;
      this.obstacles.push({
        x: this.canvas.width,
        y: 0,
        width: 20,
        height: beamH,
        type: 'beam-top'
      });
    } else if (type === 'beam-bottom') {
      const beamH = 40 + Math.random() * 100;
      this.obstacles.push({
        x: this.canvas.width,
        y: h - beamH,
        width: 20,
        height: beamH,
        type: 'beam-bottom'
      });
    } else {
      const bh = 30 + Math.random() * 50;
      this.obstacles.push({
        x: this.canvas.width,
        y: Math.random() * (h - bh),
        width: 25,
        height: bh,
        type: 'block'
      });
    }
  }

  spawnPowerup() {
    this.powerups.push({
      x: this.canvas.width + 20,
      y: 30 + Math.random() * (this.canvas.height - 60),
      angle: 0
    });
  }

  spawnGravityFlipEffect() {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 3 + Math.random() * 3,
        alpha: 1,
        color: this.gravityDir > 0 ? 'rgba(255, 107, 107, 1)' : 'rgba(0, 206, 201, 1)'
      });
    }
    this.shaking = 5;
  }

  spawnCollectEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 2 + Math.random() * 4,
        alpha: 1,
        color: 'rgba(253, 203, 110, 1)'
      });
    }
  }

  gameOver() {
    this.running = false;
    cancelAnimationFrame(this.frameId);

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('nova-runner-best', this.bestScore);
    }

    // Explosion
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: 2 + Math.random() * 5,
        alpha: 1,
        color: ['rgba(108, 92, 231, 1)', 'rgba(253, 121, 168, 1)', 'rgba(0, 206, 201, 1)'][Math.floor(Math.random() * 3)]
      });
    }
    this.shaking = 15;

    // Draw final frame with particles
    const animateExplosion = () => {
      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.alpha -= 0.02; p.size *= 0.97;
        p.vx *= 0.98; p.vy *= 0.98;
      });
      this.particles = this.particles.filter(p => p.alpha > 0);
      this.draw();
      if (this.particles.length > 0) {
        requestAnimationFrame(animateExplosion);
      }
    };
    animateExplosion();

    document.getElementById('gameOverScore').textContent = `Score: ${this.score}m`;
    document.getElementById('gameOverBest').textContent = `Best: ${this.bestScore}m`;
    
    setTimeout(() => {
      document.getElementById('gameOver').classList.add('nova-game-over--visible');
    }, 500);
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('gamePause').classList.toggle('nova-game-pause--visible', this.paused);
    if (!this.paused) this.loop();
  }

  updateScoreUI() {
    document.getElementById('gameScore').textContent = this.score;
    document.getElementById('gameBest').textContent = this.bestScore;
  }

  restart() {
    this.start();
  }

  destroy() {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this._touchstart);
    }
  }
}
