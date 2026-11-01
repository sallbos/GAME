/**
 * Game 12: Minesweeper
 * Classic minefield puzzle with first-click safety, flag mode toggle for mobile, flood fill & timer.
 */
class MinesweeperGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.rows = 10;
        this.cols = 10;
        this.mineCount = 12;
        this.difficulty = options.difficulty || 'Easy';

        this.grid = [];
        this.isGenerated = false;
        this.isGameOver = false;
        this.hasWon = false;
        this.flagMode = false; // For mobile toggle
        this.flagCount = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.score = 0;

        this.handleClick = this.handleClick.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'action-only',
            { action: '🚩 TOGGLE FLAG' }
        );
        this.resetGame();
        this.canvas.addEventListener('pointerdown', this.handleClick);
        this.canvas.addEventListener('contextmenu', this.handleContextMenu);
        this.draw();
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 540;
    }

    resetGame() {
        if (this.difficulty === 'Hard') {
            this.rows = 14; this.cols = 14; this.mineCount = 30;
        } else if (this.difficulty === 'Normal') {
            this.rows = 12; this.cols = 12; this.mineCount = 20;
        } else {
            this.rows = 10; this.cols = 10; this.mineCount = 12;
        }

        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    r, c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            this.grid.push(row);
        }

        this.isGenerated = false;
        this.isGameOver = false;
        this.hasWon = false;
        this.flagCount = 0;
        this.timer = 0;
        this.score = 0;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
        this.draw();
    }

    generateMines(safeR, safeC) {
        let placed = 0;
        while (placed < this.mineCount) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if (!this.grid[r][c].isMine && !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) {
                this.grid[r][c].isMine = true;
                placed++;
            }
        }

        // Calculate neighbor numbers
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].isMine) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                                if (this.grid[nr][nc].isMine) count++;
                            }
                        }
                    }
                    this.grid[r][c].neighborMines = count;
                }
            }
        }

        this.timerInterval = setInterval(() => {
            this.timer++;
            this.draw();
        }, 1000);
        this.isGenerated = true;
    }

    handleClick(e) {
        if (this.isGameOver || this.hasWon) return;

        // Check if virtual flag toggle was pressed
        if (this.controls.isPressed('action')) {
            this.flagMode = !this.flagMode;
            this.controls.buttons['action'] = false;
            this.audio.playClick();
            this.draw();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const mx = (e.clientX - rect.left) * scale;
        const my = (e.clientY - rect.top) * scale;

        // Header smiley click
        if (my < 60 && Math.abs(mx - this.canvas.width / 2) < 25) {
            this.resetGame();
            return;
        }

        if (my < 60) return;

        const cellSize = (this.canvas.height - 70) / this.rows;
        const col = Math.floor(mx / cellSize);
        const row = Math.floor((my - 65) / cellSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            if (e.button === 2 || this.flagMode) {
                this.toggleFlag(row, col);
            } else {
                this.revealCell(row, col);
            }
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const mx = (e.clientX - rect.left) * scale;
        const my = (e.clientY - rect.top) * scale;
        if (my < 60) return;

        const cellSize = (this.canvas.height - 70) / this.rows;
        const col = Math.floor(mx / cellSize);
        const row = Math.floor((my - 65) / cellSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.toggleFlag(row, col);
        }
    }

    toggleFlag(r, c) {
        const cell = this.grid[r][c];
        if (cell.isRevealed) return;
        cell.isFlagged = !cell.isFlagged;
        this.flagCount += cell.isFlagged ? 1 : -1;
        this.audio.playClick();
        this.draw();
        this.checkWinCondition();
    }

    revealCell(r, c) {
        if (!this.isGenerated) {
            this.generateMines(r, c);
        }

        const cell = this.grid[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;

        if (cell.isMine) {
            this.isGameOver = true;
            clearInterval(this.timerInterval);
            this.audio.playExplosion();
            this.revealAllMines();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            this.draw();
            return;
        }

        this.audio.playPop();

        // Flood fill empty neighbors
        if (cell.neighborMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        if (!this.grid[nr][nc].isRevealed) {
                            this.revealCell(nr, nc);
                        }
                    }
                }
            }
        }

        this.checkWinCondition();
        this.draw();
    }

    revealAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].isMine) {
                    this.grid[r][c].isRevealed = true;
                }
            }
        }
    }

    checkWinCondition() {
        let allNonMinesRevealed = true;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].isMine && !this.grid[r][c].isRevealed) {
                    allNonMinesRevealed = false;
                    break;
                }
            }
        }

        if (allNonMinesRevealed && !this.isGameOver) {
            this.hasWon = true;
            clearInterval(this.timerInterval);
            this.score = Math.max(100, 1000 - this.timer * 5 + this.mineCount * 25);
            this.audio.playWin();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            this.draw();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header Bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(10, 10, this.canvas.width - 20, 48);

        // Mine Counter
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`💣 ${String(Math.max(0, this.mineCount - this.flagCount)).padStart(3, '0')}`, 24, 40);

        // Smiley
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        let face = '🙂';
        if (this.hasWon) face = '😎';
        else if (this.isGameOver) face = '😵';
        ctx.fillText(face, this.canvas.width / 2, 42);

        // Timer
        ctx.textAlign = 'right';
        ctx.fillText(`⏱️ ${String(Math.min(999, this.timer)).padStart(3, '0')}`, this.canvas.width - 24, 40);

        // Draw Grid
        const cellSize = (this.canvas.height - 70) / this.rows;
        const numberColors = ['', '#38bdf8', '#22c55e', '#ef4444', '#818cf8', '#b91c1c', '#06b6d4', '#f59e0b', '#ec4899'];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                const x = c * cellSize + (this.canvas.width - this.cols * cellSize) / 2;
                const y = 65 + r * cellSize;

                if (cell.isRevealed) {
                    ctx.fillStyle = cell.isMine ? '#ef4444' : '#1e293b';
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

                    if (cell.isMine) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `${cellSize * 0.6}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('💣', x + cellSize / 2, y + cellSize / 2);
                    } else if (cell.neighborMines > 0) {
                        ctx.fillStyle = numberColors[cell.neighborMines] || '#ffffff';
                        ctx.font = `bold ${cellSize * 0.55}px Orbitron, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(cell.neighborMines, x + cellSize / 2, y + cellSize / 2);
                    }
                } else {
                    // Unrevealed cell
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

                    if (cell.isFlagged) {
                        ctx.font = `${cellSize * 0.55}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🚩', x + cellSize / 2, y + cellSize / 2);
                    }
                }
            }
        }
    }

    restart() {
        this.resetGame();
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        this.resetGame();
    }

    destroy() {
        clearInterval(this.timerInterval);
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        this.controls.destroyTouchOverlay();
    }
}

window.MinesweeperGame = MinesweeperGame;
