/**
 * Game 20: Bike Racing (Hill Climb Trials)
 * Physics-based motorbike simulator with terrain deformation, wheel springs, backflips, stunts & coin pickups.
 */
class BikeRacingGame {
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

        this.bike = {
            x: 100,
            y: 200,
            vx: 0,
            vy: 0,
            angle: 0,
            angularVelocity: 0,
            wheelRadius: 12,
            wheelBase: 36,
            isGrounded: false
        };

        this.airRotation = 0;
        this.terrain = [];
        this.coins = [];
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'bike'
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
        this.bike.x = 100;
        this.bike.y = 200;
        this.bike.vx = 0;
        this.bike.vy = 0;
        this.bike.angle = 0;
        this.bike.angularVelocity = 0;
        this.score = 0;
        this.distance = 0;
        this.airRotation = 0;
        this.particles = [];

        // Generate hilly terrain heights
        this.generateTerrain();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    generateTerrain() {
        this.terrain = [];
        this.coins = [];
        for (let i = 0; i < 600; i++) {
            const worldX = i * 20;
            // Wave formulation for nice undulating hills and jumps
            const y = 350 + Math.sin(worldX * 0.008) * 60 + Math.sin(worldX * 0.02) * 35;
            this.terrain.push({ x: worldX, y });

            // Place coins on hill peaks
            if (i > 10 && i % 14 === 0) {
                this.coins.push({ x: worldX, y: y - 35, collected: false });
            }
        }
    }

    getTerrainY(worldX) {
        if (worldX < 0) return 350;
        const index = Math.floor(worldX / 20);
        if (index >= this.terrain.length - 1) return 350;
        const t = (worldX % 20) / 20;
        return this.terrain[index].y * (1 - t) + this.terrain[index + 1].y * t;
    }

    handleKeyDown(e) {
        // Controls handled via polling
    }

    update() {
        const b = this.bike;

        // Player Controls
        const isGas = this.controls.isPressed('up') || this.controls.isPressed('action');
        const isBrake = this.controls.isPressed('down');
        const isLeanLeft = this.controls.isPressed('left');
        const isLeanRight = this.controls.isPressed('right');

        if (isGas) {
            b.vx += Math.cos(b.angle) * 0.28;
            b.vy += Math.sin(b.angle) * 0.28;
            b.angularVelocity += 0.003;
        }
        if (isBrake) {
            b.vx *= 0.94;
        }
        if (isLeanLeft) {
            b.angularVelocity -= 0.012; // tilt back
        }
        if (isLeanRight) {
            b.angularVelocity += 0.012; // tilt forward
        }

        // Gravity & Damping
        b.vy += 0.38;
        b.vx *= 0.985;
        b.angularVelocity *= 0.94;

        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.angularVelocity;

        // Ground / Wheel Contact Check
        const rearWheelX = b.x - Math.cos(b.angle) * (b.wheelBase / 2);
        const rearWheelY = b.y - Math.sin(b.angle) * (b.wheelBase / 2);
        const frontWheelX = b.x + Math.cos(b.angle) * (b.wheelBase / 2);
        const frontWheelY = b.y + Math.sin(b.angle) * (b.wheelBase / 2);

        const groundRear = this.getTerrainY(rearWheelX);
        const groundFront = this.getTerrainY(frontWheelX);

        b.isGrounded = false;

        if (rearWheelY + b.wheelRadius >= groundRear) {
            b.y = groundRear - b.wheelRadius + Math.sin(b.angle) * (b.wheelBase / 2);
            b.vy = Math.min(0, b.vy * -0.2);
            b.isGrounded = true;
        }

        if (frontWheelY + b.wheelRadius >= groundFront) {
            b.y = groundFront - b.wheelRadius - Math.sin(b.angle) * (b.wheelBase / 2);
            b.vy = Math.min(0, b.vy * -0.2);
            b.isGrounded = true;
        }

        // Align with slope when on ground
        if (b.isGrounded) {
            const slopeAngle = Math.atan2(groundFront - groundRear, b.wheelBase);
            b.angle += (slopeAngle - b.angle) * 0.22;
        } else {
            // Count air flips
            this.airRotation += b.angularVelocity;
            if (Math.abs(this.airRotation) >= Math.PI * 2) {
                this.score += 250;
                this.audio.playPowerup();
                this.airRotation = 0;
            }
        }

        // Crash Check (Rider head hits ground)
        const headX = b.x - Math.sin(b.angle) * 28;
        const headY = b.y - Math.cos(b.angle) * 28;
        if (headY >= this.getTerrainY(headX)) {
            this.createCrashParticles(headX, headY);
            this.gameOver();
            return;
        }

        // Distance & score
        this.distance = Math.max(this.distance, b.x);
        this.score = Math.floor(this.distance / 10);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        // Collect Coins
        this.coins.forEach(c => {
            if (!c.collected && Math.hypot(b.x - c.x, b.y - c.y) < 35) {
                c.collected = true;
                this.score += 50;
                this.audio.playScore();
            }
        });

        // Exhaust smoke particles when accelerating
        if (isGas && Math.random() < 0.5) {
            this.particles.push({
                x: rearWheelX,
                y: rearWheelY,
                vx: -Math.cos(b.angle) * 3 + (Math.random() - 0.5),
                vy: (Math.random() - 0.5) * 2,
                life: 0.8,
                color: '#64748b'
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    createCrashParticles(x, y) {
        for (let i = 0; i < 20; i++) {
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
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Camera scroll offset follows bike X
        const camX = this.bike.x - 180;

        ctx.save();
        ctx.translate(-camX, 0);

        // Draw Hills Terrain
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(camX - 50, this.canvas.height);

        for (let i = 0; i < this.terrain.length; i++) {
            const pt = this.terrain[i];
            if (pt.x >= camX - 60 && pt.x <= camX + this.canvas.width + 60) {
                ctx.lineTo(pt.x, pt.y);
            }
        }
        ctx.lineTo(camX + this.canvas.width + 60, this.canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Coins
        this.coins.forEach(c => {
            if (!c.collected && c.x >= camX - 20 && c.x <= camX + this.canvas.width + 20) {
                ctx.fillStyle = '#eab308';
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });

        // Draw Bike
        const b = this.bike;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Wheels
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.5;

        // Rear Wheel
        ctx.beginPath();
        ctx.arc(-b.wheelBase / 2, 0, b.wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Front Wheel
        ctx.beginPath();
        ctx.arc(b.wheelBase / 2, 0, b.wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Chassis Frame
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-b.wheelBase / 2, 0);
        ctx.lineTo(0, -12);
        ctx.lineTo(b.wheelBase / 2, 0);
        ctx.lineTo(2, -22);
        ctx.lineTo(0, -12);
        ctx.stroke();

        // Rider Stickman
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        // Body
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-6, -28);
        ctx.lineTo(8, -22); // Hands to handlebars
        ctx.stroke();

        // Head & Helmet
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-6, -34, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        ctx.restore();

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

window.BikeRacingGame = BikeRacingGame;
