const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---- HiDPI support ----
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const W = 800;
const H = 500;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(dpr, dpr);

// ---- DOM refs ----
const welcomeScreen = document.getElementById('welcome-screen');
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const welcomeBtn = document.getElementById('welcome-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const scoreDisplay = document.getElementById('score-display');
const highscoreDisplay = document.getElementById('highscore-display');
const livesDisplay = document.getElementById('lives-display');
const powerupDisplay = document.getElementById('powerup-display');
const finalScore = document.getElementById('final-score');
const finalHighscore = document.getElementById('final-highscore');
const startHighscore = document.getElementById('start-highscore');
const loadingBar = document.getElementById('loading-bar');
const loadingTip = document.getElementById('loading-tip');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');
const achievementToast = document.getElementById('achievement-toast');
const touchControls = document.getElementById('touch-controls');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
const touchJump = document.getElementById('touch-jump');
const colorBtns = document.querySelectorAll('.color-btn');

// ---- Sound system (Web Audio) ----
let audioCtx = null;
let muted = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration, type = 'square', volume = 0.12) {
  if (muted) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function toggleMute() {
  muted = !muted;
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

function playJump() {
  playTone(400, 0.1, 'square', 0.06);
  setTimeout(() => playTone(600, 0.08, 'square', 0.04), 50);
}

function playDoubleJump() {
  playTone(500, 0.06, 'square', 0.05);
  setTimeout(() => playTone(800, 0.08, 'square', 0.05), 40);
  setTimeout(() => playTone(1000, 0.06, 'square', 0.03), 80);
}

function playCollect() {
  playTone(880, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.06), 60);
}

function playGoldCollect() {
  playTone(660, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.08, 'sine', 0.08), 60);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.06), 120);
}

function playHit() {
  playTone(150, 0.15, 'sawtooth', 0.1);
  setTimeout(() => playTone(100, 0.2, 'sawtooth', 0.08), 80);
}

function playGameOver() {
  playTone(400, 0.15, 'square', 0.08);
  setTimeout(() => playTone(300, 0.15, 'square', 0.08), 150);
  setTimeout(() => playTone(200, 0.3, 'square', 0.06), 300);
}

function playAchievement() {
  playTone(523, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 100);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.1), 200);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.12), 300);
}

function playPowerUp() {
  playTone(440, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(554, 0.08, 'sine', 0.08), 60);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.08), 120);
  setTimeout(() => playTone(880, 0.15, 'sine', 0.1), 180);
}

// ---- Game state ----
const GROUND_Y = 440;
let gameState = 'welcome';
let score = 0;
let highScore = 0;
let frameCount = 0;
let gameTime = 0;
let combo = 0;
let maxCombo = 0;
let difficulty = 1;
let lives = 3;
const MAX_LIVES = 3;
let invincible = false;
let invincibleTimer = 0;
let paused = false;
let loadingInterval = null;
let gameOverTimeout = null;

// ---- Power-ups ----
let activePowerUp = null;
let powerUpTimer = 0;
const POWERUP_DURATION = 600; // frames (~10s)

// ---- Player ----
const player = {
  x: 200,
  y: GROUND_Y - 40,
  w: 36,
  h: 44,
  vx: 0,
  vy: 0,
  speed: 5,
  jumpPower: -15.5,
  doubleJumpPower: -13.5,
  gravity: 0.5,
  onGround: true,
  jumpsLeft: 2,
  maxJumps: 2,
  facing: 1,
  blinkTimer: 0,
  color: '#5dade2',
  colorDark: '#2e86c1',
  colorLight: '#85c1e9'
};

// ---- Entities ----
let stars = [];
let obstacles = [];
let particles = [];
let floatingTexts = [];
let powerUps = [];
let bgMountains = [];

// ---- Screen shake ----
let shakeX = 0;
let shakeY = 0;
let shakeIntensity = 0;

// ---- Achievements ----
const MILESTONES = [10, 25, 50, 100, 200, 500];
let achievedMilestones = new Set();

// ---- Score history ----
let scoreHistory = [];
const MAX_HISTORY = 10;
try {
  highScore = parseInt(localStorage.getItem('starCatcherHighScore') || '0', 10);
  const saved = localStorage.getItem('starCatcherHistory');
  if (saved) scoreHistory = JSON.parse(saved);
  const savedAchievements = localStorage.getItem('starCatcherAchievements');
  if (savedAchievements) {
    JSON.parse(savedAchievements).forEach(m => achievedMilestones.add(m));
  }
  const savedColor = localStorage.getItem('starCatcherColor');
  if (savedColor) setPlayerColor(savedColor);
} catch(e) {}

function setPlayerColor(hex) {
  player.color = hex;
  const temp = document.createElement('div');
  temp.style.color = hex;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  const match = computed.match(/\d+/g);
  if (match) {
    const r = Math.min(255, parseInt(match[0]) - 40);
    const g = Math.min(255, parseInt(match[1]) - 40);
    const b = Math.min(255, parseInt(match[2]) - 40);
    player.colorDark = `rgb(${r},${g},${b})`;
    player.colorLight = `rgb(${Math.min(255, parseInt(match[0]) + 40)},${Math.min(255, parseInt(match[1]) + 40)},${Math.min(255, parseInt(match[2]) + 40)})`;
  } else {
    player.colorDark = '#2e86c1';
    player.colorLight = '#85c1e9';
  }
  try { localStorage.setItem('starCatcherColor', hex); } catch(e) {}
}

function getComboMultiplier() {
  return 1 + Math.floor(combo / 5);
}

function saveScore(score) {
  scoreHistory.unshift(score);
  if (scoreHistory.length > MAX_HISTORY) scoreHistory.length = MAX_HISTORY;
  try { localStorage.setItem('starCatcherHistory', JSON.stringify(scoreHistory)); } catch(e) {}
}

function renderHistory(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (scoreHistory.length === 0) {
    el.innerHTML = '<div class="history-empty">No games yet</div>';
    return;
  }
  el.innerHTML = scoreHistory.map((s, i) =>
    `<div class="history-item ${i === 0 ? 'latest' : ''}">
      <span class="history-rank">#${i + 1}</span>
      <span class="history-score">${s}</span>
    </div>`
  ).join('');
}

// ---- Input ----
const keys = { left: false, right: false, jump: false, jumpPressed: false };

// ---- Background layers ----
function initBackground() {
  bgMountains = [];
  for (let i = 0; i < 12; i++) {
    bgMountains.push({
      x: i * 80 - 40,
      h: 60 + Math.random() * 80,
      w: 100 + Math.random() * 60,
      color: `hsl(${210 + Math.random() * 30}, 60%, ${55 + Math.random() * 20}%)`
    });
  }
}
initBackground();

// ---- Entity spawning ----
function spawnStar(isGold = false) {
  stars.push({
    x: W + 30,
    y: 80 + Math.random() * (GROUND_Y - 200),
    w: isGold ? 32 : 26,
    h: isGold ? 32 : 26,
    speed: 2 + difficulty * 0.3,
    angle: Math.random() * Math.PI * 2,
    bob: Math.random() * 20,
    bobSpeed: 2 + Math.random() * 2,
    gold: isGold,
    glowPulse: Math.random() * Math.PI * 2
  });
}

function spawnObstacle() {
  const type = Math.random();
  let size, speed, yOff = 0;

  if (type < 0.2) {
    // Big slow
    size = 42 + Math.random() * 10;
    speed = 1.5 + difficulty * 0.3;
  } else if (type < 0.4) {
    // Small fast
    size = 18 + Math.random() * 6;
    speed = 4 + difficulty * 0.6;
  } else {
    // Normal
    size = 28 + Math.random() * 16;
    speed = 2.5 + difficulty * 0.5;
  }

  if (type < 0.2) yOff = -10;
  else if (type < 0.4) yOff = 4;

  obstacles.push({
    x: W + 20,
    y: GROUND_Y - size - 4 + yOff,
    w: size,
    h: size,
    speed: speed,
    color: `hsl(${Math.random() * 20 + 340}, 70%, 50%)`,
    bounce: Math.random() * 10,
    bounceSpeed: 3 + Math.random() * 3
  });
}

function spawnPowerUp() {
  const types = ['shield', 'magnet', 'slowmo'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerUps.push({
    x: W + 30,
    y: 120 + Math.random() * (GROUND_Y - 250),
    w: 28,
    h: 28,
    speed: 2 + difficulty * 0.2,
    type,
    bob: Math.random() * 20,
    bobSpeed: 2 + Math.random() * 2
  });
}

// ---- Particles ----
function emitParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 3 + Math.random() * 5,
      color
    });
  }
}

function emitStarCollect(x, y) {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.012 + Math.random() * 0.015,
      size: 3 + Math.random() * 6,
      color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`
    });
  }
}

function addFloatingText(x, y, text, color = '#ffd700') {
  floatingTexts.push({
    x, y,
    text,
    color,
    life: 1,
    vy: -2.5
  });
}

// ---- Drawing functions ----
function drawBackground() {
  ctx.save();
  ctx.translate(-shakeX, -shakeY);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#4facfe');
  skyGrad.addColorStop(0.5, '#87CEEB');
  skyGrad.addColorStop(0.8, '#b8e6ff');
  skyGrad.addColorStop(1, '#90d5a8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const cloudOffset = (frameCount * 0.2) % 600;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 180 + 50) - cloudOffset + 600) % 900 - 100;
    const cy = 30 + i * 25;
    drawCloud(cx, cy, 60 + i * 10);
  }

  for (const m of bgMountains) {
    const mx = ((m.x - frameCount * 0.3) % 1200 + 1200) % 1200 - 100;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(mx - m.w / 2, GROUND_Y + 4);
    ctx.quadraticCurveTo(mx, GROUND_Y - m.h, mx + m.w / 2, GROUND_Y + 4);
    ctx.fill();
  }

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  groundGrad.addColorStop(0, '#7ec850');
  groundGrad.addColorStop(0.15, '#5da832');
  groundGrad.addColorStop(0.4, '#8B5E3C');
  groundGrad.addColorStop(1, '#6d4c2a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  ctx.strokeStyle = '#4a8c2a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const gx = (i * 22 + frameCount * 0.2) % 880;
    const gh = 6 + Math.sin(i * 1.7 + frameCount * 0.03) * 4;
    ctx.beginPath();
    ctx.moveTo(gx, GROUND_Y);
    ctx.lineTo(gx - 3, GROUND_Y - gh);
    ctx.moveTo(gx, GROUND_Y);
    ctx.lineTo(gx + 3, GROUND_Y - gh);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.35, y - size * 0.15, size * 0.3, 0, Math.PI * 2);
  ctx.arc(x + size * 0.7, y, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const p = player;
  const px = Math.round(p.x - shakeX);
  const py = Math.round(p.y - shakeY);

  // Invincible blink
  if (invincible && Math.floor(frameCount / 4) % 2 === 0) return;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(px + p.w / 2, GROUND_Y + 2 - shakeY, p.w * 0.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shield glow
  if (activePowerUp === 'shield') {
    ctx.save();
    ctx.shadowColor = 'rgba(52, 152, 219, 0.6)';
    ctx.shadowBlur = 20 + Math.sin(frameCount * 0.1) * 8;
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + p.w / 2, py + p.h / 2, p.w * 0.7 + Math.sin(frameCount * 0.08) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const bodyGrad = ctx.createLinearGradient(px, py, px, py + p.h);
  bodyGrad.addColorStop(0, p.color);
  bodyGrad.addColorStop(1, p.colorDark);

  let sy = 1, sx = 1;
  if (!p.onGround && p.vy < 0) { sy = 0.85; sx = 1.12; }
  if (!p.onGround && p.vy > 0) { sy = 1.1; sx = 0.92; }

  ctx.save();
  ctx.translate(px + p.w / 2, py + p.h / 2);
  ctx.scale(p.facing * sx, sy);

  const bw = p.w, bh = p.h;
  const bx = -bw / 2, by = -bh / 2;
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = p.colorDark;
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.stroke();

  // Belly
  ctx.fillStyle = p.colorLight;
  roundRect(ctx, bx + 6, by + bh * 0.35, bw - 12, bh * 0.35, 4);
  ctx.fill();

  // Eyes
  p.blinkTimer++;
  const eyeOpen = p.blinkTimer % 180 < 175;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-5, -8, 6, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -8, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (eyeOpen) {
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(-5, -7, 3.5, 0, Math.PI * 2);
    ctx.arc(5, -7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -9, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-1, -8);
    ctx.moveTo(1, -8);
    ctx.lineTo(9, -8);
    ctx.stroke();
  }

  // Mouth
  ctx.strokeStyle = p.colorDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (p.vy < -1) {
    ctx.arc(0, 4, 5, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 6, 5, 0.1, Math.PI - 0.1);
  }
  ctx.stroke();

  // Jump indicator dots
  if (p.jumpsLeft > 0) {
    for (let i = 0; i < p.jumpsLeft; i++) {
      ctx.fillStyle = p.jumpsLeft === 1 ? '#ff6b6b' : '#ffd93d';
      ctx.beginPath();
      ctx.arc(-6 + i * 12, -bh / 2 - 12 - i * 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255,150,150,0.4)';
  ctx.beginPath();
  ctx.ellipse(-11, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(11, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  const legAnim = p.onGround ? Math.sin(frameCount * 0.2) * (Math.abs(p.vx) > 0.5 ? 4 : 0) : 0;
  ctx.fillStyle = p.colorDark;
  ctx.strokeStyle = p.colorDark;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const lx = side * 7;
    const ly = bh / 2 - 2;
    ctx.fillRect(bx + lx - 4, ly, 8, 12 + legAnim * side * -1);
    ctx.strokeRect(bx + lx - 4, ly, 8, 12 + legAnim * side * -1);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(s) {
  const cx = Math.round(s.x + s.w / 2 - shakeX);
  const cy = Math.round(s.y + s.h / 2 - shakeY + Math.sin(frameCount * 0.05 + s.bobSpeed * 0.1) * 3);
  const rot = s.angle + frameCount * 0.03;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  if (s.gold) {
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 20 + Math.sin(frameCount * 0.08 + s.glowPulse) * 8;
  } else {
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 15;
  }

  const spikes = 5;
  const outerR = s.w / 2;
  const innerR = outerR * 0.45;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (s.gold) {
    const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
    starGrad.addColorStop(0, '#fffdf0');
    starGrad.addColorStop(0.3, '#ffd700');
    starGrad.addColorStop(0.7, '#ffaa00');
    starGrad.addColorStop(1, '#ff8c00');
    ctx.fillStyle = starGrad;
    ctx.strokeStyle = '#cc7000';
  } else {
    const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
    starGrad.addColorStop(0, '#fff7a0');
    starGrad.addColorStop(0.5, '#ffd700');
    starGrad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = starGrad;
    ctx.strokeStyle = '#e68a00';
  }
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gold star extra sparkle
  if (s.gold) {
    ctx.fillStyle = '#fff';
    const sparkleSize = 3 + Math.sin(frameCount * 0.12 + s.glowPulse) * 2;
    for (let i = 0; i < 4; i++) {
      const a = frameCount * 0.05 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * outerR * 0.6, Math.sin(a) * outerR * 0.6, sparkleSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.shadowColor = 'transparent';
  ctx.restore();
}

function drawObstacle(o) {
  const cx = Math.round(o.x + o.w / 2 - shakeX);
  const cy = Math.round(o.y + o.h / 2 - shakeY + Math.sin(frameCount * 0.06 + o.bounce) * 3);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, o.h / 2 + 2, o.w * 0.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(-o.w / 2, -o.h / 2, o.w / 2, o.h / 2);
  grad.addColorStop(0, '#e74c3c');
  grad.addColorStop(0.5, '#c0392b');
  grad.addColorStop(1, '#a93226');
  ctx.fillStyle = grad;
  roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 4);
  ctx.fill();
  ctx.strokeStyle = '#7b241c';
  ctx.lineWidth = 2;
  roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 4);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-6, -4, 5, 0, Math.PI * 2);
  ctx.arc(6, -4, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(-6, -3, 2.5, 0, Math.PI * 2);
  ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.lineTo(-3, -8);
  ctx.moveTo(3, -8);
  ctx.lineTo(12, -11);
  ctx.stroke();

  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(0, 6, 4, 0, Math.PI);
  ctx.fill();

  ctx.restore();
}

function drawPowerUpItem(pu) {
  const cx = Math.round(pu.x + pu.w / 2 - shakeX);
  const cy = Math.round(pu.y + pu.h / 2 - shakeY + Math.sin(frameCount * 0.06 + pu.bobSpeed * 0.1) * 3);

  ctx.save();
  ctx.translate(cx, cy);

  // Glow
  ctx.shadowColor = pu.type === 'shield' ? 'rgba(52,152,219,0.6)' :
    pu.type === 'magnet' ? 'rgba(231,76,60,0.6)' : 'rgba(155,89,182,0.6)';
  ctx.shadowBlur = 15;

  // Background circle
  ctx.fillStyle = pu.type === 'shield' ? '#3498db' :
    pu.type === 'magnet' ? '#e74c3c' : '#9b59b6';
  ctx.beginPath();
  ctx.arc(0, 0, pu.w / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Icon
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icon = pu.type === 'shield' ? '🛡' : pu.type === 'magnet' ? '🧲' : '⏱';
  ctx.fillText(icon, 0, 1);

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(Math.round(p.x - shakeX), Math.round(p.y - shakeY), p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.life;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${20 + (1 - ft.life) * 8}px 'Fredoka One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.x - shakeX, ft.y - shakeY);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

// ---- Physics & logic ----
function updatePlayer() {
  const p = player;

  if (keys.left) { p.vx = -p.speed; p.facing = -1; }
  else if (keys.right) { p.vx = p.speed; p.facing = 1; }
  else { p.vx *= 0.7; if (Math.abs(p.vx) < 0.3) p.vx = 0; }

  if (keys.jump && p.jumpsLeft > 0) {
    const isDouble = !p.onGround;
    p.vy = isDouble ? p.doubleJumpPower : p.jumpPower;
    p.jumpsLeft--;
    p.onGround = false;
    keys.jump = false;
    if (isDouble) {
      emitParticles(p.x + p.w / 2, p.y + p.h, 'rgba(255,255,255,0.6)', 6);
      playDoubleJump();
    } else {
      playJump();
    }
  }

  // Slow-mo
  const gravMult = activePowerUp === 'slowmo' ? 0.4 : 1;
  const speedMult = activePowerUp === 'slowmo' ? 0.5 : 1;

  p.vy += p.gravity * gravMult;
  if (p.vy > 12 * speedMult) p.vy = 12 * speedMult;

  p.x += p.vx * speedMult;
  p.y += p.vy * speedMult;

  if (p.y + p.h >= GROUND_Y) {
    p.y = GROUND_Y - p.h;
    p.vy = 0;
    p.onGround = true;
    p.jumpsLeft = p.maxJumps;
  }

  if (p.x < 0) p.x = 0;
  if (p.x + p.w > W) p.x = W - p.w;
}

function updateStars() {
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    const speedMult = activePowerUp === 'slowmo' ? 0.4 : 1;
    s.x -= s.speed * speedMult;

    // Magnet effect
    if (activePowerUp === 'magnet') {
      const dx = player.x + player.w / 2 - (s.x + s.w / 2);
      const dy = player.y + player.h / 2 - (s.y + s.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && dist > 1) {
        const force = 3 * (1 - dist / 150);
        s.x += dx / dist * force;
        s.y += dy / dist * force;
      }
    }

    if (s.x + s.w < -20) {
      combo = 0;
      stars.splice(i, 1);
      continue;
    }

    if (rectCollide(player, s)) {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      const mult = getComboMultiplier();
      const points = (s.gold ? 3 : 1) * mult;
      emitStarCollect(s.x + s.w / 2, s.y + s.h / 2);
      score += points;
      if (s.gold) {
        addFloatingText(s.x, s.y - 10, `+${points}`, '#ff8c00');
        playGoldCollect();
      } else {
        addFloatingText(s.x, s.y - 10, `+${points}`, '#ffd700');
        playCollect();
      }
      if (mult > 1) {
        addFloatingText(s.x + 20, s.y - 30, `x${mult}`, '#ff6b6b');
      }
      stars.splice(i, 1);
      updateScoreDisplay();
      checkAchievements();
    }
  }
}

function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    const speedMult = activePowerUp === 'slowmo' ? 0.4 : 1;
    o.x -= o.speed * speedMult;

    if (o.x + o.w < -20) {
      obstacles.splice(i, 1);
      continue;
    }

    if (rectCollide(player, o)) {
      if (activePowerUp === 'shield') {
        activePowerUp = null;
        powerUpTimer = 0;
        powerupDisplay.textContent = '';
        playHit();
        emitParticles(player.x + player.w / 2, player.y + player.h / 2, '#3498db', 15);
        addFloatingText(player.x, player.y - 20, '🛡', '#3498db');
        obstacles.splice(i, 1);
        return;
      }
      playerHit();
      return;
    }
  }
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i];
    const speedMult = activePowerUp === 'slowmo' ? 0.4 : 1;
    pu.x -= pu.speed * speedMult;

    if (pu.x + pu.w < -20) {
      powerUps.splice(i, 1);
      continue;
    }

    if (rectCollide(player, pu)) {
      emitParticles(pu.x + pu.w / 2, pu.y + pu.h / 2, '#fff', 10);
      activePowerUp = pu.type;
      powerUpTimer = POWERUP_DURATION;
      playPowerUp();
      updatePowerUpDisplay();
      powerUps.splice(i, 1);
    }
  }
}

function updatePowerUpDisplay() {
  if (activePowerUp) {
    const icons = { shield: '🛡', magnet: '🧲', slowmo: '⏱' };
    powerupDisplay.textContent = `${icons[activePowerUp] || ''}`;
  } else {
    powerupDisplay.textContent = '';
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life -= 0.015;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function updateShake() {
  if (shakeIntensity > 0) {
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeIntensity *= 0.9;
    if (shakeIntensity < 0.5) {
      shakeIntensity = 0;
      shakeX = 0;
      shakeY = 0;
    }
  }
}

function rectCollide(a, b) {
  const shrink = 6;
  return a.x + shrink < b.x + b.w - shrink &&
    a.x + a.w - shrink > b.x + shrink &&
    a.y + shrink < b.y + b.h - shrink &&
    a.y + a.h - shrink > b.y + shrink;
}

// ---- Spawning ----
function manageSpawns() {
  const speedMult = activePowerUp === 'slowmo' ? 0.4 : 1;
  const adjusted = difficulty / speedMult;

  // Stars - sometimes gold
  if (stars.length < 4 + Math.floor(adjusted) && Math.random() < 0.02) {
    spawnStar(Math.random() < 0.15);
  }

  // Obstacles
  const maxObs = 1 + Math.floor(adjusted / 2);
  if (obstacles.length < maxObs && Math.random() < (0.008 + adjusted * 0.002)) {
    spawnObstacle();
  }

  // Power-ups
  if (powerUps.length < 1 && !activePowerUp && Math.random() < 0.003) {
    spawnPowerUp();
  }

  if (frameCount % 600 === 0) {
    difficulty = Math.min(difficulty + 0.5, 8);
  }
}

// ---- Lives & hit ----
function playerHit() {
  if (invincible) return;
  combo = 0;
  lives--;
  updateLivesDisplay();
  updateScoreDisplay();
  playHit();
  shakeIntensity = 8;
  emitParticles(player.x + player.w / 2, player.y + player.h / 2, '#e74c3c', 15);

  if (lives <= 0) {
    gameOver();
  } else {
    invincible = true;
    invincibleTimer = 90;
    activePowerUp = null;
    powerUpTimer = 0;
    updatePowerUpDisplay();
  }
}

function updateLivesDisplay() {
  livesDisplay.textContent = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    livesDisplay.textContent += i < lives ? '❤️' : '🖤';
  }
}

// ---- Achievements ----
function checkAchievements() {
  for (const m of MILESTONES) {
    if (score >= m && !achievedMilestones.has(m)) {
      achievedMilestones.add(m);
      try { localStorage.setItem('starCatcherAchievements', JSON.stringify([...achievedMilestones])); } catch(e) {}
      showAchievement(`🌟 ${m} Stars!`);
      playAchievement();
    }
  }
}

function showAchievement(text) {
  const el = document.createElement('div');
  el.className = 'achievement-popup';
  el.textContent = text;
  achievementToast.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---- Game state management ----
function startGame() {
  if (gameState === 'playing' || gameState === 'loading') return;
  score = 0;
  frameCount = 0;
  gameTime = 0;
  combo = 0;
  maxCombo = 0;
  difficulty = 1;
  lives = MAX_LIVES;
  invincible = false;
  invincibleTimer = 0;
  activePowerUp = null;
  powerUpTimer = 0;
  shakeIntensity = 0;
  shakeX = 0;
  shakeY = 0;
  stars = [];
  obstacles = [];
  particles = [];
  floatingTexts = [];
  powerUps = [];
  player.x = 200;
  player.y = GROUND_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.jumpsLeft = player.maxJumps;
  player.blinkTimer = 0;

  updateScoreDisplay();
  updateLivesDisplay();
  updatePowerUpDisplay();
  showScreen('game');
  gameState = 'playing';
}

function gameOver() {
  gameState = 'gameover';
  playGameOver();

  emitParticles(player.x + player.w / 2, player.y + player.h / 2, '#e74c3c', 25);
  emitParticles(player.x + player.w / 2, player.y + player.h / 2, '#f39c12', 15);
  shakeIntensity = 12;

  const isNewBest = score > highScore;
  if (isNewBest) {
    highScore = score;
    try { localStorage.setItem('starCatcherHighScore', highScore.toString()); } catch(e) {}
  }

  saveScore(score);
  renderHistory('start-history');

  finalScore.innerHTML = (isNewBest
    ? `Score: ${score} <span style="font-size:18px;color:#ffd700;display:block;">🎉 New Best!</span>`
    : `Score: ${score}`)
    + ` <span style="font-size:16px;color:#ff6b6b;display:block;">🔥 Best Combo: x${getComboMultiplier()}</span>`;
  finalHighscore.textContent = `🏆 Best: ${highScore}`;
  renderHistory('gameover-history');

  gameOverTimeout = setTimeout(() => {
    if (gameState === 'gameover') {
      showScreen('gameover');
    }
  }, 500);
}

function togglePause() {
  if (gameState !== 'playing') return;
  paused = !paused;
  pauseOverlay.classList.toggle('active', paused);
}

// ---- Screen management ----
function showScreen(name) {
  welcomeScreen.classList.remove('active');
  loadingScreen.classList.remove('active');
  startScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  gameoverScreen.classList.remove('active');

  if (name === 'welcome') welcomeScreen.classList.add('active');
  if (name === 'loading') loadingScreen.classList.add('active');
  if (name === 'start') startScreen.classList.add('active');
  if (name === 'game') gameScreen.classList.add('active');
  if (name === 'gameover') gameoverScreen.classList.add('active');

  pauseOverlay.classList.remove('active');
}

// ---- Loading screen ----
const loadingTips = [
  'Catch shiny stars to score points!',
  'Dodge the red baddies!',
  'Use double jump to reach higher stars!',
  'How many stars can you collect?',
  'Stay away from angry blocks!',
  'Gold stars are worth 3 points!',
  'Collect power-ups for special abilities!',
  '🛡 Shield protects from one hit!',
  '🧲 Magnet attracts nearby stars!',
  '⏱ Slow-mo slows everything down!'
];

function startLoading() {
  if (gameState === 'loading') return;
  gameState = 'loading';
  showScreen('loading');
  loadingBar.style.width = '0%';
  loadingTip.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];

  let progress = 0;
  loadingInterval = setInterval(() => {
    const increment = 5 + Math.random() * 15;
    progress = Math.min(progress + increment, 100);
    loadingBar.style.width = progress + '%';

    if (Math.random() < 0.15) {
      loadingTip.textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];
    }

    if (progress >= 100) {
      clearInterval(loadingInterval);
      loadingInterval = null;
      setTimeout(() => {
        if (gameState === 'loading') {
          showScreen('start');
          gameState = 'start';
        }
      }, 300);
    }
  }, 180);
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `⭐ ${score}`;
  highscoreDisplay.textContent = `🏆 ${highScore}`;
  const timerEl = document.getElementById('timer-display');
  if (timerEl) {
    const mins = Math.floor(gameTime / 60);
    const secs = gameTime % 60;
    timerEl.textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
  }
  const comboEl = document.getElementById('combo-display');
  if (comboEl) {
    const mult = getComboMultiplier();
    comboEl.textContent = combo > 0 ? `🔥 x${mult}` : '';
  }
}

// ---- Game loop ----
function gameLoop() {
  frameCount++;

  if (gameState === 'playing' && !paused) {
    updatePlayer();
    updateStars();
    updateObstacles();
    updatePowerUps();
    manageSpawns();
    gameTime = Math.floor(frameCount / 60);
    updateScoreDisplay();
    updateFloatingTexts();

    // Power-up timer
    if (activePowerUp) {
      powerUpTimer--;
      if (powerUpTimer <= 0) {
        activePowerUp = null;
        updatePowerUpDisplay();
      }
    }

    // Invincibility timer
    if (invincible) {
      invincibleTimer--;
      if (invincibleTimer <= 0) {
        invincible = false;
      }
    }

    updateShake();
  }

  drawBackground();

  if (gameState === 'playing') {
    const entities = [];
    for (const s of stars) entities.push({ type: 'star', data: s, y: s.y });
    for (const o of obstacles) entities.push({ type: 'obstacle', data: o, y: o.y });
    for (const pu of powerUps) entities.push({ type: 'powerup', data: pu, y: pu.y });
    entities.sort((a, b) => a.y - b.y);

    for (const e of entities) {
      if (e.type === 'star') drawStar(e.data);
      if (e.type === 'obstacle') drawObstacle(e.data);
      if (e.type === 'powerup') drawPowerUpItem(e.data);
    }

    drawPlayer();
  }

  if (particles.length > 0) {
    updateParticles();
    drawParticles();
  }

  drawFloatingTexts();

  requestAnimationFrame(gameLoop);
}

// ---- Auto-pause on tab blur ----
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameState === 'playing' && !paused) {
    togglePause();
  }
});

// ---- Event listeners ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
    keys.jump = true;
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    if (gameState === 'playing') togglePause();
  }

  if (e.key === 'Enter') {
    if (gameState === 'welcome') startLoading();
    else if (gameState === 'gameover') startGame();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keys.jump = false;
});

// ---- Touch controls (canvas) ----
let touchX = null;
let touchJumpQueued = false;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  touchX = t.clientX - rect.left;
  touchJumpQueued = true;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const newX = t.clientX - rect.left;
  if (newX < touchX - 10) { keys.left = true; keys.right = false; }
  else if (newX > touchX + 10) { keys.right = true; keys.left = false; }
  else { keys.left = false; keys.right = false; }
  touchX = newX;
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  touchX = null;
});

// Process touch jump in game loop via frame-based check
function processTouchJump() {
  if (touchJumpQueued) {
    keys.jump = true;
    touchJumpQueued = false;
  }
}

// ---- Touch buttons ----
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  touchControls.classList.add('active');
}

function setupTouchButton(el, key) {
  if (!el) return;
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys[key] = true;
  });
  el.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys[key] = false;
  });
  el.addEventListener('touchcancel', (e) => {
    keys[key] = false;
  });
  el.addEventListener('mousedown', () => { keys[key] = true; });
  el.addEventListener('mouseup', () => { keys[key] = false; });
  el.addEventListener('mouseleave', () => { keys[key] = false; });
}

setupTouchButton(touchLeft, 'left');
setupTouchButton(touchRight, 'right');
setupTouchButton(touchJump, 'jump');

// ---- Button listeners ----
welcomeBtn.addEventListener('click', startLoading);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', () => {
  showScreen('start');
  gameState = 'start';
  startHighscore.textContent = `🏆 Best: ${highScore}`;
});
resumeBtn.addEventListener('click', togglePause);
document.getElementById('mute-btn')?.addEventListener('click', toggleMute);
quitBtn.addEventListener('click', () => {
  paused = false;
  pauseOverlay.classList.remove('active');
  showScreen('start');
  gameState = 'start';
  startHighscore.textContent = `🏆 Best: ${highScore}`;
});

// ---- Customization ----
colorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const color = btn.dataset.color;
    setPlayerColor(color);
  });
});

// Select current color on start screen
const savedColor = localStorage.getItem('starCatcherColor');
if (savedColor) {
  colorBtns.forEach(b => {
    if (b.dataset.color === savedColor) b.classList.add('selected');
  });
} else {
  document.querySelector('.color-btn')?.classList.add('selected');
}

// ---- Modified update loop wrapper ----
const origRequestAnimationFrame = window.requestAnimationFrame;
window.requestAnimationFrame = function(callback) {
  return origRequestAnimationFrame.call(window, () => {
    processTouchJump();
    callback();
  });
};

// ---- Init ----
startHighscore.textContent = `🏆 Best: ${highScore}`;
renderHistory('start-history');
renderHistory('gameover-history');
showScreen('welcome');

gameLoop();
