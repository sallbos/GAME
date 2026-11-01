/**
 * Game 10: Memory Cards
 * Visual card matching with 3D flip effects, move counter, stopwatch timer & score rating.
 */
class MemoryCardsGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.moves = 0;
        this.matchedPairs = 0;
        this.totalPairs = 8;
        this.cards = [];
        this.flippedIndices = [];
        this.isLocked = false;
        this.isRunning = false;

        this.startTime = 0;
        this.timer = 0;
        this.particles = [];

        this.handleClick = this.handleClick.bind(this);
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
        this.canvas.addEventListener('pointerdown', this.handleClick);
        this.startTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 560;
        this.canvas.height = 560;
    }

    resetGame() {
        this.moves = 0;
        this.matchedPairs = 0;
        this.score = 0;
        this.flippedIndices = [];
        this.isLocked = false;
        this.particles = [];
        this.timer = 0;
        this.startTime = performance.now();

        const icons = ['🎮', '🕹️', '👾', '🚀', '💎', '👑', '⚡', '🛡️'];
        const deck = [...icons, ...icons];
        // Shuffle deck (Fisher-Yates)
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const cols = 4;
        const rows = 4;
        const cardW = 110;
        const cardH = 110;
        const gap = 16;
        const offsetX = (this.canvas.width - (cols * cardW + (cols - 1) * gap)) / 2;
        const offsetY = (this.canvas.height - (rows * cardH + (rows - 1) * gap)) / 2 + 20;

        this.cards = deck.map((icon, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            return {
                id: idx,
                icon,
                x: offsetX + col * (cardW + gap),
                y: offsetY + row * (cardH + gap),
                w: cardW,
                h: cardH,
                isFlipped: false,
                isMatched: false,
                flipProgress: 0 // 0 = face down, 1 = face up
            };
        });

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleClick(e) {
        if (!this.isRunning || this.isLocked) return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const mx = (e.clientX - rect.left) * scale;
        const my = (e.clientY - rect.top) * scale;

        for (let i = 0; i < this.cards.length; i++) {
            const c = this.cards[i];
            if (!c.isFlipped && !c.isMatched && mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
                this.flipCard(i);
                break;
            }
        }
    }

    flipCard(idx) {
        const card = this.cards[idx];
        card.isFlipped = true;
        this.flippedIndices.push(idx);
        this.audio.playClick();

        if (this.flippedIndices.length === 2) {
            this.moves++;
            this.isLocked = true;
            const [firstIdx, secondIdx] = this.flippedIndices;
            const first = this.cards[firstIdx];
            const second = this.cards[secondIdx];

            if (first.icon === second.icon) {
                // Match!
                setTimeout(() => {
                    first.isMatched = true;
                    second.isMatched = true;
                    this.matchedPairs++;
                    this.score += Math.max(20, 150 - this.moves * 5);
                    this.audio.playScore();
                    this.createMatchStars(first.x + first.w / 2, first.y + first.h / 2);
                    this.createMatchStars(second.x + second.w / 2, second.y + second.h / 2);
                    this.flippedIndices = [];
                    this.isLocked = false;
                    if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

                    if (this.matchedPairs === this.totalPairs) {
                        this.handleVictory();
                    }
                }, 400);
            } else {
                // No match
                setTimeout(() => {
                    first.isFlipped = false;
                    second.isFlipped = false;
                    this.flippedIndices = [];
                    this.isLocked = false;
                }, 900);
            }
        }
    }

    createMatchStars(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color: '#38bdf8'
            });
        }
    }

    handleVictory() {
        this.isRunning = false;
        this.audio.playWin();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    update() {
        if (this.isRunning) {
            this.timer = Math.floor((performance.now() - this.startTime) / 1000);
        }

        // Animate flip progress
        this.cards.forEach(c => {
            const target = (c.isFlipped || c.isMatched) ? 1 : 0;
            c.flipProgress += (target - c.flipProgress) * 0.25;
        });

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header info
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`MOVES: ${this.moves}`, 24, 30);
        ctx.textAlign = 'center';
        ctx.fillText(`PAIRS: ${this.matchedPairs}/${this.totalPairs}`, this.canvas.width / 2, 30);
        ctx.textAlign = 'right';
        ctx.fillText(`TIME: ${this.timer}s`, this.canvas.width - 24, 30);

        // Draw Cards
        this.cards.forEach(c => {
            ctx.save();
            ctx.translate(c.x + c.w / 2, c.y + c.h / 2);

            // Scale X for 3D flip illusion
            const scaleX = Math.abs(Math.cos(c.flipProgress * Math.PI));
            ctx.scale(scaleX, 1);

            const isFront = c.flipProgress > 0.5;

            if (isFront) {
                // Card Face Up
                ctx.fillStyle = c.isMatched ? '#1e293b' : '#334155';
                ctx.strokeStyle = c.isMatched ? '#22c55e' : '#38bdf8';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
                ctx.fill();
                ctx.stroke();

                // Emoji
                ctx.font = '42px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.icon, 0, 4);
            } else {
                // Card Back
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
                ctx.fill();
                ctx.stroke();

                // Cyber Pattern on Back
                ctx.fillStyle = '#38bdf8';
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('❖', 0, 0);
            }

            ctx.restore();
        });

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;
    }

    loop(timestamp) {
        if (!this.isRunning && this.matchedPairs < this.totalPairs) return;
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
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.MemoryCardsGame = MemoryCardsGame;
