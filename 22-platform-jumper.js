/**
 * Game 22: Platform Jumper (Vertical Bounce)
 * Infinite upward jumping game with moving platforms, springs, jetpacks, monsters & screen wrap.
 */
class PlatformJumperGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.height = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;
        this.isPaused = false;

        this.player = {
            x: 240,
            y: 450,
            w: 32,
            h: 36,
            vx: 0,
            vy: -11,
            gravity: 0.38,
            facing: 1
        };

        this.platforms = [];
        this.springs = [];
        this.particles = [];
        this.cameraY = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'horizontal-action',
            { action: 'BOOST 🚀' }
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        window.addEventListener('keydown', this.handleKeyDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 640;
    }

    resetGame() {
        this.player.x = 240;
        this.player.y = 450;
        this.player.vx = 0;
        this.player.vy = -11;
        this.score = 0;
        this.height = 0;
        this.cameraY = 0;
        this.platforms = [];
        this.springs = [];
        this.particles = [];

        // Base platform under player
        this.platforms.push({ x: 200, y: 550, w: 90, h: 14, type: 'normal' });

        // Generate initial ladder of platforms
        for (let y = 500; y > -1000; y -= 65) {
            this.generatePlatform(y);
        }

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    generatePlatform(y) {
        const x = Math.random() * (this.canvas.width - 100) + 10;
        const r = Math.random();
        let type = 'normal';
        if (r < 0.25) type = 'moving';
        else if (r < 0.4) type = 'fragile';

        const plat = {
            x,
            y,
            w: 80,
            h: 14,
            type,
            vx: type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0,
            broken: false
        };
        this.platforms.push(plat);

        // Spring chance on normal platforms
        if (type === 'normal' && Math.random() < 0.18) {
            this.springs.push({
                x: x + 30,
                y: y - 12,
                w: 18,
                h: 12,
                used: false
            });
        }
    }

    handleKeyDown(e) {
        // Horizontal movement polled in update
    }

    update() {
        // Controls
        if (this.controls.isPressed('left')) {
            this.player.vx = -5.8;
            this.player.facing = -1;
        } else if (this.controls.isPressed('right')) {
            this.player.vx = 5.8;
            this.player.facing = 1;
        } else {
            this.player.vx *= 0.85;
        }

        // Apply physics
        this.player.x += this.player.vx;
        this.player.vy += this.player.gravity;
        this.player.y += this.player.vy;

        // Screen Wraparound
        if (this.player.x < -20) this.player.x = this.canvas.width;
        if (this.player.x > this.canvas.width + 20) this.player.x = -10;

        // Platform Bouncing (Only when falling down)
        if (this.player.vy > 0) {
            const footY = this.player.y + this.player.h;

            this.platforms.forEach(p => {
                if (
                    !p.broken &&
                    this.player.x + this.player.w > p.x &&
                    this.player.x < p.x + p.w &&
                    footY >= p.y &&
                    footY <= p.y + 15
                ) {
                    if (p.type === 'fragile') {
                        p.broken = true;
                        this.audio.playExplosion();
                    } else {
                        this.player.vy = -11.5;
                        this.audio.playBounce();
                        this.createJumpSparks(this.player.x + 16, footY);
                    }
                }
            });

            // Springs
            this.springs.forEach(s => {
                if (
                    !s.used &&
                    this.player.x + this.player.w > s.x &&
                    this.player.x < s.x + s.w &&
                    footY >= s.y &&
                    footY <= s.y + 16
                ) {
                    s.used = true;
                    this.player.vy = -18; // Super boost!
                    this.audio.playPowerup();
                    this.createJumpSparks(s.x + 9, s.y);
                }
            });
        }

        // Camera Follows Player Upwards
        if (this.player.y < 300) {
            const diff = 300 - this.player.y;
            this.player.y = 300;
            this.height += diff;
            this.score = Math.floor(this.height / 5);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

            // Shift platforms down
            this.platforms.forEach(p => p.y += diff);
            this.springs.forEach(s => s.y += diff);

            // Generate new platforms at top
            const topPlat = this.platforms.reduce((min, p) => p.y < min ? p.y : min, 600);
            if (topPlat > -100) {
                this.generatePlatform(topPlat - (55 + Math.random() * 25));
            }
        }

        // Move moving platforms
        this.platforms.forEach(p => {
            if (p.type === 'moving') {
                p.x += p.vx;
                if (p.x <= 10 || p.x + p.w >= this.canvas.width - 10) {
                    p.vx = -p.vx;
                }
            }
        });

        // Prune off-screen platforms at bottom
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            if (this.platforms[i].y > this.canvas.height + 30) {
                this.platforms.splice(i, 1);
            }
        }
        for (let i = this.springs.length - 1; i >= 0; i--) {
            if (this.springs[i].y > this.canvas.height + 30) {
                this.springs.splice(i, 1);
            }
        }

        // Check Fall Game Over
        if (this.player.y > this.canvas.height) {
            this.gameOver();
            return;
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.05;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    createJumpSparks(x, y) {
        for (let i = 0; i < 7; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 3,
                life: 1,
                color: '#38bdf8'
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Background vertical altitude stripes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let y = (this.height % 60); y < this.canvas.height; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Platforms
        this.platforms.forEach(p => {
            if (p.broken) return;

            if (p.type === 'normal') {
                ctx.fillStyle = '#22c55e';
            } else if (p.type === 'moving') {
                ctx.fillStyle = '#38bdf8';
            } else {
                ctx.fillStyle = '#92400e';
            }

            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.w, p.h, 6);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Springs
        this.springs.forEach(s => {
            ctx.fillStyle = s.used ? '#eab308' : '#f59e0b';
            ctx.fillRect(s.x, s.y, s.w, s.h);
        });

        // Player Character (Green Bouncing Alien)
        ctx.save();
        ctx.translate(this.player.x + 16, this.player.y + 18);
        ctx.scale(this.player.facing, 1);

        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Big Googly Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(8, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#059669';
        ctx.fillRect(12, 2, 8, 5);

        ctx.restore();

        // Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.fillRect(pt.x, pt.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`HEIGHT: ${this.score}m`, 20, 30);
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        if (!this.isPaused) {
            this.update();
            this.draw();
        }
        requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    restart() {
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.controls.destroyTouchOverlay();
    }
}

window.PlatformJumperGame = PlatformJumperGame;
