// ============================
// VARIABLES GENERALES
// ============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const coinSound = new Audio("sounds/coin.wav"); // ruta a tu sonido

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
const clearScoresBtn = document.getElementById("clearScoresBtn");

// ============================
// EVENTOS
// ============================
startBtn.onclick = startGame;
scoresBtn.onclick = showScores;
backToMenu.onclick = goToMenu;
pauseBtn.onclick = pauseGame;
resumeBtn.onclick = resumeGame;
menuBtn.onclick = goToMenu;
clearScoresBtn.onclick = clearScores;

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") direction = "up";
    if (e.key === "ArrowDown") direction = "down";
    if (e.key === "ArrowLeft") direction = "left";
    if (e.key === "ArrowRight") direction = "right";
});

// ============================
// FUNCIONES DE MENÚS
// ============================
function goToMenu() {
    gameRunning = false;
    paused = false;
    menu.classList.remove("hidden");
    scoresMenu.classList.add("hidden");
    gameContainer.classList.add("hidden");
}

function clearScores() {
    if (confirm("¿Seguro que deseas borrar todos los puntajes?")) {
        localStorage.removeItem("pigScores");
        scoreList.innerHTML = "";
        alert("Todos los puntajes han sido borrados.");
    }
}

function showScores() {
    menu.classList.add("hidden");
    scoresMenu.classList.remove("hidden");

    scoreList.innerHTML = "";
    let scores = JSON.parse(localStorage.getItem("pigScores") || "[]");

    scores.sort((a, b) => b.points - a.points);

    scores.slice(0, 10).forEach((s, index) => {
        const li = document.createElement("li");
        const name = s.name || "Jugador";
        const points = s.points || 0;
        const level = s.level || 1;

        li.innerHTML = `<strong>${index + 1}.</strong> ${name} - Puntos: ${points} - Nivel: ${level}`;
        scoreList.appendChild(li);
    });
}

// ============================
// HUD
// ============================
function updateHUD() {
    document.getElementById("levelDisplay").textContent = "Nivel: " + currentLevel;
    document.getElementById("coinsDisplay").textContent = "Monedas restantes: " + coins.length;

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

    bgMusic.play().catch(e => console.log("Música no se pudo reproducir automáticamente"));

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

    let coinCount = 10 + (level - 1) * 5;

    for (let i = 0; i < coinCount; i++) {
        let coin;
        let validPosition = false;

        while (!validPosition) {
            coin = {
                x: Math.floor(Math.random() * 29) * 20,
                y: Math.floor(Math.random() * 29) * 20,
                size: 20
            };

            validPosition = !coins.some(c => rectsCollide(c, coin));
            validPosition = validPosition && !rectsCollide(pig, coin);
        }

        coins.push(coin);
    }

    enemy.speed = 2 + (level - 1) * 0.4;
    pig.speed = 4 + (level - 1) * 0.2;

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
// MÚSICA DE FONDO
// ============================
const bgMusic = new Audio('sounds/bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3;

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
// MOVIMIENTO CERDO
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
// MOVIMIENTO ENEMIGO (PATHFINDING SENCILLO)
// ============================
function moveEnemy() {
    let ox = enemy.x;
    let oy = enemy.y;

    let dx = pig.x - enemy.x;
    let dy = pig.y - enemy.y;

    let moved = false;

    if (Math.abs(dx) > Math.abs(dy)) {
        enemy.x += dx > 0 ? enemy.speed : -enemy.speed;
        if (!checkWallCollision(enemy)) moved = true;
        else enemy.x = ox;

        if (!moved) {
            enemy.y += dy > 0 ? enemy.speed : -enemy.speed;
            if (!checkWallCollision(enemy)) moved = true;
            else enemy.y = oy;
        }
    } else {
        enemy.y += dy > 0 ? enemy.speed : -enemy.speed;
        if (!checkWallCollision(enemy)) moved = true;
        else enemy.y = oy;

        if (!moved) {
            enemy.x += dx > 0 ? enemy.speed : -enemy.speed;
            if (!checkWallCollision(enemy)) moved = true;
            else enemy.x = ox;
        }
    }

    if (!moved) {
        let directions = [
            {x: enemy.x + enemy.speed, y: enemy.y},
            {x: enemy.x - enemy.speed, y: enemy.y},
            {x: enemy.x, y: enemy.y + enemy.speed},
            {x: enemy.x, y: enemy.y - enemy.speed}
        ];

        for (let d of directions) {
            let prevX = enemy.x;
            let prevY = enemy.y;
            enemy.x = d.x;
            enemy.y = d.y;
            if (!checkWallCollision(enemy)) break;
            enemy.x = prevX;
            enemy.y = prevY;
        }
    }
}

// ============================
// COLISIONES
// ============================
function rectsCollide(a, b) {
    return a.x < b.x + b.size &&
           a.x + a.size > b.x &&
           a.y < b.y + b.size &&
           a.y + a.size > b.y;
}

function checkCoinCollision() {
    coins = coins.filter(coin => {
        if (rectsCollide(pig, coin)) {
            score++;
            coinSound.currentTime = 0;
            coinSound.play();
            updateHUD();
            return false;
        }
        return true;
    });
}

function checkEnemyCollision() {
    if (rectsCollide(pig, enemy)) {
        const hitSound = new Audio('sounds/hit.wav');
        hitSound.play();

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
        ) return true;
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

    const newScore = { name, points: score, level: currentLevel };
    scores.push(newScore);

    scores.sort((a, b) => b.points - a.points);

    let isNewRecord = scores[0] === newScore;

    localStorage.setItem("pigScores", JSON.stringify(scores));

    if (isNewRecord) {
        alert("¡NUEVO RECORD! " + score + " puntos");
    }
}

// ============================
// DIBUJAR TODO
// ============================
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "pink";
    ctx.fillRect(pig.x, pig.y, pig.size, pig.size);

    ctx.fillStyle = "red";
    ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);

    ctx.fillStyle = "yellow";
    coins.forEach(c => ctx.fillRect(c.x, c.y, c.size, c.size));

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
    bgMusic.pause();
}

function resumeGame() {
    paused = false;
    resumeBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    bgMusic.play();
}

// ============================
// TRANSICIÓN DE NIVELES
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
