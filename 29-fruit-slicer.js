/**
 * Game 29: Fruit Slicer (Blade Master)
 * Fruit slicing physics with sword blade trail, severed fruit halves, juice bursts & combo multipliers.
 */
class FruitSlicerGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.strikes = 0;
        this.maxStrikes = 3;
        this.highScore = options.highScore || 0;
        this.isRunning = false;

        this.fruits = [];
        this.halves = [];
        this.bladeTrail = [];
        this.particles = [];
        this.isPointerDown = false;
        this.spawnTimer = 0;

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
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

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    resetGame() {
        this.score = 0;
        this.strikes = 0;
        this.fruits = [];
        this.halves = [];
        this.bladeTrail = [];
        this.particles = [];
        this.spawnTimer = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handlePointerDown(e) {
        if (!this.isRunning) return;
        this.isPointerDown = true;
        this.bladeTrail = [];
        this.addTrailPoint(e);
    }

    handlePointerMove(e) {
        if (!this.isRunning || !this.isPointerDown) return;
        this.addTrailPoint(e);
        this.checkSlice();
    }

    handlePointerUp() {
        this.isPointerDown = false;
        this.bladeTrail = [];
    }

    addTrailPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.bladeTrail.push({
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            life: 1
        });
        if (this.bladeTrail.length > 8) this.bladeTrail.shift();
    }

    checkSlice() {
        if (this.bladeTrail.length < 2) return;
        const p1 = this.bladeTrail[this.bladeTrail.length - 2];
        const p2 = this.bladeTrail[this.bladeTrail.length - 1];

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            const dist = this.distToSegment(f.x, f.y, p1.x, p1.y, p2.x, p2.y);

            if (dist < f.radius + 6) {
                if (f.isBomb) {
                    this.audio.playExplosion();
                    this.strikes = 3;
                    this.createJuiceSplatter(f.x, f.y, '#ef4444');
                    this.gameOver();
                    return;
                } else {
                    this.sliceFruit(f, i);
                }
            }
        }
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    sliceFruit(f, idx) {
        this.audio.playSlice();
        this.score += 15;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Spawn two falling halves
        this.halves.push({
            x: f.x - 8, y: f.y,
            vx: -3.5, vy: f.vy * 0.6,
            angle: f.angle, vAngle: -0.12,
            emoji: f.emoji, color: f.color
        });
        this.halves.push({
            x: f.x + 8, y: f.y,
            vx: 3.5, vy: f.vy * 0.6,
            angle: f.angle, vAngle: 0.12,
            emoji: f.emoji, color: f.color
        });

        this.createJuiceSplatter(f.x, f.y, f.color);
        this.fruits.splice(idx, 1);
    }

    createJuiceSplatter(x, y, color) {
        for (let i = 0; i < 18; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color
            });
        }
    }

    spawnFruit() {
        const types = [
            { emoji: '🍉', color: '#ef4444', radius: 24 },
            { emoji: '🍊', color: '#f97316', radius: 20 },
            { emoji: '🍎', color: '#dc2626', radius: 20 },
            { emoji: '🍌', color: '#eab308', radius: 22 },
            { emoji: '🍍', color: '#ca8a04', radius: 26 }
        ];

        const isBomb = Math.random() < 0.2;
        const config = isBomb ? { emoji: '💣', color: '#475569', radius: 22 } : types[Math.floor(Math.random() * types.length)];

        this.fruits.push({
            x: Math.random() * 400 + 120,
            y: this.canvas.height + 30,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4 - 11.5,
            angle: 0,
            vAngle: (Math.random() - 0.5) * 0.08,
            gravity: 0.38,
            isBomb,
            ...config
        });
    }

    update() {
        // Spawn Fruits
        this.spawnTimer++;
        if (this.spawnTimer > 45) {
            this.spawnFruit();
            if (Math.random() < 0.4) this.spawnFruit();
            this.spawnTimer = 0;
        }

        // Update Fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.vy += f.gravity;
            f.x += f.vx;
            f.y += f.vy;
            f.angle += f.vAngle;

            // Missed fruit fell off screen
            if (f.y > this.canvas.height + 60 && f.vy > 0) {
                if (!f.isBomb) {
                    this.strikes++;
                    this.audio.playHit();
                    if (this.strikes >= this.maxStrikes) {
                        this.gameOver();
                        return;
                    }
                }
                this.fruits.splice(i, 1);
            }
        }

        // Update Halves
        for (let i = this.halves.length - 1; i >= 0; i--) {
            const h = this.halves[i];
            h.vy += 0.4;
            h.x += h.vx;
            h.y += h.vy;
            h.angle += h.vAngle;
            if (h.y > this.canvas.height + 60) this.halves.splice(i, 1);
        }

        // Update Trail fade
        for (let i = this.bladeTrail.length - 1; i >= 0; i--) {
            this.bladeTrail[i].life -= 0.1;
            if (this.bladeTrail[i].life <= 0) this.bladeTrail.splice(i, 1);
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

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;

        // Dojo Wood Texture
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Splatters / Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw Fruits
        this.fruits.forEach(f => {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);
            ctx.font = `${f.radius * 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.emoji, 0, 0);
            ctx.restore();
        });

        // Draw Halves
        this.halves.forEach(h => {
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.angle);
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(h.emoji, 0, 0);
            ctx.restore();
        });

        // Draw Glowing Blade Trail
        if (this.bladeTrail.length >= 2) {
            ctx.strokeStyle = '#38bdf8';
            ctx.shadowColor = '#0ea5e9';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            this.bladeTrail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 24, 34);
        ctx.textAlign = 'right';
        ctx.fillText(`STRIKES: ${'❌ '.repeat(this.strikes)}${'⚪ '.repeat(Math.max(0, this.maxStrikes - this.strikes))}`, this.canvas.width - 24, 34);
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
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        this.controls.destroyTouchOverlay();
    }
}

window.FruitSlicerGame = FruitSlicerGame;
