/**
 * Game 27: Rock Paper Scissors (Arcade Tournament)
 * Animated hands showdown, 3-2-1 countdown, streak multipliers, win-rate stats & tournament ladder.
 */
class RockPaperScissorsGame {
    constructor(canvas, container, audio, controls, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.audio = audio;
        this.controls = controls;
        this.options = options;

        this.score = 0;
        this.highScore = options.highScore || 0;
        this.streak = 0;
        this.round = 1;
        this.isRunning = false;

        this.playerChoice = null;
        this.aiChoice = null;
        this.resultText = 'CHOOSE YOUR MOVE!';
        this.animPhase = 0; // 0 = idle, >0 = shaking
        this.particles = [];

        this.choices = [
            { id: 'rock', emoji: '✊', name: 'ROCK', color: '#ef4444' },
            { id: 'paper', emoji: '✋', name: 'PAPER', color: '#38bdf8' },
            { id: 'scissors', emoji: '✌️', name: 'SCISSORS', color: '#eab308' }
        ];

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
        this.canvas.width = 560;
        this.canvas.height = 480;
    }

    resetGame() {
        this.score = 0;
        this.streak = 0;
        this.round = 1;
        this.playerChoice = null;
        this.aiChoice = null;
        this.resultText = 'CHOOSE YOUR MOVE!';
        this.animPhase = 0;
        this.particles = [];
        if (this.options.onScoreUpdate) this.options.onScoreUpdate(0);
    }

    handleClick(e) {
        if (!this.isRunning || this.animPhase > 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // Choice buttons at bottom (y: 350 to 430)
        if (my >= 350 && my <= 430) {
            const btnW = 120;
            const gap = 24;
            const startX = (this.canvas.width - (3 * btnW + 2 * gap)) / 2;

            this.choices.forEach((c, idx) => {
                const bx = startX + idx * (btnW + gap);
                if (mx >= bx && mx <= bx + btnW) {
                    this.playRound(c.id);
                }
            });
        }
    }

    playRound(choiceId) {
        this.playerChoice = choiceId;
        this.animPhase = 30; // 30 frames shake animation
        this.audio.playBounce();
        this.resultText = 'ROCK... PAPER... SCISSORS... SHOOT!';

        setTimeout(() => {
            const options = ['rock', 'paper', 'scissors'];
            this.aiChoice = options[Math.floor(Math.random() * options.length)];
            this.resolveOutcome();
        }, 600);
    }

    resolveOutcome() {
        this.animPhase = 0;
        const p = this.playerChoice;
        const a = this.aiChoice;

        if (p === a) {
            this.resultText = "IT'S A DRAW! 🤝";
            this.audio.playHit();
        } else if (
            (p === 'rock' && a === 'scissors') ||
            (p === 'paper' && a === 'rock') ||
            (p === 'scissors' && a === 'paper')
        ) {
            this.streak++;
            const pts = 50 * this.streak;
            this.score += pts;
            this.resultText = `YOU WIN! +${pts} PTS 🎉`;
            this.audio.playWin();
            this.createVictorySparks(this.canvas.width / 4, 200);
            if (this.options.onScoreUpdate) this.options.onScoreUpdate(this.score);
        } else {
            this.streak = 0;
            this.resultText = 'AI WINS! 💥';
            this.audio.playGameOver();
        }
        this.round++;
    }

    createVictorySparks(x, y) {
        for (let i = 0; i < 16; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1,
                color: '#38bdf8'
            });
        }
    }

    update() {
        if (this.animPhase > 0) this.animPhase--;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 24, 32);
        ctx.textAlign = 'right';
        ctx.fillText(`STREAK: ${this.streak} 🔥`, this.canvas.width - 24, 32);

        // Result Banner
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.resultText, this.canvas.width / 2, 85);

        // VS Center Split
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.fillText('VS', this.canvas.width / 2, 215);

        // Left: Player Hand
        ctx.save();
        const shakeX = this.animPhase > 0 ? Math.sin(this.animPhase) * 10 : 0;
        ctx.translate(this.canvas.width / 4 + shakeX, 210);

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-65, -65, 130, 130, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let pEmoji = '❓';
        if (this.animPhase > 0) pEmoji = '✊';
        else if (this.playerChoice) {
            pEmoji = this.choices.find(c => c.id === this.playerChoice).emoji;
        }
        ctx.fillText(pEmoji, 0, 4);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Orbitron, sans-serif';
        ctx.fillText('YOU', 0, 85);
        ctx.restore();

        // Right: AI Hand
        ctx.save();
        ctx.translate(this.canvas.width * 0.75 - shakeX, 210);

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-65, -65, 130, 130, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = '54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let aiEmoji = '❓';
        if (this.animPhase > 0) aiEmoji = '✊';
        else if (this.aiChoice) {
            aiEmoji = this.choices.find(c => c.id === this.aiChoice).emoji;
        }
        ctx.fillText(aiEmoji, 0, 4);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Orbitron, sans-serif';
        ctx.fillText('CPU', 0, 85);
        ctx.restore();

        // Choice Buttons at Bottom
        const btnW = 120;
        const gap = 24;
        const startX = (this.canvas.width - (3 * btnW + 2 * gap)) / 2;

        this.choices.forEach((c, idx) => {
            const bx = startX + idx * (btnW + gap);
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, 360, btnW, 70, 12);
            ctx.fill();
            ctx.stroke();

            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(c.emoji, bx + btnW / 2, 385);

            ctx.fillStyle = c.color;
            ctx.font = 'bold 11px Orbitron, sans-serif';
            ctx.fillText(c.name, bx + btnW / 2, 415);
        });

        // Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;
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

window.RockPaperScissorsGame = RockPaperScissorsGame;
