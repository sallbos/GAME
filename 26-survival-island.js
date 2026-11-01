/**
 * Game 26: Survival Island
 * Wilderness crafting simulator with Day/Night cycle, wood chopping, rock mining, hunger & campfire warmth.
 */
class SurvivalIslandGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.day = 1;
        this.timeOfDay = 0; // 0 to 1 (0 = morning, 0.5 = noon, 0.75 = night)
        this.score = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;

        this.player = {
            x: 320,
            y: 240,
            hp: 100,
            hunger: 100,
            warmth: 100,
            speed: 3.5,
            wood: 10,
            stone: 5,
            food: 4
        };

        this.resources = [];
        this.campfires = [];
        this.wolves = [];
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-action',
            { action: 'INTERACT 🪓', shoot: 'CRAFT 🔥' }
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
        this.day = 1;
        this.timeOfDay = 0.2;
        this.score = 0;
        this.player.x = 320;
        this.player.y = 240;
        this.player.hp = 100;
        this.player.hunger = 100;
        this.player.warmth = 100;
        this.player.wood = 10;
        this.player.stone = 5;
        this.player.food = 4;

        this.campfires = [{ x: 320, y: 240, fuel: 100 }];
        this.spawnIslandResources();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    spawnIslandResources() {
        this.resources = [];
        // Palm trees
        for (let i = 0; i < 12; i++) {
            this.resources.push({
                x: Math.random() * 440 + 100,
                y: Math.random() * 320 + 80,
                type: 'tree',
                hp: 3
            });
        }
        // Rocks
        for (let i = 0; i < 8; i++) {
            this.resources.push({
                x: Math.random() * 440 + 100,
                y: Math.random() * 320 + 80,
                type: 'rock',
                hp: 4
            });
        }
        // Berry bushes
        for (let i = 0; i < 8; i++) {
            this.resources.push({
                x: Math.random() * 440 + 100,
                y: Math.random() * 320 + 80,
                type: 'berry',
                hp: 1
            });
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        if (e.code === 'Space' || e.key === 'e' || e.key === 'E') {
            this.interact();
        } else if (e.code === 'KeyC') {
            this.craftCampfire();
        } else if (e.code === 'KeyF') {
            this.eatFood();
        }
    }

    interact() {
        // Find nearest resource
        for (let i = this.resources.length - 1; i >= 0; i--) {
            const res = this.resources[i];
            if (Math.hypot(this.player.x - res.x, this.player.y - res.y) < 36) {
                res.hp--;
                this.audio.playHit();

                if (res.type === 'tree') {
                    this.player.wood += 2;
                    this.createParticles(res.x, res.y, '#16a34a');
                } else if (res.type === 'rock') {
                    this.player.stone += 2;
                    this.createParticles(res.x, res.y, '#94a3b8');
                } else if (res.type === 'berry') {
                    this.player.food += 2;
                    this.createParticles(res.x, res.y, '#dc2626');
                }

                if (res.hp <= 0) {
                    this.audio.playScore();
                    this.resources.splice(i, 1);
                }
                return;
            }
        }

        // Eat food if no resource nearby
        this.eatFood();
    }

    eatFood() {
        if (this.player.food > 0 && this.player.hunger < 100) {
            this.player.food--;
            this.player.hunger = Math.min(100, this.player.hunger + 30);
            this.player.hp = Math.min(100, this.player.hp + 15);
            this.audio.playPop();
        }
    }

    craftCampfire() {
        if (this.player.wood >= 5 && this.player.stone >= 3) {
            this.player.wood -= 5;
            this.player.stone -= 3;
            this.campfires.push({
                x: this.player.x,
                y: this.player.y,
                fuel: 100
            });
            this.audio.playPowerup();
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color
            });
        }
    }

    update() {
        // Controls
        const vec = this.controls.getVector();
        this.player.x += vec.x * this.player.speed;
        this.player.y += vec.y * this.player.speed;

        // Keep inside island bounds
        this.player.x = Math.max(60, Math.min(this.canvas.width - 60, this.player.x));
        this.player.y = Math.max(60, Math.min(this.canvas.height - 60, this.player.y));

        if (this.controls.isPressed('action')) {
            this.interact();
            this.controls.buttons['action'] = false;
        }
        if (this.controls.isPressed('shoot')) {
            this.craftCampfire();
            this.controls.buttons['shoot'] = false;
        }

        // Day/Night Cycle Progression
        this.timeOfDay = (this.timeOfDay + 0.0006) % 1;
        if (this.timeOfDay < 0.0006) {
            this.day++;
            this.score += 200;
            this.spawnIslandResources();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        }

        // Hunger decay
        this.player.hunger = Math.max(0, this.player.hunger - 0.035);

        // Warmth logic (cold at night unless near campfire)
        const isNight = this.timeOfDay > 0.65 && this.timeOfDay < 0.95;
        let nearFire = false;

        this.campfires.forEach(f => {
            f.fuel -= 0.04;
            if (Math.hypot(this.player.x - f.x, this.player.y - f.y) < 90 && f.fuel > 0) {
                nearFire = true;
            }
        });

        if (isNight && !nearFire) {
            this.player.warmth = Math.max(0, this.player.warmth - 0.12);
        } else {
            this.player.warmth = Math.min(100, this.player.warmth + 0.2);
        }

        // Health penalties
        if (this.player.hunger <= 0 || this.player.warmth <= 0) {
            this.player.hp -= 0.15;
            if (this.player.hp <= 0) {
                this.gameOver();
                return;
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

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;

        // Ocean Sea
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Island Sand Beach
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(this.canvas.width / 2, this.canvas.height / 2, 280, 200, 0, 0, Math.PI * 2);
        ctx.fill();

        // Island Green Grass
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(this.canvas.width / 2, this.canvas.height / 2, 250, 170, 0, 0, Math.PI * 2);
        ctx.fill();

        // Campfires
        this.campfires.forEach(f => {
            if (f.fuel > 0) {
                ctx.fillStyle = '#f97316';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(f.x, f.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });

        // Resources
        this.resources.forEach(r => {
            if (r.type === 'tree') {
                ctx.fillStyle = '#16a34a';
                ctx.beginPath();
                ctx.arc(r.x, r.y - 12, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.fillRect(r.x - 4, r.y - 4, 8, 14);
            } else if (r.type === 'rock') {
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath();
                ctx.roundRect(r.x - 10, r.y - 8, 20, 16, 4);
                ctx.fill();
            } else {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(r.x, r.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Player (Survivor)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Night Lighting Overlay
        const isNight = this.timeOfDay > 0.65 && this.timeOfDay < 0.95;
        const darkness = isNight ? 0.75 : (this.timeOfDay > 0.55 ? 0.35 : 0);

        if (darkness > 0) {
            ctx.fillStyle = `rgba(15, 23, 42, ${darkness})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // Top Status HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`DAY ${this.day}  |  🪵 WOOD: ${this.player.wood}  🪨 STONE: ${this.player.stone}  🍎 FOOD: ${this.player.food}`, 20, 26);

        // Status Bars (Health, Hunger, Warmth)
        ctx.fillText(`HP:`, 20, 50);
        ctx.fillStyle = '#334155'; ctx.fillRect(55, 40, 70, 8);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(55, 40, (this.player.hp / 100) * 70, 8);

        ctx.fillStyle = '#ffffff'; ctx.fillText(`HUNGER:`, 140, 50);
        ctx.fillStyle = '#334155'; ctx.fillRect(210, 40, 70, 8);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(210, 40, (this.player.hunger / 100) * 70, 8);

        ctx.fillStyle = '#ffffff'; ctx.fillText(`WARMTH:`, 300, 50);
        ctx.fillStyle = '#334155'; ctx.fillRect(380, 40, 70, 8);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(380, 40, (this.player.warmth / 100) * 70, 8);
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

window.SurvivalIslandGame = SurvivalIslandGame;
