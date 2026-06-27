const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("levelText"),
  health: document.getElementById("healthText"),
  score: document.getElementById("scoreText"),
  fact: document.getElementById("factText"),
  start: document.getElementById("startBtn"),
  sound: document.getElementById("soundBtn"),
  mission: document.getElementById("missionText"),
  planetIcon: document.getElementById("planetIcon"),
  planetName: document.getElementById("planetName"),
  planetFact: document.getElementById("planetFact"),
  modal: document.getElementById("quizModal"),
  quizTitle: document.getElementById("quizTitle"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizOptions: document.getElementById("quizOptions"),
};

const planets = [
  {
    name: "太阳能量站",
    fact: "太阳是一颗恒星，它给地球带来光和热。",
    colors: ["#fff6b0", "#ffca45", "#ff7a30", "#5b1f17"],
    quiz: {
      q: "太阳给地球带来了什么？",
      options: ["光和热", "海水和沙子", "玩具和书本"],
      answer: 0,
    },
  },
  {
    name: "地球家园",
    fact: "地球有空气、水和合适的温度，是我们生活的家园。",
    colors: ["#b7f7ff", "#3ea4ff", "#2c8a62", "#173c78"],
    quiz: {
      q: "我们生活在哪颗星球上？",
      options: ["地球", "太阳", "月亮"],
      answer: 0,
    },
  },
  {
    name: "月亮基地",
    fact: "月亮是地球的天然卫星，它围绕地球运动。",
    colors: ["#f4f2e8", "#bebdb8", "#777b82", "#2b3038"],
    quiz: {
      q: "月亮围绕哪颗星球运动？",
      options: ["地球", "木星", "太阳"],
      answer: 0,
    },
  },
  {
    name: "太阳系航道",
    fact: "太阳系里有八大行星，它们都围绕太阳运行。",
    colors: ["#dff9ff", "#49d3c8", "#3572c9", "#121a3a"],
    quiz: {
      q: "太阳系里的行星主要围绕谁运行？",
      options: ["太阳", "月亮", "云朵"],
      answer: 0,
    },
  },
  {
    name: "火星探险点",
    fact: "火星常被叫作红色星球，因为它的表面看起来偏红。",
    colors: ["#ffd0a8", "#d65c43", "#7d2e35", "#35131a"],
    quiz: {
      q: "火星常被叫作什么星球？",
      options: ["红色星球", "蓝色星球", "绿色星球"],
      answer: 0,
    },
  },
  {
    name: "土星光环站",
    fact: "土星最容易被认出来，因为它有漂亮的行星环。",
    colors: ["#fff2b8", "#c6a15b", "#776040", "#27222a"],
    quiz: {
      q: "哪颗行星有很明显的漂亮光环？",
      options: ["土星", "地球", "水星"],
      answer: 0,
    },
  },
];

const keys = new Set();
let audioCtx;
let soundOn = true;
let running = false;
let paused = false;
let lastTime = 0;
let spawnTimer = 0;
let capsuleTimer = 0;

const state = {
  level: 1,
  health: 100,
  score: 0,
  facts: 0,
  factsNeeded: 3,
  enemiesDefeated: 0,
  player: { x: 215, y: 650, r: 18, cooldown: 0 },
  bullets: [],
  enemies: [],
  capsules: [],
  particles: [],
  stars: [],
};

function resetGame() {
  state.level = 1;
  state.health = 100;
  state.score = 0;
  setupLevel();
  running = true;
  paused = false;
  ui.start.textContent = "重新开始";
}

function setupLevel() {
  const levelIndex = (state.level - 1) % planets.length;
  const planet = planets[levelIndex];
  state.facts = 0;
  state.enemiesDefeated = 0;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height - 92;
  state.bullets = [];
  state.enemies = [];
  state.capsules = [];
  state.particles = [];
  state.stars = Array.from({ length: 95 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: 0.35 + Math.random() * 1.2,
  }));
  ui.planetName.textContent = planet.name;
  ui.planetFact.textContent = planet.fact;
  ui.planetIcon.style.background = `radial-gradient(circle at 30% 26%, ${planet.colors[0]} 0 12%, ${planet.colors[1]} 34%, ${planet.colors[2]} 68%, ${planet.colors[3]} 100%)`;
  ui.mission.textContent = `第 ${state.level} 关：探索 ${planet.name}，收集 ${state.factsNeeded} 个知识胶囊，学习简单太空知识。`;
  updateHud();
}

function updateHud() {
  ui.level.textContent = state.level;
  ui.health.textContent = Math.max(0, Math.round(state.health));
  ui.score.textContent = state.score;
  ui.fact.textContent = `${state.facts}/${state.factsNeeded}`;
}

function playTone(type) {
  if (!soundOn) return;
  audioCtx ||= new AudioContext();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const settings = {
    shoot: [740, 0.045, "square", 0.035],
    collect: [1040, 0.14, "sine", 0.06],
    hit: [110, 0.18, "sawtooth", 0.07],
    level: [520, 0.36, "triangle", 0.075],
  }[type];
  osc.frequency.setValueAtTime(settings[0], now);
  if (type === "level") osc.frequency.exponentialRampToValueAtTime(880, now + settings[1]);
  gain.gain.setValueAtTime(settings[3], now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + settings[1]);
  osc.type = settings[2];
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + settings[1]);
}

function shoot() {
  if (!running || paused) return;
  if (state.player.cooldown > 0) return;
  state.bullets.push({ x: state.player.x, y: state.player.y - 24, r: 4, vy: -560 });
  state.player.cooldown = 0.16;
  playTone("shoot");
}

function spawnEnemy() {
  const hard = Math.min(1.9, 1 + state.level * 0.14);
  const kind = Math.random() > 0.64 ? "drone" : "asteroid";
  state.enemies.push({
    kind,
    x: 38 + Math.random() * (canvas.width - 76),
    y: -46,
    r: kind === "drone" ? 17 : 24 + Math.random() * 12,
    vy: (92 + Math.random() * 58) * hard,
    wobble: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 44,
    hp: kind === "drone" ? 1 : 2,
  });
}

function spawnCapsule() {
  state.capsules.push({
    x: 34 + Math.random() * (canvas.width - 68),
    y: -30,
    r: 13,
    vy: 105 + state.level * 8,
    pulse: 0,
  });
}

function collide(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < a.r + b.r;
}

function addBurst(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 190,
      vy: (Math.random() - 0.5) * 190,
      life: 0.45 + Math.random() * 0.35,
      color,
    });
  }
}

function maybeFinishLevel() {
  if (state.facts >= state.factsNeeded && state.enemiesDefeated >= 5 + state.level) {
    paused = true;
    showQuiz();
  }
}

function showQuiz() {
  const planet = planets[(state.level - 1) % planets.length];
  ui.quizTitle.textContent = `${planet.name} 通关题`;
  ui.quizQuestion.textContent = planet.quiz.q;
  ui.quizOptions.innerHTML = "";
  planet.quiz.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => {
      if (index === planet.quiz.answer) {
        state.score += 300;
        state.level += 1;
        state.health = Math.min(100, state.health + 22);
        ui.modal.hidden = true;
        setupLevel();
        paused = false;
        playTone("level");
      } else {
        state.health = Math.max(20, state.health - 18);
        button.textContent = `${option}  再想想`;
        button.style.borderColor = "rgba(255, 107, 107, .85)";
        playTone("hit");
      }
      updateHud();
    });
    ui.quizOptions.appendChild(button);
  });
  ui.modal.hidden = false;
}

function gameOver() {
  running = false;
  paused = false;
  ui.mission.textContent = `任务结束：最终分数 ${state.score}。点击重新开始再次出航。`;
  ui.start.textContent = "重新开始";
}

function update(dt) {
  if (!running || paused) return;
  const p = state.player;
  const speed = 245;
  if (keys.has("arrowup") || keys.has("w")) p.y -= speed * dt;
  if (keys.has("arrowdown") || keys.has("s")) p.y += speed * dt;
  if (keys.has("arrowleft") || keys.has("a")) p.x -= speed * dt;
  if (keys.has("arrowright") || keys.has("d")) p.x += speed * dt;
  if (keys.has(" ")) shoot();
  p.x = Math.max(28, Math.min(canvas.width - 28, p.x));
  p.y = Math.max(canvas.height * 0.34, Math.min(canvas.height - 34, p.y));
  p.cooldown = Math.max(0, p.cooldown - dt);

  spawnTimer -= dt;
  capsuleTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.45, 1.15 - state.level * 0.07);
  }
  if (capsuleTimer <= 0) {
    spawnCapsule();
    capsuleTimer = 2.2 + Math.random() * 1.4;
  }

  state.stars.forEach((star) => {
    star.y += (45 + state.level * 5) * star.z * dt;
    if (star.y > canvas.height + 5) {
      star.x = Math.random() * canvas.width;
      star.y = -5;
    }
  });

  state.bullets.forEach((b) => (b.y += b.vy * dt));
  state.enemies.forEach((e) => {
    e.y += e.vy * dt;
    e.wobble += dt * 4;
    if (e.kind === "drone") e.x += (Math.sin(e.wobble) * 36 + e.drift) * dt;
    e.x = Math.max(24, Math.min(canvas.width - 24, e.x));
  });
  state.capsules.forEach((c) => {
    c.y += c.vy * dt;
    c.pulse += dt * 5;
  });
  state.particles.forEach((part) => {
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.life -= dt;
  });

  state.bullets = state.bullets.filter((b) => b.y > -20);
  state.enemies = state.enemies.filter((e) => e.y < canvas.height + 70);
  state.capsules = state.capsules.filter((c) => c.y < canvas.height + 40);
  state.particles = state.particles.filter((part) => part.life > 0);

  for (const enemy of state.enemies) {
    if (collide(p, enemy)) {
      enemy.y = canvas.height + 999;
      state.health -= enemy.kind === "drone" ? 14 : 20;
      addBurst(p.x, p.y, "#ff6b6b", 16);
      playTone("hit");
    }
  }

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (enemy.y < canvas.height + 100 && collide(bullet, enemy)) {
        bullet.y = -999;
        enemy.hp -= 1;
        addBurst(enemy.x, enemy.y, enemy.kind === "drone" ? "#49d3c8" : "#ffd166", 8);
        if (enemy.hp <= 0) {
          enemy.y = canvas.height + 999;
          state.score += enemy.kind === "drone" ? 90 : 120;
          state.enemiesDefeated += 1;
        }
      }
    }
  }

  for (const capsule of state.capsules) {
    if (collide(p, capsule)) {
      capsule.y = canvas.height + 999;
      state.facts = Math.min(state.factsNeeded, state.facts + 1);
      state.score += 130;
      addBurst(capsule.x, capsule.y, "#ffd166", 14);
      playTone("collect");
    }
  }

  updateHud();
  maybeFinishLevel();
  if (state.health <= 0) gameOver();
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#dff7ff";
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(-17, 18);
  ctx.lineTo(0, 8);
  ctx.lineTo(17, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#49d3c8";
  ctx.fillRect(-8, 0, 16, 18);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.moveTo(-9, 21);
  ctx.lineTo(0, 38);
  ctx.lineTo(9, 21);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.kind === "drone") {
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-16, -10);
    ctx.lineTo(0, -20);
    ctx.lineTo(16, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#161b22";
    ctx.fillRect(-4, -5, 10, 10);
  } else {
    const gradient = ctx.createRadialGradient(-8, -8, 4, 0, 0, enemy.r);
    gradient.addColorStop(0, "#c5a36a");
    gradient.addColorStop(1, "#4b3d35");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet() {
  const planet = planets[(state.level - 1) % planets.length];
  const x = canvas.width - 72;
  const y = 118;
  const radius = 58;
  const gradient = ctx.createRadialGradient(x - 20, y - 24, 8, x, y, radius);
  gradient.addColorStop(0, planet.colors[0]);
  gradient.addColorStop(0.36, planet.colors[1]);
  gradient.addColorStop(0.72, planet.colors[2]);
  gradient.addColorStop(1, planet.colors[3]);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (planet.name.includes("土星")) {
    ctx.strokeStyle = "rgba(255, 234, 178, .72)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 84, 20, -0.18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#050b12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPlanet();

  state.stars.forEach((star) => {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + star.z * 0.38})`;
    ctx.fillRect(star.x, star.y, star.z * 2, star.z * 2);
  });

  state.capsules.forEach((c) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 18 + Math.sin(c.pulse) * 5;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#4d3a12";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 1);
    ctx.restore();
  });

  state.bullets.forEach((b) => {
    ctx.fillStyle = "#7df9ff";
    ctx.shadowColor = "#7df9ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  state.enemies.forEach(drawEnemy);
  drawShip(state.player.x, state.player.y);

  state.particles.forEach((part) => {
    ctx.globalAlpha = Math.max(0, part.life);
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x, part.y, 3, 3);
    ctx.globalAlpha = 1;
  });

  if (!running) {
    ctx.fillStyle = "rgba(4, 10, 16, .58)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#edf9f9";
    ctx.font = "700 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("准备出航", canvas.width / 2, canvas.height / 2 - 18);
    ctx.font = "18px sans-serif";
    ctx.fillText("点击开始任务", canvas.width / 2, canvas.height / 2 + 24);
  }
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

document.querySelectorAll("[data-key]").forEach((button) => {
  const key = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    keys.add(key);
    if (key === " ") shoot();
  };
  const release = (event) => {
    event.preventDefault();
    keys.delete(key);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

ui.start.addEventListener("click", () => {
  if (audioCtx?.state === "suspended") audioCtx.resume();
  resetGame();
});

ui.sound.addEventListener("click", () => {
  soundOn = !soundOn;
  ui.sound.textContent = soundOn ? "音效开" : "音效关";
  ui.sound.setAttribute("aria-pressed", String(soundOn));
});

setupLevel();
draw();
requestAnimationFrame(frame);
