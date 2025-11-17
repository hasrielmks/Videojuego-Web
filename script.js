// ============================
// VARIABLES GENERALES
// ============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameRunning = false;
let paused = false;

let pig = { x: 50, y: 50, size: 20, speed: 4 };
let enemy = { x: 500, y: 500, size: 20, speed: 3 };

let direction = "";
let coins = [];
let currentLevel = 1;
let score = 0;
let lives = 3;

let walls = [];

// ============================
// ELEMENTOS DEL DOM
// ============================
const menu = document.getElementById("menu");
const scoresMenu = document.getElementById("scores");
const gameContainer = document.getElementById("gameContainer");

const startBtn = document.getElementById("startBtn");
const scoresBtn = document.getElementById("scoresBtn");
const backToMenu = document.getElementById("backToMenu");

const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const menuBtn = document.getElementById("menuBtn");

const scoreList = document.getElementById("scoreList");

// ============================
// EVENTOS
// ============================
startBtn.onclick = startGame;
scoresBtn.onclick = showScores;
backToMenu.onclick = goToMenu;
pauseBtn.onclick = pauseGame;
resumeBtn.onclick = resumeGame;
menuBtn.onclick = goToMenu;

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") direction = "up";
    if (e.key === "ArrowDown") direction = "down";
    if (e.key === "ArrowLeft") direction = "left";
    if (e.key === "ArrowRight") direction = "right";
});

// ============================
// MENÚS
// ============================
function goToMenu() {
    gameRunning = false;
    paused = false;
    menu.classList.remove("hidden");
    scoresMenu.classList.add("hidden");
    gameContainer.classList.add("hidden");
}

function showScores() {
    menu.classList.add("hidden");
    scoresMenu.classList.remove("hidden");

    scoreList.innerHTML = "";
    let scores = JSON.parse(localStorage.getItem("pigScores") || "[]");

    scores.slice(0, 10).forEach(s => {
        const li = document.createElement("li");
        li.textContent = `${s.name}: ${s.points}`;
        scoreList.appendChild(li);
    });
}

// ============================
// HUD
// ============================
function updateHUD() {
    document.getElementById("levelDisplay").textContent = "Nivel: " + currentLevel;

    const livesContainer = document.getElementById("heartsContainer");
    livesContainer.innerHTML = "";

    for (let i = 0; i < lives; i++) {
        const heart = document.createElement("span");
        heart.textContent = "❤️";
        heart.style.fontSize = "24px";
        heart.style.marginRight = "5px";
        livesContainer.appendChild(heart);
    }
}

// ============================
// INICIAR JUEGO
// ============================
function startGame() {
    menu.classList.add("hidden");
    scoresMenu.classList.add("hidden");
    gameContainer.classList.remove("hidden");

    resetGame();
    gameRunning = true;

    gameLoop();
}

function resetGame() {
    pig.x = 50;
    pig.y = 50;

    enemy.x = 500;
    enemy.y = 500;

    direction = "";
    score = 0;
    currentLevel = 1;
    lives = 3;

    loadLevel(currentLevel);
    updateHUD();
}

// ============================
// NIVELES
// ============================
function loadLevel(level) {
    walls = [];
    coins = [];

    // Monedas
    let coinCount = 10 + (level - 1) * 5;
    for (let i = 0; i < coinCount; i++) {
        coins.push({
            x: Math.floor(Math.random() * 29) * 20,
            y: Math.floor(Math.random() * 29) * 20,
            size: 20
        });
    }

    // Aumentar dificultad
    enemy.speed = 2 + (level - 1) * 0.4;
    pig.speed = 4 + (level - 1) * 0.2;

    // Paredes
    let wallCount = 5 + level;
    for (let i = 0; i < wallCount; i++) {
        walls.push({
            x: Math.floor(Math.random() * 25) * 20,
            y: Math.floor(Math.random() * 25) * 20,
            width: 60,
            height: 20
        });
    }

    updateHUD();
}

// ============================
// GAME LOOP
// ============================
function gameLoop() {
    if (!gameRunning) return;
    if (!paused) updateGame();
    drawGame();

    requestAnimationFrame(gameLoop);
}

function updateGame() {
    movePig();
    moveEnemy();
    checkCoinCollision();
    checkEnemyCollision();

    if (coins.length === 0) {
        currentLevel++;
        loadLevel(currentLevel);
        updateHUD();
        showLevelTransition();
    }
}

// ============================
// MOVIMIENTO DEL CERDO
// ============================
function movePig() {
    let ox = pig.x;
    let oy = pig.y;

    if (direction === "up") pig.y -= pig.speed;
    if (direction === "down") pig.y += pig.speed;
    if (direction === "left") pig.x -= pig.speed;
    if (direction === "right") pig.x += pig.speed;

    pig.x = Math.max(0, Math.min(pig.x, 580));
    pig.y = Math.max(0, Math.min(pig.y, 580));

    if (checkWallCollision(pig)) {
        pig.x = ox;
        pig.y = oy;
    }
}

// ============================
// MOVIMIENTO ENEMIGO
// ============================
function moveEnemy() {
    let ox = enemy.x;
    let oy = enemy.y;

    if (enemy.x < pig.x) enemy.x += enemy.speed;
    if (enemy.x > pig.x) enemy.x -= enemy.speed;
    if (enemy.y < pig.y) enemy.y += enemy.speed;
    if (enemy.y > pig.y) enemy.y -= enemy.speed;

    if (checkWallCollision(enemy)) {
        enemy.x = ox;
        enemy.y = oy;
    }
}

// ============================
// COLISIONES
// ============================
function checkCoinCollision() {
    coins = coins.filter(coin => {
        if (Math.abs(pig.x - coin.x) < 20 && Math.abs(pig.y - coin.y) < 20) {
            score++;
            return false;
        }
        return true;
    });
}

function checkEnemyCollision() {
    if (Math.abs(pig.x - enemy.x) < 20 && Math.abs(pig.y - enemy.y) < 20) {

        lives--;
        updateHUD();

        if (lives <= 0) {
            saveScore();
            alert("¡Perdiste todas las vidas! Puntaje: " + score);
            goToMenu();
            return;
        }

        pig.x = 50;
        pig.y = 50;
        enemy.x = 500;
        enemy.y = 500;
        direction = "";

        alert("¡Te atraparon! Vidas restantes: " + lives);
    }
}

function checkWallCollision(obj) {
    for (let w of walls) {
        if (
            obj.x < w.x + w.width &&
            obj.x + obj.size > w.x &&
            obj.y < w.y + w.height &&
            obj.y + obj.size > w.y
        ) {
            return true;
        }
    }
    return false;
}

// ============================
// GUARDAR PUNTAJE
// ============================
function saveScore() {
    let scores = JSON.parse(localStorage.getItem("pigScores") || "[]");

    let name = prompt("Ingresa tu nombre:");
    if (!name) name = "Jugador";

    scores.push({ name, points: score });

    scores.sort((a, b) => b.points - a.points);
    localStorage.setItem("pigScores", JSON.stringify(scores));
}

// ============================
// DIBUJAR TODO
// ============================
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cerdo
    ctx.fillStyle = "pink";
    ctx.fillRect(pig.x, pig.y, pig.size, pig.size);

    // Enemigo
    ctx.fillStyle = "red";
    ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);

    // Monedas
    ctx.fillStyle = "yellow";
    coins.forEach(c => ctx.fillRect(c.x, c.y, c.size, c.size));

    // Paredes
    ctx.fillStyle = "#9344bdff";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.width, w.height));
}

// ============================
// PAUSA
// ============================
function pauseGame() {
    paused = true;
    pauseBtn.classList.add("hidden");
    resumeBtn.classList.remove("hidden");
}

function resumeGame() {
    paused = false;
    resumeBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
}

// ============================
// PANTALLA DE TRANSICIÓN
// ============================
function showLevelTransition() {
    const transition = document.getElementById("levelTransition");
    const text = document.getElementById("transitionText");

    text.textContent = "Nivel " + currentLevel;

    transition.classList.remove("hidden");

    setTimeout(() => {
        transition.classList.add("hidden");
    }, 1500);
}
