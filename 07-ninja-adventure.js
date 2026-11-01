/**
 * Game 07: Ninja Adventure
 * Fast-paced side-scrolling action platformer with double jumps, shurikens, enemies, spikes & sacred scrolls.
 */
class NinjaAdventureGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.lives = 3;
        this.isRunning = false;
        this.isPaused = false;

        this.ninja = {
            x: 90,
            y: 340,
            w: 28,
            h: 46,
            vy: 0,
            gravity: 0.58,
            isGrounded: false,
            jumpCount: 0,
            isSliding: false,
            slideTimer: 0
        };

        this.platforms = [];
        this.obstacles = [];
        this.enemies = [];
        this.shurikens = [];
        this.collectibles = [];
        this.particles = [];
        this.petals = [];

        this.gameSpeed = 4.2;
        this.distance = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-action',
            { action: 'JUMP ⬆', shoot: 'ATTACK ⚔' }
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        window.addEventListener('keydown', this.handleKeyDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 480;
        this.petals = [];
        for (let i = 0; i < 25; i++) {
            this.petals.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: -Math.random() * 2 - 1,
                vy: Math.random() * 1.5 + 0.5,
                size: Math.random() * 4 + 2
            });
        }
    }

    resetGame() {
        this.ninja.y = 300;
        this.ninja.vy = 0;
        this.ninja.jumpCount = 0;
        this.ninja.isSliding = false;
        this.lives = 3;
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = 4.2;

        this.platforms = [
            { x: 0, y: 390, w: 700, h: 90 }
        ];
        this.obstacles = [];
        this.enemies = [];
        this.shurikens = [];
        this.collectibles = [];
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            this.jump();
        } else if (e.code === 'KeyJ' || e.code === 'KeyX') {
            this.throwShuriken();
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            this.slide();
        }
    }

    jump() {
        if (this.ninja.jumpCount < 2) {
            this.ninja.vy = -11.5;
            this.ninja.jumpCount++;
            this.ninja.isGrounded = false;
            this.audio.playJump();
            this.createSmoke(this.ninja.x + this.ninja.w / 2, this.ninja.y + this.ninja.h);
        }
    }

    slide() {
        if (this.ninja.isGrounded && !this.ninja.isSliding) {
            this.ninja.isSliding = true;
            this.ninja.slideTimer = 22;
            this.audio.playSlice();
        }
    }

    throwShuriken() {
        this.audio.playShoot();
        this.shurikens.push({
            x: this.ninja.x + this.ninja.w + 5,
            y: this.ninja.y + 18,
            vx: 9.5,
            angle: 0
        });
    }

    update() {
        // Controls polling
        if (this.controls.isPressed('action') || this.controls.isPressed('up')) {
            if (this.ninja.jumpCount === 0 || (this.ninja.vy > 0 && this.ninja.jumpCount === 1)) {
                this.jump();
            }
        }
        if (this.controls.isPressed('shoot') || this.controls.isPressed('punch')) {
            if (Math.random() < 0.15) this.throwShuriken();
        }
        if (this.controls.isPressed('down')) {
            this.slide();
        }

        this.distance += this.gameSpeed;
        this.score = Math.floor(this.distance / 10);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Slide timer
        if (this.ninja.isSliding) {
            this.ninja.slideTimer--;
            if (this.ninja.slideTimer <= 0) {
                this.ninja.isSliding = false;
            }
        }

        // Ninja physics
        this.ninja.vy += this.ninja.gravity;
        this.ninja.y += this.ninja.vy;

        // Ground detection
        this.ninja.isGrounded = false;
        const nh = this.ninja.isSliding ? 24 : this.ninja.h;
        this.platforms.forEach(plat => {
            if (
                this.ninja.x + this.ninja.w > plat.x &&
                this.ninja.x < plat.x + plat.w &&
                this.ninja.y + nh >= plat.y &&
                this.ninja.y + nh <= plat.y + 18 &&
                this.ninja.vy >= 0
            ) {
                this.ninja.y = plat.y - nh;
                this.ninja.vy = 0;
                this.ninja.isGrounded = true;
                this.ninja.jumpCount = 0;
            }
        });

        // Fell in pit
        if (this.ninja.y > this.canvas.height) {
            this.hitNinja(true);
            return;
        }

        // Spawn platforms & gaps
        const lastPlat = this.platforms[this.platforms.length - 1];
        if (lastPlat.x + lastPlat.w < this.canvas.width + 200) {
            const gap = Math.random() < 0.35 ? Math.random() * 80 + 70 : 0;
            const newW = Math.random() * 300 + 400;
            const newY = Math.min(410, Math.max(340, lastPlat.y + (Math.random() - 0.5) * 60));
            this.platforms.push({
                x: lastPlat.x + lastPlat.w + gap,
                y: newY,
                w: newW,
                h: 90
            });

            // Spawn obstacles / spikes on this platform
            if (Math.random() < 0.6) {
                this.obstacles.push({
                    x: lastPlat.x + lastPlat.w + gap + 150,
                    y: newY - 26,
                    w: 24,
                    h: 26,
                    type: 'spike'
                });
            }

            // Spawn enemies
            if (Math.random() < 0.5) {
                this.enemies.push({
                    x: lastPlat.x + lastPlat.w + gap + 280,
                    y: newY - 38,
                    w: 26,
                    h: 38,
                    hp: 1,
                    type: 'samurai'
                });
            }

            // Spawn scrolls / coins
            for (let k = 0; k < 3; k++) {
                this.collectibles.push({
                    x: lastPlat.x + lastPlat.w + gap + 100 + k * 40,
                    y: newY - 60 - Math.sin(k) * 20,
                    collected: false
                });
            }
        }

        // Scroll platforms
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i];
            p.x -= this.gameSpeed;
            if (p.x + p.w < -100) this.platforms.splice(i, 1);
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const ob = this.obstacles[i];
            ob.x -= this.gameSpeed;
            if (
                this.ninja.x + this.ninja.w > ob.x &&
                this.ninja.x < ob.x + ob.w &&
                this.ninja.y + nh > ob.y &&
                this.ninja.y < ob.y + ob.h
            ) {
                this.hitNinja();
                this.obstacles.splice(i, 1);
                continue;
            }
            if (ob.x < -40) this.obstacles.splice(i, 1);
        }

        // Update Shurikens
        for (let i = this.shurikens.length - 1; i >= 0; i--) {
            const sh = this.shurikens[i];
            sh.x += sh.vx;
            sh.angle += 0.3;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const en = this.enemies[j];
                if (sh.x > en.x && sh.x < en.x + en.w && sh.y > en.y && sh.y < en.y + en.h) {
                    this.audio.playExplosion();
                    this.createSmoke(en.x + en.w / 2, en.y + en.h / 2);
                    this.enemies.splice(j, 1);
                    this.shurikens.splice(i, 1);
                    this.score += 50;
                    break;
                }
            }

            if (sh.x > this.canvas.width + 40 && this.shurikens[i]) {
                this.shurikens.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const en = this.enemies[i];
            en.x -= this.gameSpeed + 0.8;
            if (
                this.ninja.x + this.ninja.w > en.x &&
                this.ninja.x < en.x + en.w &&
                this.ninja.y + nh > en.y &&
                this.ninja.y < en.y + en.h
            ) {
                this.hitNinja();
                this.enemies.splice(i, 1);
                continue;
            }
            if (en.x < -50) this.enemies.splice(i, 1);
        }

        // Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            c.x -= this.gameSpeed;
            if (
                !c.collected &&
                this.ninja.x + this.ninja.w > c.x - 10 &&
                this.ninja.x < c.x + 10 &&
                this.ninja.y + nh > c.y - 10 &&
                this.ninja.y < c.y + 10
            ) {
                c.collected = true;
                this.audio.playScore();
                this.score += 25;
                this.createSmoke(c.x, c.y);
                this.collectibles.splice(i, 1);
                continue;
            }
            if (c.x < -20) this.collectibles.splice(i, 1);
        }

        // Petals
        this.petals.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.y > this.canvas.height) p.y = -10;
        });

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.05;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    hitNinja(instantKill = false) {
        this.audio.playHit();
        this.lives--;
        if (instantKill || this.lives <= 0) {
            this.gameOver();
        } else {
            this.ninja.y = 280;
            this.ninja.vy = 0;
        }
    }

    createSmoke(x, y) {
        for (let i = 0; i < 7; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color: '#cbd5e1'
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

        // Background: Crimson moon night
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Giant Red Blood Moon
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(520, 110, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(520, 110, 60, 0, Math.PI * 2);
        ctx.fill();

        // Sakura Petals
        ctx.fillStyle = '#f472b6';
        this.petals.forEach(p => {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, 0.4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Platforms
        this.platforms.forEach(plat => {
            // Rooftop tiles
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#334155';
            ctx.fillRect(plat.x, plat.y, plat.w, 10);
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(plat.x, plat.y);
            ctx.lineTo(plat.x + plat.w, plat.y);
            ctx.stroke();
        });

        // Obstacles (Spikes)
        this.obstacles.forEach(ob => {
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(ob.x, ob.y + ob.h);
            ctx.lineTo(ob.x + ob.w / 2, ob.y);
            ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
            ctx.closePath();
            ctx.fill();
        });

        // Enemies (Samurai)
        this.enemies.forEach(en => {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(en.x, en.y, en.w, en.h);
            // Kabuto Horns
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(en.x, en.y);
            ctx.lineTo(en.x + en.w / 2, en.y - 8);
            ctx.lineTo(en.x + en.w, en.y);
            ctx.fill();
        });

        // Collectibles (Coins/Scrolls)
        this.collectibles.forEach(c => {
            ctx.fillStyle = '#eab308';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Shurikens
        this.shurikens.forEach(sh => {
            ctx.save();
            ctx.translate(sh.x, sh.y);
            ctx.rotate(sh.angle);
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.moveTo(0, 0);
                ctx.lineTo(-4, -12);
                ctx.lineTo(0, -6);
                ctx.lineTo(4, -12);
            }
            ctx.fill();
            ctx.restore();
        });

        // Ninja Character
        ctx.save();
        ctx.translate(this.ninja.x, this.ninja.y);

        if (this.ninja.isSliding) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 18, 40, 18);
            ctx.fillStyle = '#dc2626'; // Red headband
            ctx.fillRect(28, 16, 12, 5);
        } else {
            // Shadow / ninja suit
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(4, 12, 20, 24); // Torso

            // Head
            ctx.beginPath();
            ctx.arc(14, 8, 8, 0, Math.PI * 2);
            ctx.fill();

            // Headband tails
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(2, 6, 24, 4);
            ctx.fillRect(-8, 6, 10, 3); // Flying ribbon

            // Glowing Eyes
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(16, 7, 4, 2);

            // Legs
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(6, 36, 6, 10);
            ctx.fillRect(16, 36, 6, 10);
        }
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
        ctx.fillText(`SCORE: ${this.score}`, 16, 26);
        ctx.fillText(`LIVES: ${'❤️ '.repeat(Math.max(0, this.lives))}`, 16, 48);
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

window.NinjaAdventureGame = NinjaAdventureGame;
