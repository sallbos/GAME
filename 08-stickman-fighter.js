/**
 * Game 08: Stickman Fighter
 * 1v1 Arena fighting game with punch, kick, block, energy blasts, combos, AI sparring & impact effects.
 */
class StickmanFighterGame {
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
        this.isPaused = false;
        this.roundWins = 0;

        this.p1 = this.createFighter(180, '#38bdf8', 1);
        this.p2 = this.createFighter(460, '#ef4444', -1);

        this.projectiles = [];
        this.particles = [];
        this.combos = 0;
        this.comboTimer = 0;
        this.shakeTimer = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    createFighter(x, color, facing) {
        return {
            x,
            y: 380,
            vy: 0,
            isGrounded: true,
            color,
            facing,
            hp: 100,
            maxHp: 100,
            energy: 0,
            state: 'idle', // idle, punch, kick, block, hit
            stateTimer: 0,
            speed: 4.5
        };
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'fighter'
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
    }

    resetGame() {
        this.p1 = this.createFighter(180, '#38bdf8', 1);
        this.p2 = this.createFighter(460, '#ef4444', -1);
        this.projectiles = [];
        this.particles = [];
        this.combos = 0;
        this.comboTimer = 0;
        this.score = 0;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleKeyDown(e) {
        if (!this.isRunning || this.isPaused) return;

        if (e.code === 'KeyJ') {
            this.attack(this.p1, 'punch');
        } else if (e.code === 'KeyK') {
            this.attack(this.p1, 'kick');
        } else if (e.code === 'KeyL') {
            this.special(this.p1);
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            if (this.p1.isGrounded) {
                this.p1.vy = -12;
                this.p1.isGrounded = false;
                this.audio.playJump();
            }
        }
    }

    attack(fighter, type) {
        if (fighter.state !== 'idle') return;
        fighter.state = type;
        fighter.stateTimer = type === 'punch' ? 12 : 18;
        this.audio.playSlice();

        const range = type === 'punch' ? 55 : 70;
        const damage = type === 'punch' ? 10 : 16;
        const opponent = fighter === this.p1 ? this.p2 : this.p1;

        const distance = Math.abs(fighter.x - opponent.x);
        const isFacing = (fighter.facing === 1 && opponent.x > fighter.x) || (fighter.facing === -1 && opponent.x < fighter.x);

        if (distance < range && isFacing && Math.abs(fighter.y - opponent.y) < 40) {
            this.hitFighter(opponent, damage, fighter);
        }
    }

    special(fighter) {
        if (fighter.energy < 50 || fighter.state !== 'idle') return;
        fighter.energy -= 50;
        fighter.state = 'punch';
        fighter.stateTimer = 20;
        this.audio.playShoot();

        this.projectiles.push({
            x: fighter.x + fighter.facing * 30,
            y: fighter.y - 40,
            vx: fighter.facing * 8,
            owner: fighter,
            color: fighter.color
        });
    }

    hitFighter(target, damage, attacker) {
        let finalDmg = damage;
        if (target.state === 'block') {
            finalDmg *= 0.2;
            this.audio.playHit();
        } else {
            target.state = 'hit';
            target.stateTimer = 14;
            target.x += attacker.facing * 18;
            this.audio.playExplosion();
            this.shakeTimer = 8;
        }

        target.hp = Math.max(0, target.hp - finalDmg);
        attacker.energy = Math.min(100, attacker.energy + 15);

        this.createHitSparks(target.x, target.y - 45, attacker.color);

        if (attacker === this.p1) {
            this.combos++;
            this.comboTimer = 60;
            this.score += Math.floor(finalDmg * 10);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        }

        if (target.hp <= 0) {
            this.handleKO(target);
        }
    }

    handleKO(defeated) {
        this.isRunning = false;
        if (defeated === this.p2) {
            this.audio.playWin();
            this.roundWins++;
            this.score += 500;
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        } else {
            this.audio.playGameOver();
        }
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    update() {
        // P1 Touch / Controls
        if (this.controls.isPressed('punch')) this.attack(this.p1, 'punch');
        if (this.controls.isPressed('kick')) this.attack(this.p1, 'kick');
        if (this.controls.isPressed('special')) this.special(this.p1);
        if (this.controls.isPressed('block')) {
            this.p1.state = 'block';
        } else if (this.p1.state === 'block') {
            this.p1.state = 'idle';
        }

        if (this.controls.isPressed('left')) {
            this.p1.x -= this.p1.speed;
            this.p1.facing = -1;
        }
        if (this.controls.isPressed('right')) {
            this.p1.x += this.p1.speed;
            this.p1.facing = 1;
        }

        // Keep fighters facing each other automatically when idle
        if (this.p1.state === 'idle') {
            this.p1.facing = this.p1.x < this.p2.x ? 1 : -1;
        }
        if (this.p2.state === 'idle') {
            this.p2.facing = this.p2.x < this.p1.x ? 1 : -1;
        }

        // P1 Gravity & Physics
        this.p1.vy += 0.65;
        this.p1.y += this.p1.vy;
        if (this.p1.y >= 380) {
            this.p1.y = 380;
            this.p1.vy = 0;
            this.p1.isGrounded = true;
        }
        this.p1.x = Math.max(40, Math.min(this.canvas.width - 40, this.p1.x));

        // State Timers
        [this.p1, this.p2].forEach(f => {
            if (f.stateTimer > 0) {
                f.stateTimer--;
                if (f.stateTimer <= 0 && f.state !== 'block') {
                    f.state = 'idle';
                }
            }
        });

        // Simple AI for P2
        if (this.p2.hp > 0 && this.p2.state === 'idle') {
            const dist = Math.abs(this.p2.x - this.p1.x);
            if (dist > 70) {
                this.p2.x += (this.p1.x > this.p2.x ? 1 : -1) * (this.p2.speed * 0.7);
            } else {
                const r = Math.random();
                if (r < 0.05) this.attack(this.p2, 'punch');
                else if (r < 0.09) this.attack(this.p2, 'kick');
                else if (r < 0.12 && this.p2.energy >= 50) this.special(this.p2);
                else if (r < 0.16) this.p2.state = 'block';
            }
        }

        // P2 Gravity
        this.p2.vy += 0.65;
        this.p2.y += this.p2.vy;
        if (this.p2.y >= 380) {
            this.p2.y = 380;
            this.p2.vy = 0;
            this.p2.isGrounded = true;
        }
        this.p2.x = Math.max(40, Math.min(this.canvas.width - 40, this.p2.x));

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx;
            const target = proj.owner === this.p1 ? this.p2 : this.p1;
            if (Math.abs(proj.x - target.x) < 25 && Math.abs(proj.y - (target.y - 40)) < 35) {
                this.hitFighter(target, 25, proj.owner);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (proj.x < 0 || proj.x > this.canvas.width) {
                this.projectiles.splice(i, 1);
            }
        }

        // Combo counter timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.combos = 0;
        }

        if (this.shakeTimer > 0) this.shakeTimer--;

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.05;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    createHitSparks(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color
            });
        }
    }

    drawStickman(f) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.strokeStyle = f.color;
        ctx.fillStyle = f.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(0, -70, 10, 0, Math.PI * 2);
        ctx.fill();

        // Spine
        ctx.beginPath();
        ctx.moveTo(0, -60);
        ctx.lineTo(0, -25);
        ctx.stroke();

        // Limbs based on state
        const fac = f.facing;
        if (f.state === 'punch') {
            // Punching arm extended
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(fac * 30, -50);
            ctx.stroke();
            // Other arm guard
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(fac * 10, -40);
            ctx.stroke();
        } else if (f.state === 'kick') {
            // Legs in kick stance
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(fac * 35, -40);
            ctx.stroke();
            // Standing leg
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(-fac * 8, 0);
            ctx.stroke();
        } else if (f.state === 'block') {
            // Crossed arms in front
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(fac * 14, -55);
            ctx.lineTo(fac * 14, -40);
            ctx.stroke();
        } else {
            // Idle arms
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(fac * 12, -35);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(-fac * 10, -35);
            ctx.stroke();
        }

        if (f.state !== 'kick') {
            // Regular legs
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(fac * 10, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(-fac * 10, 0);
            ctx.stroke();
        }

        ctx.restore();
    }

    draw() {
        const ctx = this.ctx;
        ctx.save();
        if (this.shakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        }

        // Arena Background
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Arena floor
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 380, this.canvas.width, 100);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 380);
        ctx.lineTo(this.canvas.width, 380);
        ctx.stroke();

        // Projectiles
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Draw Fighters
        this.drawStickman(this.p1);
        this.drawStickman(this.p2);

        // Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.fillRect(pt.x, pt.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // HUD - Health Bars
        // P1 Health
        ctx.fillStyle = '#334155';
        ctx.fillRect(40, 30, 220, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(40, 30, (this.p1.hp / this.p1.maxHp) * 220, 16);

        // P1 Energy
        ctx.fillStyle = '#eab308';
        ctx.fillRect(40, 50, (this.p1.energy / 100) * 220, 6);

        // P2 Health
        ctx.fillStyle = '#334155';
        ctx.fillRect(this.canvas.width - 260, 30, 220, 16);
        ctx.fillStyle = '#ef4444';
        const p2BarW = (this.p2.hp / this.p2.maxHp) * 220;
        ctx.fillRect(this.canvas.width - 40 - p2BarW, 30, p2BarW, 16);

        // P2 Energy
        ctx.fillStyle = '#eab308';
        const p2EnergyW = (this.p2.energy / 100) * 220;
        ctx.fillRect(this.canvas.width - 40 - p2EnergyW, 50, p2EnergyW, 6);

        // VS Logo
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VS', this.canvas.width / 2, 45);

        // Combo counter
        if (this.combos > 1) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 24px Orbitron, sans-serif';
            ctx.fillText(`${this.combos} HITS!`, 100, 100);
        }

        ctx.restore();
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

window.StickmanFighterGame = StickmanFighterGame;
