// Game Configuration
const MAP_WIDTH = 1600;  // 8x enlarged
const MAP_HEIGHT = 800;
const PLAYER_SIZE = 32;
const MAX_LOADOUT_ITEMS = 5;

const ITEMS = {
    SCAR: { name: 'SCAR', emoji: '🔫', color: 'scar' },
    SHOTGUN: { name: 'Shotgun', emoji: '🔫', color: 'shotgun' },
    MINI_SHIELD: { name: 'Mini Shield', emoji: '🛡️', color: 'shield' },
    MEDKIT: { name: 'Medkit', emoji: '🏥', color: 'medkit' }
};

// DOM Elements
const gameMap = document.getElementById('gameMap');
const menu = document.getElementById('menu');
const gameOver = document.getElementById('gameOver');
const healthFill = document.getElementById('healthFill');
const healthText = document.getElementById('healthText');
const loadoutItems = document.getElementById('loadoutItems');
const interactionPrompt = document.getElementById('interactionPrompt');

let gameRunning = false;
let cameraX = 0;
let cameraY = 0;

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 4;
        this.health = 100;
        this.maxHealth = 100;
        this.loadout = [];
        this.element = null;
        this.isJumping = false;
        this.nearChest = null;
        this.chestInteractCooldown = 0;
    }

    draw() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = 'player-minecraft';
            this.element.innerHTML = `
                <div class="player-body">
                    <div class="player-head"></div>
                    <div class="player-torso"></div>
                </div>
            `;
            gameMap.appendChild(this.element);
        }
        this.element.style.left = (this.x - cameraX) + 'px';
        this.element.style.top = (this.y - cameraY) + 'px';
    }

    update() {
        // Gravity
        this.velocityY += 0.5;
        this.y += this.velocityY;

        // Ground collision
        if (this.y + this.height >= MAP_HEIGHT - 50) {
            this.y = MAP_HEIGHT - 50 - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }

        // Horizontal boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > MAP_WIDTH) this.x = MAP_WIDTH - this.width;

        this.x += this.velocityX;
        this.velocityX *= 0.9;

        // Update camera
        cameraX = this.x - 250;
        cameraY = this.y - 200;
        if (cameraX < 0) cameraX = 0;
        if (cameraY < 0) cameraY = 0;
        if (cameraX + window.innerWidth > MAP_WIDTH) cameraX = MAP_WIDTH - window.innerWidth;
        if (cameraY + window.innerHeight > MAP_HEIGHT) cameraY = MAP_HEIGHT - window.innerHeight;

        if (this.chestInteractCooldown > 0) this.chestInteractCooldown--;

        this.draw();
    }

    moveLeft() {
        this.velocityX = -this.speed;
    }

    moveRight() {
        this.velocityX = this.speed;
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = -12;
            this.isJumping = true;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        updateHealthBar();
    }

    addItem(item) {
        if (this.loadout.length < MAX_LOADOUT_ITEMS) {
            this.loadout.push(item);
            updateLoadoutUI();
            return true;
        }
        return false;
    }
}

// Chest Class
class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.isOpen = false;
        this.element = null;
        this.interactDistance = 60;
    }

    draw() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = 'chest';
            gameMap.appendChild(this.element);
        }
        if (this.isOpen) this.element.classList.add('opened');
        this.element.style.left = (this.x - cameraX) + 'px';
        this.element.style.top = (this.y - cameraY) + 'px';
    }

    getDistance(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            this.element.classList.add('opened');
            return this.generateLoot();
        }
        return null;
    }

    generateLoot() {
        const items = Object.values(ITEMS);
        const randomItem = items[Math.floor(Math.random() * items.length)];
        return randomItem;
    }
}

// Item Drop Class
class ItemDrop {
    constructor(x, y, item) {
        this.x = x;
        this.y = y;
        this.item = item;
        this.width = 24;
        this.height = 24;
        this.element = null;
    }

    draw() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = `item-drop item-${this.item.color}`;
            gameMap.appendChild(this.element);
        }
        this.element.style.left = (this.x - cameraX) + 'px';
        this.element.style.top = (this.y - cameraY) + 'px';
    }

    remove() {
        if (this.element) this.element.remove();
    }
}

// Game State
let player;
let chests = [];
let itemDrops = [];
let keys = {};

// Initialize Game
function startGame() {
    gameRunning = true;
    menu.style.display = 'none';
    gameMap.innerHTML = '';
    gameMap.style.width = MAP_WIDTH + 'px';
    gameMap.style.height = MAP_HEIGHT + 'px';

    // Create player
    player = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Create chests
    chests = [
        new Chest(300, 200),
        new Chest(1300, 200),
        new Chest(300, 600),
        new Chest(1300, 600),
        new Chest(800, 400)
    ];

    itemDrops = [];

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleInteract);

    gameLoop();
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'w') player.jump();
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleInteract(e) {
    if (e.key.toLowerCase() === 'e' && player.nearChest && player.chestInteractCooldown === 0) {
        const loot = player.nearChest.open();
        if (loot) {
            if (player.addItem(loot)) {
                itemDrops = itemDrops.filter(drop => drop !== null);
            } else {
                const drop = new ItemDrop(player.nearChest.x, player.nearChest.y, loot);
                itemDrops.push(drop);
            }
            player.chestInteractCooldown = 30;
        }
    }
}

function updateHealthBar() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthFill.style.width = healthPercent + '%';
    healthText.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
}

function updateLoadoutUI() {
    loadoutItems.innerHTML = '';
    if (player.loadout.length === 0) {
        loadoutItems.innerHTML = '<div class="loadout-empty">Empty</div>';
    } else {
        player.loadout.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'loadout-item';
            itemEl.innerHTML = `
                <span class="item-name">${item.emoji} ${item.name}</span>
                <span class="item-amount">${index + 1}</span>
            `;
            loadoutItems.appendChild(itemEl);
        });
    }
}

function gameLoop() {
    if (!gameRunning) return;

    // Player input
    if (keys['a']) player.moveLeft();
    if (keys['d']) player.moveRight();

    // Check chest proximity
    player.nearChest = null;
    chests.forEach(chest => {
        const distance = chest.getDistance(player);
        if (distance < chest.interactDistance && !chest.isOpen) {
            player.nearChest = chest;
        }
    });

    // Show interaction prompt
    if (player.nearChest) {
        interactionPrompt.style.display = 'block';
    } else {
        interactionPrompt.style.display = 'none';
    }

    // Update
    player.update();
    chests.forEach(chest => chest.draw());
    itemDrops.forEach(drop => drop.draw());

    updateLoadoutUI();
    updateHealthBar();

    requestAnimationFrame(gameLoop);
}

// Start Menu Button
function init() {
    // Menu is shown by default
}

init();
