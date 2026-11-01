/**
 * Game 28: Whack-a-Mole
 * Fast-paced arcade reaction test with golden moles, bomb moles, hammer smashes & frenzy streaks.
 */
class WhackAMoleGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.timeLeft = 30;
        this.timerInterval = null;
        this.isRunning = false;

        this.holes = [];
        this.particles = [];
        this.hammer = { x: -100, y: -100, isSwinging: false, swingAngle: 0 };

        this.handleClick = this.handleClick.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
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
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 540;
        this.canvas.height = 540;

        // Initialize 3x3 holes
        this.holes = [];
        const startX = 60;
        const startY = 80;
        const gap = 145;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                this.holes.push({
                    x: startX + c * gap + 45,
                    y: startY + r * gap + 45,
                    r: 45,
                    moleUp: false,
                    moleType: 'normal',
                    timer: 0,
                    hit: false
                });
            }
        }
    }

    resetGame() {
        this.score = 0;
        this.timeLeft = 30;
        this.particles = [];
        this.holes.forEach(h => {
            h.moleUp = false;
            h.timer = 0;
            h.hit = false;
        });

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isRunning) {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.gameOver();
                }
            }
        }, 1000);

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handlePointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.hammer.x = (e.clientX - rect.left) * scaleX;
        this.hammer.y = (e.clientY - rect.top) * scaleY;
    }

    handleClick(e) {
        if (!this.isRunning) return;
        this.handlePointerMove(e);
        this.hammer.isSwinging = true;
        this.hammer.swingAngle = -Math.PI / 4;

        const hx = this.hammer.x;
        const hy = this.hammer.y;

        // Check which mole was hit
        for (const h of this.holes) {
            if (h.moleUp && !h.hit && Math.hypot(hx - h.x, hy - (h.y - 15)) < h.r + 10) {
                h.hit = true;

                if (h.moleType === 'bomb') {
                    this.score = Math.max(0, this.score - 150);
                    this.audio.playExplosion();
                    this.createHitStars(h.x, h.y, '#ef4444');
                } else if (h.moleType === 'golden') {
                    this.score += 300;
                    this.audio.playPowerup();
                    this.createHitStars(h.x, h.y, '#ffd700');
                } else {
                    this.score += 100;
                    this.audio.playHit();
                    this.createHitStars(h.x, h.y, '#38bdf8');
                }

                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
                setTimeout(() => { h.moleUp = false; }, 200);
                break;
            }
        }
    }

    createHitStars(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color
            });
        }
    }

    update() {
        // Hammer swing recovery
        if (this.hammer.isSwinging) {
            this.hammer.swingAngle += 0.12;
            if (this.hammer.swingAngle >= 0) {
                this.hammer.swingAngle = 0;
                this.hammer.isSwinging = false;
            }
        }

        // Randomly pop up moles
        if (Math.random() < 0.05) {
            const available = this.holes.filter(h => !h.moleUp);
            if (available.length > 0) {
                const h = available[Math.floor(Math.random() * available.length)];
                h.moleUp = true;
                h.hit = false;
                h.timer = 55 + Math.random() * 35;

                const r = Math.random();
                if (r < 0.15) h.moleType = 'golden';
                else if (r < 0.3) h.moleType = 'bomb';
                else h.moleType = 'normal';

                this.audio.playPop();
            }
        }

        // Countdown mole timers
        this.holes.forEach(h => {
            if (h.moleUp) {
                h.timer--;
                if (h.timer <= 0) {
                    h.moleUp = false;
                }
            }
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

    gameOver() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.audio.playWin();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;

        // Grassy Ground
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 24, 34);
        ctx.textAlign = 'right';
        ctx.fillText(`TIME: ${this.timeLeft}s`, this.canvas.width - 24, 34);

        // Draw Holes and Moles
        this.holes.forEach(h => {
            // Hole Rim
            ctx.fillStyle = '#022c22';
            ctx.beginPath();
            ctx.ellipse(h.x, h.y, h.r, h.r * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Mole if up
            if (h.moleUp) {
                ctx.save();
                ctx.translate(h.x, h.y);

                if (h.moleType === 'bomb') {
                    // Bomb
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, -22, 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 18px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('💣', 0, -16);
                } else {
                    // Mole Body
                    ctx.fillStyle = h.moleType === 'golden' ? '#eab308' : '#78350f';
                    ctx.beginPath();
                    ctx.arc(0, -20, 24, 0, Math.PI * 2);
                    ctx.fill();

                    // Snout
                    ctx.fillStyle = '#fbcfe8';
                    ctx.beginPath();
                    ctx.ellipse(0, -14, 10, 7, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(-7, -26, 3, 0, Math.PI * 2);
                    ctx.arc(7, -26, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        });

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // Draw Hammer
        if (this.hammer.x > 0) {
            ctx.save();
            ctx.translate(this.hammer.x, this.hammer.y);
            ctx.rotate(this.hammer.swingAngle);

            // Handle
            ctx.fillStyle = '#d97706';
            ctx.fillRect(-4, -10, 8, 48);

            // Mallet Head
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(-24, -26, 48, 22, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
        }
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
        clearInterval(this.timerInterval);
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.controls.destroyTouchOverlay();
    }
}

window.WhackAMoleGame = WhackAMoleGame;
