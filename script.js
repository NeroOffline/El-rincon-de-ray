const pages = [...document.querySelectorAll('[data-page-section]')];
const navLinks = [...document.querySelectorAll('.nav-link')];
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const toast = document.getElementById('toast');

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function openPage(pageName) {

  const page = document.querySelector(
    `[data-page-section="${pageName}"]`
  );

  if (!page) {
    console.error(`No se encontró la sección: ${pageName}`);
    return;
  }

  /* ============================================
     MOSTRAR SOLO LA SECCIÓN SELECCIONADA
     ============================================ */

  pages.forEach(section => {

    const isActive = section === page;

    section.classList.toggle(
      'active-page',
      isActive
    );

    /*
      Esto fuerza que la sección seleccionada
      sea visible aunque exista algún conflicto
      en styles.css.
    */
    section.style.display =
      isActive ? 'block' : 'none';

  });


  /* ============================================
     CAMBIAR BOTÓN ACTIVO DEL MENÚ
     ============================================ */

  navLinks.forEach(link => {

    link.classList.toggle(
      'active',
      link.dataset.page === pageName
    );

  });


  /* ============================================
     VOLVER ARRIBA
     ============================================ */

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  mainNav?.classList.remove('open');

  menuToggle?.setAttribute(
    'aria-expanded',
    'false'
  );


  /* Detener minijuego si sales de Minijuegos */

  if (pageName !== 'minijuegos') {
    stopActiveGame();
  }

}

function routeFromHash() {
  const page = location.hash.replace('#', '') || 'inicio';
  openPage(page);
}

window.addEventListener('hashchange', routeFromHash);
window.addEventListener('DOMContentLoaded', routeFromHash);

menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

/* ----------------------- FILTROS ----------------------- */
function setupFilter(groupSelector, cardType) {
  const group = document.querySelector(groupSelector);
  if (!group) return;
  const cards = [...document.querySelectorAll(`[data-type="${cardType}"]`)];

  group.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    group.querySelectorAll('[data-filter]').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    cards.forEach(card => {
      const tags = card.dataset.tags || '';
      card.hidden = filter !== 'all' && !tags.includes(filter);
    });
  });
}

setupFilter('[data-filter-group="games"]', 'game');
setupFilter('[data-filter-group="anime"]', 'anime');

function setupSearch(inputSelector, cardType) {
  const input = document.querySelector(inputSelector);
  if (!input) return;
  const cards = [...document.querySelectorAll(`[data-type="${cardType}"]`)];

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      card.style.display = title.includes(term) ? '' : 'none';
    });
  });
}

setupSearch('#game-search', 'game');
setupSearch('#anime-search', 'anime');

/* ---------------------- FAVORITOS ---------------------- */
const STORAGE_KEY = 'el-rincon-de-ray-favoritos';
let favorites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function cardInfo(button) {
  const card = button.closest('.recommendation-card');
  const title = card?.querySelector('h2')?.textContent?.trim() || 'Sin título';
  const section = card?.closest('.page')?.id || 'general';
  return { title, section };
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  renderFavorites();
}

function syncFavoriteButtons() {
  document.querySelectorAll('.favorite-btn').forEach(button => {
    const info = cardInfo(button);
    const active = favorites.some(item => item.title === info.title);
    button.classList.toggle('active', active);
    button.textContent = active ? '♥' : '♡';
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest('.favorite-btn');
  if (!button) return;
  const info = cardInfo(button);
  const exists = favorites.some(item => item.title === info.title);
  favorites = exists ? favorites.filter(item => item.title !== info.title) : [...favorites, info];
  saveFavorites();
  syncFavoriteButtons();
  showToast(exists ? `${info.title} eliminado de favoritos.` : `${info.title} agregado a favoritos.`);
});

function renderFavorites() {
  const list = document.getElementById('favorites-list');
  if (!list) return;

  if (!favorites.length) {
    list.innerHTML = '<div class="favorite-item"><strong>Aún no tienes favoritos.</strong><p>Pulsa el botón de favorito en una recomendación para guardarla aquí.</p></div>';
    return;
  }

  list.innerHTML = favorites
    .map(item => `<div class="favorite-item"><strong>${item.title}</strong><p>Sección: ${item.section}</p></div>`)
    .join('');
}

syncFavoriteButtons();
renderFavorites();

/* ---------------- LINKS QUE DEBES CAMBIAR ---------------- */
document.addEventListener('click', event => {
  const link = event.target.closest('.external-placeholder');
  if (!link || link.getAttribute('href') !== '#') return;
  event.preventDefault();
  showToast('Este botón aún necesita su link real. Busca href="#" en index.html y reemplázalo.');
});

/* ================================================================
   MINIJUEGOS
   No necesitas modificar index.html ni styles.css.
   Este mismo archivo crea el panel de juego, aplica los controles,
   oculta "Mejores puntuaciones" y mantiene el bloque de ayuda.
   ================================================================ */

let activeGameKey = null;
let activeController = null;
let gamePanel = null;
let gameCanvas = null;
let gameCtx = null;
let gameTitle = null;
let gameStatus = null;
let gameScore = null;

const MINIGAME_NAMES = {
  snake: 'Snake',
  pong: 'Pong',
  frogger: 'Frogger',
  jumper: 'Platform Jumper'
};

function normalizeGameKey(name = '') {
  const value = name.toLowerCase();
  if (value.includes('snake')) return 'snake';
  if (value.includes('pong')) return 'pong';
  if (value.includes('frogger')) return 'frogger';
  if (value.includes('platform')) return 'jumper';
  return value;
}

function setGameStatus(text) {
  if (gameStatus) gameStatus.textContent = text;
}

function setGameScore(text) {
  if (gameScore) gameScore.textContent = text;
}

function stopActiveGame() {
  if (activeController?.destroy) activeController.destroy();
  activeController = null;
  activeGameKey = null;
}

function clearGameCanvas() {
  if (!gameCtx || !gameCanvas) return;
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.fillStyle = '#08102d';
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function injectMinigameStyles() {
  if (document.getElementById('minigame-runtime-styles')) return;

  const style = document.createElement('style');
  style.id = 'minigame-runtime-styles';
  style.textContent = `
    .page-minijuegos .scores { display:none !important; }
    .page-minijuegos .mini-bottom { grid-template-columns:1fr !important; }
    .page-minijuegos .controls { width:100%; }

    .game-player-panel {
      margin: 24px auto 32px;
      padding: 18px;
      width: min(1100px, calc(100% - 32px));
      border: 2px solid rgba(152,118,255,.7);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(12,19,61,.97), rgba(5,9,34,.98));
      box-shadow: 0 18px 45px rgba(0,0,0,.35), 0 0 30px rgba(125,88,255,.12);
    }

    .game-player-panel[hidden] { display:none !important; }

    .game-player-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin-bottom:12px;
      flex-wrap:wrap;
    }

    .game-player-title-wrap h2 {
      margin:0;
      font-family: var(--font-pixel, monospace);
      font-size:2.2rem;
      color:#fff;
    }

    .game-player-meta {
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .game-chip {
      padding:7px 12px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;
      background:rgba(108,76,255,.17);
      color:#eee9ff;
      font-family:var(--font-pixel, monospace);
      font-size:1.05rem;
    }

    .game-canvas-wrap {
      width:100%;
      overflow:hidden;
      border-radius:12px;
      border:2px solid rgba(105,200,255,.35);
      background:#050923;
    }

    #minigame-canvas {
      width:100%;
      height:auto;
      display:block;
      image-rendering:pixelated;
      outline:none;
      background:#08102d;
    }

    .game-player-actions {
      display:flex;
      justify-content:flex-end;
      gap:10px;
      margin-top:12px;
      flex-wrap:wrap;
    }

    .game-action-btn {
      cursor:pointer;
      border:1px solid rgba(255,255,255,.18);
      border-radius:10px;
      padding:9px 14px;
      color:white;
      background:linear-gradient(135deg,#6f52ff,#c454d9);
      font-family:var(--font-pixel, monospace);
      font-size:1rem;
    }

    .game-action-btn.secondary {
      background:rgba(255,255,255,.08);
    }

    .page-minijuegos .controls h3 { margin-bottom:14px; }
    .page-minijuegos .controls p {
      display:flex;
      align-items:center;
      gap:12px;
      margin:10px 0;
    }
    .page-minijuegos .controls kbd {
      min-width:125px;
      text-align:center;
    }
  `;
  document.head.appendChild(style);
}

function setupMinigames() {
  const miniGrid = document.getElementById('mini-grid');
  if (!miniGrid) return;

  injectMinigameStyles();

  // Quita visualmente el bloque de puntuaciones.
  document.querySelector('.page-minijuegos .scores')?.remove();

  // Deja exactamente los controles que pediste.
  const controls = document.querySelector('.page-minijuegos .controls');
  if (controls) {
    controls.innerHTML = `
      <h3>Controles y ayuda</h3>
      <p><kbd>← ↑ ↓ →</kbd> mover / navegar</p>
      <p><kbd>Z</kbd> seleccionar / saltar</p>
      <p><kbd>X</kbd> acción especial</p>
      <p><kbd>P</kbd> pausa</p>
    `;
  }

  gamePanel = document.createElement('div');
  gamePanel.id = 'game-player-panel';
  gamePanel.className = 'game-player-panel';
  gamePanel.hidden = true;
  gamePanel.innerHTML = `
    <div class="game-player-head">
      <div class="game-player-title-wrap">
        <h2 id="runtime-game-title">Minijuego</h2>
      </div>
      <div class="game-player-meta">
        <span class="game-chip" id="runtime-game-status">Listo</span>
        <span class="game-chip" id="runtime-game-score">Puntuación: 0</span>
      </div>
    </div>
    <div class="game-canvas-wrap">
      <canvas id="minigame-canvas" width="760" height="440" tabindex="0" aria-label="Área del minijuego"></canvas>
    </div>
    <div class="game-player-actions">
      <button class="game-action-btn" id="runtime-game-restart" type="button">Reiniciar</button>
      <button class="game-action-btn secondary" id="runtime-game-close" type="button">Cerrar</button>
    </div>
  `;

  miniGrid.insertAdjacentElement('afterend', gamePanel);

  gameCanvas = document.getElementById('minigame-canvas');
  gameCtx = gameCanvas.getContext('2d');
  gameTitle = document.getElementById('runtime-game-title');
  gameStatus = document.getElementById('runtime-game-status');
  gameScore = document.getElementById('runtime-game-score');

  document.getElementById('runtime-game-restart')?.addEventListener('click', () => {
    if (activeGameKey) launchGame(activeGameKey);
  });

  document.getElementById('runtime-game-close')?.addEventListener('click', () => {
    stopActiveGame();
    gamePanel.hidden = true;
    clearGameCanvas();
  });

  document.querySelectorAll('.game-launch').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const key = normalizeGameKey(button.dataset.game);
      launchGame(key);
    });
  });

  document.addEventListener('keydown', event => {
    if (!activeController || gamePanel.hidden) return;
    const key = event.key.toLowerCase();
    if (['arrowleft','arrowright','arrowup','arrowdown','z','x','p'].includes(key)) {
      event.preventDefault();
    }
    activeController.keydown?.(event);
  });

  document.addEventListener('keyup', event => {
    if (!activeController || gamePanel.hidden) return;
    activeController.keyup?.(event);
  });

  clearGameCanvas();
}

function launchGame(key) {
  const factories = {
    snake: createSnakeGame,
    pong: createPongGame,
    frogger: createFroggerGame,
    jumper: createPlatformJumperGame
  };

  if (!factories[key] || !gamePanel || !gameCanvas) return;

  stopActiveGame();
  activeGameKey = key;
  gamePanel.hidden = false;
  gameTitle.textContent = MINIGAME_NAMES[key];
  setGameStatus('En juego');
  setGameScore('Puntuación: 0');
  clearGameCanvas();

  activeController = factories[key](gameCanvas, gameCtx);
  activeController.start?.();

  gamePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => gameCanvas.focus(), 350);
}

/* ---------------------- UTILIDADES GRÁFICAS ---------------------- */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function drawPixelText(ctx, text, x, y, size = 20, align = 'left') {
  ctx.save();
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5efff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ================================================================
   1) SNAKE
   Flechas = mover
   Z = comenzar / reiniciar si perdiste
   X = avance especial de una casilla
   P = pausa
   ================================================================ */
function createSnakeGame(canvas, ctx) {
  const CELL = 20;
  const COLS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;
  let snake, dir, nextDir, food, score, paused, ended, started, timer;

  function randomFood() {
    let f;
    do {
      f = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
    } while (snake.some(p => p.x === f.x && p.y === f.y));
    return f;
  }

  function reset() {
    snake = [
      { x: 12, y: 11 },
      { x: 11, y: 11 },
      { x: 10, y: 11 }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = randomFood();
    score = 0;
    paused = false;
    ended = false;
    started = false;
    setGameStatus('Pulsa Z para comenzar');
    setGameScore('Puntuación: 0');
    draw();
  }

  function step() {
    if (paused || ended || !started) return;

    if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) dir = nextDir;

    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y
    };

    if (
      head.x < 0 || head.x >= COLS ||
      head.y < 0 || head.y >= ROWS ||
      snake.some(p => p.x === head.x && p.y === head.y)
    ) {
      ended = true;
      started = false;
      setGameStatus('Fin. Pulsa Z para reiniciar');
      draw();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      setGameScore(`Puntuación: ${score}`);
      food = randomFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = '#07122d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(95,107,180,.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += CELL) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += CELL) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // comida
    ctx.fillStyle = '#ff5f8f';
    ctx.fillRect(food.x * CELL + 4, food.y * CELL + 4, CELL - 8, CELL - 8);

    snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#b7ff8a' : '#62e36f';
      ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4);
    });

    if (!started && !ended) {
      drawPixelText(ctx, 'Pulsa Z para comenzar', canvas.width / 2, canvas.height / 2, 24, 'center');
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawPixelText(ctx, 'PAUSA', canvas.width / 2, canvas.height / 2, 30, 'center');
    }
  }

  function keydown(e) {
    const key = e.key.toLowerCase();

    if (key === 'p') {
      paused = !paused;
      setGameStatus(paused ? 'Pausa' : (started ? 'En juego' : 'Listo'));
      draw();
      return;
    }

    if (key === 'z') {
      if (ended) reset();
      started = true;
      ended = false;
      setGameStatus('En juego');
      return;
    }

    if (paused || ended) return;

    const moves = {
      arrowup: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 }
    };

    if (moves[key]) nextDir = moves[key];

    // X = avance especial inmediato de una casilla.
    if (key === 'x' && started) step();
  }

  return {
    start() {
      reset();
      timer = setInterval(step, 115);
    },
    keydown,
    keyup() {},
    destroy() {
      clearInterval(timer);
    }
  };
}

/* ================================================================
   2) PONG
   ↑ ↓ = mover paleta
   Z = sacar / comenzar
   X = movimiento rápido de la paleta
   P = pausa
   ================================================================ */
function createPongGame(canvas, ctx) {
  const keys = new Set();
  let raf = 0;
  let paused = false;
  let running = false;
  let scorePlayer = 0;
  let scoreCPU = 0;
  let boost = false;

  const player = { x: 28, y: 170, w: 14, h: 100 };
  const cpu = { x: canvas.width - 42, y: 170, w: 14, h: 100 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, r: 9, vx: 5, vy: 3 };

  function resetBall(direction = 1) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 5 * direction;
    ball.vy = (Math.random() > .5 ? 1 : -1) * (2.5 + Math.random() * 2);
    running = false;
    setGameStatus('Pulsa Z para sacar');
  }

  function reset() {
    player.y = cpu.y = 170;
    scorePlayer = 0;
    scoreCPU = 0;
    paused = false;
    setGameScore('0 - 0');
    resetBall(1);
    draw();
  }

  function update() {
    if (!paused) {
      const speed = boost ? 9 : 5.5;
      if (keys.has('arrowup')) player.y -= speed;
      if (keys.has('arrowdown')) player.y += speed;
      player.y = clamp(player.y, 0, canvas.height - player.h);

      if (running) {
        // IA sencilla
        const cpuTarget = ball.y - cpu.h / 2;
        cpu.y += clamp(cpuTarget - cpu.y, -4.2, 4.2);
        cpu.y = clamp(cpu.y, 0, canvas.height - cpu.h);

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y - ball.r <= 0 || ball.y + ball.r >= canvas.height) {
          ball.vy *= -1;
          ball.y = clamp(ball.y, ball.r, canvas.height - ball.r);
        }

        const bRect = { x: ball.x - ball.r, y: ball.y - ball.r, w: ball.r * 2, h: ball.r * 2 };
        if (ball.vx < 0 && rectsOverlap(bRect, player)) {
          ball.x = player.x + player.w + ball.r;
          ball.vx = Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (player.y + player.h / 2)) * .05;
        }
        if (ball.vx > 0 && rectsOverlap(bRect, cpu)) {
          ball.x = cpu.x - ball.r;
          ball.vx = -Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (cpu.y + cpu.h / 2)) * .05;
        }

        if (ball.x < -20) {
          scoreCPU++;
          setGameScore(`${scorePlayer} - ${scoreCPU}`);
          resetBall(1);
        }

        if (ball.x > canvas.width + 20) {
          scorePlayer++;
          setGameScore(`${scorePlayer} - ${scoreCPU}`);
          resetBall(-1);
        }

        if (scorePlayer >= 5 || scoreCPU >= 5) {
          running = false;
          setGameStatus(scorePlayer >= 5 ? 'Ganaste. Pulsa Z para reiniciar' : 'La CPU ganó. Pulsa Z para reiniciar');
        }
      }
    }

    draw();
    raf = requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = '#090a20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f3efff';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillRect(cpu.x, cpu.y, cpu.w, cpu.h);

    ctx.fillStyle = '#ff8ad8';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    drawPixelText(ctx, String(scorePlayer), canvas.width * .42, 45, 34, 'center');
    drawPixelText(ctx, String(scoreCPU), canvas.width * .58, 45, 34, 'center');

    if (!running && !paused) {
      drawPixelText(ctx, 'Pulsa Z para sacar', canvas.width / 2, canvas.height - 35, 20, 'center');
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawPixelText(ctx, 'PAUSA', canvas.width / 2, canvas.height / 2, 30, 'center');
    }
  }

  function keydown(e) {
    const key = e.key.toLowerCase();

    if (key === 'p') {
      paused = !paused;
      setGameStatus(paused ? 'Pausa' : (running ? 'En juego' : 'Listo'));
      return;
    }

    if (key === 'z') {
      if (scorePlayer >= 5 || scoreCPU >= 5) reset();
      running = true;
      setGameStatus('En juego');
    }

    if (key === 'x') boost = true;
    keys.add(key);
  }

  function keyup(e) {
    const key = e.key.toLowerCase();
    if (key === 'x') boost = false;
    keys.delete(key);
  }

  return {
    start() {
      reset();
      raf = requestAnimationFrame(update);
    },
    keydown,
    keyup,
    destroy() {
      cancelAnimationFrame(raf);
      keys.clear();
    }
  };
}

/* ================================================================
   3) FROGGER
   Flechas = mover
   Z = salto hacia delante
   X = salto largo (dos casillas)
   P = pausa
   ================================================================ */
function createFroggerGame(canvas, ctx) {
  const STEP = 40;
  let raf = 0;
  let last = performance.now();
  let paused = false;
  let ended = false;
  let score = 0;
  let lives = 3;

  const frog = { x: 360, y: 390, w: 28, h: 28 };

  const cars = [
    { y: 330, x: 20, w: 70, h: 28, speed: 145, color: '#ff5d77' },
    { y: 290, x: 350, w: 85, h: 28, speed: -175, color: '#6cc4ff' },
    { y: 250, x: 160, w: 62, h: 28, speed: 205, color: '#ffd45f' }
  ];

  const logs = [
    { y: 170, x: 20, w: 150, h: 28, speed: 75 },
    { y: 130, x: 280, w: 170, h: 28, speed: -92 },
    { y: 90, x: 520, w: 145, h: 28, speed: 82 }
  ];

  function resetFrog() {
    frog.x = 360;
    frog.y = 390;
  }

  function reset() {
    paused = false;
    ended = false;
    score = 0;
    lives = 3;
    resetFrog();
    setGameStatus('En juego');
    setGameScore(`Cruces: ${score} | Vidas: ${lives}`);
  }

  function loseLife() {
    lives--;
    setGameScore(`Cruces: ${score} | Vidas: ${lives}`);
    if (lives <= 0) {
      ended = true;
      setGameStatus('Fin. Pulsa Z para reiniciar');
    }
    resetFrog();
  }

  function update(now) {
    const dt = Math.min((now - last) / 1000, .04);
    last = now;

    if (!paused && !ended) {
      cars.forEach(car => {
        car.x += car.speed * dt;
        if (car.speed > 0 && car.x > canvas.width + 20) car.x = -car.w;
        if (car.speed < 0 && car.x + car.w < -20) car.x = canvas.width;
      });

      logs.forEach(log => {
        log.x += log.speed * dt;
        if (log.speed > 0 && log.x > canvas.width + 20) log.x = -log.w;
        if (log.speed < 0 && log.x + log.w < -20) log.x = canvas.width;
      });

      const frogRect = { ...frog };

      // Choque con autos
      for (const car of cars) {
        if (rectsOverlap(frogRect, car)) {
          loseLife();
          break;
        }
      }

      // Zona de río
      if (!ended && frog.y <= 190 && frog.y >= 70) {
        let ridingLog = null;
        for (const log of logs) {
          if (Math.abs(frog.y - log.y) < 24 && rectsOverlap(frogRect, log)) {
            ridingLog = log;
            break;
          }
        }

        if (ridingLog) {
          frog.x += ridingLog.speed * dt;
          if (frog.x < -frog.w || frog.x > canvas.width) loseLife();
        } else {
          loseLife();
        }
      }

      // Meta
      if (!ended && frog.y < 45) {
        score++;
        setGameScore(`Cruces: ${score} | Vidas: ${lives}`);
        resetFrog();
      }
    }

    draw();
    raf = requestAnimationFrame(update);
  }

  function draw() {
    // fondo
    ctx.fillStyle = '#13234d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // meta
    ctx.fillStyle = '#2f7a57';
    ctx.fillRect(0, 0, canvas.width, 60);

    // río
    ctx.fillStyle = '#174d86';
    ctx.fillRect(0, 60, canvas.width, 150);

    // zona segura
    ctx.fillStyle = '#245f4c';
    ctx.fillRect(0, 210, canvas.width, 30);

    // carretera
    ctx.fillStyle = '#2a2c3c';
    ctx.fillRect(0, 240, canvas.width, 130);

    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.setLineDash([25, 18]);
    [280, 320, 360].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    logs.forEach(log => {
      ctx.fillStyle = '#8a5a37';
      ctx.fillRect(log.x, log.y, log.w, log.h);
      ctx.fillStyle = '#b17a4d';
      ctx.fillRect(log.x + 8, log.y + 6, log.w - 16, 5);
    });

    cars.forEach(car => {
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y, car.w, car.h);
      ctx.fillStyle = '#12152d';
      ctx.fillRect(car.x + 12, car.y + 5, car.w - 24, 8);
    });

    // rana pixel simple
    ctx.fillStyle = '#65e06c';
    ctx.fillRect(frog.x, frog.y, frog.w, frog.h);
    ctx.fillStyle = '#d9ffd0';
    ctx.fillRect(frog.x + 5, frog.y + 4, 6, 6);
    ctx.fillRect(frog.x + 17, frog.y + 4, 6, 6);

    drawPixelText(ctx, 'META', canvas.width / 2, 28, 18, 'center');

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawPixelText(ctx, 'PAUSA', canvas.width / 2, canvas.height / 2, 30, 'center');
    }
  }

  function keydown(e) {
    const key = e.key.toLowerCase();

    if (key === 'p') {
      paused = !paused;
      setGameStatus(paused ? 'Pausa' : 'En juego');
      return;
    }

    if (ended && key === 'z') {
      reset();
      return;
    }

    if (paused || ended) return;

    const moves = {
      arrowup: [0, -STEP],
      arrowdown: [0, STEP],
      arrowleft: [-STEP, 0],
      arrowright: [STEP, 0]
    };

    if (moves[key]) {
      frog.x += moves[key][0];
      frog.y += moves[key][1];
    }

    // Z = salto normal hacia delante.
    if (key === 'z') frog.y -= STEP;

    // X = salto especial de dos casillas.
    if (key === 'x') frog.y -= STEP * 2;

    frog.x = clamp(frog.x, 0, canvas.width - frog.w);
    frog.y = clamp(frog.y, 0, canvas.height - frog.h);
  }

  return {
    start() {
      reset();
      last = performance.now();
      raf = requestAnimationFrame(update);
    },
    keydown,
    keyup() {},
    destroy() {
      cancelAnimationFrame(raf);
    }
  };
}

/* ================================================================
   4) PLATFORM JUMPER — estilo DOODLE JUMP
   ← → = mover
   Z = iniciar / reiniciar cuando termina
   X = impulso especial
   P = pausa

   IMPORTANTE:
   El personaje SALTA AUTOMÁTICAMENTE cada vez que cae sobre
   una plataforma. El objetivo es subir lo más alto posible.
   ================================================================ */
function createPlatformJumperGame(canvas, ctx) {
  const keys = new Set();

  // ==============================================================
  // CAMBIA AQUÍ si quieres ajustar la dificultad.
  // ==============================================================
  const GRAVITY = 0.52;
  const MOVE_SPEED = 4.6;
  const JUMP_POWER = -11.8;
  const SPECIAL_JUMP_POWER = -16;
  const SCROLL_LINE = 165;

  let raf = 0;
  let paused = false;
  let ended = false;
  let score = 0;

  // El impulso de X tiene un pequeño tiempo de recarga.
  let specialCooldown = 0;

  const player = {
    x: canvas.width / 2 - 16,
    y: canvas.height - 105,
    w: 32,
    h: 38,
    vx: 0,
    vy: JUMP_POWER
  };

  let platforms = [];

  function makePlatforms() {
    platforms = [
      { x: canvas.width / 2 - 80, y: canvas.height - 55, w: 160, h: 16 },
      { x: 95,  y: 325, w: 125, h: 16 },
      { x: 335, y: 260, w: 115, h: 16 },
      { x: 555, y: 195, w: 120, h: 16 },
      { x: 390, y: 125, w: 110, h: 16 },
      { x: 145, y: 55,  w: 120, h: 16 }
    ];
  }

  function reset() {
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 105;
    player.vx = 0;

    // Arranca saltando automáticamente.
    player.vy = JUMP_POWER;

    paused = false;
    ended = false;
    score = 0;
    specialCooldown = 0;

    keys.clear();
    makePlatforms();

    setGameStatus('En juego');
    setGameScore('Altura: 0');
  }

  function generatePlatformAbove() {
    const highest = Math.min(...platforms.map(p => p.y));

    // Distancia vertical pensada para que siempre sea alcanzable.
    const verticalGap = 55 + Math.random() * 28;

    platforms.push({
      x: 25 + Math.random() * (canvas.width - 150),
      y: highest - verticalGap,
      w: 90 + Math.random() * 50,
      h: 16
    });
  }

  function update() {
    if (!paused && !ended) {
      if (specialCooldown > 0) specialCooldown--;

      // Movimiento horizontal.
      player.vx *= 0.82;

      if (keys.has('arrowleft')) {
        player.vx = -MOVE_SPEED;
      }

      if (keys.has('arrowright')) {
        player.vx = MOVE_SPEED;
      }

      player.x += player.vx;

      // Como en Doodle Jump: si sale por un lado,
      // aparece por el lado contrario.
      if (player.x + player.w < 0) {
        player.x = canvas.width;
      }

      if (player.x > canvas.width) {
        player.x = -player.w;
      }

      // Física vertical.
      const previousBottom = player.y + player.h;

      player.vy += GRAVITY;
      player.y += player.vy;

      // ------------------------------------------------------------
      // REBOTE AUTOMÁTICO
      // Solo puede aterrizar mientras está cayendo.
      // ------------------------------------------------------------
      if (player.vy > 0) {
        for (const platform of platforms) {
          const newBottom = player.y + player.h;

          const crossedTop =
            previousBottom <= platform.y &&
            newBottom >= platform.y;

          const horizontal =
            player.x + player.w > platform.x &&
            player.x < platform.x + platform.w;

          if (crossedTop && horizontal) {
            player.y = platform.y - player.h;

            // Aquí está el comportamiento tipo Doodle Jump:
            // al tocar la plataforma vuelve a saltar solo.
            player.vy = JUMP_POWER;

            break;
          }
        }
      }

      // ------------------------------------------------------------
      // SCROLL INFINITO
      // Cuando el jugador sube demasiado, mantenemos al personaje
      // en la misma zona y desplazamos las plataformas hacia abajo.
      // ------------------------------------------------------------
      if (player.y < SCROLL_LINE && player.vy < 0) {
        const shift = SCROLL_LINE - player.y;

        player.y = SCROLL_LINE;

        platforms.forEach(platform => {
          platform.y += shift;
        });

        score += Math.round(shift);
        setGameScore(`Altura: ${score}`);

        // Quitamos plataformas que ya salieron por abajo.
        platforms = platforms.filter(
          platform => platform.y < canvas.height + 40
        );

        // Siempre mantenemos varias plataformas por encima.
        while (platforms.length < 9) {
          generatePlatformAbove();
        }
      }

      // Perder al caer por debajo de la pantalla.
      if (player.y > canvas.height + 50) {
        ended = true;
        setGameStatus('Fin. Pulsa Z para reiniciar');
      }
    }

    draw();
    raf = requestAnimationFrame(update);
  }

  function drawPlatform(platform) {
    // Césped.
    ctx.fillStyle = '#6ed66f';
    ctx.fillRect(platform.x, platform.y, platform.w, 7);

    // Borde claro.
    ctx.fillStyle = '#a7f28f';
    ctx.fillRect(platform.x + 3, platform.y, platform.w - 6, 3);

    // Tierra.
    ctx.fillStyle = '#755043';
    ctx.fillRect(
      platform.x + 5,
      platform.y + 7,
      platform.w - 10,
      platform.h - 7
    );

    // Sombra.
    ctx.fillStyle = '#4b3640';
    ctx.fillRect(
      platform.x + 9,
      platform.y + 12,
      platform.w - 18,
      4
    );
  }

  function drawPlayer() {
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    // Cola.
    ctx.strokeStyle = '#6c432f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x - 1, y + 24, 12, Math.PI * 0.7, Math.PI * 1.9);
    ctx.stroke();

    // Cuerpo.
    ctx.fillStyle = '#7a4d32';
    ctx.fillRect(x + 5, y + 11, 22, 24);

    // Orejas.
    ctx.fillStyle = '#7a4d32';
    ctx.fillRect(x, y + 5, 8, 10);
    ctx.fillRect(x + 24, y + 5, 8, 10);

    // Cara.
    ctx.fillStyle = '#d7a276';
    ctx.fillRect(x + 5, y + 3, 22, 18);

    // Lentes de sol.
    ctx.fillStyle = '#171526';
    ctx.fillRect(x + 6, y + 7, 9, 7);
    ctx.fillRect(x + 17, y + 7, 9, 7);
    ctx.fillRect(x + 14, y + 9, 4, 2);

    // Brillito de los lentes.
    ctx.fillStyle = '#da7cff';
    ctx.fillRect(x + 7, y + 8, 3, 2);
    ctx.fillRect(x + 18, y + 8, 3, 2);

    // Patas.
    ctx.fillStyle = '#d7a276';
    ctx.fillRect(x + 7, y + 33, 7, 5);
    ctx.fillRect(x + 19, y + 33, 7, 5);
  }

  function draw() {
    // Cielo.
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#68b6ff');
    grad.addColorStop(0.55, '#9fd4ff');
    grad.addColorStop(1, '#d7eaff');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nubes sencillas estilo pixel.
    ctx.fillStyle = 'rgba(255,255,255,.78)';

    [
      [75, 75],
      [575, 100],
      [310, 215]
    ].forEach(([x, y]) => {
      ctx.fillRect(x, y, 90, 20);
      ctx.fillRect(x + 18, y - 13, 48, 16);
      ctx.fillRect(x + 38, y - 20, 32, 14);
    });

    // Plataformas.
    platforms.forEach(drawPlatform);

    // Jugador.
    drawPlayer();

    // Indicador discreto del impulso X.
    ctx.fillStyle = 'rgba(15,23,55,.72)';
    ctx.fillRect(12, 12, 145, 27);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(
      specialCooldown <= 0 ? 'X: impulso listo' : 'X: recargando',
      22,
      31
    );

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawPixelText(
        ctx,
        'PAUSA',
        canvas.width / 2,
        canvas.height / 2,
        30,
        'center'
      );
    }

    if (ended) {
      ctx.fillStyle = 'rgba(9,14,42,.58)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawPixelText(
        ctx,
        'FIN',
        canvas.width / 2,
        canvas.height / 2 - 22,
        34,
        'center'
      );

      drawPixelText(
        ctx,
        'Pulsa Z para reiniciar',
        canvas.width / 2,
        canvas.height / 2 + 24,
        20,
        'center'
      );
    }
  }

  function keydown(e) {
    const key = e.key.toLowerCase();

    if (
      key === 'arrowleft' ||
      key === 'arrowright' ||
      key === 'z' ||
      key === 'x' ||
      key === 'p'
    ) {
      e.preventDefault();
    }

    // P = pausa.
    if (key === 'p') {
      if (ended) return;

      paused = !paused;
      setGameStatus(paused ? 'Pausa' : 'En juego');
      return;
    }

    // Z = reiniciar después de perder.
    if (ended && key === 'z') {
      reset();
      return;
    }

    if (paused || ended) return;

    // X = impulso especial hacia arriba.
    // No sustituye al salto automático: es una ayuda adicional.
    if (key === 'x' && specialCooldown <= 0) {
      player.vy = SPECIAL_JUMP_POWER;
      specialCooldown = 240;
      setGameStatus('¡Impulso especial!');
    }

    keys.add(key);
  }

  function keyup(e) {
    keys.delete(e.key.toLowerCase());

    if (!paused && !ended) {
      setGameStatus('En juego');
    }
  }

  return {
    start() {
      reset();
      raf = requestAnimationFrame(update);
    },

    keydown,

    keyup,

    destroy() {
      cancelAnimationFrame(raf);
      keys.clear();
    }
  };
}

// Inicializamos todo al cargar el documento.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMinigames);
} else {
  setupMinigames();
}
