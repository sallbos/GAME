/**
 * Game 17: Basketball Challenge
 * Arc shooting physics, drag-to-aim trajectory, backboard/rim collisions, moving hoops & swish streaks.
 */
class BasketballGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.isRunning = false;
        this.streak = 0;

        this.hoop = {
            x: 480,
            y: 200,
            rimW: 60,
            rimH: 8,
            vy: 0.8,
            isMoving: false
        };

        this.ball = {
            x: 120,
            y: 420,
            radius: 18,
            vx: 0,
            vy: 0,
            gravity: 0.45,
            isShot: false,
            scored: false
        };

        this.aim = {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };

        this.particles = [];

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
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

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 520;
    }

    resetGame() {
        this.score = 0;
        this.timeLeft = 60;
        this.streak = 0;
        this.resetBall();
        this.hoop.isMoving = false;

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isRunning) {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.gameOver();
                }
            }
        }, 1000);

        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    resetBall() {
        this.ball.x = 120 + (Math.random() - 0.5) * 60;
        this.ball.y = 420;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.isShot = false;
        this.ball.scored = false;
    }

    handlePointerDown(e) {
        if (!this.isRunning || this.ball.isShot) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        if (Math.hypot(mx - this.ball.x, my - this.ball.y) < 50) {
            this.aim.isDragging = true;
            this.aim.startX = mx;
            this.aim.startY = my;
            this.aim.currentX = mx;
            this.aim.currentY = my;
        }
    }

    handlePointerMove(e) {
        if (!this.aim.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.aim.currentX = (e.clientX - rect.left) * scaleX;
        this.aim.currentY = (e.clientY - rect.top) * scaleY;
    }

    handlePointerUp() {
        if (!this.aim.isDragging) return;
        this.aim.isDragging = false;

        const dx = this.aim.startX - this.aim.currentX;
        const dy = this.aim.startY - this.aim.currentY;

        if (Math.hypot(dx, dy) > 20) {
            this.ball.vx = dx * 0.16;
            this.ball.vy = dy * 0.16;
            this.ball.isShot = true;
            this.audio.playJump();
        }
    }

    update() {
        // Move hoop on higher score
        if (this.score >= 50) {
            this.hoop.isMoving = true;
            this.hoop.y += this.hoop.vy;
            if (this.hoop.y < 120 || this.hoop.y > 280) {
                this.hoop.vy = -this.hoop.vy;
            }
        }

        if (this.ball.isShot) {
            this.ball.vy += this.ball.gravity;
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            // Hoop collision logic
            const rimLeft = this.hoop.x;
            const rimRight = this.hoop.x + this.hoop.rimW;
            const rimY = this.hoop.y;

            // Backboard collision (x = rimRight + 12)
            const bbX = rimRight + 8;
            if (
                this.ball.x + this.ball.radius >= bbX &&
                this.ball.x - this.ball.radius <= bbX + 10 &&
                this.ball.y >= rimY - 80 &&
                this.ball.y <= rimY + 20
            ) {
                this.ball.x = bbX - this.ball.radius;
                this.ball.vx = -this.ball.vx * 0.6;
                this.audio.playBounce();
            }

            // Rim edges collision
            [rimLeft, rimRight].forEach(rx => {
                const dist = Math.hypot(this.ball.x - rx, this.ball.y - rimY);
                if (dist < this.ball.radius + 4) {
                    this.ball.vx = -this.ball.vx * 0.5;
                    this.ball.vy = -this.ball.vy * 0.5;
                    this.audio.playHit();
                }
            });

            // Score Detection (ball passes downward through rim cylinder)
            if (
                !this.ball.scored &&
                this.ball.vy > 0 &&
                this.ball.x > rimLeft + 5 &&
                this.ball.x < rimRight - 5 &&
                this.ball.y >= rimY - 5 &&
                this.ball.y <= rimY + 15
            ) {
                this.ball.scored = true;
                this.streak++;
                const pts = 2 * this.streak;
                this.score += pts;
                this.audio.playScore();
                this.createNetParticles(this.hoop.x + this.hoop.rimW / 2, rimY + 15);
                if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            }

            // Floor bounce
            if (this.ball.y + this.ball.radius >= 480) {
                this.ball.y = 480 - this.ball.radius;
                this.ball.vy = -this.ball.vy * 0.5;
                this.ball.vx *= 0.8;
                if (!this.ball.scored && Math.abs(this.ball.vy) < 2) {
                    this.streak = 0; // streak lost on miss
                    this.resetBall();
                }
            }

            // Reset ball if off-screen
            if (this.ball.x > this.canvas.width + 40 || this.ball.x < -40 || this.ball.y > 600) {
                if (!this.ball.scored) this.streak = 0;
                this.resetBall();
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

    createNetParticles(x, y) {
        for (let i = 0; i < 14; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 4 + 1,
                life: 1,
                color: '#f8fafc'
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Floor / Court
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 480, this.canvas.width, 40);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 480, this.canvas.width, 4);

        // Draw Aim Trajectory
        if (this.aim.isDragging) {
            const dx = this.aim.startX - this.aim.currentX;
            const dy = this.aim.startY - this.aim.currentY;
            let simX = this.ball.x;
            let simY = this.ball.y;
            let simVx = dx * 0.16;
            let simVy = dy * 0.16;

            ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
            for (let step = 0; step < 22; step++) {
                simVy += this.ball.gravity;
                simX += simVx;
                simY += simVy;
                if (step % 2 === 0) {
                    ctx.beginPath();
                    ctx.arc(simX, simY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw Backboard & Hoop
        const rimX = this.hoop.x;
        const rimY = this.hoop.y;
        const bbX = rimX + this.hoop.rimW + 8;

        // Backboard
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(bbX, rimY - 80, 10, 100);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bbX - 2, rimY - 45, 4, 40);

        // Rim
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(rimX + this.hoop.rimW / 2, rimY, this.hoop.rimW / 2, 7, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Net (white grid lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rimX, rimY);
        ctx.lineTo(rimX + 15, rimY + 35);
        ctx.lineTo(rimX + this.hoop.rimW - 15, rimY + 35);
        ctx.lineTo(rimX + this.hoop.rimW, rimY);
        ctx.stroke();

        // Draw Ball
        ctx.save();
        ctx.translate(this.ball.x, this.ball.y);
        ctx.fillStyle = '#ea580c';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ball Ribs / Seams
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.ball.radius, -0.6, 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-this.ball.radius, 0);
        ctx.lineTo(this.ball.radius, 0);
        ctx.stroke();
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
        ctx.textAlign = 'center';
        if (this.streak > 1) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`STREAK x${this.streak}! 🔥`, this.canvas.width / 2, 30);
        }
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(`TIME: ${this.timeLeft}s`, this.canvas.width - 20, 30);

        if (!this.ball.isShot && !this.aim.isDragging) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('DRAG BALL BACK TO AIM & SHOOT', 60, 470);
        }
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
        clearInterval(this.timerInterval);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        this.controls.destroyTouchOverlay();
    }
}

window.BasketballGame = BasketballGame;
