/**
 * Game 21: Pool Billiards (8-Ball Arcade)
 * Top-down pocket billiards with realistic ball-to-ball collisions, cushion rebounds, cue stick aiming & pockets.
 */
class PoolBilliardsGame {
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

        this.table = {
            x: 40,
            y: 40,
            w: 560,
            h: 320,
            cushion: 20
        };

        this.balls = [];
        this.pockets = [];
        this.cueBall = null;

        this.cue = {
            aimAngle: 0,
            power: 0,
            isCharging: false,
            maxPower: 22
        };

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
        this.canvas.height = 400;

        // Initialize 6 pockets
        const tx = this.table.x + this.table.cushion;
        const ty = this.table.y + this.table.cushion;
        const tw = this.table.w - this.table.cushion * 2;
        const th = this.table.h - this.table.cushion * 2;
        const r = 18;

        this.pockets = [
            { x: tx, y: ty, r },
            { x: tx + tw / 2, y: ty - 4, r },
            { x: tx + tw, y: ty, r },
            { x: tx, y: ty + th, r },
            { x: tx + tw / 2, y: ty + th + 4, r },
            { x: tx + tw, y: ty + th, r }
        ];
    }

    resetGame() {
        this.score = 0;
        this.balls = [];

        // Cue Ball
        this.cueBall = {
            id: 0,
            x: 180,
            y: 200,
            vx: 0,
            vy: 0,
            r: 9,
            color: '#f8fafc',
            isCue: true
        };
        this.balls.push(this.cueBall);

        // Rack of 10 Object Balls
        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#0f172a', '#ec4899', '#f97316', '#06b6d4', '#eab308'];
        const startX = 420;
        const startY = 200;
        let ballIdx = 1;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col <= row; col++) {
                if (ballIdx > 10) break;
                this.balls.push({
                    id: ballIdx,
                    x: startX + row * 17,
                    y: startY - (row * 10) + col * 20,
                    vx: 0,
                    vy: 0,
                    r: 9,
                    color: colors[(ballIdx - 1) % colors.length],
                    isCue: false
                });
                ballIdx++;
            }
        }

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    areBallsMoving() {
        return this.balls.some(b => Math.hypot(b.vx, b.vy) > 0.05);
    }

    handlePointerDown(e) {
        if (!this.isRunning || this.areBallsMoving()) return;
        this.cue.isCharging = true;
        this.cue.power = 0;
        this.updateAim(e);
    }

    handlePointerMove(e) {
        if (!this.isRunning || this.areBallsMoving()) return;
        this.updateAim(e);
        if (this.cue.isCharging) {
            this.cue.power = Math.min(this.cue.maxPower, this.cue.power + 0.6);
        }
    }

    updateAim(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        this.cue.aimAngle = Math.atan2(my - this.cueBall.y, mx - this.cueBall.x);
    }

    handlePointerUp() {
        if (!this.cue.isCharging) return;
        this.cue.isCharging = false;

        const power = Math.max(5, this.cue.power);
        this.cueBall.vx = Math.cos(this.cue.aimAngle) * power;
        this.cueBall.vy = Math.sin(this.cue.aimAngle) * power;
        this.cue.power = 0;
        this.audio.playHit();
    }

    update() {
        const cushion = this.table.cushion;
        const minX = this.table.x + cushion + 9;
        const maxX = this.table.x + this.table.w - cushion - 9;
        const minY = this.table.y + cushion + 9;
        const maxY = this.table.y + this.table.h - cushion - 9;

        // Move balls and resolve cushion collisions
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            b.x += b.vx;
            b.y += b.vy;
            b.vx *= 0.985;
            b.vy *= 0.985;

            // Stop threshold
            if (Math.hypot(b.vx, b.vy) < 0.04) {
                b.vx = 0;
                b.vy = 0;
            }

            // Cushion rebounds
            if (b.x <= minX) { b.x = minX; b.vx = -b.vx * 0.75; this.audio.playBounce(); }
            if (b.x >= maxX) { b.x = maxX; b.vx = -b.vx * 0.75; this.audio.playBounce(); }
            if (b.y <= minY) { b.y = minY; b.vy = -b.vy * 0.75; this.audio.playBounce(); }
            if (b.y >= maxY) { b.y = maxY; b.vy = -b.vy * 0.75; this.audio.playBounce(); }

            // Pocket Detection
            for (const p of this.pockets) {
                if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
                    this.audio.playScore();
                    if (b.isCue) {
                        // Scratch! Reset cue ball
                        setTimeout(() => {
                            b.x = 180;
                            b.y = 200;
                            b.vx = 0;
                            b.vy = 0;
                        }, 500);
                    } else {
                        this.score += 100;
                        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
                        this.balls.splice(i, 1);
                        if (this.balls.length === 1) {
                            // All object balls cleared!
                            this.handleWin();
                        }
                    }
                    break;
                }
            }
        }

        // Ball-to-ball collisions (Elastic collision)
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                const b1 = this.balls[i];
                const b2 = this.balls[j];
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);

                if (dist < b1.r + b2.r && dist > 0) {
                    this.audio.playClick();
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const kx = b1.vx - b2.vx;
                    const ky = b1.vy - b2.vy;
                    const p = 2 * (nx * kx + ny * ky) / 2;

                    b1.vx -= p * nx;
                    b1.vy -= p * ny;
                    b2.vx += p * nx;
                    b2.vy += p * ny;

                    // Separate balls
                    const overlap = (b1.r + b2.r - dist) / 2;
                    b1.x -= nx * overlap;
                    b1.y -= ny * overlap;
                    b2.x += nx * overlap;
                    b2.y += ny * overlap;
                }
            }
        }
    }

    handleWin() {
        this.isRunning = false;
        this.audio.playWin();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Pool Table Wooden Rim
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.roundRect(this.table.x, this.table.y, this.table.w, this.table.h, 16);
        ctx.fill();

        // Green Baize Felt
        const cushion = this.table.cushion;
        ctx.fillStyle = '#15803d';
        ctx.fillRect(this.table.x + cushion, this.table.y + cushion, this.table.w - cushion * 2, this.table.h - cushion * 2);

        // Pockets
        ctx.fillStyle = '#0f172a';
        this.pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Balls
        this.balls.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Highlight glint
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(b.x - 3, b.y - 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Cue Stick & Aim Line
        if (!this.areBallsMoving() && this.cueBall) {
            const angle = this.cue.aimAngle;

            // Dotted aim guide line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.cueBall.x, this.cueBall.y);
            ctx.lineTo(this.cueBall.x + Math.cos(angle) * 160, this.cueBall.y + Math.sin(angle) * 160);
            ctx.stroke();
            ctx.setLineDash([]);

            // Cue Stick
            const cueDist = 20 + this.cue.power * 2;
            const stickX = this.cueBall.x - Math.cos(angle) * cueDist;
            const stickY = this.cueBall.y - Math.sin(angle) * cueDist;
            const stickEndX = stickX - Math.cos(angle) * 150;
            const stickEndY = stickY - Math.sin(angle) * 150;

            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(stickX, stickY);
            ctx.lineTo(stickEndX, stickEndY);
            ctx.stroke();

            // Cue Tip
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(stickX, stickY);
            ctx.lineTo(stickX - Math.cos(angle) * 8, stickY - Math.sin(angle) * 8);
            ctx.stroke();
        }

        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 26);
        ctx.textAlign = 'right';
        ctx.fillText(`BALLS LEFT: ${Math.max(0, this.balls.length - 1)}`, this.canvas.width - 20, 26);

        if (!this.areBallsMoving() && !this.cue.isCharging) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('AIM TOWARDS OBJECT BALLS AND HOLD / RELEASE TO STRIKE', this.canvas.width / 2, 385);
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
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        this.controls.destroyTouchOverlay();
    }
}

window.PoolBilliardsGame = PoolBilliardsGame;
