/**
 * Game 24: Tower Defense
 * Tactical lane defense with Archer, Cannon, Frost & Laser towers, wave escalation & gold economy.
 */
class TowerDefenseGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.gold = 350;
        this.lives = 15;
        this.wave = 1;
        this.score = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;
        this.selectedTowerType = 'archer';

        this.path = [
            { x: 0, y: 140 },
            { x: 200, y: 140 },
            { x: 200, y: 340 },
            { x: 420, y: 340 },
            { x: 420, y: 180 },
            { x: 640, y: 180 }
        ];

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];

        this.spawnTimer = 0;
        this.enemiesInWave = 12;
        this.enemiesSpawned = 0;

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
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    resetGame() {
        this.gold = 350;
        this.lives = 15;
        this.wave = 1;
        this.score = 0;
        this.selectedTowerType = 'archer';
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.enemiesInWave = 12;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleClick(e) {
        if (!this.isRunning) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // Check Tower Selector Bar clicks (at bottom y = 430)
        if (my >= 430) {
            const types = ['archer', 'cannon', 'frost', 'laser'];
            const btnW = 120;
            types.forEach((t, idx) => {
                const bx = 40 + idx * 140;
                if (mx >= bx && mx <= bx + btnW) {
                    this.selectedTowerType = t;
                    this.audio.playClick();
                }
            });
            return;
        }

        // Place Tower on Map
        const costs = { archer: 100, cannon: 150, frost: 125, laser: 200 };
        const cost = costs[this.selectedTowerType];

        if (this.gold >= cost) {
            // Check if too close to path or existing tower
            const onPath = this.isNearPath(mx, my, 35);
            const nearTower = this.towers.some(t => Math.hypot(t.x - mx, t.y - my) < 38);

            if (!onPath && !nearTower && my < 410) {
                this.gold -= cost;
                this.audio.playBounce();
                this.towers.push(this.createTower(mx, my, this.selectedTowerType));
            }
        }
    }

    createTower(x, y, type) {
        const configs = {
            archer: { range: 120, rate: 22, dmg: 1.5, color: '#22c55e' },
            cannon: { range: 100, rate: 55, dmg: 5.0, color: '#f59e0b' },
            frost: { range: 90, rate: 35, dmg: 0.8, color: '#38bdf8' },
            laser: { range: 140, rate: 10, dmg: 0.7, color: '#ec4899' }
        };
        return {
            x, y, type,
            ...configs[type],
            cooldown: 0
        };
    }

    isNearPath(x, y, threshold) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];
            // Point to line segment distance
            const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
            const t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            if (Math.hypot(x - projX, y - projY) < threshold) return true;
        }
        return false;
    }

    spawnEnemy() {
        const hp = 8 + this.wave * 5;
        this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            pathIdx: 0,
            hp: hp,
            maxHp: hp,
            speed: 1.4 + Math.min(1.2, this.wave * 0.1),
            slowTimer: 0,
            bounty: 15 + this.wave * 2
        });
        this.enemiesSpawned++;
    }

    update() {
        // Spawn waves
        this.spawnTimer++;
        if (this.spawnTimer > 40 && this.enemiesSpawned < this.enemiesInWave) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Check wave completion
        if (this.enemiesSpawned >= this.enemiesInWave && this.enemies.length === 0) {
            this.wave++;
            this.enemiesSpawned = 0;
            this.enemiesInWave += 5;
            this.gold += 100;
            this.audio.playPowerup();
        }

        // Update Enemies along path
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const target = this.path[e.pathIdx + 1];

            if (target) {
                const angle = Math.atan2(target.y - e.y, target.x - e.x);
                const currentSpeed = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
                if (e.slowTimer > 0) e.slowTimer--;

                e.x += Math.cos(angle) * currentSpeed;
                e.y += Math.sin(angle) * currentSpeed;

                if (Math.hypot(target.x - e.x, target.y - e.y) < 6) {
                    e.pathIdx++;
                }
            } else {
                // Reached castle breach!
                this.lives--;
                this.audio.playHit();
                this.enemies.splice(i, 1);
                if (this.lives <= 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }
        }

        // Tower Targeting & Firing
        this.towers.forEach(t => {
            if (t.cooldown > 0) t.cooldown--;

            if (t.cooldown <= 0) {
                // Find enemy in range
                const target = this.enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) <= t.range);
                if (target) {
                    t.cooldown = t.rate;
                    this.projectiles.push({
                        startX: t.x,
                        startY: t.y,
                        x: t.x,
                        y: t.y,
                        target: target,
                        type: t.type,
                        dmg: t.dmg,
                        color: t.color
                    });
                    this.audio.playShoot();
                }
            }
        });

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (!p.target || p.target.hp <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            p.x += Math.cos(angle) * 10;
            p.y += Math.sin(angle) * 10;

            if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 12) {
                p.target.hp -= p.dmg;

                if (p.type === 'frost') {
                    p.target.slowTimer = 45;
                }

                if (p.target.hp <= 0) {
                    this.destroyEnemy(p.target);
                }

                this.projectiles.splice(i, 1);
            }
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

    destroyEnemy(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx > -1) {
            this.gold += enemy.bounty;
            this.score += enemy.bounty * 10;
            this.audio.playScore();
            this.createSparks(enemy.x, enemy.y);
            this.enemies.splice(idx, 1);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        }
    }

    createSparks(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
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

        // Draw Road Pathway
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 44;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        this.path.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Inner pathway neon edge
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Towers
        this.towers.forEach(t => {
            // Range outline (subtle)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            ctx.stroke();

            // Tower Base
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(t.x - 16, t.y - 16, 32, 32, 6);
            ctx.fill();

            // Tower Top Cannon
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = e.slowTimer > 0 ? '#38bdf8' : '#ef4444';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
            ctx.fill();

            // Health bar
            ctx.fillStyle = '#334155';
            ctx.fillRect(e.x - 14, e.y - 18, 28, 4);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(e.x - 14, e.y - 18, (e.hp / e.maxHp) * 28, 4);
        });

        // Projectiles
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // Bottom Tower Selection Bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 420, this.canvas.width, 60);

        const types = [
            { id: 'archer', name: 'ARCHER 100G', color: '#22c55e' },
            { id: 'cannon', name: 'CANNON 150G', color: '#f59e0b' },
            { id: 'frost', name: 'FROST 125G', color: '#38bdf8' },
            { id: 'laser', name: 'LASER 200G', color: '#ec4899' }
        ];

        types.forEach((t, idx) => {
            const bx = 30 + idx * 150;
            const isSel = this.selectedTowerType === t.id;
            ctx.fillStyle = isSel ? '#334155' : '#0f172a';
            ctx.strokeStyle = isSel ? t.color : '#475569';
            ctx.lineWidth = isSel ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(bx, 428, 130, 44, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = t.color;
            ctx.font = 'bold 11px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.name, bx + 65, 455);
        });

        // Top HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`GOLD: ${this.gold}g  |  LIVES: ${this.lives}  |  WAVE: ${this.wave}`, 20, 26);
        ctx.textAlign = 'right';
        ctx.fillText(`SCORE: ${this.score}`, this.canvas.width - 20, 26);
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
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.TowerDefenseGame = TowerDefenseGame;
