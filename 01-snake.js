/**
 * Game 01: Snake
 * Classic arcade snake with neon visuals, fruit & golden bonus food, smooth controls, and speed scaling.
 */
class SnakeGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.gridSize = 20;
        this.tileCountX = 24;
        this.tileCountY = 24;

        this.difficulty = options.difficulty || 'Normal';
        this.baseSpeed = this.difficulty === 'Easy' ? 140 : (this.difficulty === 'Hard' ? 70 : 100);
        this.score = 0;
        this.highScore = options.highScore || 0;
        this.isRunning = false;
        this.isPaused = false;

        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = { x: 5, y: 5, type: 'apple' };
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.particles = [];

        this.lastFrameTime = 0;
        this.accumulatedTime = 0;
        this.stepDelay = this.baseSpeed;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.loop = this.loop.bind(this);
    }

    start() {
        this.setupCanvas();
        this.controls.setupTouchOverlay(
            this.container.querySelector('.touch-controls-container') || this.container,
            'dpad-only'
        );
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        window.addEventListener('keydown', this.handleKeyDown);
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.tileCountX = 25;
        this.tileCountY = 25;
        this.gridSize = this.canvas.width / this.tileCountX;
    }

    resetGame() {
        this.snake = [
            { x: 10, y: 12 },
            { x: 9, y: 12 },
            { x: 8, y: 12 }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.stepDelay = this.baseSpeed;
        this.spawnFood();
        this.bonusFood = null;
        this.bonusTimer = 0;
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    spawnFood() {
        let valid = false;
        while (!valid) {
            const rx = Math.floor(Math.random() * this.tileCountX);
            const ry = Math.floor(Math.random() * this.tileCountY);
            if (!this.snake.some(seg => seg.x === rx && seg.y === ry)) {
                this.food = { x: rx, y: ry, type: 'apple' };
                valid = true;
            }
        }

        // 20% chance to spawn golden bonus fruit if not active
        if (!this.bonusFood && Math.random() < 0.25 && this.score >= 30) {
            let bx, by, bvalid = false;
            while (!bvalid) {
                bx = Math.floor(Math.random() * this.tileCountX);
                by = Math.floor(Math.random() * this.tileCountY);
                if (!this.snake.some(seg => seg.x === bx && seg.y === by) && (bx !== this.food.x || by !== this.food.y)) {
                    this.bonusFood = { x: bx, y: by, timer: 60 };
                    bvalid = true;
                }
            }
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning || this.isPaused) return;
        if ((e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: -1 };
        } else if ((e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: 1 };
        } else if ((e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && this.direction.x === 0) {
            this.nextDirection = { x: -1, y: 0 };
        } else if ((e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') && this.direction.x === 0) {
            this.nextDirection = { x: 1, y: 0 };
        }
    }

    checkInputs() {
        if (this.controls.isPressed('up') && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
        if (this.controls.isPressed('down') && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
        if (this.controls.isPressed('left') && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
        if (this.controls.isPressed('right') && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
    }

    update() {
        this.direction = { ...this.nextDirection };
        const head = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        // Wall collisions
        if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
            this.gameOver();
            return;
        }

        // Self collisions
        for (let i = 0; i < this.snake.length; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head);

        // Check food collection
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.audio.playScore();
            this.createExplosion(head.x * this.gridSize + this.gridSize / 2, head.y * this.gridSize + this.gridSize / 2, '#00ff88');
            this.stepDelay = Math.max(50, this.baseSpeed - Math.floor(this.score / 20) * 4);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            this.spawnFood();
        } else if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
            this.score += 50;
            this.audio.playPowerup();
            this.createExplosion(head.x * this.gridSize + this.gridSize / 2, head.y * this.gridSize + this.gridSize / 2, '#ffd700');
            this.bonusFood = null;
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        } else {
            this.snake.pop();
        }

        if (this.bonusFood) {
            this.bonusFood.timer -= 0.15;
            if (this.bonusFood.timer <= 0) {
                this.bonusFood = null;
            }
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        this.audio.playGameOver();
        if (this.options.onGameOver) {
            this.options.onGameOver(this.score);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Subtle Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Draw Food
        const fx = this.food.x * this.gridSize + this.gridSize / 2;
        const fy = this.food.y * this.gridSize + this.gridSize / 2;
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(fx, fy, this.gridSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bonus Food
        if (this.bonusFood) {
            const bx = this.bonusFood.x * this.gridSize + this.gridSize / 2;
            const by = this.bonusFood.y * this.gridSize + this.gridSize / 2;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(bx, by, this.gridSize * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Star icon inside
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', bx, by);
        }

        // Draw Snake
        ctx.shadowBlur = 0;
        this.snake.forEach((seg, index) => {
            const x = seg.x * this.gridSize;
            const y = seg.y * this.gridSize;
            const isHead = index === 0;

            if (isHead) {
                ctx.fillStyle = '#00ff88';
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.roundRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2, 6);
                ctx.fill();

                // Eyes
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#0f172a';
                const eyeOffset = this.gridSize * 0.25;
                if (this.direction.x === 1) {
                    ctx.fillRect(x + this.gridSize * 0.6, y + eyeOffset, 3, 3);
                    ctx.fillRect(x + this.gridSize * 0.6, y + this.gridSize - eyeOffset - 3, 3, 3);
                } else if (this.direction.x === -1) {
                    ctx.fillRect(x + eyeOffset, y + eyeOffset, 3, 3);
                    ctx.fillRect(x + eyeOffset, y + this.gridSize - eyeOffset - 3, 3, 3);
                } else if (this.direction.y === -1) {
                    ctx.fillRect(x + eyeOffset, y + eyeOffset, 3, 3);
                    ctx.fillRect(x + this.gridSize - eyeOffset - 3, y + eyeOffset, 3, 3);
                } else {
                    ctx.fillRect(x + eyeOffset, y + this.gridSize * 0.6, 3, 3);
                    ctx.fillRect(x + this.gridSize - eyeOffset - 3, y + this.gridSize * 0.6, 3, 3);
                }
            } else {
                const ratio = 1 - (index / this.snake.length) * 0.5;
                ctx.fillStyle = `rgba(0, 220, 130, ${ratio})`;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4, 4);
                ctx.fill();
            }
        });

        // Draw Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
            ctx.globalAlpha = 1;
        }

        // HUD overlay inside canvas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '14px Orbitron, monospace, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 16, 26);
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const delta = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        if (!this.isPaused) {
            this.accumulatedTime += delta;
            this.checkInputs();

            if (this.accumulatedTime >= this.stepDelay) {
                this.update();
                this.accumulatedTime = 0;
            }
            this.draw();
        }

        requestAnimationFrame(this.loop);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
    }

    restart() {
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        this.baseSpeed = diff === 'Easy' ? 140 : (diff === 'Hard' ? 70 : 100);
        this.stepDelay = this.baseSpeed;
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.controls.destroyTouchOverlay();
    }
}

window.SnakeGame = SnakeGame;
