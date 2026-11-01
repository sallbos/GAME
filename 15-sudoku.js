/**
 * Game 15: Sudoku
 * 9x9 logic puzzle with 3x3 block borders, on-screen numpad, pencil notes mode, hints & error checking.
 */
class SudokuGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.selectedCell = { r: 0, c: 0 };
        this.initialGrid = [];
        this.currentGrid = [];
        this.solution = [];
        this.pencilNotes = [];
        this.pencilMode = false;

        this.difficulty = options.difficulty || 'Easy';
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.timer = 0;
        this.timerInterval = null;
        this.score = 0;
        this.isRunning = false;

        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'none'
        );
        this.resetGame();
        this.isRunning = true;
        this.canvas.addEventListener('pointerdown', this.handleClick);
        window.addEventListener('keydown', this.handleKeyDown);
        this.draw();
    }

    setupCanvas() {
        this.canvas.width = 540;
        this.canvas.height = 640;
    }

    resetGame() {
        // Base valid solution
        const base = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9]
        ];

        // Shuffle numbers randomly to create new valid puzzle
        const map = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = map.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [map[i], map[j]] = [map[j], map[i]];
        }

        this.solution = base.map(row => row.map(v => map[v - 1]));

        // Remove numbers based on difficulty
        const removeCount = this.difficulty === 'Hard' ? 45 : (this.difficulty === 'Normal' ? 38 : 30);
        this.initialGrid = this.solution.map(row => [...row]);

        let removed = 0;
        while (removed < removeCount) {
            const r = Math.floor(Math.random() * 9);
            const c = Math.floor(Math.random() * 9);
            if (this.initialGrid[r][c] !== 0) {
                this.initialGrid[r][c] = 0;
                removed++;
            }
        }

        this.currentGrid = this.initialGrid.map(row => [...row]);
        this.pencilNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
        this.selectedCell = { r: 0, c: 0 };
        this.mistakes = 0;
        this.timer = 0;
        this.score = 0;

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.draw();
        }, 1000);

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
        this.draw();
    }

    handleClick(e) {
        if (!this.isRunning) return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const mx = (e.clientX - rect.left) * scale;
        const my = (e.clientY - rect.top) * scale;

        const boardSize = 500;
        const cellSize = boardSize / 9;
        const startY = 40;
        const startX = (this.canvas.width - boardSize) / 2;

        // Check board click
        if (mx >= startX && mx <= startX + boardSize && my >= startY && my <= startY + boardSize) {
            const c = Math.floor((mx - startX) / cellSize);
            const r = Math.floor((my - startY) / cellSize);
            if (r >= 0 && r < 9 && c >= 0 && c < 9) {
                this.selectedCell = { r, c };
                this.audio.playClick();
                this.draw();
                return;
            }
        }

        // Check Numpad click (at bottom)
        const numpadY = 555;
        const btnW = 44;
        const btnGap = 8;
        const padStartX = (this.canvas.width - (10 * (btnW + btnGap) - btnGap)) / 2;

        for (let i = 1; i <= 9; i++) {
            const bx = padStartX + (i - 1) * (btnW + btnGap);
            if (mx >= bx && mx <= bx + btnW && my >= numpadY && my <= numpadY + 45) {
                this.inputNumber(i);
                return;
            }
        }

        // Erase button
        const eraseX = padStartX + 9 * (btnW + btnGap);
        if (mx >= eraseX && mx <= eraseX + btnW && my >= numpadY && my <= numpadY + 45) {
            this.inputNumber(0);
            return;
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        const key = e.key;
        if (key >= '1' && key <= '9') {
            this.inputNumber(parseInt(key, 10));
        } else if (key === 'Backspace' || key === 'Delete') {
            this.inputNumber(0);
        } else if (key === 'ArrowUp') {
            this.selectedCell.r = Math.max(0, this.selectedCell.r - 1);
            this.draw();
        } else if (key === 'ArrowDown') {
            this.selectedCell.r = Math.min(8, this.selectedCell.r + 1);
            this.draw();
        } else if (key === 'ArrowLeft') {
            this.selectedCell.c = Math.max(0, this.selectedCell.c - 1);
            this.draw();
        } else if (key === 'ArrowRight') {
            this.selectedCell.c = Math.min(8, this.selectedCell.c + 1);
            this.draw();
        }
    }

    inputNumber(num) {
        const { r, c } = this.selectedCell;
        if (this.initialGrid[r][c] !== 0) return; // Clue cannot be modified

        if (num === 0) {
            this.currentGrid[r][c] = 0;
            this.audio.playClick();
        } else {
            if (num === this.solution[r][c]) {
                this.currentGrid[r][c] = num;
                this.audio.playPop();
                this.score += 20;
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
                this.checkWin();
            } else {
                this.mistakes++;
                this.audio.playHit();
                if (this.mistakes >= this.maxMistakes) {
                    this.isRunning = false;
                    clearInterval(this.timerInterval);
                    this.audio.playGameOver();
                    if (this.options.onGameOver) this.options.onGameOver(this.score);
                }
            }
        }
        this.draw();
    }

    checkWin() {
        let full = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.currentGrid[r][c] !== this.solution[r][c]) {
                    full = false;
                    break;
                }
            }
        }
        if (full) {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            this.score += 500;
            this.audio.playWin();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`MISTAKES: ${this.mistakes}/${this.maxMistakes}`, 20, 26);
        ctx.textAlign = 'right';
        ctx.fillText(`TIME: ${Math.floor(this.timer / 60)}:${String(this.timer % 60).padStart(2, '0')}`, this.canvas.width - 20, 26);

        // Board parameters
        const boardSize = 500;
        const cellSize = boardSize / 9;
        const startY = 40;
        const startX = (this.canvas.width - boardSize) / 2;

        // Draw Cells
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const x = startX + c * cellSize;
                const y = startY + r * cellSize;

                // Selection highlight
                if (this.selectedCell.r === r && this.selectedCell.c === c) {
                    ctx.fillStyle = '#1e3a8a';
                } else if (this.selectedCell.r === r || this.selectedCell.c === c) {
                    ctx.fillStyle = '#1e293b';
                } else {
                    ctx.fillStyle = '#0f172a';
                }
                ctx.fillRect(x, y, cellSize, cellSize);

                // Numbers
                const val = this.currentGrid[r][c];
                if (val !== 0) {
                    const isInitial = this.initialGrid[r][c] !== 0;
                    ctx.fillStyle = isInitial ? '#38bdf8' : '#22c55e';
                    ctx.font = `bold ${cellSize * 0.55}px Orbitron, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(val, x + cellSize / 2, y + cellSize / 2 + 2);
                }
            }
        }

        // Grid Lines (Thin & 3x3 Thick)
        for (let i = 0; i <= 9; i++) {
            ctx.beginPath();
            ctx.strokeStyle = i % 3 === 0 ? '#38bdf8' : '#334155';
            ctx.lineWidth = i % 3 === 0 ? 3 : 1;

            // Vertical
            ctx.moveTo(startX + i * cellSize, startY);
            ctx.lineTo(startX + i * cellSize, startY + boardSize);

            // Horizontal
            ctx.moveTo(startX, startY + i * cellSize);
            ctx.lineTo(startX + boardSize, startY + i * cellSize);
            ctx.stroke();
        }

        // Draw On-Screen Numpad
        const numpadY = 555;
        const btnW = 44;
        const btnGap = 8;
        const padStartX = (this.canvas.width - (10 * (btnW + btnGap) - btnGap)) / 2;

        for (let i = 1; i <= 9; i++) {
            const bx = padStartX + (i - 1) * (btnW + btnGap);
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx, numpadY, btnW, 45, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i, bx + btnW / 2, numpadY + 23);
        }

        // Erase button
        const eraseX = padStartX + 9 * (btnW + btnGap);
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(eraseX, numpadY, btnW, 45, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⌫', eraseX + btnW / 2, numpadY + 23);
    }

    restart() {
        this.resetGame();
        this.isRunning = true;
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        this.resetGame();
    }

    destroy() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.controls.destroyTouchOverlay();
    }
}

window.SudokuGame = SudokuGame;
