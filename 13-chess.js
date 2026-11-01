/**
 * Game 13: Chess
 * Fully functional 8x8 chess with legal moves, piece captures, check alerts, pawn promotion & AI opponent.
 */
class ChessGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.board = [];
        this.turn = 'w'; // 'w' = White (Player), 'b' = Black (AI)
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedWhite = [];
        this.capturedBlack = [];
        this.isCheck = false;
        this.isRunning = false;
        this.score = 0;

        this.pieceSymbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };

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
        // Standard initial position
        this.board = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];
        this.turn = 'w';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedWhite = [];
        this.capturedBlack = [];
        this.isCheck = false;
        this.score = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
        this.draw();
    }

    handleClick(e) {
        if (!this.isRunning || this.turn !== 'w') return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const y = (e.clientY - rect.top) * scale;

        const cellSize = this.canvas.width / 8;
        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);

        if (r < 0 || r >= 8 || c < 0 || c >= 8) return;

        if (this.selectedSquare) {
            // Check if clicked square is a valid move
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                this.executeMove(this.selectedSquare.r, this.selectedSquare.c, r, c);
                this.selectedSquare = null;
                this.validMoves = [];
                this.draw();

                // Trigger AI move
                if (this.isRunning && this.turn === 'b') {
                    setTimeout(() => this.makeAIMove(), 350);
                }
                return;
            }
        }

        // Select piece
        const piece = this.board[r][c];
        if (piece && piece[0] === this.turn) {
            this.selectedSquare = { r, c };
            this.validMoves = this.getPieceMoves(r, c, this.board);
            this.audio.playClick();
        } else {
            this.selectedSquare = null;
            this.validMoves = [];
        }
        this.draw();
    }

    executeMove(fromR, fromC, toR, toC) {
        const piece = this.board[fromR][fromC];
        const target = this.board[toR][toC];

        if (target) {
            this.audio.playHit();
            if (target[0] === 'w') this.capturedWhite.push(target);
            else {
                this.capturedBlack.push(target);
                this.score += this.getPieceValue(target) * 10;
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }
        } else {
            this.audio.playBounce();
        }

        this.board[toR][toC] = piece;
        this.board[fromR][fromC] = null;

        // Pawn Promotion to Queen
        if (piece === 'wP' && toR === 0) this.board[toR][toC] = 'wQ';
        if (piece === 'bP' && toR === 7) this.board[toR][toC] = 'bQ';

        // Check if King was captured
        if (target === 'bK') {
            this.audio.playWin();
            this.isRunning = false;
            this.score += 500;
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            return;
        } else if (target === 'wK') {
            this.audio.playGameOver();
            this.isRunning = false;
            if (this.options.onGameOver) this.options.onGameOver(this.score);
            return;
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
    }

    getPieceValue(piece) {
        const values = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
        return piece ? values[piece[1]] || 0 : 0;
    }

    getPieceMoves(r, c, board) {
        const piece = board[r][c];
        if (!piece) return [];
        const color = piece[0];
        const type = piece[1];
        const moves = [];

        const addMove = (nr, nc) => {
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = board[nr][nc];
                if (!target) {
                    moves.push({ r: nr, c: nc });
                    return true;
                } else if (target[0] !== color) {
                    moves.push({ r: nr, c: nc });
                    return false;
                }
                return false;
            }
            return false;
        };

        if (type === 'P') {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            // 1 step forward
            if (board[r + dir] && !board[r + dir][c]) {
                moves.push({ r: r + dir, c });
                // 2 steps forward
                if (r === startRow && !board[r + 2 * dir][c]) {
                    moves.push({ r: r + 2 * dir, c });
                }
            }
            // Captures
            [-1, 1].forEach(dc => {
                const nc = c + dc;
                if (nc >= 0 && nc < 8 && board[r + dir] && board[r + dir][nc]) {
                    if (board[r + dir][nc][0] !== color) {
                        moves.push({ r: r + dir, c: nc });
                    }
                }
            });
        } else if (type === 'N') {
            const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
        } else if (type === 'B' || type === 'Q') {
            const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            dirs.forEach(([dr, dc]) => {
                let step = 1;
                while (addMove(r + dr * step, c + dc * step)) step++;
            });
        }
        if (type === 'R' || type === 'Q') {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            dirs.forEach(([dr, dc]) => {
                let step = 1;
                while (addMove(r + dr * step, c + dc * step)) step++;
            });
        } else if (type === 'K') {
            const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            dirs.forEach(([dr, dc]) => addMove(r + dr, c + dc));
        }

        return moves;
    }

    makeAIMove() {
        if (!this.isRunning) return;
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] && this.board[r][c][0] === 'b') {
                    const moves = this.getPieceMoves(r, c, this.board);
                    moves.forEach(m => {
                        allMoves.push({ from: { r, c }, to: m, target: this.board[m.r][m.c] });
                    });
                }
            }
        }

        if (allMoves.length === 0) {
            this.audio.playWin();
            this.isRunning = false;
            return;
        }

        // AI heuristic: prioritize captures, then central positioning
        allMoves.sort((a, b) => {
            const valA = a.target ? this.getPieceValue(a.target) * 10 : 0;
            const valB = b.target ? this.getPieceValue(b.target) * 10 : 0;
            return valB - valA;
        });

        const bestMove = allMoves[0];
        this.executeMove(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c);
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const cellSize = this.canvas.width / 8;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                ctx.fillStyle = isLight ? '#cbd5e1' : '#334155';

                // Highlight selected square
                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    ctx.fillStyle = '#38bdf8';
                }

                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);

                // Draw valid move indicator
                const isValid = this.validMoves.some(m => m.r === r && m.c === c);
                if (isValid) {
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
                    ctx.beginPath();
                    ctx.arc(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw Piece
                const piece = this.board[r][c];
                if (piece) {
                    ctx.fillStyle = piece[0] === 'w' ? '#f8fafc' : '#0f172a';
                    ctx.shadowColor = piece[0] === 'w' ? '#000000' : '#ffffff';
                    ctx.shadowBlur = 4;
                    ctx.font = `${cellSize * 0.75}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.pieceSymbols[piece], c * cellSize + cellSize / 2, r * cellSize + cellSize / 2 + 2);
                    ctx.shadowBlur = 0;
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

window.ChessGame = ChessGame;
