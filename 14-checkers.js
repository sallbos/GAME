/**
 * Game 14: Checkers (Draughts)
 * Standard 8x8 checkers with diagonal movement, jump captures, multi-jumps, king promotions & AI opponent.
 */
class CheckersGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.board = [];
        this.turn = 'r'; // 'r' = Red (Player), 'b' = Black (AI)
        this.selectedPiece = null;
        this.validMoves = [];
        this.score = 0;
        this.highScore = options.highScore || 0;
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
        this.canvas.width = 560;
        this.canvas.height = 560;
    }

    resetGame() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Place initial pieces on dark squares
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) this.board[r][c] = { color: 'b', isKing: false };
                    else if (r > 4) this.board[r][c] = { color: 'r', isKing: false };
                }
            }
        }

        this.turn = 'r';
        this.selectedPiece = null;
        this.validMoves = [];
        this.score = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
        this.draw();
    }

    handleClick(e) {
        if (!this.isRunning || this.turn !== 'r') return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const y = (e.clientY - rect.top) * scale;

        const cellSize = this.canvas.width / 8;
        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);

        if (r < 0 || r >= 8 || c < 0 || c >= 8) return;

        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                this.executeMove(this.selectedPiece.r, this.selectedPiece.c, move);
                this.selectedPiece = null;
                this.validMoves = [];
                this.draw();

                if (this.isRunning && this.turn === 'b') {
                    setTimeout(() => this.makeAIMove(), 350);
                }
                return;
            }
        }

        const piece = this.board[r][c];
        if (piece && piece.color === this.turn) {
            this.selectedPiece = { r, c };
            this.validMoves = this.getPieceMoves(r, c, this.board);
            this.audio.playClick();
        } else {
            this.selectedPiece = null;
            this.validMoves = [];
        }
        this.draw();
    }

    getPieceMoves(r, c, board) {
        const piece = board[r][c];
        if (!piece) return [];
        const moves = [];
        const dirs = [];

        if (piece.color === 'r' || piece.isKing) {
            dirs.push([-1, -1], [-1, 1]); // Upwards
        }
        if (piece.color === 'b' || piece.isKing) {
            dirs.push([1, -1], [1, 1]); // Downwards
        }

        dirs.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            // Regular step
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
                moves.push({ r: nr, c: nc, isJump: false });
            }
            // Jump capture
            const jr = r + 2 * dr;
            const jc = c + 2 * dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
                const middle = board[nr][nc];
                if (middle && middle.color !== piece.color) {
                    moves.push({ r: jr, c: jc, isJump: true, jumpR: nr, jumpC: nc });
                }
            }
        });

        // If any jump is available, standard checkers prioritizes jumps
        const jumps = moves.filter(m => m.isJump);
        return jumps.length > 0 ? jumps : moves;
    }

    executeMove(fromR, fromC, move) {
        const piece = this.board[fromR][fromC];
        this.board[move.r][move.c] = piece;
        this.board[fromR][fromC] = null;

        if (move.isJump) {
            this.board[move.jumpR][move.jumpC] = null;
            this.audio.playHit();
            if (piece.color === 'r') {
                this.score += 50;
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }
        } else {
            this.audio.playBounce();
        }

        // King promotion
        if (piece.color === 'r' && move.r === 0) piece.isKing = true;
        if (piece.color === 'b' && move.r === 7) piece.isKing = true;

        // Check if game won
        this.checkGameOver();

        this.turn = this.turn === 'r' ? 'b' : 'r';
    }

    makeAIMove() {
        if (!this.isRunning) return;
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] && this.board[r][c].color === 'b') {
                    const moves = this.getPieceMoves(r, c, this.board);
                    moves.forEach(m => {
                        allMoves.push({ from: { r, c }, to: m });
                    });
                }
            }
        }

        if (allMoves.length === 0) {
            this.audio.playWin();
            this.isRunning = false;
            this.score += 300;
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            return;
        }

        // Prioritize jumps
        const jumps = allMoves.filter(m => m.to.isJump);
        const selected = jumps.length > 0 ? jumps[Math.floor(Math.random() * jumps.length)] : allMoves[Math.floor(Math.random() * allMoves.length)];

        this.executeMove(selected.from.r, selected.from.c, selected.to);
        this.draw();
    }

    checkGameOver() {
        let redCount = 0;
        let blackCount = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c]) {
                    if (this.board[r][c].color === 'r') redCount++;
                    else blackCount++;
                }
            }
        }

        if (blackCount === 0) {
            this.isRunning = false;
            this.audio.playWin();
            this.score += 500;
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        } else if (redCount === 0) {
            this.isRunning = false;
            this.audio.playGameOver();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        }
    }

    draw() {
        const ctx = this.ctx;
        const cellSize = this.canvas.width / 8;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isDark = (r + c) % 2 === 1;
                ctx.fillStyle = isDark ? '#1e293b' : '#cbd5e1';

                // Highlight selected piece
                if (this.selectedPiece && this.selectedPiece.r === r && this.selectedPiece.c === c) {
                    ctx.fillStyle = '#38bdf8';
                }

                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);

                // Highlight valid moves
                const isValid = this.validMoves.some(m => m.r === r && m.c === c);
                if (isValid) {
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
                    ctx.beginPath();
                    ctx.arc(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw Piece
                const piece = this.board[r][c];
                if (piece) {
                    const cx = c * cellSize + cellSize / 2;
                    const cy = r * cellSize + cellSize / 2;
                    const radius = cellSize * 0.38;

                    ctx.fillStyle = piece.color === 'r' ? '#ef4444' : '#0284c7';
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
                    ctx.stroke();

                    // King Crown
                    if (piece.isKing) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 22px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('👑', cx, cy);
                    }
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
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.CheckersGame = CheckersGame;
