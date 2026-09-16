// Game Variables
const gameScreen = document.getElementById('gameScreen');
const menu = document.getElementById('menu');
const gameUI = document.getElementById('gameUI');
const gameOver = document.getElementById('gameOver');

let gameActive = false;
let gameMode = null;

class Player {
    constructor(x, y, isPlayer1 = true) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityY = 0;
        this.velocityX = 0;
        this.isJumping = false;
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 30;
        this.isPlayer1 = isPlayer1;
        this.element = null;
        this.canShoot = true;
        this.shootCooldown = 200; // ms
        this.invincible = false;
        this.invincibleTime = 0;
    }

    draw() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = `player-element ${this.isPlayer1 ? 'p1' : 'p2'}`;
            this.element.textContent = this.isPlayer1 ? 'P1' : 'P2';
            gameScreen.appendChild(this.element);
        }
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    update() {
        // Gravity
        this.velocityY += 0.5;
        this.y += this.velocityY;
        this.x += this.velocityX;

        // Friction
        this.velocityX *= 0.9;

        // Boundary check
        if (this.y + this.height > gameScreen.clientHeight) {
            this.y = gameScreen.clientHeight - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > gameScreen.clientWidth) this.x = gameScreen.clientWidth - this.width;

        // Invincibility timer
        if (this.invincible) {
            this.invincibleTime--;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }

        this.draw();
    }

    move(direction) {
        const speed = 5;
        if (direction === 'left') this.velocityX = -speed;
        if (direction === 'right') this.velocityX = speed;
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = -12;
            this.isJumping = true;
        }
    }

    shoot(bullets) {
        if (this.canShoot && this.ammo > 0) {
            const bulletX = this.isPlayer1 ? this.x + this.width : this.x - 10;
            const bulletVelocity = this.isPlayer1 ? 8 : -8;
            bullets.push(new Bullet(bulletX, this.y + 15, bulletVelocity, this.isPlayer1));
            this.ammo--;
            this.canShoot = false;
            setTimeout(() => { this.canShoot = true; }, this.shootCooldown);
        }
    }

    takeDamage(amount) {
        if (!this.invincible) {
            this.health -= amount;
            this.invincible = true;
            this.invincibleTime = 30;
            if (this.health < 0) this.health = 0;
        }
    }
}

class Bullet {
    constructor(x, y, velocityX, isPlayer1) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.radius = 4;
        this.isPlayer1 = isPlayer1;
        this.element = null;
        this.damage = 10;
    }

    draw() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = 'bullet';
            gameScreen.appendChild(this.element);
        }
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    update() {
        this.x += this.velocityX;
        this.draw();
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > gameScreen.clientWidth;
    }

    remove() {
        if (this.element) this.element.remove();
    }
}

let player1, player2;
let bullets = [];
let keys = {};
let gameRunning = false;

function startGame(mode) {
    gameMode = mode;
    gameActive = true;
    gameRunning = true;
    menu.style.display = 'none';
    gameUI.style.display = 'block';
    gameScreen.innerHTML = '';

    player1 = new Player(50, 300, true);
    player2 = new Player(gameScreen.clientWidth - 80, 300, false);
    bullets = [];

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gameScreen.addEventListener('click', handleClick);

    gameLoop();
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'w') player1.jump();
    if (e.key === 'ArrowUp') player2.jump();

    if (e.key.toLowerCase() === 'e') meleeAttack(player1, player2);
    if (e.key === 'r') meleeAttack(player2, player1);
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleClick(e) {
    const rect = gameScreen.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // Simple detection: left side = player1, right side = player2
    if (clickX < gameScreen.clientWidth / 2) {
        player1.shoot(bullets);
    } else {
        player2.shoot(bullets);
    }
}

function meleeAttack(attacker, defender) {
    const distance = Math.abs(attacker.x - defender.x);
    if (distance < 80) {
        defender.takeDamage(15);
    }
}

function updatePlayerStats() {
    document.getElementById('player1HP').textContent = `${Math.max(0, Math.floor(player1.health))}/100 HP`;
    document.getElementById('player2HP').textContent = `${Math.max(0, Math.floor(player2.health))}/100 HP`;
    document.getElementById('player1Ammo').textContent = `Ammo: ${player1.ammo}`;
    document.getElementById('player2Ammo').textContent = `Ammo: ${player2.ammo}`;

    document.getElementById('player1Health').style.width = (player1.health / player1.maxHealth) * 100 + '%';
    document.getElementById('player2Health').style.width = (player2.health / player2.maxHealth) * 100 + '%';
}

function gameLoop() {
    if (!gameRunning) return;

    // Player 1 controls
    if (keys['a']) player1.move('left');
    if (keys['d']) player1.move('right');
    if (keys[' ']) player1.jump();

    // Player 2 controls
    if (keys['arrowleft']) player2.move('left');
    if (keys['arrowright']) player2.move('right');

    // Update entities
    player1.update();
    player2.update();

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();

        // Check collision with players
        if (checkCollision(bullets[i], player1) && !bullets[i].isPlayer1) {
            player1.takeDamage(bullets[i].damage);
            bullets[i].remove();
            bullets.splice(i, 1);
            continue;
        }
        if (checkCollision(bullets[i], player2) && bullets[i].isPlayer1) {
            player2.takeDamage(bullets[i].damage);
            bullets[i].remove();
            bullets.splice(i, 1);
            continue;
        }

        if (bullets[i].isOutOfBounds()) {
            bullets[i].remove();
            bullets.splice(i, 1);
        }
    }

    updatePlayerStats();

    // Check win condition
    if (player1.health <= 0) {
        endGame('Player 2 Wins! 🎉');
        return;
    }
    if (player2.health <= 0) {
        endGame('Player 1 Wins! 🎉');
        return;
    }

    requestAnimationFrame(gameLoop);
}

function checkCollision(bullet, player) {
    return (
        bullet.x < player.x + player.width &&
        bullet.x + bullet.radius * 2 > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + bullet.radius * 2 > player.y
    );
}

function endGame(winnerText) {
    gameRunning = false;
    gameUI.style.display = 'none';
    gameOver.style.display = 'block';
    document.getElementById('winnerText').textContent = winnerText;

    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    gameScreen.removeEventListener('click', handleClick);
}

function goBackToMenu() {
    gameRunning = false;
    gameActive = false;
    gameScreen.innerHTML = '';
    menu.style.display = 'block';
    gameUI.style.display = 'none';
    gameOver.style.display = 'none';
    keys = {};
}

function showCharacterSelect() {
    alert('Character Select coming soon! 🎨');
}