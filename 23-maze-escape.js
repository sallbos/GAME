/**
 * Game 23: Maze Escape
 * Procedural recursive backtracker maze, dynamic fog-of-war lighting, golden key, exit portal & gems.
 */
class MazeEscapeGame {
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
        this.hasKey = false;
        this.difficulty = options.difficulty || 'Normal';

        this.cols = 17;
        this.rows = 17;
        this.cellSize = 26;
        this.grid = [];

        this.player = {
            r: 1,
            c: 1,
            x: 0,
            y: 0,
            angle: 0
        };

        this.keyPos = { r: 0, c: 0 };
        this.exitPos = { r: 0, c: 0 };
        this.gems = [];
        this.visited = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-only'
        );
        this.resetGame();
        this.isRunning = true;

        window.addEventListener('keydown', this.handleKeyDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 560;
        this.canvas.height = 560;
    }

    resetGame() {
        if (this.difficulty === 'Easy') {
            this.cols = 13; this.rows = 13;
        } else if (this.difficulty === 'Hard') {
            this.cols = 21; this.rows = 21;
        } else {
            this.cols = 17; this.rows = 17;
        }

        this.cellSize = Math.floor(520 / this.cols);
        this.generateMaze();

        this.player.r = 1;
        this.player.c = 1;
        this.player.x = (1 + 0.5) * this.cellSize;
        this.player.y = (1 + 0.5) * this.cellSize;
        this.player.angle = 0;
        this.hasKey = false;
        this.score = 0;

        // Place Key and Exit far away
        this.exitPos = { r: this.rows - 2, c: this.cols - 2 };
        this.keyPos = { r: Math.floor(this.rows / 2), c: this.cols - 2 };

        // Scatter gems in open corridors
        this.gems = [];
        for (let r = 1; r < this.rows - 1; r++) {
            for (let c = 1; c < this.cols - 1; c++) {
                if (this.grid[r][c] === 0 && (r !== 1 || c !== 1) && Math.random() < 0.12) {
                    this.gems.push({ r, c, collected: false });
                }
            }
        }

        // Visited cells for fog of war
        this.visited = Array(this.rows).fill(false).map(() => Array(this.cols).fill(false));
        this.markVisited(1, 1);

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    generateMaze() {
        // 1 = Wall, 0 = Path
        this.grid = Array(this.rows).fill(1).map(() => Array(this.cols).fill(1));

        const stack = [{ r: 1, c: 1 }];
        this.grid[1][1] = 0;

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];

            [[0, -2], [0, 2], [-2, 0], [2, 0]].forEach(([dr, dc]) => {
                const nr = current.r + dr;
                const nc = current.c + dc;
                if (nr > 0 && nr < this.rows - 1 && nc > 0 && nc < this.cols - 1 && this.grid[nr][nc] === 1) {
                    neighbors.push({ r: nr, c: nc, wallR: current.r + dr / 2, wallC: current.c + dc / 2 });
                }
            });

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.grid[next.wallR][next.wallC] = 0;
                this.grid[next.r][next.c] = 0;
                stack.push({ r: next.r, c: next.c });
            } else {
                stack.pop();
            }
        }
    }

    markVisited(centerR, centerC) {
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const r = centerR + dr;
                const c = centerC + dc;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    this.visited[r][c] = true;
                }
            }
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        let dr = 0, dc = 0;
        if (e.code === 'ArrowUp' || e.key === 'w') { dr = -1; this.player.angle = -Math.PI / 2; }
        else if (e.code === 'ArrowDown' || e.key === 's') { dr = 1; this.player.angle = Math.PI / 2; }
        else if (e.code === 'ArrowLeft' || e.key === 'a') { dc = -1; this.player.angle = Math.PI; }
        else if (e.code === 'ArrowRight' || e.key === 'd') { dc = 1; this.player.angle = 0; }

        if (dr !== 0 || dc !== 0) {
            this.tryMove(dr, dc);
        }
    }

    tryMove(dr, dc) {
        const nr = this.player.r + dr;
        const nc = this.player.c + dc;

        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.grid[nr][nc] === 0) {
            this.player.r = nr;
            this.player.c = nc;
            this.audio.playClick();
            this.markVisited(nr, nc);

            // Gem collection
            this.gems.forEach(g => {
                if (!g.collected && g.r === nr && g.c === nc) {
                    g.collected = true;
                    this.score += 25;
                    this.audio.playScore();
                    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
                }
            });

            // Key pickup
            if (!this.hasKey && nr === this.keyPos.r && nc === this.keyPos.c) {
                this.hasKey = true;
                this.score += 100;
                this.audio.playPowerup();
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }

            // Exit
            if (this.hasKey && nr === this.exitPos.r && nc === this.exitPos.c) {
                this.handleWin();
            }
        }
    }

    handleWin() {
        this.isRunning = false;
        this.score += 500;
        this.audio.playWin();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    update() {
        // Touch controls support
        if (this.controls.isPressed('up')) { this.tryMove(-1, 0); this.controls.buttons['up'] = false; }
        if (this.controls.isPressed('down')) { this.tryMove(1, 0); this.controls.buttons['down'] = false; }
        if (this.controls.isPressed('left')) { this.tryMove(0, -1); this.controls.buttons['left'] = false; }
        if (this.controls.isPressed('right')) { this.tryMove(0, 1); this.controls.buttons['right'] = false; }

        // Smooth visual position interpolation
        const targetX = (this.player.c + 0.5) * this.cellSize + 20;
        const targetY = (this.player.r + 0.5) * this.cellSize + 20;
        this.player.x += (targetX - this.player.x) * 0.35;
        this.player.y += (targetY - this.player.y) * 0.35;
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const offsetX = 20;
        const offsetY = 20;

        // Draw Maze Grid
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = offsetX + c * this.cellSize;
                const y = offsetY + r * this.cellSize;

                if (this.grid[r][c] === 1) {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(x, y, this.cellSize, this.cellSize);
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, this.cellSize, this.cellSize);
                } else {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(x, y, this.cellSize, this.cellSize);
                }
            }
        }

        // Draw Gems
        this.gems.forEach(g => {
            if (!g.collected) {
                const gx = offsetX + (g.c + 0.5) * this.cellSize;
                const gy = offsetY + (g.r + 0.5) * this.cellSize;
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(gx, gy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });

        // Draw Key
        if (!this.hasKey) {
            const kx = offsetX + (this.keyPos.c + 0.5) * this.cellSize;
            const ky = offsetY + (this.keyPos.r + 0.5) * this.cellSize;
            ctx.fillStyle = '#eab308';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            ctx.font = `${this.cellSize * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔑', kx, ky);
            ctx.shadowBlur = 0;
        }

        // Draw Exit Portal
        const ex = offsetX + (this.exitPos.c + 0.5) * this.cellSize;
        const ey = offsetY + (this.exitPos.r + 0.5) * this.cellSize;
        ctx.fillStyle = this.hasKey ? '#22c55e' : '#64748b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = this.hasKey ? 12 : 2;
        ctx.beginPath();
        ctx.arc(ex, ey, this.cellSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.cellSize * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hasKey ? '🌀' : '🔒', ex, ey);

        // Draw Player
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, this.cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Fog of War Darkness Overlay with Flashlight Radial Gradient
        const darkCanvas = document.createElement('canvas');
        darkCanvas.width = this.canvas.width;
        darkCanvas.height = this.canvas.height;
        const dctx = darkCanvas.getContext('2d');

        dctx.fillStyle = 'rgba(7, 10, 19, 0.94)';
        dctx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);

        // Punch out light circle at player position
        dctx.globalCompositeOperation = 'destination-out';
        const grad = dctx.createRadialGradient(
            this.player.x, this.player.y, 10,
            this.player.x, this.player.y, 140
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        dctx.fillStyle = grad;
        dctx.beginPath();
        dctx.arc(this.player.x, this.player.y, 140, 0, Math.PI * 2);
        dctx.fill();

        ctx.drawImage(darkCanvas, 0, 0);

        // Top HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 16);
        ctx.textAlign = 'right';
        ctx.fillText(this.hasKey ? 'PORTAL UNLOCKED! ESCAPE! 🌀' : 'FIND THE KEY 🔑', this.canvas.width - 20, 16);
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
        window.removeEventListener('keydown', this.handleKeyDown);
        this.controls.destroyTouchOverlay();
    }
}

window.MazeEscapeGame = MazeEscapeGame;
