/**
 * Game 25: Dungeon Explorer
 * Top-down roguelite crawler with rooms, sword slashing, skeleton warriors, treasure chests & floor stairs.
 */
class DungeonExplorerGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.floor = 1;
        this.isRunning = false;

        this.player = {
            x: 320,
            y: 380,
            radius: 14,
            speed: 3.6,
            angle: 0,
            hp: 100,
            maxHp: 100,
            keys: 0,
            isAttacking: false,
            attackTimer: 0
        };

        this.monsters = [];
        this.chests = [];
        this.stairs = { x: 320, y: 100 };
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-action',
            { action: 'SWORD ⚔' }
        );
        this.resetGame();
        this.isRunning = true;

        window.addEventListener('keydown', this.handleKeyDown);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    resetGame() {
        this.floor = 1;
        this.score = 0;
        this.player.hp = 100;
        this.player.keys = 0;
        this.generateFloor();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    generateFloor() {
        this.player.x = 320;
        this.player.y = 400;
        this.monsters = [];
        this.chests = [];
        this.particles = [];

        // Spawn 4-7 monsters
        const count = 4 + this.floor * 2;
        for (let i = 0; i < count; i++) {
            this.monsters.push({
                x: Math.random() * 480 + 80,
                y: Math.random() * 260 + 80,
                hp: 3 + this.floor,
                maxHp: 3 + this.floor,
                speed: 1.2 + Math.random() * 0.8,
                type: Math.random() < 0.5 ? 'slime' : 'skeleton'
            });
        }

        // Spawn 2-3 chests
        for (let i = 0; i < 3; i++) {
            this.chests.push({
                x: 120 + i * 200,
                y: 120 + (i % 2) * 160,
                opened: false
            });
        }

        this.stairs = { x: 320, y: 80 };
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        if (e.code === 'Space' || e.code === 'KeyJ') {
            this.attack();
        }
    }

    attack() {
        if (this.player.attackTimer > 0) return;
        this.player.isAttacking = true;
        this.player.attackTimer = 16;
        this.audio.playSlice();

        // Check hit arc
        const swordRange = 45;
        this.monsters.forEach(m => {
            const dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (dist < swordRange + 15) {
                m.hp -= 2;
                this.audio.playHit();
                this.createBlood(m.x, m.y, '#22c55e');

                // Knockback
                const angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                m.x += Math.cos(angle) * 20;
                m.y += Math.sin(angle) * 20;

                if (m.hp <= 0) {
                    this.destroyMonster(m);
                }
            }
        });
    }

    destroyMonster(m) {
        const idx = this.monsters.indexOf(m);
        if (idx > -1) {
            this.score += 50;
            this.audio.playExplosion();
            this.monsters.splice(idx, 1);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        }
    }

    createBlood(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1,
                color
            });
        }
    }

    update() {
        // Player Attack Cooldown
        if (this.player.attackTimer > 0) {
            this.player.attackTimer--;
            if (this.player.attackTimer <= 0) {
                this.player.isAttacking = false;
            }
        }

        if (this.controls.isPressed('action')) {
            this.attack();
        }

        // Movement
        const vec = this.controls.getVector();
        this.player.x += vec.x * this.player.speed;
        this.player.y += vec.y * this.player.speed;

        if (vec.x !== 0 || vec.y !== 0) {
            this.player.angle = Math.atan2(vec.y, vec.x);
        }

        // Dungeon Walls Bounds
        this.player.x = Math.max(50, Math.min(this.canvas.width - 50, this.player.x));
        this.player.y = Math.max(70, Math.min(this.canvas.height - 50, this.player.y));

        // Update Monsters
        this.monsters.forEach(m => {
            const dist = Math.hypot(this.player.x - m.x, this.player.y - m.y);
            if (dist < 220) {
                const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
                m.x += Math.cos(angle) * m.speed;
                m.y += Math.sin(angle) * m.speed;

                // Attack Player
                if (dist < this.player.radius + 14) {
                    this.player.hp -= 0.5;
                    this.audio.playHit();
                    if (this.player.hp <= 0) {
                        this.gameOver();
                    }
                }
            }
        });

        // Open Chests
        this.chests.forEach(c => {
            if (!c.opened && Math.hypot(this.player.x - c.x, this.player.y - c.y) < 30) {
                c.opened = true;
                this.score += 100;
                this.player.hp = Math.min(100, this.player.hp + 30);
                this.audio.playPowerup();
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }
        });

        // Stairs to Next Floor
        if (Math.hypot(this.player.x - this.stairs.x, this.player.y - this.stairs.y) < 25) {
            this.floor++;
            this.score += 200;
            this.audio.playWin();
            this.generateFloor();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
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

        // Dungeon Stone Floor
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dungeon Stone Walls
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, 50);
        ctx.fillRect(0, 0, 40, this.canvas.height);
        ctx.fillRect(this.canvas.width - 40, 0, 40, this.canvas.height);
        ctx.fillRect(0, this.canvas.height - 40, this.canvas.width, 40);

        // Grid flagstones
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 40; x < this.canvas.width - 40; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, this.canvas.height - 40); ctx.stroke();
        }
        for (let y = 50; y < this.canvas.height - 40; y += 40) {
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(this.canvas.width - 40, y); ctx.stroke();
        }

        // Stairs Down
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(this.stairs.x - 16, this.stairs.y - 16, 32, 32);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼', this.stairs.x, this.stairs.y);

        // Chests
        this.chests.forEach(c => {
            ctx.fillStyle = c.opened ? '#94a3b8' : '#eab308';
            ctx.shadowColor = c.opened ? 'transparent' : '#facc15';
            ctx.shadowBlur = c.opened ? 0 : 8;
            ctx.beginPath();
            ctx.roundRect(c.x - 12, c.y - 10, 24, 20, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Monsters
        this.monsters.forEach(m => {
            ctx.fillStyle = m.type === 'slime' ? '#22c55e' : '#e2e8f0';
            ctx.beginPath();
            ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Monster eyes
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(m.x - 5, m.y - 4, 3, 3);
            ctx.fillRect(m.x + 2, m.y - 4, 3, 3);

            // Health bar
            ctx.fillStyle = '#334155';
            ctx.fillRect(m.x - 14, m.y - 22, 28, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(m.x - 14, m.y - 22, (m.hp / m.maxHp) * 28, 4);
        });

        // Player (Knight)
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.angle);

        // Sword Swing
        if (this.player.isAttacking) {
            ctx.strokeStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 36, -0.6, 0.6);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Shield
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(4, -14, 6, 12);

        // Armor Body
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
        ctx.fill();

        // Helmet Plume
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, -4, 8, 8);

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
        ctx.fillText(`FLOOR: ${this.floor}  |  SCORE: ${this.score}`, 20, 28);

        // Health Bar
        ctx.fillText(`HP:`, 20, 48);
        ctx.fillStyle = '#334155';
        ctx.fillRect(55, 38, 120, 10);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(55, 38, (this.player.hp / this.player.maxHp) * 120, 10);
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
        window.removeEventListener('keydown', this.handleKeyDown);
        this.controls.destroyTouchOverlay();
    }
}

window.DungeonExplorerGame = DungeonExplorerGame;
