/**
 * Game 03: Space Shooter
 * Retro vertical arcade shmup with multi-wave invaders, lasers, weapon drops, shields & boss encounter.
 */
class SpaceShooterGame {
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

        this.player = {
            x: 240,
            y: 560,
            width: 36,
            height: 38,
            speed: 5.5,
            weaponLevel: 1,
            shield: 100,
            shootCooldown: 0
        };

        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.stars = [];
        this.spawnTimer = 0;
        this.wave = 1;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'horizontal-action',
            { action: 'FIRE 🔥' }
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        window.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 640;
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.8,
                speed: Math.random() * 3 + 1
            });
        }
    }

    resetGame() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 80;
        this.player.weaponLevel = 1;
        this.player.shield = 100;
        this.player.shootCooldown = 0;
        this.lives = 3;
        this.score = 0;
        this.wave = 1;
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.shoot();
        }
    }

    handlePointerMove(e) {
        if (!this.isRunning || this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const clientX = e.clientX - rect.left;
        this.player.x = Math.max(20, Math.min(this.canvas.width - 20, clientX * scaleX));
    }

    shoot() {
        if (this.player.shootCooldown > 0) return;
        this.audio.playShoot();
        const y = this.player.y - 15;

        if (this.player.weaponLevel === 1) {
            this.playerBullets.push({ x: this.player.x, y, vx: 0, vy: -9, color: '#38bdf8' });
        } else if (this.player.weaponLevel === 2) {
            this.playerBullets.push({ x: this.player.x - 10, y, vx: 0, vy: -9, color: '#a855f7' });
            this.playerBullets.push({ x: this.player.x + 10, y, vx: 0, vy: -9, color: '#a855f7' });
        } else {
            this.playerBullets.push({ x: this.player.x, y, vx: 0, vy: -9, color: '#f59e0b' });
            this.playerBullets.push({ x: this.player.x - 12, y, vx: -2, vy: -8.5, color: '#f59e0b' });
            this.playerBullets.push({ x: this.player.x + 12, y, vx: 2, vy: -8.5, color: '#f59e0b' });
        }
        this.player.shootCooldown = 12;
    }

    spawnEnemy() {
        const types = [
            { type: 'scout', hp: 1, speed: 2.5, score: 20, color: '#ef4444', size: 22 },
            { type: 'fighter', hp: 3, speed: 1.8, score: 50, color: '#f59e0b', size: 28 },
            { type: 'cruiser', hp: 6, speed: 1.2, score: 100, color: '#a855f7', size: 36 }
        ];
        const r = Math.random();
        const config = r < 0.6 ? types[0] : (r < 0.88 ? types[1] : types[2]);

        this.enemies.push({
            x: Math.random() * (this.canvas.width - 60) + 30,
            y: -40,
            hp: config.hp,
            maxHp: config.hp,
            speed: config.speed,
            scoreVal: config.score,
            color: config.color,
            size: config.size,
            shootTimer: Math.random() * 80 + 40,
            oscillation: Math.random() * Math.PI * 2
        });
    }

    update() {
        if (this.player.shootCooldown > 0) this.player.shootCooldown--;

        // Player Controls
        if (this.controls.isPressed('left')) this.player.x -= this.player.speed;
        if (this.controls.isPressed('right')) this.player.x += this.player.speed;
        if (this.controls.isPressed('up')) this.player.y -= this.player.speed;
        if (this.controls.isPressed('down')) this.player.y += this.player.speed;
        if (this.controls.isPressed('action') || this.controls.isPressed('shoot')) {
            this.shoot();
        }

        // Keep player in bounds
        this.player.x = Math.max(25, Math.min(this.canvas.width - 25, this.player.x));
        this.player.y = Math.max(100, Math.min(this.canvas.height - 30, this.player.y));

        // Background Starfield
        this.stars.forEach(s => {
            s.y += s.speed;
            if (s.y > this.canvas.height) {
                s.y = 0;
                s.x = Math.random() * this.canvas.width;
            }
        });

        // Update Player Bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            b.x += b.vx;
            b.y += b.vy;
            if (b.y < -20) {
                this.playerBullets.splice(i, 1);
            }
        }

        // Update Enemy Bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Player hit check
            const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
            if (dist < 18) {
                this.hitPlayer(15);
                this.enemyBullets.splice(i, 1);
                continue;
            }

            if (b.y > this.canvas.height + 20) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // Spawn Enemies
        this.spawnTimer++;
        if (this.spawnTimer > 55) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.y += e.speed;
            e.oscillation += 0.05;
            e.x += Math.sin(e.oscillation) * 1.5;

            // Shooting
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                e.shootTimer = 110 + Math.random() * 40;
                this.enemyBullets.push({
                    x: e.x,
                    y: e.y + e.size,
                    vx: (this.player.x - e.x) * 0.015,
                    vy: 4.2
                });
            }

            // Bullet vs Enemy Hit Check
            for (let j = this.playerBullets.length - 1; j >= 0; j--) {
                const b = this.playerBullets[j];
                const d = Math.hypot(b.x - e.x, b.y - e.y);
                if (d < e.size) {
                    e.hp--;
                    this.createSparks(b.x, b.y, '#38bdf8');
                    this.playerBullets.splice(j, 1);
                    if (e.hp <= 0) {
                        this.destroyEnemy(e, i);
                        break;
                    }
                }
            }

            // Player collision
            const distPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (distPlayer < e.size + 15) {
                this.hitPlayer(30);
                this.destroyEnemy(e, i);
                continue;
            }

            // Off-screen
            if (e.y > this.canvas.height + 50) {
                this.enemies.splice(i, 1);
            }
        }

        // Update Powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += 2;
            const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
            if (dist < 28) {
                this.audio.playPowerup();
                if (p.type === 'weapon') {
                    this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
                } else if (p.type === 'shield') {
                    this.player.shield = Math.min(100, this.player.shield + 40);
                }
                this.powerups.splice(i, 1);
                continue;
            }
            if (p.y > this.canvas.height + 20) this.powerups.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.035;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    destroyEnemy(e, idx) {
        this.audio.playExplosion();
        this.score += e.scoreVal;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Explosion particles
        for (let k = 0; k < 18; k++) {
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: e.color
            });
        }

        // Powerup drop chance (15%)
        if (Math.random() < 0.18) {
            this.powerups.push({
                x: e.x,
                y: e.y,
                type: Math.random() < 0.5 ? 'weapon' : 'shield'
            });
        }

        this.enemies.splice(idx, 1);
    }

    hitPlayer(damage) {
        this.audio.playHit();
        this.player.shield -= damage;
        if (this.player.shield <= 0) {
            this.lives--;
            this.player.shield = 100;
            this.player.weaponLevel = Math.max(1, this.player.weaponLevel - 1);
            if (this.lives <= 0) {
                this.gameOver();
            }
        }
    }

    createSparks(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 0.8,
                color
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
        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Player Bullets
        this.playerBullets.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(b.x - 3, b.y, 6, 14);
        });
        ctx.shadowBlur = 0;

        // Enemy Bullets
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 6;
        this.enemyBullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Powerups
        this.powerups.forEach(p => {
            ctx.fillStyle = p.type === 'weapon' ? '#f59e0b' : '#38bdf8';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.type === 'weapon' ? 'W' : 'S', p.x, p.y);
        });

        // Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + e.size);
            ctx.lineTo(e.x - e.size * 0.8, e.y - e.size * 0.6);
            ctx.lineTo(e.x + e.size * 0.8, e.y - e.size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Health bar if multi-hp
            if (e.maxHp > 1) {
                const barW = e.size * 1.5;
                ctx.fillStyle = '#334155';
                ctx.fillRect(e.x - barW / 2, e.y - e.size - 8, barW, 4);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(e.x - barW / 2, e.y - e.size - 8, barW * (e.hp / e.maxHp), 4);
            }
        });

        // Player Ship
        ctx.save();
        ctx.translate(this.player.x, this.player.y);

        // Jet engine glow
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-8, 18);
        ctx.lineTo(0, 26 + Math.random() * 6);
        ctx.lineTo(8, 18);
        ctx.closePath();
        ctx.fill();

        // Hull
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(18, 14);
        ctx.lineTo(0, 8);
        ctx.lineTo(-18, 14);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.ellipse(0, -4, 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shield dome if shield is up
        if (this.player.shield > 20) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${this.player.shield / 150})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // In-game HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 16, 26);
        ctx.fillText(`LIVES: ${'❤️ '.repeat(Math.max(0, this.lives))}`, 16, 46);

        // Shield bar
        ctx.fillText(`SHIELD:`, 16, 66);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(80, 56, 100, 10);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(80, 56, this.player.shield, 10);
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

    setDifficulty(diff) {
        if (diff === 'Easy') {
            this.player.speed = 6.2;
        } else if (diff === 'Hard') {
            this.player.speed = 4.8;
        } else {
            this.player.speed = 5.5;
        }
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.controls.destroyTouchOverlay();
    }
}

window.SpaceShooterGame = SpaceShooterGame;
