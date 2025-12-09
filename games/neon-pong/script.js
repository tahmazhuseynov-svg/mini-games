class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Fixed internal resolution for consistent gameplay
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.lastTime = 0;
        this.winningScore = 5;
        this.isRunning = false;

        this.player = new Paddle(this, 10, 'blue');
        this.ai = new Paddle(this, this.width - 20, 'purple');
        this.ball = new Ball(this);

        this.ui = {
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            playerScore: document.getElementById('player-score'),
            aiScore: document.getElementById('ai-score'),
            finalScore: document.getElementById('final-score'),
            startBtn: document.getElementById('start-btn'),
            restartBtn: document.getElementById('restart-btn')
        };

        this.initInput();
        this.bindEvents();
    }

    bindEvents() {
        this.ui.startBtn.addEventListener('click', () => this.start());
        this.ui.restartBtn.addEventListener('click', () => this.resetGame());
    }

    initInput() {
        // Track mouse movement relative to canvas
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isRunning) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.height / rect.height;
            const mouseY = (e.clientY - rect.top) * scaleY;

            this.player.y = mouseY - this.player.height / 2;
        });
    }

    start() {
        this.ui.startScreen.classList.remove('active');
        this.ui.gameOverScreen.classList.remove('active');
        this.isRunning = true;
        this.ball.reset();
        this.player.score = 0;
        this.ai.score = 0;
        this.updateScoreDisplay();
        this.loop(0);
    }

    resetGame() {
        this.start();
    }

    updateScoreDisplay() {
        this.ui.playerScore.textContent = this.player.score;
        this.ui.aiScore.textContent = this.ai.score;
    }

    gameOver(winner) {
        this.isRunning = false;
        this.ui.gameOverScreen.classList.add('active');

        let message = winner === 'player' ? 'YOU WIN' : 'YOU LOSE';
        let color = winner === 'player' ? '#00f3ff' : '#bc13fe';

        this.ui.finalScore.innerHTML = `<span style="color: ${color}">${message}</span><br>Final Score: ${this.player.score} - ${this.ai.score}`;
        this.submitScore(this.player.score);
    }

    submitScore(score) {
        fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: 'neon-pong',
                score: score
            })
        });
    }

    update(deltaTime) {
        this.player.update(deltaTime);
        this.ai.update(deltaTime);
        this.ball.update(deltaTime);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#050510'; // Match css bg
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw center line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.player.draw(this.ctx);
        this.ai.draw(this.ctx);
        this.ball.draw(this.ctx);
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

class Paddle {
    constructor(game, x, colorType) {
        this.game = game;
        this.width = 10;
        this.height = 100;
        this.x = x;
        this.y = (game.height - this.height) / 2;
        this.colorType = colorType;
        this.speed = 0.4; // AI Speed (pixels per ms)
        this.score = 0;
    }

    update(deltaTime) {
        // Clamp Y position
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > this.game.height) this.y = this.game.height - this.height;

        // AI Logic
        if (this.colorType === 'purple') {
            const center = this.y + this.height / 2;
            const ballY = this.game.ball.y;

            if (center < ballY - 10) {
                this.y += this.speed * deltaTime;
            } else if (center > ballY + 10) {
                this.y -= this.speed * deltaTime;
            }
        }
    }

    draw(ctx) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.colorType === 'blue' ? '#00f3ff' : '#bc13fe';
        ctx.fillStyle = this.colorType === 'blue' ? '#00f3ff' : '#bc13fe';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Ball {
    constructor(game) {
        this.game = game;
        this.radius = 8;
        this.reset();
    }

    reset() {
        this.x = this.game.width / 2;
        this.y = this.game.height / 2;

        // Random start direction
        const dirX = Math.random() < 0.5 ? -1 : 1;
        const dirY = (Math.random() * 2 - 1) * 0.5; // Slightly random angle

        this.speed = 0.5; // Base speed
        this.velocityX = dirX * this.speed;
        this.velocityY = dirY * this.speed;
    }

    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Wall collisions (Top/Bottom)
        if (this.y - this.radius < 0 || this.y + this.radius > this.game.height) {
            this.velocityY *= -1;
            // Prevent sticking
            if (this.y - this.radius < 0) this.y = this.radius;
            if (this.y + this.radius > this.game.height) this.y = this.game.height - this.radius;
        }

        // Paddle collisions
        const player = this.game.player;
        const ai = this.game.ai;

        // Check Left Paddle (Player)
        if (this.x - this.radius < player.x + player.width &&
            this.x + this.radius > player.x &&
            this.y > player.y && this.y < player.y + player.height) {

            if (this.velocityX < 0) { // Only bounce if coming towards it
                this.velocityX *= -1.05; // Increase speed slightly
                this.velocityX = Math.min(this.velocityX, 1.5); // Cap speed

                // Add "english" based on where it hit the paddle
                const hitPoint = this.y - (player.y + player.height / 2);
                this.velocityY += hitPoint * 0.002;
            }
        }

        // Check Right Paddle (AI)
        if (this.x + this.radius > ai.x &&
            this.x - this.radius < ai.x + ai.width &&
            this.y > ai.y && this.y < ai.y + ai.height) {

            if (this.velocityX > 0) {
                this.velocityX *= -1.05;
                this.velocityX = Math.max(this.velocityX, -1.5);

                const hitPoint = this.y - (ai.y + ai.height / 2);
                this.velocityY += hitPoint * 0.002;
            }
        }

        // Scoring
        if (this.x < 0) {
            this.game.ai.score++;
            this.game.updateScoreDisplay();
            this.checkWin();
            this.reset();
        } else if (this.x > this.game.width) {
            this.game.player.score++;
            this.game.updateScoreDisplay();
            this.checkWin();
            this.reset();
        }
    }

    checkWin() {
        if (this.game.player.score >= this.game.winningScore) {
            this.game.gameOver('player');
        } else if (this.game.ai.score >= this.game.winningScore) {
            this.game.gameOver('ai');
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

// Initialize
window.onload = () => {
    const game = new Game();
};
