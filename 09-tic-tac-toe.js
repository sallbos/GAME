/**
 * Game 09: Tic Tac Toe
 * Neon glowing Tic Tac Toe with Minimax AI (unbeatable on Hard), 2-Player mode & win strike animations.
 */
class TicTacToeGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.draws = 0;
        this.difficulty = options.difficulty || 'Hard';
        this.vsAI = true;

        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.winningLine = null;
        this.isRunning = false;

        this.handleClick = this.handleClick.bind(this);
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
        this.draw();
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 480;
    }

    resetGame() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.winningLine = null;
        this.isRunning = true;
        this.draw();
    }

    handleClick(e) {
        if (!this.isRunning || this.winningLine) return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const y = (e.clientY - rect.top) * scale;

        const cellSize = this.canvas.width / 3;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        const idx = row * 3 + col;

        if (idx >= 0 && idx < 9 && !this.board[idx]) {
            this.makeMove(idx, this.currentPlayer);

            if (this.vsAI && this.isRunning && this.currentPlayer === 'O') {
                setTimeout(() => this.aiMove(), 250);
            }
        }
    }

    makeMove(idx, player) {
        this.board[idx] = player;
        this.audio.playClick();
        this.draw();

        const win = this.checkWin(this.board);
        if (win) {
            this.winningLine = win;
            this.isRunning = false;
            if (win.winner === 'X') {
                this.p1Wins++;
                this.score += 100;
                this.audio.playWin();
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            } else {
                this.p2Wins++;
                this.audio.playGameOver();
            }
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            this.draw();
            return;
        }

        if (this.board.every(cell => cell !== null)) {
            this.draws++;
            this.isRunning = false;
            this.audio.playHit();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            this.draw();
            return;
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    aiMove() {
        if (!this.isRunning) return;
        let move;
        if (this.difficulty === 'Easy' && Math.random() < 0.55) {
            const emptyIndices = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
            move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else {
            move = this.getBestMove();
        }
        if (move !== undefined) {
            this.makeMove(move, 'O');
        }
    }

    getBestMove() {
        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < 9; i++) {
            if (!this.board[i]) {
                this.board[i] = 'O';
                const score = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }
        return bestMove;
    }

    minimax(board, depth, isMaximizing) {
        const win = this.checkWin(board);
        if (win) {
            return win.winner === 'O' ? 10 - depth : depth - 10;
        }
        if (board.every(cell => cell !== null)) return 0;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = 'O';
                    const score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    maxScore = Math.max(score, maxScore);
                }
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = 'X';
                    const score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    minScore = Math.min(score, minScore);
                }
            }
            return minScore;
        }
    }

    checkWin(board) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const line of lines) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line };
            }
        }
        return null;
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cellSize = this.canvas.width / 3;

        // Draw Grid Lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        // Vertical lines
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 20);
            ctx.lineTo(i * cellSize, this.canvas.height - 20);
            ctx.stroke();
        }
        // Horizontal lines
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(20, i * cellSize);
            ctx.lineTo(this.canvas.width - 20, i * cellSize);
            ctx.stroke();
        }

        // Draw Marks
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const cx = col * cellSize + cellSize / 2;
            const cy = row * cellSize + cellSize / 2;
            const pad = 36;

            if (this.board[i] === 'X') {
                ctx.strokeStyle = '#38bdf8';
                ctx.shadowColor = '#0ea5e9';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(cx - pad, cy - pad);
                ctx.lineTo(cx + pad, cy + pad);
                ctx.moveTo(cx + pad, cy - pad);
                ctx.lineTo(cx - pad, cy + pad);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (this.board[i] === 'O') {
                ctx.strokeStyle = '#ec4899';
                ctx.shadowColor = '#f43f5e';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(cx, cy, pad, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Draw Winning Strike Line
        if (this.winningLine) {
            const [a, , c] = this.winningLine.line;
            const r1 = Math.floor(a / 3), c1 = a % 3;
            const r2 = Math.floor(c / 3), c2 = c % 3;

            const x1 = c1 * cellSize + cellSize / 2;
            const y1 = r1 * cellSize + cellSize / 2;
            const x2 = c2 * cellSize + cellSize / 2;
            const y2 = r2 * cellSize + cellSize / 2;

            ctx.strokeStyle = '#22c55e';
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    restart() {
        this.resetGame();
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    destroy() {
        this.isRunning = false;
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.TicTacToeGame = TicTacToeGame;
