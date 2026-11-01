/**
 * Game 11: 2048
 * Classic sliding block puzzle with tile merging, animations, undo history, swipe & D-pad controls.
 */
class Game2048 {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;
        this.hasWon = false;
        this.history = [];

        this.touchStartX = 0;
        this.touchStartY = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
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
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        this.draw();
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 480;
    }

    resetGame() {
        this.grid = Array(this.size).fill(0).map(() => Array(this.size).fill(0));
        this.score = 0;
        this.hasWon = false;
        this.history = [];
        this.spawnTile();
        this.spawnTile();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
        this.draw();
    }

    spawnTile() {
        const emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length > 0) {
            const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    saveHistory() {
        this.history.push({
            grid: this.grid.map(row => [...row]),
            score: this.score
        });
        if (this.history.length > 5) this.history.shift();
    }

    undo() {
        if (this.history.length > 0) {
            const last = this.history.pop();
            this.grid = last.grid;
            this.score = last.score;
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            this.draw();
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        let moved = false;
        if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') moved = this.move('up');
        else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') moved = this.move('down');
        else if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moved = this.move('left');
        else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') moved = this.move('right');
        else if (e.code === 'KeyZ') this.undo();

        if (moved) this.afterMove();
    }

    handleTouchStart(e) {
        if (e.touches && e.touches[0]) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    handleTouchEnd(e) {
        if (e.changedTouches && e.changedTouches[0]) {
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;
            let moved = false;

            if (Math.hypot(dx, dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    moved = this.move(dx > 0 ? 'right' : 'left');
                } else {
                    moved = this.move(dy > 0 ? 'down' : 'up');
                }
                if (moved) this.afterMove();
            }
        }
    }

    move(dir) {
        this.saveHistory();
        let moved = false;

        const rotate = (matrix) => matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
        let tempGrid = this.grid.map(row => [...row]);

        if (dir === 'up') tempGrid = rotate(rotate(rotate(tempGrid)));
        else if (dir === 'right') tempGrid = rotate(rotate(tempGrid));
        else if (dir === 'down') tempGrid = rotate(tempGrid);

        // Slide left logic
        for (let r = 0; r < this.size; r++) {
            let row = tempGrid[r].filter(val => val !== 0);
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] === row[c + 1]) {
                    row[c] *= 2;
                    this.score += row[c];
                    this.audio.playPop();
                    row.splice(c + 1, 1);
                    if (row[c] === 2048 && !this.hasWon) {
                        this.hasWon = true;
                        this.audio.playWin();
                    }
                }
            }
            while (row.length < this.size) row.push(0);

            for (let c = 0; c < this.size; c++) {
                if (tempGrid[r][c] !== row[c]) moved = true;
                tempGrid[r][c] = row[c];
            }
        }

        // Rotate back
        if (dir === 'up') tempGrid = rotate(tempGrid);
        else if (dir === 'right') tempGrid = rotate(rotate(tempGrid));
        else if (dir === 'down') tempGrid = rotate(rotate(rotate(tempGrid)));

        if (moved) {
            this.grid = tempGrid;
            this.audio.playBounce();
        } else {
            this.history.pop(); // discard redundant history
        }

        return moved;
    }

    afterMove() {
        this.spawnTile();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        this.draw();

        if (this.isGameOver()) {
            this.isRunning = false;
            this.audio.playGameOver();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        }
    }

    isGameOver() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return false;
                if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
                if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    getTileColor(val) {
        const colors = {
            2: { bg: '#334155', text: '#f8fafc' },
            4: { bg: '#475569', text: '#f8fafc' },
            8: { bg: '#f97316', text: '#ffffff' },
            16: { bg: '#ea580c', text: '#ffffff' },
            32: { bg: '#ef4444', text: '#ffffff' },
            64: { bg: '#dc2626', text: '#ffffff' },
            128: { bg: '#eab308', text: '#ffffff' },
            256: { bg: '#f59e0b', text: '#ffffff' },
            512: { bg: '#10b981', text: '#ffffff' },
            1024: { bg: '#06b6d4', text: '#ffffff' },
            2048: { bg: '#3b82f6', text: '#ffffff' }
        };
        return colors[val] || { bg: '#8b5cf6', text: '#ffffff' };
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const pad = 12;
        const cellSize = (this.canvas.width - pad * (this.size + 1)) / this.size;

        // Draw Board Background
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(pad / 2, pad / 2, this.canvas.width - pad, this.canvas.height - pad, 12);
        ctx.fill();

        // Draw Cells
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const x = pad + c * (cellSize + pad);
                const y = pad + r * (cellSize + pad);
                const val = this.grid[r][c];

                if (val === 0) {
                    ctx.fillStyle = '#334155';
                    ctx.beginPath();
                    ctx.roundRect(x, y, cellSize, cellSize, 8);
                    ctx.fill();
                } else {
                    const colors = this.getTileColor(val);
                    ctx.fillStyle = colors.bg;
                    ctx.shadowColor = colors.bg;
                    ctx.shadowBlur = val >= 128 ? 12 : 0;
                    ctx.beginPath();
                    ctx.roundRect(x, y, cellSize, cellSize, 8);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    ctx.fillStyle = colors.text;
                    ctx.font = `bold ${val >= 1000 ? 28 : (val >= 100 ? 34 : 40)}px Orbitron, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(val, x + cellSize / 2, y + cellSize / 2);
                }
            }
        }
    }

    restart() {
        this.resetGame();
        this.isRunning = true;
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.controls.destroyTouchOverlay();
    }
}

window.Game2048 = Game2048;
