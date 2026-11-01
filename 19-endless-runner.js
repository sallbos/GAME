/**
 * Game 19: Endless Runner ("Cyber Dash")
 * 2D neon rooftop runner with double jumps, slide rolls, laser hurdles, drones & speed ramp.
 */
class EndlessRunnerGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.distance = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;
        this.isPaused = false;
        this.speed = 5.5;

        this.player = {
            x: 80,
            y: 380,
            w: 32,
            h: 52,
            vy: 0,
            gravity: 0.65,
            isGrounded: true,
            jumpCount: 0,
            isSliding: false,
            slideTimer: 0
        };

        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.buildings = [];
        this.spawnTimer = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'horizontal-action',
            { left: 'SLIDE ⬇', right: 'DASH ⚡', action: 'JUMP ⬆' }
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
        this.buildings = [];
        for (let i = 0; i < 10; i++) {
            this.buildings.push({
                x: i * 80,
                w: 70,
                h: Math.random() * 180 + 120,
                color: '#1e293b'
            });
        }
    }

    resetGame() {
        this.player.y = 380;
        this.player.vy = 0;
        this.player.jumpCount = 0;
        this.player.isSliding = false;
        this.speed = 5.5;
        this.score = 0;
        this.distance = 0;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            this.jump();
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            this.slide();
        }
    }

    jump() {
        if (this.player.jumpCount < 2) {
            this.player.vy = -12;
            this.player.jumpCount++;
            this.player.isGrounded = false;
            this.audio.playJump();
            this.createDust(this.player.x + 16, this.player.y + 52);
        }
    }

    slide() {
        if (this.player.isGrounded && !this.player.isSliding) {
            this.player.isSliding = true;
            this.player.slideTimer = 25;
            this.audio.playSlice();
        }
    }

    spawnObstacle() {
        const types = ['crate', 'laser_high', 'drone'];
        const type = types[Math.floor(Math.random() * types.length)];

        if (type === 'crate') {
            this.obstacles.push({
                x: this.canvas.width + 40,
                y: 388,
                w: 32,
                h: 44,
                type: 'crate'
            });
        } else if (type === 'laser_high') {
            // Must slide under!
            this.obstacles.push({
                x: this.canvas.width + 40,
                y: 345,
                w: 45,
                h: 22,
                type: 'laser_high'
            });
        } else {
            // Flying drone
            this.obstacles.push({
                x: this.canvas.width + 40,
                y: 320 + (Math.random() - 0.5) * 30,
                w: 30,
                h: 20,
                type: 'drone'
            });
        }

        // Spawn orbs
        if (Math.random() < 0.6) {
            this.coins.push({
                x: this.canvas.width + 120,
                y: 340,
                collected: false
            });
        }
    }

    update() {
        // Controls polling
        if (this.controls.isPressed('action') || this.controls.isPressed('up')) {
            if (this.player.jumpCount === 0) this.jump();
        }
        if (this.controls.isPressed('left') || this.controls.isPressed('down')) {
            this.slide();
        }

        // Distance & score
        this.distance += this.speed;
        this.score = Math.floor(this.distance / 10);
        this.speed = Math.min(10.5, 5.5 + this.distance * 0.0006);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Slide timer
        if (this.player.isSliding) {
            this.player.slideTimer--;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
            }
        }

        // Physics
        this.player.vy += this.player.gravity;
        this.player.y += this.player.vy;

        // Ground collision (Floor at y = 432)
        const ph = this.player.isSliding ? 26 : this.player.h;
        if (this.player.y + ph >= 432) {
            this.player.y = 432 - ph;
            this.player.vy = 0;
            this.player.isGrounded = true;
            this.player.jumpCount = 0;
        }

        // Parallax background buildings
        this.buildings.forEach(b => {
            b.x -= this.speed * 0.35;
            if (b.x + b.w < 0) {
                b.x = this.canvas.width + 20;
            }
        });

        // Spawn obstacles
        this.spawnTimer++;
        if (this.spawnTimer > Math.max(50, 110 - this.speed * 4)) {
            this.spawnObstacle();
            this.spawnTimer = 0;
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const ob = this.obstacles[i];
            ob.x -= this.speed;

            // Hitbox check
            if (
                this.player.x + this.player.w > ob.x &&
                this.player.x < ob.x + ob.w &&
                this.player.y + ph > ob.y &&
                this.player.y < ob.y + ob.h
            ) {
                this.gameOver();
                return;
            }

            if (ob.x < -60) this.obstacles.splice(i, 1);
        }

        // Update Coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            c.x -= this.speed;

            if (
                !c.collected &&
                this.player.x + this.player.w > c.x - 12 &&
                this.player.x < c.x + 12 &&
                this.player.y + ph > c.y - 12 &&
                this.player.y < c.y + 12
            ) {
                c.collected = true;
                this.score += 50;
                this.audio.playScore();
                this.createDust(c.x, c.y);
                this.coins.splice(i, 1);
                continue;
            }

            if (c.x < -30) this.coins.splice(i, 1);
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    createDust(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x, y,
                vx: -Math.random() * 4 - 2,
                vy: (Math.random() - 0.5) * 3,
                life: 1,
                color: '#38bdf8'
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playExplosion();
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Distant Cyber Buildings
        this.buildings.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, 432 - b.h, b.w, b.h);

            // Windows
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            for (let wy = 432 - b.h + 20; wy < 420; wy += 25) {
                ctx.fillRect(b.x + 10, wy, 15, 12);
                ctx.fillRect(b.x + 40, wy, 15, 12);
            }
        });

        // Floor / Road
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 432, this.canvas.width, 48);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 432);
        ctx.lineTo(this.canvas.width, 432);
        ctx.stroke();

        // Coins (Energy Orbs)
        this.coins.forEach(c => {
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Obstacles
        this.obstacles.forEach(ob => {
            if (ob.type === 'crate') {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#f87171';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 4);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (ob.type === 'laser_high') {
                // Overhead beam
                ctx.fillStyle = '#ec4899';
                ctx.shadowColor = '#f43f5e';
                ctx.shadowBlur = 12;
                ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
                ctx.shadowBlur = 0;
            } else {
                // Drone
                ctx.fillStyle = '#a855f7';
                ctx.beginPath();
                ctx.ellipse(ob.x + 15, ob.y + 10, 15, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(ob.x + 12, ob.y + 8, 6, 4);
            }
        });

        // Player
        ctx.save();
        ctx.translate(this.player.x, this.player.y);

        if (this.player.isSliding) {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(0, 6, 42, 20, 6);
            ctx.fill();
            ctx.fillStyle = '#38bdf8'; // Glowing visor
            ctx.fillRect(32, 10, 8, 4);
        } else {
            // Cyber runner body
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(4, 12, 24, 28, 4);
            ctx.fill();

            // Head & Helmet
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(16, 8, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#38bdf8'; // Visor
            ctx.fillRect(16, 6, 8, 4);

            // Legs running animation
            ctx.fillStyle = '#0369a1';
            const legPhase = Math.sin(this.distance * 0.15);
            ctx.fillRect(8, 40, 6, 12 + legPhase * 4);
            ctx.fillRect(18, 40, 6, 12 - legPhase * 4);
        }
        ctx.restore();

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        ctx.textAlign = 'right';
        ctx.fillText(`DISTANCE: ${Math.floor(this.distance)}m`, this.canvas.width - 20, 30);
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

window.EndlessRunnerGame = EndlessRunnerGame;
