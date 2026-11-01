/**
 * Game 04: Breakout
 * Neon arcade brick breaker with ball physics, multi-ball, wide paddle powerups & explosive bricks.
 */
class BreakoutGame {
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

        this.paddle = {
            width: 100,
            height: 14,
            x: 250,
            y: 560,
            speed: 8
        };

        this.balls = [];
        this.bricks = [];
        this.powerups = [];
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'steer-pedals'
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;

        window.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 600;
        this.canvas.height = 620;
    }

    resetGame() {
        this.paddle.width = 100;
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
        this.paddle.y = this.canvas.height - 40;
        this.lives = 3;
        this.score = 0;
        this.balls = [];
        this.powerups = [];
        this.particles = [];
        this.spawnBall();
        this.createBricks();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    spawnBall() {
        this.balls.push({
            x: this.paddle.x + this.paddle.width / 2,
            y: this.paddle.y - 12,
            radius: 7,
            vx: (Math.random() - 0.5) * 4 || 3,
            vy: -5.5
        });
    }

    createBricks() {
        this.bricks = [];
        const rows = 5;
        const cols = 9;
        const brickW = 56;
        const brickH = 20;
        const padding = 8;
        const offsetTop = 60;
        const offsetLeft = (this.canvas.width - (cols * (brickW + padding) - padding)) / 2;

        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isBomb = Math.random() < 0.08;
                this.bricks.push({
                    x: offsetLeft + c * (brickW + padding),
                    y: offsetTop + r * (brickH + padding),
                    w: brickW,
                    h: brickH,
                    color: isBomb ? '#ec4899' : colors[r % colors.length],
                    isBomb: isBomb,
                    hits: r === 0 ? 2 : 1,
                    maxHits: r === 0 ? 2 : 1,
                    points: (rows - r) * 10
                });
            }
        }
    }

    handleKeyDown(e) {
        if (e.code === 'Space' && this.balls.length === 0) {
            this.spawnBall();
        }
    }

    handlePointerMove(e) {
        if (!this.isRunning || this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const clientX = (e.clientX - rect.left) * scaleX;
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, clientX - this.paddle.width / 2));
    }

    update() {
        // Keyboard controls
        if (this.controls.isPressed('left')) this.paddle.x -= this.paddle.speed;
        if (this.controls.isPressed('right')) this.paddle.x += this.paddle.speed;
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));

        // Update Balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            b.x += b.vx;
            b.y += b.vy;

            // Wall bounces
            if (b.x - b.radius <= 0) {
                b.x = b.radius;
                b.vx = Math.abs(b.vx);
                this.audio.playBounce();
            } else if (b.x + b.radius >= this.canvas.width) {
                b.x = this.canvas.width - b.radius;
                b.vx = -Math.abs(b.vx);
                this.audio.playBounce();
            }
            if (b.y - b.radius <= 0) {
                b.y = b.radius;
                b.vy = Math.abs(b.vy);
                this.audio.playBounce();
            }

            // Paddle bounce
            if (
                b.y + b.radius >= this.paddle.y &&
                b.y - b.radius <= this.paddle.y + this.paddle.height &&
                b.x >= this.paddle.x &&
                b.x <= this.paddle.x + this.paddle.width &&
                b.vy > 0
            ) {
                this.audio.playBounce();
                b.vy = -Math.abs(b.vy);
                // Calculate hit position (-1 left edge, 0 center, +1 right edge)
                const hitPos = (b.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
                b.vx = hitPos * 6.5;
            }

            // Brick collision
            for (let j = this.bricks.length - 1; j >= 0; j--) {
                const brick = this.bricks[j];
                if (
                    b.x + b.radius > brick.x &&
                    b.x - b.radius < brick.x + brick.w &&
                    b.y + b.radius > brick.y &&
                    b.y - b.radius < brick.y + brick.h
                ) {
                    b.vy = -b.vy;
                    brick.hits--;
                    this.createParticles(b.x, b.y, brick.color);

                    if (brick.hits <= 0) {
                        this.destroyBrick(brick, j);
                    } else {
                        this.audio.playHit();
                    }
                    break;
                }
            }

            // Ball fell off bottom
            if (b.y > this.canvas.height + 20) {
                this.balls.splice(i, 1);
            }
        }

        // If all balls lost
        if (this.balls.length === 0) {
            this.lives--;
            this.audio.playGameOver();
            if (this.lives > 0) {
                this.spawnBall();
            } else {
                this.gameOver();
                return;
            }
        }

        // Check Victory
        if (this.bricks.length === 0) {
            this.audio.playWin();
            this.createBricks();
            this.paddle.width = Math.max(70, this.paddle.width - 10);
            this.spawnBall();
        }

        // Update Powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += 2.4;

            if (
                p.y + 10 >= this.paddle.y &&
                p.y <= this.paddle.y + this.paddle.height &&
                p.x >= this.paddle.x &&
                p.x <= this.paddle.x + this.paddle.width
            ) {
                this.applyPowerup(p.type);
                this.powerups.splice(i, 1);
                continue;
            }
            if (p.y > this.canvas.height + 20) this.powerups.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.04;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    destroyBrick(brick, idx) {
        this.audio.playScore();
        this.score += brick.points;
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);

        if (brick.isBomb) {
            this.audio.playExplosion();
            // Destroy adjacent bricks
            for (let k = this.bricks.length - 1; k >= 0; k--) {
                if (k === idx) continue;
                const other = this.bricks[k];
                if (Math.hypot(other.x - brick.x, other.y - brick.y) < 75) {
                    this.score += other.points;
                    this.createParticles(other.x + other.w / 2, other.y + other.h / 2, other.color);
                    this.bricks.splice(k, 1);
                    if (k < idx) idx--;
                }
            }
        }

        // Powerup drop chance
        if (Math.random() < 0.22) {
            const types = ['wide', 'multiball'];
            this.powerups.push({
                x: brick.x + brick.w / 2,
                y: brick.y + brick.h / 2,
                type: types[Math.floor(Math.random() * types.length)]
            });
        }

        this.bricks.splice(idx, 1);
    }

    applyPowerup(type) {
        this.audio.playPowerup();
        if (type === 'wide') {
            this.paddle.width = Math.min(160, this.paddle.width + 30);
        } else if (type === 'multiball') {
            if (this.balls.length > 0) {
                const b = this.balls[0];
                this.balls.push({ x: b.x, y: b.y, radius: b.radius, vx: -b.vx, vy: b.vy });
                this.balls.push({ x: b.x, y: b.y, radius: b.radius, vx: b.vx * 0.7, vy: b.vy * 1.1 });
            }
        }
    }

    createParticles(x, y, color) {
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

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Bricks
        this.bricks.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = b.hits > 1 ? 10 : 4;
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, b.h, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (b.isBomb) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💣', b.x + b.w / 2, b.y + b.h / 2 + 4);
            }
        });

        // Paddle
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Balls
        this.balls.forEach(b => {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Powerups
        this.powerups.forEach(p => {
            ctx.fillStyle = p.type === 'wide' ? '#22c55e' : '#ec4899';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(p.x - 12, p.y - 8, 24, 16, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.type === 'wide' ? 'EXP' : '3X', p.x, p.y + 4);
        });

        // Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.fillRect(pt.x, pt.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 16, 26);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${'❤️ '.repeat(Math.max(0, this.lives))}`, this.canvas.width - 16, 26);
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
            this.paddle.width = 120;
        } else if (diff === 'Hard') {
            this.paddle.width = 80;
        } else {
            this.paddle.width = 100;
        }
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.controls.destroyTouchOverlay();
    }
}

window.BreakoutGame = BreakoutGame;
