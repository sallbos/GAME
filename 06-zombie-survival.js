/**
 * Game 06: Zombie Survival
 * Top-down twin-stick arena shooter with zombie hordes, weapon pickups, health drops & wave progression.
 */
class ZombieSurvivalGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.wave = 1;
        this.isRunning = false;
        this.isPaused = false;

        this.player = {
            x: 300,
            y: 300,
            radius: 14,
            speed: 3.8,
            angle: 0,
            hp: 100,
            maxHp: 100,
            weapon: 'pistol',
            ammo: Infinity,
            shootCooldown: 0
        };

        this.bullets = [];
        this.zombies = [];
        this.drops = [];
        this.particles = [];
        this.mousePos = { x: 300, y: 300 };

        this.spawnTimer = 0;
        this.zombiesPerWave = 15;
        this.zombiesSpawnedInWave = 0;

        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-action',
            { action: 'FIRE 🔫' }
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 640;
    }

    resetGame() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.hp = 100;
        this.player.weapon = 'pistol';
        this.player.ammo = Infinity;
        this.score = 0;
        this.wave = 1;
        this.bullets = [];
        this.zombies = [];
        this.drops = [];
        this.particles = [];
        this.zombiesSpawnedInWave = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handlePointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mousePos.x = (e.clientX - rect.left) * scaleX;
        this.mousePos.y = (e.clientY - rect.top) * scaleY;
    }

    handlePointerDown(e) {
        this.handlePointerMove(e);
        this.shoot();
    }

    shoot() {
        if (!this.isRunning || this.isPaused) return;
        if (this.player.shootCooldown > 0) return;

        this.audio.playShoot();
        const angle = this.player.angle;
        const speed = 10;

        if (this.player.weapon === 'shotgun') {
            [-0.15, 0, 0.15].forEach(offset => {
                this.bullets.push({
                    x: this.player.x + Math.cos(angle) * 16,
                    y: this.player.y + Math.sin(angle) * 16,
                    vx: Math.cos(angle + offset) * speed,
                    vy: Math.sin(angle + offset) * speed,
                    range: 35
                });
            });
            this.player.shootCooldown = 22;
            this.player.ammo--;
        } else if (this.player.weapon === 'machinegun') {
            this.bullets.push({
                x: this.player.x + Math.cos(angle) * 16,
                y: this.player.y + Math.sin(angle) * 16,
                vx: Math.cos(angle + (Math.random() - 0.5) * 0.1) * (speed + 2),
                vy: Math.sin(angle + (Math.random() - 0.5) * 0.1) * (speed + 2),
                range: 45
            });
            this.player.shootCooldown = 8;
            this.player.ammo--;
        } else {
            // Pistol
            this.bullets.push({
                x: this.player.x + Math.cos(angle) * 16,
                y: this.player.y + Math.sin(angle) * 16,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                range: 50
            });
            this.player.shootCooldown = 15;
        }

        if (this.player.ammo <= 0) {
            this.player.weapon = 'pistol';
            this.player.ammo = Infinity;
        }
    }

    spawnZombie() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * this.canvas.width; y = -20; }
        else if (side === 1) { x = this.canvas.width + 20; y = Math.random() * this.canvas.height; }
        else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 20; }
        else { x = -20; y = Math.random() * this.canvas.height; }

        const r = Math.random();
        let type = 'walker';
        let hp = 2;
        let speed = 1.6;
        let radius = 13;
        let color = '#22c55e';

        if (r < 0.25) {
            type = 'runner';
            hp = 1;
            speed = 2.8;
            radius = 11;
            color = '#eab308';
        } else if (r > 0.88) {
            type = 'brute';
            hp = 6;
            speed = 1.1;
            radius = 20;
            color = '#ef4444';
        }

        this.zombies.push({ x, y, hp, maxHp: hp, speed, radius, color, type });
        this.zombiesSpawnedInWave++;
    }

    update() {
        if (this.player.shootCooldown > 0) this.player.shootCooldown--;

        // Calculate player angle
        this.player.angle = Math.atan2(this.mousePos.y - this.player.y, this.mousePos.x - this.player.x);

        // Movement
        const vec = this.controls.getVector();
        this.player.x += vec.x * this.player.speed;
        this.player.y += vec.y * this.player.speed;

        // Keep inside bounds
        this.player.x = Math.max(16, Math.min(this.canvas.width - 16, this.player.x));
        this.player.y = Math.max(16, Math.min(this.canvas.height - 16, this.player.y));

        if (this.controls.isPressed('action')) {
            this.shoot();
        }

        // Spawn Wave Zombies
        this.spawnTimer++;
        if (this.spawnTimer > Math.max(30, 80 - this.wave * 8) && this.zombiesSpawnedInWave < this.zombiesPerWave) {
            this.spawnZombie();
            this.spawnTimer = 0;
        }

        // Check if wave cleared
        if (this.zombiesSpawnedInWave >= this.zombiesPerWave && this.zombies.length === 0) {
            this.wave++;
            this.zombiesSpawnedInWave = 0;
            this.zombiesPerWave += 6;
            this.audio.playPowerup();
        }

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.range--;

            // Hit zombies
            for (let j = this.zombies.length - 1; j >= 0; j--) {
                const z = this.zombies[j];
                const d = Math.hypot(b.x - z.x, b.y - z.y);
                if (d < z.radius + 4) {
                    z.hp--;
                    this.createBlood(b.x, b.y, '#22c55e');
                    this.bullets.splice(i, 1);
                    if (z.hp <= 0) {
                        this.destroyZombie(z, j);
                    }
                    break;
                }
            }

            if (b.range <= 0 && this.bullets[i]) {
                this.bullets.splice(i, 1);
            }
        }

        // Update Zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];
            const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x);
            z.x += Math.cos(angle) * z.speed;
            z.y += Math.sin(angle) * z.speed;

            // Attack player
            const dist = Math.hypot(this.player.x - z.x, this.player.y - z.y);
            if (dist < this.player.radius + z.radius) {
                this.player.hp -= 0.6;
                this.audio.playHit();
                this.createBlood(this.player.x, this.player.y, '#ef4444');
                if (this.player.hp <= 0) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Update Drops
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            const dist = Math.hypot(this.player.x - drop.x, this.player.y - drop.y);
            if (dist < 26) {
                this.audio.playPowerup();
                if (drop.type === 'health') {
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
                } else if (drop.type === 'shotgun') {
                    this.player.weapon = 'shotgun';
                    this.player.ammo = 24;
                } else if (drop.type === 'machinegun') {
                    this.player.weapon = 'machinegun';
                    this.player.ammo = 60;
                }
                this.drops.splice(i, 1);
            }
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

    destroyZombie(z, idx) {
        this.audio.playExplosion();
        this.score += z.type === 'brute' ? 50 : (z.type === 'runner' ? 30 : 20);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Drop item chance
        if (Math.random() < 0.25) {
            const r = Math.random();
            let type = 'health';
            if (r < 0.4) type = 'shotgun';
            else if (r < 0.7) type = 'machinegun';
            this.drops.push({ x: z.x, y: z.y, type });
        }

        this.zombies.splice(idx, 1);
    }

    createBlood(x, y, color) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
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
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Ground grit grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
        }

        // Drops
        this.drops.forEach(d => {
            ctx.fillStyle = d.type === 'health' ? '#ef4444' : (d.type === 'shotgun' ? '#f59e0b' : '#38bdf8');
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(d.x - 9, d.y - 9, 18, 18, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(d.type === 'health' ? '✚' : (d.type === 'shotgun' ? 'SG' : 'MG'), d.x, d.y + 4);
        });

        // Bullets
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 6;
        this.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Zombies
        this.zombies.forEach(z => {
            ctx.fillStyle = z.color;
            ctx.shadowColor = z.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Arms reaching out
            const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x);
            ctx.strokeStyle = z.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x + Math.cos(angle + 0.3) * (z.radius + 7), z.y + Math.sin(angle + 0.3) * (z.radius + 7));
            ctx.moveTo(z.x, z.y);
            ctx.lineTo(z.x + Math.cos(angle - 0.3) * (z.radius + 7), z.y + Math.sin(angle - 0.3) * (z.radius + 7));
            ctx.stroke();
        });

        // Player
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.angle);

        // Flashlight beam
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 150, -0.3, 0.3);
        ctx.closePath();
        ctx.fill();

        // Gun barrel
        ctx.fillStyle = '#64748b';
        ctx.fillRect(8, 2, 14, 4);

        // Body
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}  |  WAVE: ${this.wave}`, 16, 26);
        ctx.fillText(`WEAPON: ${this.player.weapon.toUpperCase()} (${this.player.ammo === Infinity ? '∞' : this.player.ammo})`, 16, 46);

        // Health bar
        ctx.fillStyle = '#334155';
        ctx.fillRect(16, 56, 120, 8);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(16, 56, (this.player.hp / this.player.maxHp) * 120, 8);
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
        this.wave = diff === 'Hard' ? 3 : 1;
    }

    destroy() {
        this.isRunning = false;
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.controls.destroyTouchOverlay();
    }
}

window.ZombieSurvivalGame = ZombieSurvivalGame;
