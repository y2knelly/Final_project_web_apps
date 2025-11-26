// app.js
const arena = document.getElementById("arena");
const hud = {
  health: document.getElementById("health"),
  score: document.getElementById("score"),
  combo: document.getElementById("combo"),
  wave: document.getElementById("wave"),
};
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const startScreen = document.getElementById("startScreen");
const startGameBtn = document.getElementById("startGame");

const WORDS = {
  easy: ["all", "and", "are", "but", "can", "for", "get", "had", "has", "her", "him", "his", "how", "not", "now", "one", "out", "she", "the", "two", "was", "who", "why"],
  mid: ["cat", "bat", "dog", "eat", "rice","cake","lamp","code","blue","tree","book","game"],
  hard: ["arrow","blimp","speed","sword","piece","there","paper","light","night","bells","blight","flower","tower","thumb","eleven","dancer","espoque","computer","function","variable","operator","database","graphics","terminal","compiler"],
};
const BOSS_WORDS = ["logorrhea", "handkerchief", "onomatopoeia", "sacrilegious", "gobbledegook", "sesquipedalian", "antidisestablishmentarianism"];

let state = {
  running: false,
  paused: false,
  wave: 1,
  baseHP: 100,
  score: 0,
  combo: 1,
  enemies: [],
  targetIndex: 0,
  tickHandle: null,
};

// ---------- GAME FLOW ----------
function start() {
  reset();
  state.running = true;
  spawnWave(state.wave);
  state.tickHandle = setInterval(tick, 60);
}

function reset() {
  clearInterval(state.tickHandle);
  arena.querySelectorAll(".enemy").forEach(e => e.remove());
  document.getElementById("defeatedWords").innerHTML = "";
  state.wave = 1;
  state.baseHP = 100;
  state.score = 0;
  state.combo = 1;
  state.enemies = [];
  state.targetIndex = 0;
  updateHUD();
}

// ---------- WAVES & ENEMIES ----------
function spawnWave(wave) {
    
    const speed = 0.4 + wave * 0.5;

    if (wave % 5 === 0) {
      // Boss wave
      const bossWord = pickRandom(BOSS_WORDS);
      const laneY = 100;
      spawnRow([bossWord], laneY, speed*2); 
      showWaveBanner(`Boss Level ${wave/5}`);
    } else {
      const count = Math.min(3 + wave, 10);
      const difficulty = wave < 3 ? "easy" : wave < 8 ? "mid" : "hard";
      
      if ( wave > 2) {
        // spawn rows like a train
        for (let row = 0; row < Math.ceil(count / 2); row++) {
          const words = [];
          for (let i = 0; i < 2 && words.length < count; i++) {
            words.push(pickRandom(WORDS[difficulty]));
          }
          const laneY = 20 + (row % 6) * 70;
          spawnRow(words, laneY, speed);
        }
      } else {
        // early waves: single words
        for (let i = 0; i < count; i++) {
          const word = pickRandom(WORDS[difficulty]);
          const laneY = 20 + (i % 6) * 70;
          spawnRow([word], laneY, speed);
        }
      }
      showWaveBanner(`Wave ${wave}`);
    }
  
    // wave progression check
    setTimeout(() => {
      const check = setInterval(() => {
        if (!state.enemies.length && state.running) {
          state.wave++;
          updateHUD();
          spawnWave(state.wave);
          clearInterval(check);
        }
      }, 500);
    }, 1000);
}

function spawnRow(words, laneY, speed) {
  words.forEach((word, idx) => {
    setTimeout(() => {
      spawnEnemy(word, speed, laneY, idx * 40); // spacing between words
    }, idx * 4800); // stagger timing
  });
}


function spawnEnemy(word, speed, laneY, offsetX = 0) {
  const el = document.createElement("div");
  el.className = "enemy";
  el.innerHTML = `
    <div class="word ${colorClass(word.length)}">${word}</div>
    <div class="health-bar"><span style="width:100%"></span></div>
  `;

  // Apply offset so words can trail each other like a train
  const enemy = {
    el,
    word,
    typed: "",
    x: arena.clientWidth - 140 + offsetX,
    y: laneY,
    speed,
    hp: word.length,
    alive: true
  };

  setEnemyPosition(enemy);
  arena.appendChild(el);
  state.enemies.push(enemy);
  setActive(0);
}



// ---------- GAME LOOP ----------
function tick() {
  if (!state.running || state.paused) return;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.x -= e.speed;
    setEnemyPosition(e);
    if (e.x <= 20) {
      damageBase(10);
      killEnemy(e);
    }
  }
}

function setEnemyPosition(e) {
  e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
  e.el.classList.toggle("danger", e.x < 120);
}

function setActive(indexDelta) {
  state.targetIndex = Math.max(0, Math.min(state.enemies.length - 1, state.targetIndex + indexDelta));
  state.enemies.forEach((e, i) => e.el.classList.toggle("active", i === state.targetIndex));
}

// ---------- HUD & DAMAGE ----------
function damageBase(amount) {
  state.baseHP = Math.max(0, state.baseHP - amount);
  flashHUD("health");
  updateHUD();
  if (state.baseHP === 0) gameOver();
}

function killEnemy(e, bonus = 0) {
  e.alive = false;
  e.el.remove();
  state.enemies = state.enemies.filter(x => x !== e);
  state.score += 10 * state.combo + bonus;
  state.combo = Math.min(state.combo + 0.1, 5);
  updateHUD();

  // log defeated word only if not already present
  const log = document.getElementById("defeatedWords");
  if (![...log.children].some(child => child.textContent === e.word)) {
    const entry = document.createElement("div");
    entry.textContent = e.word;
    entry.className = colorClass(e.word.length);
    log.appendChild(entry);
  }
}

function flashHUD(id) {
  const el = hud[id];
  el.style.color = id === "health" ? "var(--danger)" : "var(--accent)";
  setTimeout(() => el.style.color = "", 150);
}

function updateHUD() {
  hud.health.textContent = `HP: ${state.baseHP}`;
  hud.score.textContent = `Score: ${Math.floor(state.score)}`;
  hud.combo.textContent = `Combo: x${state.combo.toFixed(1)}`;
  hud.wave.textContent = `Wave: ${state.wave}`;
}

// ---------- INPUT ----------
window.addEventListener("keydown", (e) => {
  if (!state.running || state.paused) return;
  if (e.key === "Tab") { e.preventDefault(); setActive(+1); return; }
  const ch = e.key.toLowerCase();
  if (!/^[a-z]$/.test(ch)) return;
  const target = state.enemies[state.targetIndex];
  if (!target) return;

  const expected = target.word[target.typed.length];
  if (ch === expected) {
    target.typed += ch;
    target.el.querySelector(".word").innerHTML =
      `<span class="hit">${target.typed}</span>${target.word.slice(target.typed.length)}`;
    const hpPercent = ((target.word.length - target.typed.length) / target.word.length) * 100;
    target.el.querySelector(".health-bar > span").style.width = `${hpPercent}%`;
    flashHUD("score");
    if (target.typed.length === target.word.length) killEnemy(target, 5);
  } else {
    state.combo = Math.max(1, state.combo - 0.5);
    flashHUD("combo");
  }
});

// ---------- WAVE BANNER ----------
function showWaveBanner(text) {
  const banner = document.getElementById("waveBanner");
  banner.textContent = text;
  banner.style.display = "block";
  setTimeout(() => banner.style.display = "none", 2000);
}

// ---------- GAME OVER ----------
function gameOver() {
  state.running = false;
  clearInterval(state.tickHandle);
  const overlay = document.createElement("div");
  overlay.style = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)";
  overlay.innerHTML = `<div style="background:#1b254a;border:1px solid #2b3a72;border-radius:12px;padding:1rem 1.5rem;">
    <h2>Game Over</h2>
    <p>Score: ${Math.floor(state.score)}</p>
    <button id="restart">Play again</button>
  </div>`;
  arena.appendChild(overlay);
  overlay.querySelector("#restart").addEventListener("click", () => { overlay.remove(); start(); });
}

// ---------- CONTROLS ----------
startGameBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  start();
});

pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
});

restartBtn.addEventListener("click", () => {
  reset();
  start();
});

// ---------- UTILS ----------
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function colorClass(len) {
  if (len === 3) return "green";
  if (len === 4) return "orange";
  if (len === 5) return "red";
  if (len === 6) return "black";
  if (len < 9) return "purple"
  if (len >= 9) return "white"; // boss words stand out
  return "";
}
