/**
 * Game 02: Flappy Bird-inspired Original Game ("Cyber Flap")
 * Smooth physics, cyber drone flap, parallax background, pipes with collision detection, and score tracking.
 */
class FlappyBirdGame {
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
        this.hasStarted = false;

        this.bird = {
            x: 80,
            y: 200,
            radius: 14,
            velocity: 0,
            gravity: 0.36,
            jumpStrength: -6.5,
            rotation: 0
        };

        this.pipes = [];
        this.pipeWidth = 60;
        this.pipeGap = 135;
        this.pipeSpawnTimer = 0;
        this.pipeSpeed = 2.2;
        this.stars = [];
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'action-only',
            { action: 'FLAP 🚀' }
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        window.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('pointerdown', this.handleClick);
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 480;
        this.canvas.height = 640;
        this.stars = [];
        for (let i = 0; i < 40; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * (this.canvas.height - 100),
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    }

    resetGame() {
        this.bird.x = 90;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.particles = [];
        this.pipeSpawnTimer = 0;
        this.score = 0;
        this.hasStarted = false;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    flap() {
        if (!this.isRunning || this.isPaused) return;
        this.hasStarted = true;
        this.bird.velocity = this.bird.jumpStrength;
        this.audio.playJump();

        // Spawn jet particles
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.bird.x - 10,
                y: this.bird.y + (Math.random() - 0.5) * 8,
                vx: -Math.random() * 3 - 1,
                vy: (Math.random() - 0.5) * 2,
                life: 1,
                color: '#38bdf8'
            });
        }
    }

    handleKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            this.flap();
        }
    }

    handleClick(e) {
        this.flap();
    }

    spawnPipe() {
        const minHeight = 60;
        const maxHeight = this.canvas.height - this.pipeGap - minHeight - 60;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;

        this.pipes.push({
            x: this.canvas.width + 10,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - (topHeight + this.pipeGap) - 50,
            passed: false
        });
    }

    update() {
        if (!this.hasStarted) {
            this.bird.y = this.canvas.height / 2 + Math.sin(performance.now() * 0.005) * 8;
            return;
        }

        // Apply bird physics
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        this.bird.rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, this.bird.velocity * 0.07));

        // Ground / Ceiling collision
        const groundY = this.canvas.height - 50;
        if (this.bird.y + this.bird.radius >= groundY) {
            this.bird.y = groundY - this.bird.radius;
            this.gameOver();
            return;
        }
        if (this.bird.y - this.bird.radius <= 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0;
        }

        // Spawn pipes
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > 95) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // Score check
            if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
                p.passed = true;
                this.score++;
                this.audio.playScore();
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }

            // Collision check (AABB vs Circle)
            if (this.checkPipeCollision(p)) {
                this.gameOver();
                return;
            }

            // Remove off-screen pipes
            if (p.x + this.pipeWidth < -20) {
                this.pipes.splice(i, 1);
            }
        }

        // Update stars
        this.stars.forEach(s => {
            s.x -= s.speed;
            if (s.x < 0) s.x = this.canvas.width;
        });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Check virtual touch action button
        if (this.controls.isPressed('action')) {
            this.flap();
            this.controls.buttons['action'] = false; // consume trigger
        }
    }

    checkPipeCollision(pipe) {
        const bx = this.bird.x;
        const by = this.bird.y;
        const r = this.bird.radius - 2;

        // Top Pipe rect: (pipe.x, 0, this.pipeWidth, pipe.topHeight)
        if (bx + r > pipe.x && bx - r < pipe.x + this.pipeWidth) {
            if (by - r < pipe.topHeight) return true;
        }

        // Bottom Pipe rect: (pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight)
        if (bx + r > pipe.x && bx - r < pipe.x + this.pipeWidth) {
            if (by + r > pipe.bottomY) return true;
        }

        return false;
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playExplosion();
        if (this.options.onGameOver) {
            this.options.onGameOver(this.score);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Pipes
        this.pipes.forEach(p => {
            // Top Pipe
            const gradTop = ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
            gradTop.addColorStop(0, '#0284c7');
            gradTop.addColorStop(0.5, '#38bdf8');
            gradTop.addColorStop(1, '#0369a1');

            ctx.fillStyle = gradTop;
            ctx.fillRect(p.x, 0, this.pipeWidth, p.topHeight);
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(p.x - 2, p.topHeight - 16, this.pipeWidth + 4, 16);

            // Bottom Pipe
            const gradBottom = ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
            gradBottom.addColorStop(0, '#0284c7');
            gradBottom.addColorStop(0.5, '#38bdf8');
            gradBottom.addColorStop(1, '#0369a1');

            ctx.fillStyle = gradBottom;
            ctx.fillRect(p.x, p.bottomY, this.pipeWidth, p.bottomHeight);
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(p.x - 2, p.bottomY, this.pipeWidth + 4, 16);

            // Neon edge glow
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, 0, this.pipeWidth, p.topHeight);
            ctx.strokeRect(p.x, p.bottomY, this.pipeWidth, p.bottomHeight);
        });

        // Draw Ground
        const groundY = this.canvas.height - 50;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY, this.canvas.width, 50);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.canvas.width, groundY);
        ctx.stroke();

        // Draw Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // Draw Bird (Cyber Drone)
        ctx.save();
        ctx.translate(this.bird.x, this.bird.y);
        ctx.rotate(this.bird.rotation);

        // Body
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye / Visor
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(4, -5, 8, 5);

        // Wing
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(-4, 2, 7, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Beak / Thruster
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(14, -2);
        ctx.lineTo(20, 2);
        ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Prompt if not started
        if (!this.hasStarted) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK OR PRESS SPACE TO FLAP', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
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
            this.pipeGap = 155;
            this.pipeSpeed = 1.9;
        } else if (diff === 'Hard') {
            this.pipeGap = 120;
            this.pipeSpeed = 2.6;
        } else {
            this.pipeGap = 135;
            this.pipeSpeed = 2.2;
        }
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.FlappyBirdGame = FlappyBirdGame;
