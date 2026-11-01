/**
 * Game 30: Bubble Shooter
 * Hexagonal bubble grid, wall-reflection aim guide, match-3 popping & floating bubble drop physics.
 */
class BubbleShooterGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;

        this.bubbleRadius = 18;
        this.rows = 10;
        this.cols = 12;
        this.grid = [];
        this.colors = ['#ef4444', '#38bdf8', '#22c55e', '#eab308', '#a855f7'];

        this.cannon = {
            x: 270,
            y: 500,
            angle: -Math.PI / 2
        };

        this.currentBubble = null;
        this.nextBubbleColor = null;
        this.firedBubble = null;
        this.particles = [];
        this.shotsWithoutPop = 0;

        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'none'
        );
        this.resetGame();
        this.isRunning = true;

        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 540;
        this.canvas.height = 560;
        this.cannon.x = this.canvas.width / 2;
        this.cannon.y = this.canvas.height - 40;
    }

    resetGame() {
        this.score = 0;
        this.shotsWithoutPop = 0;
        this.particles = [];
        this.firedBubble = null;

        // Populate top 5 rows of bubbles
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            const colsInRow = r % 2 === 0 ? this.cols : this.cols - 1;
            for (let c = 0; c < colsInRow; c++) {
                if (r < 5) {
                    row.push(this.colors[Math.floor(Math.random() * this.colors.length)]);
                } else {
                    row.push(null);
                }
            }
            this.grid.push(row);
        }

        this.currentBubble = this.getRandomColor();
        this.nextBubbleColor = this.getRandomColor();

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    getBubblePos(r, c) {
        const isOffset = r % 2 === 1;
        const x = isOffset ? (c + 1) * (this.bubbleRadius * 2) : (c + 0.5) * (this.bubbleRadius * 2) + 12;
        const y = (r + 0.5) * (this.bubbleRadius * 1.74) + 15;
        return { x, y };
    }

    handlePointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const angle = Math.atan2(my - this.cannon.y, mx - this.cannon.x);
        // Clamp cannon angle so it only aims upward
        this.cannon.angle = Math.max(-Math.PI + 0.25, Math.min(-0.25, angle));
    }

    handlePointerDown(e) {
        if (!this.isRunning || this.firedBubble) return;
        this.handlePointerMove(e);

        this.firedBubble = {
            x: this.cannon.x,
            y: this.cannon.y,
            vx: Math.cos(this.cannon.angle) * 11,
            vy: Math.sin(this.cannon.angle) * 11,
            color: this.currentBubble
        };

        this.currentBubble = this.nextBubbleColor;
        this.nextBubbleColor = this.getRandomColor();
        this.audio.playShoot();
    }

    update() {
        if (this.firedBubble) {
            const fb = this.firedBubble;
            fb.x += fb.vx;
            fb.y += fb.vy;

            // Wall bounces
            if (fb.x - this.bubbleRadius <= 0) {
                fb.x = this.bubbleRadius;
                fb.vx = Math.abs(fb.vx);
                this.audio.playBounce();
            } else if (fb.x + this.bubbleRadius >= this.canvas.width) {
                fb.x = this.canvas.width - this.bubbleRadius;
                fb.vx = -Math.abs(fb.vx);
                this.audio.playBounce();
            }

            // Ceiling or bubble cluster collision
            let hit = false;
            if (fb.y - this.bubbleRadius <= 15) {
                hit = true;
            } else {
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.grid[r].length; c++) {
                        if (this.grid[r][c]) {
                            const pos = this.getBubblePos(r, c);
                            if (Math.hypot(fb.x - pos.x, fb.y - pos.y) < this.bubbleRadius * 1.85) {
                                hit = true;
                                break;
                            }
                        }
                    }
                    if (hit) break;
                }
            }

            if (hit) {
                this.snapBubbleToGrid(fb);
                this.firedBubble = null;
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    snapBubbleToGrid(fb) {
        let bestR = 0, bestC = 0, bestDist = Infinity;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (!this.grid[r][c]) {
                    const pos = this.getBubblePos(r, c);
                    const d = Math.hypot(fb.x - pos.x, fb.y - pos.y);
                    if (d < bestDist) {
                        bestDist = d;
                        bestR = r;
                        bestC = c;
                    }
                }
            }
        }

        this.grid[bestR][bestC] = fb.color;
        const matches = this.findCluster(bestR, bestC, fb.color);

        if (matches.length >= 3) {
            this.audio.playPop();
            matches.forEach(m => {
                const pos = this.getBubblePos(m.r, m.c);
                this.createBubblePop(pos.x, pos.y, fb.color);
                this.grid[m.r][m.c] = null;
            });
            this.score += matches.length * 30;
            this.dropFloatingBubbles();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        } else {
            this.shotsWithoutPop++;
            if (this.shotsWithoutPop >= 5) {
                this.advanceCeiling();
                this.shotsWithoutPop = 0;
            }
        }

        // Check game over (bubbles reached bottom row)
        if (this.grid[this.rows - 1].some(b => b !== null)) {
            this.gameOver();
        }
    }

    findCluster(startR, startC, targetColor) {
        const matches = [];
        const visited = Array(this.rows).fill(false).map((_, r) => Array(this.grid[r].length).fill(false));
        const queue = [{ r: startR, c: startC }];
        visited[startR][startC] = true;

        while (queue.length > 0) {
            const curr = queue.shift();
            matches.push(curr);

            this.getNeighbors(curr.r, curr.c).forEach(n => {
                if (!visited[n.r][n.c] && this.grid[n.r][n.c] === targetColor) {
                    visited[n.r][n.c] = true;
                    queue.push(n);
                }
            });
        }
        return matches;
    }

    getNeighbors(r, c) {
        const isOffset = r % 2 === 1;
        const deltas = isOffset
            ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
            : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

        const neighbors = [];
        deltas.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.grid[nr].length) {
                neighbors.push({ r: nr, c: nc });
            }
        });
        return neighbors;
    }

    dropFloatingBubbles() {
        const connected = Array(this.rows).fill(false).map((_, r) => Array(this.grid[r].length).fill(false));
        const queue = [];

        // Top row bubbles are anchors
        for (let c = 0; c < this.grid[0].length; c++) {
            if (this.grid[0][c]) {
                connected[0][c] = true;
                queue.push({ r: 0, c });
            }
        }

        while (queue.length > 0) {
            const curr = queue.shift();
            this.getNeighbors(curr.r, curr.c).forEach(n => {
                if (!connected[n.r][n.c] && this.grid[n.r][n.c]) {
                    connected[n.r][n.c] = true;
                    queue.push(n);
                }
            });
        }

        // Drop unanchored bubbles
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] && !connected[r][c]) {
                    const pos = this.getBubblePos(r, c);
                    this.createBubblePop(pos.x, pos.y, this.grid[r][c]);
                    this.grid[r][c] = null;
                    this.score += 50;
                }
            }
        }
    }

    advanceCeiling() {
        const newRow = [];
        const cols = this.cols;
        for (let c = 0; c < cols; c++) {
            newRow.push(this.getRandomColor());
        }
        this.grid.pop();
        this.grid.unshift(newRow);
        this.audio.playBounce();
    }

    createBubblePop(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 26);

        // Draw Bubble Grid
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                const color = this.grid[r][c];
                if (color) {
                    const pos = this.getBubblePos(r, c);
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, this.bubbleRadius - 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Shiny glint
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(pos.x - 4, pos.y - 4, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Fired Bubble in motion
        if (this.firedBubble) {
            ctx.fillStyle = this.firedBubble.color;
            ctx.shadowColor = this.firedBubble.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.firedBubble.x, this.firedBubble.y, this.bubbleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Aim line
        if (!this.firedBubble) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.cannon.x, this.cannon.y);
            ctx.lineTo(this.cannon.x + Math.cos(this.cannon.angle) * 180, this.cannon.y + Math.sin(this.cannon.angle) * 180);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Cannon & Loaded Bubble
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        ctx.rotate(this.cannon.angle);

        // Cannon Barrel
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, -10, 48, 20);

        ctx.restore();

        // Loaded bubble in cannon
        if (this.currentBubble) {
            ctx.fillStyle = this.currentBubble;
            ctx.beginPath();
            ctx.arc(this.cannon.x, this.cannon.y, this.bubbleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Next Bubble Preview
        if (this.nextBubbleColor) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NEXT', 60, this.canvas.height - 40);

            ctx.fillStyle = this.nextBubbleColor;
            ctx.beginPath();
            ctx.arc(60, this.canvas.height - 20, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    restart() {
        this.resetGame();
        this.isRunning = true;
    }

    destroy() {
        this.isRunning = false;
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.controls.destroyTouchOverlay();
    }
}

window.BubbleShooterGame = BubbleShooterGame;
