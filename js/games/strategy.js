/* ============================================
   Search Bharat - Space Strategy Game
   Tower defense mini-game in space
   ============================================ */

class SpaceStrategy {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('bharat-strategy-best') || '0');
    this.frameId = null;

    // Game state
    this.credits = 100;
    this.wave = 0;
    this.lives = 10;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.explosions = [];
    this.path = [];
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.enemiesToSpawn = 0;
    this.gridCols = 16;
    this.gridRows = 10;
    this.cellSize = 0;
    this.selectedTower = null;
    this.hoveredCell = null;

    // Tower definitions
    this.towerTypes = [
      { name: 'Laser', cost: 25, range: 120, damage: 1, fireRate: 30, color: '#6c5ce7', projectileColor: '#a29bfe', key: '1' },
      { name: 'Plasma', cost: 50, range: 100, damage: 3, fireRate: 60, color: '#00cec9', projectileColor: '#7af5ff', key: '2' },
      { name: 'Rail', cost: 100, range: 200, damage: 8, fireRate: 120, color: '#fd79a8', projectileColor: '#ff6b6b', key: '3' },
    ];

    this.selectedTowerType = 0;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.generatePath();

    this._click = (e) => this.handleClick(e);
    this._mousemove = (e) => this.handleMouseMove(e);
    this._keydown = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
      if (e.code === 'Digit1') this.selectedTowerType = 0;
      if (e.code === 'Digit2') this.selectedTowerType = 1;
      if (e.code === 'Digit3') this.selectedTowerType = 2;
    };

    this.canvas.addEventListener('click', this._click);
    this.canvas.addEventListener('mousemove', this._mousemove);
    window.addEventListener('keydown', this._keydown);

    this.start();
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    const maxW = Math.min(wrapper.clientWidth - 20, 900);
    const maxH = Math.min(wrapper.clientHeight - 20, 560);
    
    this.cellSize = Math.min(Math.floor(maxW / this.gridCols), Math.floor(maxH / (this.gridRows + 2)));
    this.canvas.width = this.cellSize * this.gridCols;
    this.canvas.height = this.cellSize * (this.gridRows + 2);
  }

  generatePath() {
    this.path = [];
    const r = this.gridRows;
    
    // Create a winding path
    const waypoints = [
      { x: -1, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 1 },
      { x: 12, y: 1 },
      { x: 12, y: 7 },
      { x: 6, y: 7 },
      { x: 6, y: 9 },
      { x: 16, y: 9 },
    ];

    this.path = waypoints.map(wp => ({
      x: wp.x * this.cellSize + this.cellSize / 2,
      y: wp.y * this.cellSize + this.cellSize / 2,
    }));

    // Mark path cells for building prevention
    this.pathCells = new Set();
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const dx = Math.sign(to.x - from.x);
      const dy = Math.sign(to.y - from.y);
      let cx = from.x, cy = from.y;
      while (cx !== to.x || cy !== to.y) {
        if (cx >= 0 && cx < this.gridCols && cy >= 0 && cy < this.gridRows) {
          this.pathCells.add(`${cx},${cy}`);
        }
        if (cx !== to.x) cx += dx;
        else if (cy !== to.y) cy += dy;
      }
      this.pathCells.add(`${to.x},${to.y}`);
    }
  }

  start() {
    this.score = 0;
    this.credits = 100;
    this.wave = 0;
    this.lives = 10;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.explosions = [];
    this.waveTimer = 100;
    this.spawnTimer = 0;
    this.enemiesToSpawn = 0;
    this.running = true;
    this.paused = false;
    this.selectedTowerType = 0;

    document.getElementById('gameOver').classList.remove('bharat-game-over--visible');
    document.getElementById('gamePause').classList.remove('bharat-game-pause--visible');

    this.updateScoreUI();
    this.loop();
  }

  loop() {
    if (!this.running) return;
    if (!this.paused) {
      this.update();
    }
    this.draw();
    this.frameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Wave management
    if (this.enemiesToSpawn <= 0 && this.enemies.length === 0) {
      this.waveTimer--;
      if (this.waveTimer <= 0) {
        this.startWave();
      }
    }

    // Spawn enemies
    if (this.enemiesToSpawn > 0) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.enemiesToSpawn--;
        this.spawnTimer = 30;
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      this.moveEnemy(enemy);
      
      if (enemy.reachedEnd) {
        this.lives--;
        this.enemies.splice(i, 1);
        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update towers
    this.towers.forEach(tower => {
      tower.cooldown = Math.max(0, tower.cooldown - 1);
      
      if (tower.cooldown === 0) {
        const target = this.findTarget(tower);
        if (target) {
          this.shoot(tower, target);
          tower.cooldown = tower.fireRate;
          tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        }
      }
    });

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 8) {
        // Hit
        const enemy = this.enemies.find(e => {
          const d = Math.sqrt((e.x - proj.x) ** 2 + (e.y - proj.y) ** 2);
          return d < 20;
        });
        
        if (enemy) {
          enemy.hp -= proj.damage;
          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          }
        }
        
        this.spawnHitEffect(proj.x, proj.y, proj.color);
        this.projectiles.splice(i, 1);
      } else {
        const speed = 6;
        proj.x += (dx / dist) * speed;
        proj.y += (dy / dist) * speed;
      }
    }

    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      p.size *= 0.96;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // Update explosions
    this.explosions.forEach(e => {
      e.radius += 2;
      e.alpha -= 0.05;
    });
    this.explosions = this.explosions.filter(e => e.alpha > 0);

    this.updateScoreUI();
  }

  startWave() {
    this.wave++;
    this.enemiesToSpawn = 5 + this.wave * 2;
    this.spawnTimer = 0;
    this.waveTimer = 200;
    this.credits += 15 + this.wave * 5;
  }

  spawnEnemy() {
    const speed = 0.8 + this.wave * 0.05;
    const hp = 3 + this.wave * 2;
    const types = ['basic', 'fast', 'tank'];
    const type = this.wave > 3 ? types[Math.floor(Math.random() * types.length)] : 'basic';
    
    const enemy = {
      x: this.path[0].x,
      y: this.path[0].y,
      pathIndex: 0,
      speed: type === 'fast' ? speed * 1.5 : type === 'tank' ? speed * 0.6 : speed,
      hp: type === 'tank' ? hp * 3 : type === 'fast' ? hp * 0.5 : hp,
      maxHp: type === 'tank' ? hp * 3 : type === 'fast' ? hp * 0.5 : hp,
      type,
      color: type === 'tank' ? '#ff6b6b' : type === 'fast' ? '#fdcb6e' : '#e056fd',
      size: type === 'tank' ? 14 : type === 'fast' ? 8 : 10,
      reachedEnd: false
    };

    this.enemies.push(enemy);
  }

  moveEnemy(enemy) {
    if (enemy.pathIndex >= this.path.length - 1) {
      enemy.reachedEnd = true;
      return;
    }

    const target = this.path[enemy.pathIndex + 1];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    }
  }

  findTarget(tower) {
    let best = null;
    let bestProgress = -1;

    for (const enemy of this.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= tower.range && enemy.pathIndex > bestProgress) {
        best = enemy;
        bestProgress = enemy.pathIndex;
      }
    }

    return best;
  }

  shoot(tower, target) {
    this.projectiles.push({
      x: tower.x,
      y: tower.y,
      targetX: target.x,
      targetY: target.y,
      damage: tower.damage,
      color: tower.projectileColor
    });
  }

  killEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
      this.score += 10;
      this.credits += 5;
      
      // Explosion
      this.explosions.push({
        x: enemy.x, y: enemy.y,
        radius: 5, alpha: 0.8,
        color: enemy.color
      });

      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: enemy.x, y: enemy.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: 2 + Math.random() * 3,
          alpha: 1,
          color: enemy.color
        });
      }
    }
  }

  spawnHitEffect(x, y, color) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: 2 + Math.random() * 2,
        alpha: 1,
        color
      });
    }
  }

  handleClick(e) {
    if (!this.running || this.paused) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check tower type buttons
    const btnY = this.cellSize * this.gridRows + 10;
    const btnH = this.cellSize * 2 - 20;
    
    for (let i = 0; i < this.towerTypes.length; i++) {
      const btnX = 10 + i * 130;
      if (mx >= btnX && mx <= btnX + 120 && my >= btnY && my <= btnY + btnH) {
        this.selectedTowerType = i;
        return;
      }
    }

    // Place tower
    const col = Math.floor(mx / this.cellSize);
    const row = Math.floor(my / this.cellSize);

    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) return;
    if (this.pathCells.has(`${col},${row}`)) return;
    if (this.towers.some(t => t.col === col && t.row === row)) return;

    const type = this.towerTypes[this.selectedTowerType];
    if (this.credits < type.cost) return;

    this.credits -= type.cost;
    this.towers.push({
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
      col, row,
      ...type,
      cooldown: 0,
      angle: 0,
      level: 1
    });
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const col = Math.floor(mx / this.cellSize);
    const row = Math.floor(my / this.cellSize);
    
    if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
      this.hoveredCell = { col, row };
    } else {
      this.hoveredCell = null;
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Background
    ctx.fillStyle = '#070714';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridCols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, this.gridRows * cs);
      ctx.stroke();
    }
    for (let y = 0; y <= this.gridRows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cs);
      ctx.lineTo(this.gridCols * cs, y * cs);
      ctx.stroke();
    }

    // Draw path
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.2)';
    ctx.lineWidth = cs * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    this.path.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Path glow
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.08)';
    ctx.lineWidth = cs;
    ctx.beginPath();
    this.path.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Hovered cell
    if (this.hoveredCell && !this.paused) {
      const { col, row } = this.hoveredCell;
      const isPath = this.pathCells.has(`${col},${row}`);
      const hasTower = this.towers.some(t => t.col === col && t.row === row);
      const canPlace = !isPath && !hasTower;
      
      ctx.fillStyle = canPlace ? 'rgba(108, 92, 231, 0.15)' : 'rgba(255, 107, 107, 0.1)';
      ctx.fillRect(col * cs, row * cs, cs, cs);
      
      if (canPlace) {
        const type = this.towerTypes[this.selectedTowerType];
        ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(col * cs + cs / 2, row * cs + cs / 2, type.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw towers
    this.towers.forEach(tower => {
      // Range circle (dim)
      ctx.strokeStyle = `${tower.color}15`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.stroke();

      // Tower base
      ctx.fillStyle = tower.color + '40';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, cs * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Tower body
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, cs * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Tower barrel
      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.rotate(tower.angle);
      ctx.fillStyle = tower.color;
      ctx.fillRect(0, -3, cs * 0.3, 6);
      ctx.restore();

      // Inner glow
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(tower.x - 2, tower.y - 2, cs * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw enemies
    this.enemies.forEach(enemy => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(enemy.x + 2, enemy.y + 2, enemy.size, enemy.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      if (enemy.type === 'tank') {
        ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size, enemy.size * 2, enemy.size * 2);
      } else {
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fill();

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const barW = enemy.size * 2.5;
        const barH = 3;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - enemy.size - 8;
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(barX, barY, barW, barH);
        
        const hpPct = enemy.hp / enemy.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#00b894' : hpPct > 0.25 ? '#fdcb6e' : '#ff6b6b';
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }
    });

    // Draw projectiles
    this.projectiles.forEach(proj => {
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw explosions
    this.explosions.forEach(e => {
      ctx.strokeStyle = e.color + Math.floor(e.alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw particles
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // UI Panel
    const panelY = this.gridRows * cs;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
    ctx.fillRect(0, panelY, w, h - panelY);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(w, panelY);
    ctx.stroke();

    // Tower buttons
    this.towerTypes.forEach((type, i) => {
      const bx = 10 + i * 130;
      const by = panelY + 10;
      const bw = 120;
      const bh = cs * 2 - 20;
      const selected = i === this.selectedTowerType;
      const canAfford = this.credits >= type.cost;

      ctx.fillStyle = selected ? `${type.color}30` : 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = selected ? type.color : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      // Tower icon
      ctx.fillStyle = canAfford ? type.color : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(bx + 25, by + bh / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      // Info
      ctx.fillStyle = canAfford ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.font = '600 12px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(type.name, bx + 42, by + bh / 2 - 6);
      
      ctx.fillStyle = canAfford ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.font = '11px "Inter", sans-serif';
      ctx.fillText(`💰 ${type.cost}  [${type.key}]`, bx + 42, by + bh / 2 + 10);
    });

    // Stats
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "Outfit", sans-serif';
    ctx.fillText(`Wave ${this.wave}`, w - 15, panelY + 22);
    
    ctx.fillStyle = '#fdcb6e';
    ctx.font = '600 13px "Outfit", sans-serif';
    ctx.fillText(`💰 ${this.credits}`, w - 15, panelY + 42);
    
    ctx.fillStyle = this.lives > 3 ? '#00b894' : '#ff6b6b';
    ctx.fillText(`❤️ ${this.lives}`, w - 15, panelY + 62);

    // Wave countdown
    if (this.enemiesToSpawn <= 0 && this.enemies.length === 0 && this.waveTimer > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillText(`Next wave in ${Math.ceil(this.waveTimer / 60)}...`, w / 2, panelY + 45);
    }
  }

  gameOver() {
    this.running = false;
    cancelAnimationFrame(this.frameId);

    this.score = this.wave * 100 + this.towers.length * 10;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bharat-strategy-best', this.bestScore);
    }

    document.getElementById('gameOverScore').textContent = `Wave ${this.wave} • Score: ${this.score}`;
    document.getElementById('gameOverBest').textContent = `Best: ${this.bestScore}`;
    document.getElementById('gameBest').textContent = this.bestScore;

    setTimeout(() => {
      document.getElementById('gameOver').classList.add('bharat-game-over--visible');
    }, 500);
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('gamePause').classList.toggle('bharat-game-pause--visible', this.paused);
  }

  updateScoreUI() {
    document.getElementById('gameScore').textContent = this.wave;
    document.getElementById('gameBest').textContent = this.bestScore;
  }

  restart() {
    this.start();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    if (this.canvas) {
      this.canvas.removeEventListener('click', this._click);
      this.canvas.removeEventListener('mousemove', this._mousemove);
    }
    window.removeEventListener('keydown', this._keydown);
  }
}
