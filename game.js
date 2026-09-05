/* =====================================================
   OFFICE HUNT
   COMPLETE PROTOTYPE
===================================================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* =========================
   UI
========================= */

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const healthBar = document.getElementById("healthBar");
const moneyText = document.getElementById("money");
const pointsText = document.getElementById("points");
const killsText = document.getElementById("kills");
const levelText = document.getElementById("level");
const timerText = document.getElementById("timer");

const unlockPopup = document.getElementById("unlockPopup");
const continueButton = document.getElementById("continueButton");

const shop = document.getElementById("shop");
const shopMoney = document.getElementById("shopMoney");
const closeShop = document.getElementById("closeShop");

const gameMessage = document.getElementById("gameMessage");
const toolBar = document.getElementById("toolBar");

/* =========================
   GAME STATE
========================= */

let gameRunning = false;
let lastTime = 0;

let gameTime = 0;
let money = 0;
let points = 0;
let kills = 0;
let level = 1;

let spawnTimer = 0;
let attackTimer = 0;

let toolsUnlocked = false;
let selectedSlot = null;

let enemies = [];
let bullets = [];
let fireballs = [];
let moneyDrops = [];
let traps = [];

/* =========================
   KEYBOARD
========================= */

const keys = {};

window.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

    if (event.key === "1") useTool(0);
    if (event.key === "2") useTool(1);
    if (event.key === "3") useTool(2);

});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

/* =========================
   PLAYER
========================= */

const player = {

    x: 0,
    y: 0,

    radius: 17,

    speed: 260,

    health: 100,
    maxHealth: 100,

    shielded: false,
    shieldTime: 0

};

/* =========================
   TOOLS
========================= */

const tools = {

    emp: {
        name: "EMP",
        icon: "💣",
        price: 500,
        cooldown: 15
    },

    smoke: {
        name: "SMOKE",
        icon: "💨",
        price: 600,
        cooldown: 12
    },

    trap: {
        name: "TRAP",
        icon: "💀",
        price: 700,
        cooldown: 10
    },

    medkit: {
        name: "MED KIT",
        icon: "💓",
        price: 400,
        cooldown: 20
    },

    fireball: {
        name: "FIREBALL",
        icon: "🔥",
        price: 800,
        cooldown: 8
    },

    shield: {
        name: "SHIELD",
        icon: "🔪⃠",
        price: 900,
        cooldown: 30
    }

};

let equippedTools = [null, null, null];

let toolCooldowns = {
    emp: 0,
    smoke: 0,
    trap: 0,
    medkit: 0,
    fireball: 0,
    shield: 0
};

/* =========================
   ENEMY TYPES
========================= */

const enemyTypes = {

    employee: {

        name: "employee",
        color: "#32d957",

        radius: 14,

        speed: 75,

        health: 40,

        reward: 100,

        points: 200

    },

    security: {

        name: "security",
        color: "#3d9cff",

        radius: 22,

        speed: 62,

        health: 130,

        reward: 750,

        points: 1500

    },

    manager: {

        name: "manager",
        color: "#ffd43b",

        radius: 28,

        speed: 48,

        health: 220,

        reward: 500,

        points: 1000

    }

};

/* =========================
   RESIZE
========================= */

function resizeCanvas() {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!gameRunning) {

        player.x = canvas.width / 2;
        player.y = canvas.height / 2;

    }

}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

/* =========================
   START GAME
========================= */

function startGame() {

    gameRunning = true;

    gameTime = 0;
    money = 0;
    points = 0;
    kills = 0;
    level = 1;

    spawnTimer = 0;
    attackTimer = 0;

    toolsUnlocked = false;
    selectedSlot = null;

    enemies = [];
    bullets = [];
    fireballs = [];
    moneyDrops = [];
    traps = [];

    equippedTools = [null, null, null];

    Object.keys(toolCooldowns).forEach(tool => {
        toolCooldowns[tool] = 0;
    });

    player.health = player.maxHealth;
    player.shielded = false;
    player.shieldTime = 0;

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    unlockPopup.classList.add("hidden");
    shop.classList.add("hidden");

    toolBar.classList.add("locked");
    toolBar.classList.remove("tool-pop");

    updateToolBar();
    updateHUD();

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);

}

/* =========================
   PLAYER MOVEMENT
========================= */

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) dy--;
    if (keys["s"] || keys["arrowdown"]) dy++;
    if (keys["a"] || keys["arrowleft"]) dx--;
    if (keys["d"] || keys["arrowright"]) dx++;

    const length = Math.hypot(dx, dy);

    if (length > 0) {

        dx /= length;
        dy /= length;

    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.x = Math.max(
        player.radius,
        Math.min(
            canvas.width - player.radius,
            player.x
        )
    );

    player.y = Math.max(
        player.radius,
        Math.min(
            canvas.height - player.radius,
            player.y
        )
    );

}

/* =========================
   SPAWN ENEMY
========================= */

function spawnEnemy(typeName = null) {

    let type;

    if (typeName) {

        type = enemyTypes[typeName];

    } else {

        const roll = Math.random();

        if (level === 1) {

            type = enemyTypes.employee;

        } else if (level === 2) {

            type =
                roll < 0.8
                    ? enemyTypes.employee
                    : enemyTypes.security;

        } else {

            if (roll < 0.65) {

                type = enemyTypes.employee;

            } else if (roll < 0.85) {

                type = enemyTypes.security;

            } else {

                type = enemyTypes.manager;

            }

        }

    }

    const side = Math.floor(Math.random() * 4);

    let x;
    let y;

    if (side === 0) {

        x = Math.random() * canvas.width;
        y = -60;

    } else if (side === 1) {

        x = canvas.width + 60;
        y = Math.random() * canvas.height;

    } else if (side === 2) {

        x = Math.random() * canvas.width;
        y = canvas.height + 60;

    } else {

        x = -60;
        y = Math.random() * canvas.height;

    }

    const multiplier =
        1 + (level - 1) * 0.12;

    enemies.push({

        type: type.name,

        x,
        y,

        radius: type.radius,

        speed: type.speed * multiplier,

        baseSpeed: type.speed * multiplier,

        health: type.health * multiplier,

        maxHealth: type.health * multiplier,

        reward: type.reward,

        points: type.points,

        color: type.color,

        attackCooldown: 0,

        smokeFrozen: false,

        smokeTime: 0,

        empDisabled: false,

        empTime: 0,

        visionBlur: false

    });

}

/* =========================
   ENEMY UPDATE
========================= */

function updateEnemies(dt) {

    for (const enemy of enemies) {

        /* =====================
           SMOKE
        ===================== */

        if (enemy.smokeTime > 0) {

            enemy.smokeTime -= dt;

            if (enemy.smokeTime <= 0) {

                enemy.smokeFrozen = false;
                enemy.visionBlur = false;

            }

        }

        /* =====================
           EMP
        ===================== */

        if (enemy.empTime > 0) {

            enemy.empTime -= dt;

            if (enemy.empTime <= 0) {

                enemy.empDisabled = false;

            }

        }

        /* =====================
           SMOKE EFFECT
        ===================== */

        if (enemy.smokeFrozen) {

            continue;

        }

        /* =====================
           MOVEMENT
        ===================== */

        let currentSpeed = enemy.baseSpeed;

        if (enemy.visionBlur) {

            currentSpeed *= 0.35;

        }

        if (enemy.empDisabled) {

            currentSpeed *= 0.25;

        }

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distance = Math.hypot(dx, dy);

        if (distance > 0) {

            enemy.x +=
                (dx / distance) *
                currentSpeed *
                dt;

            enemy.y +=
                (dy / distance) *
                currentSpeed *
                dt;

        }

        /* =====================
           ATTACK
        ===================== */

        if (
            distance <
            player.radius +
            enemy.radius
        ) {

            enemy.attackCooldown -= dt;

            if (
                enemy.attackCooldown <= 0
            ) {

                let damage = 8;

                if (
                    enemy.type === "security"
                ) {

                    damage = 14;

                }

                if (
                    enemy.type === "manager"
                ) {

                    damage = 18;

                }

                if (!player.shielded) {

                    player.health -= damage;

                }

                enemy.attackCooldown = 0.7;

            }

        }

    }

}

/* =========================
   AUTO ATTACK
========================= */

function autoAttack() {

    if (enemies.length === 0) return;

    let target = null;
    let closest = Infinity;

    for (const enemy of enemies) {

        const distance = Math.hypot(

            enemy.x - player.x,
            enemy.y - player.y

        );

        if (distance < closest) {

            closest = distance;
            target = enemy;

        }

    }

    if (!target) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;

    const distance = Math.hypot(dx, dy);

    bullets.push({

        x: player.x,
        y: player.y,

        vx: (dx / distance) * 650,
        vy: (dy / distance) * 650,

        radius: 5,

        damage: 20

    });

}

/* =========================
   BULLETS
========================= */

function updateBullets(dt) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet = bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (
            bullet.x < -100 ||
            bullet.x > canvas.width + 100 ||
            bullet.y < -100 ||
            bullet.y > canvas.height + 100
        ) {

            bullets.splice(i, 1);
            continue;

        }

        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy = enemies[j];

            const distance = Math.hypot(

                bullet.x - enemy.x,
                bullet.y - enemy.y

            );

            if (
                distance <
                bullet.radius +
                enemy.radius
            ) {

                enemy.health -= bullet.damage;

                bullets.splice(i, 1);

                if (enemy.health <= 0) {

                    defeatEnemy(j);

                }

                break;

            }

        }

    }

}

/* =========================
   DEFEAT ENEMY
========================= */

function defeatEnemy(index) {

    const enemy = enemies[index];

    kills++;

    money += enemy.reward;
    points += enemy.points;

    createMoneyDrop(
        enemy.x,
        enemy.y,
        enemy.reward
    );

    /* MANAGER CREATES 7 EMPLOYEES */

    if (enemy.type === "manager") {

        for (let i = 0; i < 7; i++) {

            spawnEnemy("employee");

        }

        showMessage(
            "MANAGER DOWN — 7 EMPLOYEES!"
        );

    }

    enemies.splice(index, 1);

    checkToolUnlock();

    updateHUD();

}

/* =========================
   MONEY
========================= */

function createMoneyDrop(x, y, value) {

    let dropColor = "#39e75f";

    if (value >= 750) {

        dropColor = "#4da6ff";

    } else if (value >= 500) {

        dropColor = "#ffd43b";

    }

    moneyDrops.push({

        x,
        y,

        value,

        color: dropColor,

        radius:
            value >= 750
                ? 14
                : value >= 500
                ? 11
                : 8

    });

}

/* =========================
   MONEY UPDATE
========================= */

function updateMoneyDrops(dt) {

    for (
        let i = moneyDrops.length - 1;
        i >= 0;
        i--
    ) {

        const drop = moneyDrops[i];

        const dx = player.x - drop.x;
        const dy = player.y - drop.y;

        const distance = Math.hypot(dx, dy);

        if (distance < 170) {

            drop.x += dx * dt * 4;
            drop.y += dy * dt * 4;

        }

        if (
            distance <
            player.radius +
            drop.radius
        ) {

            moneyDrops.splice(i, 1);

        }

    }

}

/* =========================
   $1000 UNLOCK
========================= */

function checkToolUnlock() {

    if (
        money >= 1000 &&
        !toolsUnlocked
    ) {

        toolsUnlocked = true;

        gameRunning = false;

        unlockPopup.classList.remove(
            "hidden"
        );

    }

}

/* =========================
   CONTINUE
========================= */

continueButton.addEventListener(
    "click",
    function() {

        unlockPopup.classList.add(
            "hidden"
        );

        toolBar.classList.remove(
            "locked"
        );

        toolBar.classList.add(
            "tool-pop"
        );

        showMessage(
            "💣🤡 TOOLS UNLOCKED!"
        );

        gameRunning = true;

        lastTime = performance.now();

        requestAnimationFrame(
            gameLoop
        );

    }
);

/* =========================
   OPEN SHOP
========================= */

document
    .querySelectorAll(".tool-slot")
    .forEach((slot, index) => {

        slot.addEventListener(
            "click",
            function() {

                if (!toolsUnlocked) return;

                selectedSlot = index;

                shopMoney.textContent =
                    money;

                shop.classList.remove(
                    "hidden"
                );

            }
        );

    });

/* =========================
   SHOP BUTTONS
========================= */

document
    .querySelectorAll(
        ".shop-options button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                buyTool(
                    button.dataset.tool
                );

            }
        );

    });

closeShop.addEventListener(
    "click",
    function() {

        shop.classList.add(
            "hidden"
        );

        selectedSlot = null;

    }
);

/* =========================
   BUY TOOL
========================= */

function buyTool(toolName) {

    if (selectedSlot === null) return;

    const tool = tools[toolName];

    if (money < tool.price) {

        showMessage(
            "NOT ENOUGH MONEY"
        );

        return;

    }

    money -= tool.price;

    equippedTools[selectedSlot] =
        toolName;

    updateToolBar();

    shopMoney.textContent =
        money;

    shop.classList.add(
        "hidden"
    );

    selectedSlot = null;

    updateHUD();

}

/* =========================
   TOOL BAR
========================= */

function updateToolBar() {

    for (let i = 0; i < 3; i++) {

        const slot =
            document.getElementById(
                `slot${i + 1}`
            );

        const toolName =
            equippedTools[i];

        if (!toolName) {

            slot.querySelector(
                ".tool-icon"
            ).textContent = "+";

            slot.querySelector(
                ".tool-name"
            ).textContent = "EMPTY";

            slot.querySelector(
                ".tool-status"
            ).textContent = "BUY";

            continue;

        }

        const tool =
            tools[toolName];

        slot.querySelector(
            ".tool-icon"
        ).textContent =
            tool.icon;

        slot.querySelector(
            ".tool-name"
        ).textContent =
            tool.name;

        slot.querySelector(
            ".tool-status"
        ).textContent =
            "READY";

    }

}

/* =========================
   USE TOOL
========================= */

function useTool(index) {

    if (!toolsUnlocked) return;

    const toolName =
        equippedTools[index];

    /* EMPTY SLOT */

    if (!toolName) {

        selectedSlot = index;

        shopMoney.textContent =
            money;

        shop.classList.remove(
            "hidden"
        );

        return;

    }

    /* COOLDOWN */

    if (
        toolCooldowns[toolName] > 0
    ) {

        showMessage(

            `${Math.ceil(
                toolCooldowns[toolName]
            )}s COOLDOWN`

        );

        return;

    }

    /* =====================
       SMOKE
    ===================== */

    if (toolName === "smoke") {

        showMessage(
            "💨 SMOKE ACTIVATED!"
        );

        for (const enemy of enemies) {

            enemy.smokeTime = 4;

            /*
               Employee = completely stops
            */

            if (
                enemy.type ===
                "employee"
            ) {

                enemy.smokeFrozen =
                    true;

            }

            /*
               Security + Manager =
               blurred vision + slow
            */

            else {

                enemy.visionBlur =
                    true;

            }

        }

    }

    /* =====================
       EMP
    ===================== */

    if (toolName === "emp") {

        showMessage(
            "⚡ EMP ACTIVATED!"
        );

        for (const enemy of enemies) {

            if (
                enemy.type === "security" ||
                enemy.type === "manager"
            ) {

                enemy.empDisabled = true;
                enemy.empTime = 5;

            }

        }

    }

    /* =====================
       TRAP
    ===================== */

    if (toolName === "trap") {

        showMessage(
            "🪤 TRAP DEPLOYED!"
        );

        traps.push({

            x: player.x,
            y: player.y,

            radius: 130,

            life: 6,

            triggered: false

        });

    }

    /* =====================
       MED KIT
    ===================== */

    if (toolName === "medkit") {

        player.health =
            Math.min(

                player.maxHealth,

                player.health + 40

            );

        showMessage(
            "❤️ +40 HEALTH"
        );

    }

    /* =====================
       FIREBALL
    ===================== */

    if (toolName === "fireball") {

        let target = null;
        let closest = Infinity;

        for (const enemy of enemies) {

            const distance =
                Math.hypot(

                    enemy.x -
                    player.x,

                    enemy.y -
                    player.y

                );

            if (distance < closest) {

                closest = distance;
                target = enemy;

            }

        }

        if (target) {

            const dx =
                target.x -
                player.x;

            const dy =
                target.y -
                player.y;

            const distance =
                Math.hypot(dx, dy);

            fireballs.push({

                x: player.x,
                y: player.y,

                vx:
                    dx / distance * 500,

                vy:
                    dy / distance * 500,

                radius: 12,

                life: 3

            });

            showMessage(
                "🔥 FIREBALL!"
            );

        }

    }

    /* =====================
       SHIELD
    ===================== */

    if (toolName === "shield") {

        player.shielded = true;

        player.shieldTime = 15;

        showMessage(
            "🛡️ SHIELD ACTIVE — 15 SEC"
        );

    }

    /* START COOLDOWN */

    toolCooldowns[toolName] =
        tools[toolName].cooldown;

    /* TOOL IS CONSUMED */

    equippedTools[index] = null;

    updateToolBar();

}

/* =========================
   FIREBALL UPDATE
========================= */

function updateFireballs(dt) {

    for (
        let i = fireballs.length - 1;
        i >= 0;
        i--
    ) {

        const fireball =
            fireballs[i];

        fireball.x +=
            fireball.vx * dt;

        fireball.y +=
            fireball.vy * dt;

        fireball.life -= dt;

        if (fireball.life <= 0) {

            fireballs.splice(i, 1);
            continue;

        }

        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];

            const distance =
                Math.hypot(

                    fireball.x -
                    enemy.x,

                    fireball.y -
                    enemy.y

                );

            if (
                distance <
                fireball.radius +
                enemy.radius
            ) {

                /*
                   Employee = 100%
                */

                if (
                    enemy.type ===
                    "employee"
                ) {

                    enemy.health = 0;

                }

                /*
                   Security = 70%
                */

                else if (
                    enemy.type ===
                    "security"
                ) {

                    enemy.health -=
                        enemy.maxHealth *
                        0.70;

                }

                /*
                   Manager = 40%
                */

                else if (
                    enemy.type ===
                    "manager"
                ) {

                    enemy.health -=
                        enemy.maxHealth *
                        0.40;

                }

                fireballs.splice(i, 1);

                if (
                    enemy.health <= 0
                ) {

                    defeatEnemy(j);

                }

                break;

            }

        }

    }

}

/* =========================
   TRAPS
========================= */

function updateTraps(dt) {

    for (
        let i = traps.length - 1;
        i >= 0;
        i--
    ) {

        const trap = traps[i];

        trap.life -= dt;

        if (trap.life <= 0) {

            traps.splice(i, 1);
            continue;

        }

        if (!trap.triggered) {

            for (
                let j = enemies.length - 1;
                j >= 0;
                j--
            ) {

                const enemy =
                    enemies[j];

                const distance =
                    Math.hypot(

                        enemy.x -
                        trap.x,

                        enemy.y -
                        trap.y

                    );

                if (
                    distance <
                    trap.radius +
                    enemy.radius
                ) {

                    trap.triggered = true;

                    /*
                       Employee = dies
                    */

                    if (
                        enemy.type ===
                        "employee"
                    ) {

                        enemy.health = 0;

                    }

                    /*
                       Security = 90%
                    */

                    else if (
                        enemy.type ===
                        "security"
                    ) {

                        enemy.health -=
                            enemy.maxHealth *
                            0.90;

                    }

                    /*
                       Manager = 20%
                    */

                    else if (
                        enemy.type ===
                        "manager"
                    ) {

                        enemy.health -=
                            enemy.maxHealth *
                            0.20;

                    }

                    if (
                        enemy.health <= 0
                    ) {

                        defeatEnemy(j);

                    }

                    break;

                }

            }

        }

    }

}

/* =========================
   TOOL COOLDOWNS
========================= */

function updateToolCooldowns(dt) {

    Object.keys(toolCooldowns)
        .forEach(tool => {

            if (
                toolCooldowns[tool] > 0
            ) {

                toolCooldowns[tool] =
                    Math.max(

                        0,

                        toolCooldowns[tool] -
                        dt

                    );

            }

        });

}

/* =========================
   SHIELD
========================= */

function updateShield(dt) {

    if (!player.shielded) return;

    player.shieldTime -= dt;

    if (
        player.shieldTime <= 0
    ) {

        player.shielded = false;

        showMessage(
            "🛡️ SHIELD OFF"
        );

    }

}

/* =========================
   LEVEL
========================= */

function updateLevel() {

    const newLevel =
        Math.floor(
            gameTime / 30
        ) + 1;

    if (
        newLevel !== level
    ) {

        level = newLevel;

        showMessage(
            `LEVEL ${level}`
        );

    }

    levelText.textContent =
        level;

}

/* =========================
   MESSAGE
========================= */

let messageTimer = 0;

function showMessage(text) {

    gameMessage.textContent =
        text;

    gameMessage.classList.add(
        "show"
    );

    messageTimer = 2;

}

/* =========================
   HUD
========================= */

function updateHUD() {

    const healthPercent =
        Math.max(

            0,

            player.health /
            player.maxHealth *
            100

        );

    healthBar.style.width =
        `${healthPercent}%`;

    moneyText.textContent =
        money;

    pointsText.textContent =
        points;

    killsText.textContent =
        kills;

    const minutes =
        Math.floor(
            gameTime / 60
        );

    const seconds =
        Math.floor(
            gameTime % 60
        );

    timerText.textContent =

        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

}

/* =========================
   DRAW
========================= */

function draw() {

    /* FLOOR */

    ctx.fillStyle = "#101010";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /* GRID */

    ctx.strokeStyle = "#1c1c1c";

    for (
        let x = 0;
        x < canvas.width;
        x += 50
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);

        ctx.stroke();

    }

    for (
        let y = 0;
        y < canvas.height;
        y += 50
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);

        ctx.stroke();

    }

    /* TRAPS */

    for (const trap of traps) {

        ctx.beginPath();

        ctx.arc(
            trap.x,
            trap.y,
            trap.radius,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            "rgba(255,255,255,0.3)";

        ctx.lineWidth = 2;

        ctx.stroke();

        ctx.font =
            "20px Arial";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "white";

        ctx.fillText(
            "🪤",
            trap.x,
            trap.y + 7
        );

    }

    /* MONEY */

    for (const drop of moneyDrops) {

        ctx.beginPath();

        ctx.arc(
            drop.x,
            drop.y,
            drop.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            drop.color;

        ctx.fill();

    }

    /* PLAYER */

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "white";

    ctx.fill();

    /* SHIELD */

    if (player.shielded) {

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            player.radius + 12,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            "#7dd3ff";

        ctx.lineWidth = 4;

        ctx.stroke();

    }

    /* ENEMIES */

    for (const enemy of enemies) {

        /* SMOKE */

        if (
            enemy.smokeFrozen ||
            enemy.visionBlur
        ) {

            ctx.beginPath();

            ctx.arc(
                enemy.x,
                enemy.y,
                enemy.radius + 7,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "rgba(150,150,150,0.18)";

            ctx.fill();

        }

        /* ENEMY */

        ctx.beginPath();

        ctx.arc(
            enemy.x,
            enemy.y,
            enemy.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            enemy.color;

        ctx.fill();

        /* HEALTH BACKGROUND */

        const barWidth =
            enemy.radius * 2;

        ctx.fillStyle =
            "#222";

        ctx.fillRect(

            enemy.x -
            enemy.radius,

            enemy.y -
            enemy.radius -
            10,

            barWidth,

            4

        );

        /* HEALTH */

        ctx.fillStyle =
            "white";

        ctx.fillRect(

            enemy.x -
            enemy.radius,

            enemy.y -
            enemy.radius -
            10,

            barWidth *
            Math.max(

                0,

                enemy.health /
                enemy.maxHealth

            ),

            4

        );

        /* LABEL */

        ctx.font =
            "9px Arial";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "white";

        ctx.fillText(

            enemy.type.toUpperCase(),

            enemy.x,

            enemy.y +
            enemy.radius +
            15

        );

        /* EMP DISABLED */

        if (
            enemy.empDisabled
        ) {

            ctx.font =
                "16px Arial";

            ctx.fillText(
                "⚡",
                enemy.x,
                enemy.y - enemy.radius - 15
            );

        }

    }

    /* BULLETS */

    for (const bullet of bullets) {

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "white";

        ctx.fill();

    }

    /* FIREBALLS */

    for (const fireball of fireballs) {

        ctx.beginPath();

        ctx.arc(
            fireball.x,
            fireball.y,
            fireball.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#ff7b00";

        ctx.fill();

        ctx.font =
            "18px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "🔥",
            fireball.x,
            fireball.y + 6
        );

    }

    /* MESSAGE */

    if (messageTimer > 0) {

        messageTimer -= 1 / 60;

    } else {

        gameMessage.classList.remove(
            "show"
        );

    }

}

/* =========================
   GAME OVER
========================= */

function gameOver() {

    gameRunning = false;

    document.getElementById(
        "finalStats"
    ).innerHTML = `

        ✨ SCORE:
        ${points}

        <br>

        📀 MONEY:
        $${money}

        <br>

        ☢️ TARGETS:
        ${kills}

        <br>

        🏆 LEVEL:
        ${level}

        <br>

        🕰️ TIME:
        ${Math.floor(gameTime)}
        seconds

    `;

    gameOverScreen.classList.remove(
        "hidden"
    );

}

/* =========================
   GAME LOOP
========================= */

function gameLoop(time) {

    if (!gameRunning) return;

    const dt = Math.min(

        (time - lastTime) / 1000,

        0.05

    );

    lastTime = time;

    gameTime += dt;

    updatePlayer(dt);

    updateEnemies(dt);

    updateBullets(dt);

    updateFireballs(dt);

    updateTraps(dt);

    updateMoneyDrops(dt);

    updateShield(dt);

    updateToolCooldowns(dt);

    updateLevel();

    /* SPAWN */

    spawnTimer -= dt;

    if (spawnTimer <= 0) {

        spawnEnemy();

        spawnTimer = Math.max(

            0.25,

            1 -
            level *
            0.055

        );

    }

    /* AUTO ATTACK */

    attackTimer -= dt;

    if (attackTimer <= 0) {

        autoAttack();

        attackTimer = 0.35;

    }

    updateHUD();

    draw();

    /* DEATH */

    if (
        player.health <= 0
    ) {

        gameOver();

        return;

    }

    requestAnimationFrame(
        gameLoop
    );

}

/* =========================
   BUTTONS
========================= */

startButton.addEventListener(
    "click",
    startGame
);

restartButton.addEventListener(
    "click",
    startGame
);