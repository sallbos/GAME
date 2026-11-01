/**
 * Game 18: Football Penalty (Penalty Shootout)
 * Perspective penalty shootout with goalkeeper dive AI, curved shots, net bulge animation & sudden death rounds.
 */
class PenaltyShootoutGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.round = 1;
        this.totalShots = 5;
        this.shotResults = []; // true = goal, false = saved/missed
        this.isRunning = false;
        this.shotPhase = 'aim'; // 'aim', 'shooting', 'result'

        this.goal = {
            x: 100,
            y: 110,
            w: 440,
            h: 190
        };

        this.keeper = {
            x: 320,
            y: 220,
            w: 36,
            h: 75,
            targetX: 320,
            targetY: 220,
            diveState: 'center'
        };

        this.ball = {
            x: 320,
            y: 470,
            startX: 320,
            startY: 470,
            targetX: 320,
            targetY: 200,
            scale: 1,
            progress: 0,
            isGoal: false
        };

        this.particles = [];
        this.resultMessage = '';

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
        this.canvas.height = 540;
    }

    resetGame() {
        this.score = 0;
        this.round = 1;
        this.shotResults = [];
        this.resetShot();
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    resetShot() {
        this.shotPhase = 'aim';
        this.ball.x = 320;
        this.ball.y = 470;
        this.ball.scale = 1;
        this.ball.progress = 0;
        this.ball.isGoal = false;

        this.keeper.x = 320;
        this.keeper.y = 220;
        this.keeper.targetX = 320;
        this.keeper.targetY = 220;
        this.keeper.diveState = 'center';
        this.resultMessage = '';
    }

    handleClick(e) {
        if (!this.isRunning || this.shotPhase !== 'aim') return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const targetX = (e.clientX - rect.left) * scaleX;
        const targetY = (e.clientY - rect.top) * scaleY;

        this.takeShot(targetX, Math.min(280, Math.max(120, targetY)));
    }

    takeShot(tx, ty) {
        this.shotPhase = 'shooting';
        this.ball.startX = this.ball.x;
        this.ball.startY = this.ball.y;
        this.ball.targetX = tx;
        this.ball.targetY = ty;
        this.ball.progress = 0;
        this.audio.playShoot();

        // AI Goalkeeper dive decision
        const diveOdds = Math.random();
        if (diveOdds < 0.45) {
            // Keeper guesses near the ball target!
            this.keeper.targetX = tx + (Math.random() - 0.5) * 50;
            this.keeper.targetY = ty;
        } else {
            // Keeper dives random side
            this.keeper.targetX = 160 + Math.random() * 320;
            this.keeper.targetY = 160 + Math.random() * 80;
        }
    }

    update() {
        if (this.shotPhase === 'shooting') {
            this.ball.progress += 0.045;
            const p = this.ball.progress;

            // Curved trajectory towards target
            this.ball.x = this.ball.startX + (this.ball.targetX - this.ball.startX) * p;
            this.ball.y = this.ball.startY + (this.ball.targetY - this.ball.startY) * p - Math.sin(p * Math.PI) * 50;
            this.ball.scale = 1 - p * 0.55;

            // Move keeper
            this.keeper.x += (this.keeper.targetX - this.keeper.x) * 0.12;
            this.keeper.y += (this.keeper.targetY - this.keeper.y) * 0.12;

            if (p >= 1) {
                this.shotPhase = 'result';
                this.resolveShot();
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.04;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    resolveShot() {
        const bx = this.ball.targetX;
        const by = this.ball.targetY;
        const inGoal = bx > this.goal.x + 10 && bx < this.goal.x + this.goal.w - 10 && by > this.goal.y + 10 && by < this.goal.y + this.goal.h;

        // Keeper save check
        const distToKeeper = Math.hypot(bx - this.keeper.x, by - (this.keeper.y - 15));
        const saved = distToKeeper < 55;

        if (inGoal && !saved) {
            // GOAL!
            this.ball.isGoal = true;
            this.resultMessage = 'GOAL! ⚽🎉';
            this.audio.playWin();
            this.score += 100;
            this.shotResults.push(true);
            this.createGoalConfetti(bx, by);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        } else if (saved) {
            this.resultMessage = 'SAVED BY KEEPER! 🧤';
            this.audio.playHit();
            this.shotResults.push(false);
        } else {
            this.resultMessage = 'MISSED THE TARGET! ❌';
            this.audio.playHit();
            this.shotResults.push(false);
        }

        setTimeout(() => {
            if (this.shotResults.length >= this.totalShots) {
                this.gameOver();
            } else {
                this.round++;
                this.resetShot();
            }
        }, 1600);
    }

    createGoalConfetti(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: ['#22c55e', '#38bdf8', '#eab308', '#ffffff'][Math.floor(Math.random() * 4)]
            });
        }
    }

    gameOver() {
        this.isRunning = false;
        const goals = this.shotResults.filter(Boolean).length;
        if (goals >= 3) {
            this.audio.playWin();
        } else {
            this.audio.playGameOver();
        }
        if (this.options.onGameOver) this.options.onGameOver(this.score);
    }

    draw() {
        const ctx = this.ctx;

        // Pitch Gradient (Green)
        const pitchGrad = ctx.createLinearGradient(0, 200, 0, this.canvas.height);
        pitchGrad.addColorStop(0, '#15803d');
        pitchGrad.addColorStop(1, '#166534');
        ctx.fillStyle = pitchGrad;
        ctx.fillRect(0, 220, this.canvas.width, this.canvas.height - 220);

        // Stadium Crowd / Stands (Top)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, 220);

        // Stadium floodlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(80, 0); ctx.lineTo(0, 300); ctx.lineTo(this.canvas.width, 300); ctx.lineTo(this.canvas.width - 80, 0);
        ctx.fill();

        // Penalty Box White Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 270);
        ctx.lineTo(580, 270);
        ctx.stroke();

        // Penalty Spot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(320, 470, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Goal Posts & Net
        const gx = this.goal.x;
        const gy = this.goal.y;
        const gw = this.goal.w;
        const gh = this.goal.h;

        // Net Depth Box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(gx + 20, gy - 20, gw - 40, gh);

        // Net Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        for (let x = gx; x <= gx + gw; x += 18) {
            ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke();
        }
        for (let y = gy; y <= gy + gh; y += 18) {
            ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
        }

        // Goal Crossbar & Posts
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(gx, gy + gh);
        ctx.lineTo(gx, gy);
        ctx.lineTo(gx + gw, gy);
        ctx.lineTo(gx + gw, gy + gh);
        ctx.stroke();

        // Goalkeeper
        ctx.save();
        ctx.translate(this.keeper.x, this.keeper.y);

        // Keeper Jersey & Gloves
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(-14, -55, 28, 40, 6);
        ctx.fill();

        // Keeper Head
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(0, -65, 9, 0, Math.PI * 2);
        ctx.fill();

        // Keeper Gloves (Neon Cyan)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-22, -45, 8, 0, Math.PI * 2);
        ctx.arc(22, -45, 8, 0, Math.PI * 2);
        ctx.fill();

        // Keeper Shorts
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-12, -15, 24, 18);
        ctx.restore();

        // Ball
        ctx.save();
        ctx.translate(this.ball.x, this.ball.y);
        ctx.scale(this.ball.scale, this.ball.scale);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Football pentagon pattern
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        // Result Message
        if (this.resultMessage) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 26px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.resultMessage, this.canvas.width / 2, 80);
        }

        // HUD - Scoreboard
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);

        // Penalty Rounds Tracker
        ctx.textAlign = 'right';
        let trackerText = '';
        for (let i = 0; i < this.totalShots; i++) {
            if (i < this.shotResults.length) {
                trackerText += this.shotResults[i] ? '⚽ ' : '❌ ';
            } else {
                trackerText += '⚪ ';
            }
        }
        ctx.fillText(`SHOTS: ${trackerText}`, this.canvas.width - 20, 30);

        if (this.shotPhase === 'aim') {
            ctx.fillStyle = '#f8fafc';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CLICK / TAP ANYWHERE IN THE GOAL TO SHOOT!', this.canvas.width / 2, 515);
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
        this.canvas.removeEventListener('pointerdown', this.handleClick);
        this.controls.destroyTouchOverlay();
    }
}

window.PenaltyShootoutGame = PenaltyShootoutGame;
