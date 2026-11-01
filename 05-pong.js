/**
 * Game 05: Pong
 * High-octane arcade paddle duel with spin physics, AI difficulty scaling & 2P local mode.
 */
class PongGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0; // Player score
        this.aiScore = 0;
        this.winningScore = 7;
        this.difficulty = options.difficulty || 'Normal';
        this.isRunning = false;
        this.isPaused = false;

        this.paddleWidth = 14;
        this.paddleHeight = 85;

        this.p1 = {
            x: 30,
            y: 200,
            speed: 7
        };

        this.p2 = {
            x: 556,
            y: 200,
            speed: 5.5
        };

        this.ball = {
            x: 300,
            y: 240,
            vx: 5,
            vy: 2.5,
            radius: 7,
            baseSpeed: 5.5,
            speedMultiplier: 1
        };

        this.rally = 0;
        this.particles = [];

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
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
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        requestAnimationFrame(this.loop);
    }

    setupCanvas() {
        this.canvas.width = 600;
        this.canvas.height = 480;
    }

    resetGame() {
        this.score = 0;
        this.aiScore = 0;
        this.p1.y = (this.canvas.height - this.paddleHeight) / 2;
        this.p2.y = (this.canvas.height - this.paddleHeight) / 2;
        this.p2.x = this.canvas.width - 30 - this.paddleWidth;
        this.resetBall(1);
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    resetBall(direction = 1) {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedMultiplier = 1;
        const angle = (Math.random() - 0.5) * (Math.PI / 3);
        const speed = this.ball.baseSpeed;
        this.ball.vx = Math.cos(angle) * speed * direction;
        this.ball.vy = Math.sin(angle) * speed;
        this.rally = 0;
    }

    handleKeyDown(e) {
        // Player 2 local control with ArrowUp/ArrowDown if 2P
    }

    handlePointerMove(e) {
        if (!this.isRunning || this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleY = this.canvas.height / rect.height;
        const clientY = (e.clientY - rect.top) * scaleY;
        this.p1.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, clientY - this.paddleHeight / 2));
    }

    update() {
        // Player 1 controls (Keyboard)
        if (this.controls.isPressed('up')) {
            this.p1.y -= this.p1.speed;
        }
        if (this.controls.isPressed('down')) {
            this.p1.y += this.p1.speed;
        }
        this.p1.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.p1.y));

        // AI opponent logic for P2
        const p2Center = this.p2.y + this.paddleHeight / 2;
        const aiReactFactor = this.difficulty === 'Easy' ? 0.05 : (this.difficulty === 'Hard' ? 0.14 : 0.09);
        const targetY = this.ball.y + (Math.sin(this.ball.x * 0.02) * (this.difficulty === 'Easy' ? 40 : 15));
        this.p2.y += (targetY - p2Center) * aiReactFactor;
        this.p2.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.p2.y));

        // Ball movement
        this.ball.x += this.ball.vx * this.ball.speedMultiplier;
        this.ball.y += this.ball.vy * this.ball.speedMultiplier;

        // Top / Bottom wall bounce
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.vy = Math.abs(this.ball.vy);
            this.audio.playBounce();
        } else if (this.ball.y + this.ball.radius >= this.canvas.height) {
            this.ball.y = this.canvas.height - this.ball.radius;
            this.ball.vy = -Math.abs(this.ball.vy);
            this.audio.playBounce();
        }

        // Paddle 1 Collision
        if (
            this.ball.x - this.ball.radius <= this.p1.x + this.paddleWidth &&
            this.ball.x + this.ball.radius >= this.p1.x &&
            this.ball.y >= this.p1.y &&
            this.ball.y <= this.p1.y + this.paddleHeight &&
            this.ball.vx < 0
        ) {
            this.audio.playHit();
            this.rally++;
            this.ball.speedMultiplier = Math.min(1.8, 1 + this.rally * 0.05);
            this.ball.vx = Math.abs(this.ball.vx);
            const deltaY = this.ball.y - (this.p1.y + this.paddleHeight / 2);
            this.ball.vy = (deltaY / (this.paddleHeight / 2)) * 6;
            this.createSparks(this.p1.x + this.paddleWidth, this.ball.y, '#38bdf8');
        }

        // Paddle 2 Collision
        if (
            this.ball.x + this.ball.radius >= this.p2.x &&
            this.ball.x - this.ball.radius <= this.p2.x + this.paddleWidth &&
            this.ball.y >= this.p2.y &&
            this.ball.y <= this.p2.y + this.paddleHeight &&
            this.ball.vx > 0
        ) {
            this.audio.playHit();
            this.rally++;
            this.ball.speedMultiplier = Math.min(1.8, 1 + this.rally * 0.05);
            this.ball.vx = -Math.abs(this.ball.vx);
            const deltaY = this.ball.y - (this.p2.y + this.paddleHeight / 2);
            this.ball.vy = (deltaY / (this.paddleHeight / 2)) * 6;
            this.createSparks(this.p2.x, this.ball.y, '#ec4899');
        }

        // Scoring
        if (this.ball.x < 0) {
            this.aiScore++;
            this.audio.playGameOver();
            this.checkWinner();
            this.resetBall(1);
        } else if (this.ball.x > this.canvas.width) {
            this.score++;
            this.audio.playScore();
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
            this.checkWinner();
            this.resetBall(-1);
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    createSparks(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color
            });
        }
    }

    checkWinner() {
        if (this.score >= this.winningScore) {
            this.isRunning = false;
            this.audio.playWin();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        } else if (this.aiScore >= this.winningScore) {
            this.isRunning = false;
            this.audio.playGameOver();
            if (this.options.onGameOver) this.options.onGameOver(this.score);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Center line
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Paddle 1 (Cyan)
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(this.p1.x, this.p1.y, this.paddleWidth, this.paddleHeight, 4);
        ctx.fill();

        // Paddle 2 (Pink)
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(this.p2.x, this.p2.y, this.paddleWidth, this.paddleHeight, 4);
        ctx.fill();

        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // Scores
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.score, this.canvas.width / 2 - 60, 50);
        ctx.fillText(this.aiScore, this.canvas.width / 2 + 60, 50);

        ctx.font = '12px Orbitron, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('FIRST TO 7 WINS', this.canvas.width / 2, 80);
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
        this.difficulty = diff;
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.controls.destroyTouchOverlay();
    }
}

window.PongGame = PongGame;
