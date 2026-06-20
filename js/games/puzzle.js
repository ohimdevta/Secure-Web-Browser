/* ============================================
   Search Bharat - Bharat Puzzle Game
   Color matching block puzzle
   ============================================ */

class BharatPuzzle {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('bharat-puzzle-best') || '0');
    this.frameId = null;

    // Grid
    this.cols = 8;
    this.rows = 10;
    this.cellSize = 0;
    this.grid = [];
    this.selected = null;
    this.swapping = null;
    this.animating = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.combo = 0;
    this.particles = [];
    this.shakeAmount = 0;
    
    this.colors = [
      { fill: '#6c5ce7', glow: 'rgba(108, 92, 231, 0.5)', name: 'purple' },
      { fill: '#00cec9', glow: 'rgba(0, 206, 201, 0.5)', name: 'teal' },
      { fill: '#fd79a8', glow: 'rgba(253, 121, 168, 0.5)', name: 'pink' },
      { fill: '#fdcb6e', glow: 'rgba(253, 203, 110, 0.5)', name: 'yellow' },
      { fill: '#00b894', glow: 'rgba(0, 184, 148, 0.5)', name: 'green' },
      { fill: '#e056fd', glow: 'rgba(224, 86, 253, 0.5)', name: 'magenta' },
    ];

    this.movesLeft = 30;
    this.targetScore = 500;
    this.level = 1;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    
    this._click = (e) => this.handleClick(e);
    this._touch = (e) => { e.preventDefault(); this.handleTouch(e); };
    this._keydown = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
    };

    this.canvas.addEventListener('click', this._click);
    this.canvas.addEventListener('touchstart', this._touch);
    window.addEventListener('keydown', this._keydown);

    this.start();
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    const maxW = Math.min(wrapper.clientWidth - 40, 500);
    const maxH = Math.min(wrapper.clientHeight - 40, 600);
    
    this.cellSize = Math.min(Math.floor(maxW / this.cols), Math.floor((maxH - 80) / this.rows));
    this.canvas.width = this.cellSize * this.cols + 40;
    this.canvas.height = this.cellSize * this.rows + 100;
    this.offsetX = 20;
    this.offsetY = 80;
  }

  start() {
    this.score = 0;
    this.movesLeft = 30;
    this.level = 1;
    this.targetScore = 500;
    this.combo = 0;
    this.selected = null;
    this.animating = false;
    this.particles = [];
    
    this.generateGrid();
    
    while (this.findMatches().length > 0) {
      this.generateGrid();
    }
    
    this.running = true;
    this.paused = false;
    
    document.getElementById('gameOver').classList.remove('bharat-game-over--visible');
    document.getElementById('gamePause').classList.remove('bharat-game-pause--visible');
    
    this.updateScoreUI();
    this.render();
  }

  generateGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = {
          color: Math.floor(Math.random() * this.colors.length),
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          falling: false,
          alpha: 1
        };
      }
    }
  }

  handleClick(e) {
    if (!this.running || this.paused || this.animating) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.processInput(x, y);
  }

  handleTouch(e) {
    if (!this.running || this.paused || this.animating) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.processInput(x, y);
  }

  processInput(x, y) {
    const col = Math.floor((x - this.offsetX) / this.cellSize);
    const row = Math.floor((y - this.offsetY) / this.cellSize);
    
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    if (this.selected === null) {
      this.selected = { row, col };
      this.render();
    } else {
      const dr = Math.abs(row - this.selected.row);
      const dc = Math.abs(col - this.selected.col);
      
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        this.swap(this.selected.row, this.selected.col, row, col);
      } else {
        this.selected = { row, col };
        this.render();
      }
    }
  }

  async swap(r1, c1, r2, c2) {
    this.animating = true;
    this.selected = null;

    // Animate swap
    await this.animateSwap(r1, c1, r2, c2);

    // Actual swap
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;

    // Check matches
    const matches = this.findMatches();
    if (matches.length > 0) {
      this.movesLeft--;
      this.combo = 0;
      await this.processMatches();
    } else {
      // Swap back
      const temp2 = this.grid[r1][c1];
      this.grid[r1][c1] = this.grid[r2][c2];
      this.grid[r2][c2] = temp2;
      await this.animateSwap(r1, c1, r2, c2);
      this.shakeAmount = 5;
    }

    this.animating = false;
    this.updateScoreUI();

    // Check game over
    if (this.movesLeft <= 0) {
      if (this.score >= this.targetScore) {
        this.level++;
        this.movesLeft = 30;
        this.targetScore += 300 * this.level;
        bharatApp.showToast(`Level ${this.level}! Target: ${this.targetScore}`, '🎉');
      } else {
        this.gameOver();
      }
    }

    this.render();
  }

  animateSwap(r1, c1, r2, c2) {
    return new Promise(resolve => {
      const cell1 = this.grid[r1][c1];
      const cell2 = this.grid[r2][c2];
      const dx = (c2 - c1) * this.cellSize;
      const dy = (r2 - r1) * this.cellSize;
      
      let progress = 0;
      const animate = () => {
        progress += 0.08;
        if (progress >= 1) {
          cell1.offsetX = 0;
          cell1.offsetY = 0;
          cell2.offsetX = 0;
          cell2.offsetY = 0;
          this.render();
          resolve();
          return;
        }
        
        const ease = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        cell1.offsetX = dx * ease;
        cell1.offsetY = dy * ease;
        cell2.offsetX = -dx * ease;
        cell2.offsetY = -dy * ease;
        
        this.render();
        requestAnimationFrame(animate);
      };
      animate();
    });
  }

  findMatches() {
    const matches = new Set();

    // Horizontal
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        const color = this.grid[r][c].color;
        if (color === this.grid[r][c + 1].color && color === this.grid[r][c + 2].color) {
          matches.add(`${r},${c}`);
          matches.add(`${r},${c + 1}`);
          matches.add(`${r},${c + 2}`);
        }
      }
    }

    // Vertical
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        const color = this.grid[r][c].color;
        if (color === this.grid[r + 1][c].color && color === this.grid[r + 2][c].color) {
          matches.add(`${r},${c}`);
          matches.add(`${r + 1},${c}`);
          matches.add(`${r + 2},${c}`);
        }
      }
    }

    return [...matches].map(m => {
      const [r, c] = m.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  async processMatches() {
    let matches = this.findMatches();
    
    while (matches.length > 0) {
      this.combo++;
      const points = matches.length * 10 * this.combo;
      this.score += points;

      // Spawn particles
      matches.forEach(m => {
        const cx = this.offsetX + m.col * this.cellSize + this.cellSize / 2;
        const cy = this.offsetY + m.row * this.cellSize + this.cellSize / 2;
        const color = this.colors[this.grid[m.row][m.col].color];
        
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: 3 + Math.random() * 4,
            alpha: 1,
            color: color.fill
          });
        }
      });

      // Remove matched
      matches.forEach(m => {
        this.grid[m.row][m.col] = null;
      });

      this.render();
      await this.sleep(150);

      // Drop cells
      this.dropCells();
      this.fillEmpty();
      
      this.render();
      await this.sleep(200);

      matches = this.findMatches();
    }
  }

  dropCells() {
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
          }
          emptyRow--;
        }
      }
    }
  }

  fillEmpty() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === null) {
          this.grid[r][c] = {
            color: Math.floor(Math.random() * this.colors.length),
            scale: 0.5,
            offsetX: 0,
            offsetY: -this.cellSize * 2,
            falling: true,
            alpha: 1
          };
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();

    // Shake
    if (this.shakeAmount > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount,
        (Math.random() - 0.5) * this.shakeAmount
      );
      this.shakeAmount *= 0.85;
    }

    // Background
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, w, h);

    // Header info
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${this.level}`, 20, 30);
    
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillText(`Moves: ${this.movesLeft}`, 20, 52);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a29bfe';
    ctx.font = '700 18px "Outfit", sans-serif';
    ctx.fillText(`${this.score}`, w - 20, 30);
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillText(`Target: ${this.targetScore}`, w - 20, 52);

    // Progress bar
    const barW = w - 40;
    const progress = Math.min(this.score / this.targetScore, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(20, 62, barW, 6, 3);
    ctx.fill();
    
    const progressGrad = ctx.createLinearGradient(20, 0, 20 + barW * progress, 0);
    progressGrad.addColorStop(0, '#6c5ce7');
    progressGrad.addColorStop(1, '#00cec9');
    ctx.fillStyle = progressGrad;
    ctx.beginPath();
    ctx.roundRect(20, 62, barW * progress, 6, 3);
    ctx.fill();

    // Grid background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.beginPath();
    ctx.roundRect(this.offsetX - 4, this.offsetY - 4, 
                  this.cols * this.cellSize + 8, this.rows * this.cellSize + 8, 12);
    ctx.fill();

    // Draw cells
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;

        const x = this.offsetX + c * this.cellSize + cell.offsetX;
        const y = this.offsetY + r * this.cellSize + cell.offsetY;
        const size = this.cellSize - 4;
        const color = this.colors[cell.color];
        const isSelected = this.selected && this.selected.row === r && this.selected.col === c;

        // Cell transition
        if (cell.falling) {
          cell.offsetY += (0 - cell.offsetY) * 0.15;
          cell.scale += (1 - cell.scale) * 0.15;
          if (Math.abs(cell.offsetY) < 0.5 && Math.abs(cell.scale - 1) < 0.01) {
            cell.offsetY = 0;
            cell.scale = 1;
            cell.falling = false;
          }
        }

        ctx.save();
        ctx.translate(x + size / 2 + 2, y + size / 2 + 2);
        ctx.scale(cell.scale, cell.scale);

        // Selection glow
        if (isSelected) {
          ctx.shadowColor = color.glow;
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-size / 2, -size / 2, size, size, 8);
          ctx.stroke();
        }

        // Cell
        ctx.fillStyle = color.fill;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = isSelected ? 20 : 8;
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, 8);
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(-size / 2 + 3, -size / 2 + 3, size - 6, size / 2 - 3, 5);
        ctx.fill();

        ctx.restore();
      }
    }

    // Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      p.size *= 0.96;
      p.vy += 0.1;

      if (p.alpha > 0) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // Combo display
    if (this.combo > 1) {
      ctx.fillStyle = 'rgba(253, 203, 110, 0.8)';
      ctx.font = `800 ${16 + this.combo * 2}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo}x Combo!`, w / 2, this.offsetY - 10);
    }

    ctx.restore();

    // Continue rendering if particles or falling cells
    const hasFalling = this.grid.some(row => row.some(cell => cell && cell.falling));
    if (this.particles.length > 0 || hasFalling || this.shakeAmount > 0.5) {
      requestAnimationFrame(() => this.render());
    }
  }

  gameOver() {
    this.running = false;
    
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bharat-puzzle-best', this.bestScore);
    }

    document.getElementById('gameOverScore').textContent = `Score: ${this.score}`;
    document.getElementById('gameOverBest').textContent = `Best: ${this.bestScore}`;
    document.getElementById('gameBest').textContent = this.bestScore;

    setTimeout(() => {
      document.getElementById('gameOver').classList.add('bharat-game-over--visible');
    }, 300);
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('gamePause').classList.toggle('bharat-game-pause--visible', this.paused);
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
    this.canvas.removeEventListener('click', this._click);
    this.canvas.removeEventListener('touchstart', this._touch);
    window.removeEventListener('keydown', this._keydown);
  }
}
