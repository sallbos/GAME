/**
 * Game 16: Car Racing
 * High-speed highway racer with dynamic traffic, turbo nitro boost, oil slicks & fuel management.
 */
class CarRacingGame {
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

        this.player = {
            x: 240,
            y: 510,
            w: 42,
            h: 76,
            speed: 6,
            nitro: 100,
            isBoosting: false
        };

        this.traffic = [];
        this.collectibles = [];
        this.particles = [];
        this.roadOffset = 0;
        this.spawnTimer = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'horizontal-action',
            { action: 'NITRO ⚡' }
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
        this.player.x = this.canvas.width / 2 - 21;
        this.player.y = this.canvas.height - 110;
        this.player.speed = 6;
        this.player.nitro = 100;
        this.player.isBoosting = false;
        this.score = 0;
        this.distance = 0;
        this.traffic = [];
        this.collectibles = [];
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w') {
            this.player.isBoosting = true;
        }
    }

    spawnTraffic() {
        const lanes = [95, 175, 255, 335];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#a855f7', '#64748b'];
        this.traffic.push({
            x: lane,
            y: -90,
            w: 40,
            h: 72,
            speed: Math.random() * 2.5 + 2.5,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    spawnItem() {
        const lanes = [105, 185, 265, 345];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const type = Math.random() < 0.6 ? 'coin' : 'nitro';
        this.collectibles.push({
            x: lane,
            y: -40,
            type
        });
    }

    update() {
        // Boost state
        if (this.controls.isPressed('action') || this.controls.isPressed('up')) {
            if (this.player.nitro > 0) {
                this.player.isBoosting = true;
                this.player.nitro = Math.max(0, this.player.nitro - 0.7);
                this.player.speed = 10.5;
            } else {
                this.player.isBoosting = false;
                this.player.speed = 6.5;
            }
        } else {
            this.player.isBoosting = false;
            this.player.speed = 6.5;
            this.player.nitro = Math.min(100, this.player.nitro + 0.15);
        }

        // Steer
        if (this.controls.isPressed('left')) this.player.x -= 5.5;
        if (this.controls.isPressed('right')) this.player.x += 5.5;

        // Keep inside road bounds
        this.player.x = Math.max(75, Math.min(this.canvas.width - 75 - this.player.w, this.player.x));

        // Distance & score
        this.distance += this.player.speed;
        this.score = Math.floor(this.distance / 12);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Scroll Road
        this.roadOffset = (this.roadOffset + this.player.speed) % 40;

        // Spawn traffic
        this.spawnTimer++;
        if (this.spawnTimer > 45) {
            this.spawnTraffic();
            if (Math.random() < 0.45) this.spawnItem();
            this.spawnTimer = 0;
        }

        // Update Traffic
        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const car = this.traffic[i];
            car.y += (this.player.speed - car.speed);

            // Crash Collision
            if (
                this.player.x < car.x + car.w &&
                this.player.x + this.player.w > car.x &&
                this.player.y < car.y + car.h &&
                this.player.y + this.player.h > car.y
            ) {
                this.createExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
                this.gameOver();
                return;
            }

            if (car.y > this.canvas.height + 100 || car.y < -200) {
                this.traffic.splice(i, 1);
            }
        }

        // Update Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            item.y += this.player.speed;

            if (
                this.player.x < item.x + 20 &&
                this.player.x + this.player.w > item.x - 20 &&
                this.player.y < item.y + 20 &&
                this.player.y + this.player.h > item.y - 20
            ) {
                if (item.type === 'coin') {
                    this.score += 50;
                    this.audio.playScore();
                } else {
                    this.player.nitro = Math.min(100, this.player.nitro + 35);
                    this.audio.playPowerup();
                }
                this.collectibles.splice(i, 1);
                continue;
            }

            if (item.y > this.canvas.height + 40) this.collectibles.splice(i, 1);
        }

        // Nitro Flame Particles
        if (this.player.isBoosting) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: this.player.x + (i === 0 ? 8 : (i === 1 ? 21 : 34)),
                    y: this.player.y + this.player.h,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 6 + 6,
                    life: 1,
                    color: '#38bdf8'
                });
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    createExplosion(x, y) {
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: '#ef4444'
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

        // Grass / road sides
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Asphalt Road
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(70, 0, 340, this.canvas.height);

        // Curbs (Red & White)
        for (let y = -40 + this.roadOffset; y < this.canvas.height + 40; y += 40) {
            ctx.fillStyle = (Math.floor((y - this.roadOffset) / 40) % 2 === 0) ? '#ef4444' : '#ffffff';
            ctx.fillRect(62, y, 8, 40);
            ctx.fillRect(410, y, 8, 40);
        }

        // Dashed Lane Markers
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.setLineDash([25, 25]);
        ctx.lineDashOffset = -this.roadOffset * 2;

        [155, 240, 325].forEach(lx => {
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, this.canvas.height);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Collectibles
        this.collectibles.forEach(item => {
            if (item.type === 'coin') {
                ctx.fillStyle = '#eab308';
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(item.x, item.y, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.fillRect(item.x - 7, item.y - 12, 14, 24);
                ctx.shadowBlur = 0;
            }
        });

        // Traffic Cars
        this.traffic.forEach(c => {
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.roundRect(c.x, c.y, c.w, c.h, 6);
            ctx.fill();

            // Windshield & lights
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(c.x + 4, c.y + 14, c.w - 8, 14);
            ctx.fillRect(c.x + 4, c.y + 44, c.w - 8, 10);
            ctx.fillStyle = '#ef4444'; // Rear brake lights
            ctx.fillRect(c.x + 3, c.y + c.h - 5, 8, 4);
            ctx.fillRect(c.x + c.w - 11, c.y + c.h - 5, 8, 4);
        });

        // Player Car (Cyan Racer)
        ctx.fillStyle = '#0ea5e9';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(this.player.x, this.player.y, this.player.w, this.player.h, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Player Windshields
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(this.player.x + 4, this.player.y + 16, this.player.w - 8, 16);
        ctx.fillRect(this.player.x + 4, this.player.y + 46, this.player.w - 8, 12);
        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(this.player.x + 4, this.player.y + 2, 8, 6);
        ctx.fillRect(this.player.x + this.player.w - 12, this.player.y + 2, 8, 6);

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // HUD Dashboard
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 16, 26);
        ctx.fillText(`SPEED: ${Math.floor(this.player.speed * 18)} KM/H`, 16, 46);

        // Nitro Bar
        ctx.fillText(`NITRO:`, 16, 68);
        ctx.fillStyle = '#334155';
        ctx.fillRect(75, 58, 80, 10);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(75, 58, (this.player.nitro / 100) * 80, 10);
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

window.CarRacingGame = CarRacingGame;
