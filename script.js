/* =========================================================
   STATE + PERSISTENCE
========================================================= */
const STORAGE_KEY = 'cakeStudioState';

const defaultState = {
  name: '',
  flavor: 'vanilla',
  bg: 'candy',
  theme: 'light',
  candleCount: 5,
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  }catch(e){
    return { ...defaultState };
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){ /* storage unavailable, ignore silently */ }
}

let state = loadState();

/* =========================================================
   DOM REFS
========================================================= */
const $ = (sel) => document.querySelector(sel);

const nameInput   = $('#nameInput');
const flavorSelect= $('#flavorSelect');
const bgSelect     = $('#bgSelect');
const candleSlider = $('#candleSlider');
const candleMinus  = $('#candleMinus');
const candlePlus   = $('#candlePlus');
const candleCountEl= $('#candleCount');
const themeToggle   = $('#themeToggle');
const blowBtn       = $('#blowBtn');
const relightBtn    = $('#relightBtn');
const confettiBtn   = $('#confettiBtn');
const balloonBtn    = $('#balloonBtn');
const fireworksBtn  = $('#fireworksBtn');
const musicBtn      = $('#musicBtn');
const downloadBtn   = $('#downloadBtn');
const panelToggle   = $('#panelToggle');
const panel         = $('#panel');
const cakeEl        = $('#cake');
const candlesRow    = $('#candlesRow');
const bannerName    = $('#bannerName');

/* =========================================================
   INITIAL RENDER FROM STATE
========================================================= */
function applyState(){
  nameInput.value = state.name;
  flavorSelect.value = state.flavor;
  bgSelect.value = state.bg;
  candleSlider.value = state.candleCount;
  candleCountEl.textContent = state.candleCount;

  document.body.dataset.theme = state.theme;
  document.body.dataset.bg = state.bg;
  cakeEl.dataset.flavor = state.flavor;
  themeToggle.setAttribute('aria-pressed', state.theme === 'dark');

  updateBanner();
  renderCandles(state.candleCount);
}

function updateBanner(){
  const trimmed = state.name.trim();
  bannerName.textContent = trimmed ? `Happy Birthday, ${trimmed}! 🎉` : 'Happy Birthday!';
}

/* =========================================================
   CANDLES
========================================================= */
function renderCandles(count){
  candlesRow.innerHTML = '';
  for(let i=0;i<count;i++){
    const c = document.createElement('div');
    c.className = 'candle';
    c.dataset.lit = 'true';
    c.innerHTML = '<div class="flame"></div>';
    c.addEventListener('click', () => toggleCandle(c));
    candlesRow.appendChild(c);
  }
}

function toggleCandle(candleEl){
  const lit = candleEl.dataset.lit === 'true';
  candleEl.dataset.lit = (!lit).toString();
  candleEl.classList.toggle('out', lit);
  if(lit) maybeAllOutCelebration();
}

function maybeAllOutCelebration(){
  const all = [...candlesRow.querySelectorAll('.candle')];
  const anyLit = all.some(c => c.dataset.lit === 'true');
  if(!anyLit){
    launchConfetti();
    spawnBalloons(6);
  }
}

function blowAllCandles(){
  const all = [...candlesRow.querySelectorAll('.candle')];
  if(all.length === 0) return;
  all.forEach((c, i) => {
    setTimeout(() => {
      c.dataset.lit = 'false';
      c.classList.add('out');
    }, i * 90);
  });
  setTimeout(() => {
    launchConfetti();
    launchFireworks(2200);
    spawnBalloons(8);
  }, all.length * 90 + 150);
}

function relightCandles(){
  const all = [...candlesRow.querySelectorAll('.candle')];
  all.forEach((c, i) => {
    setTimeout(() => {
      c.dataset.lit = 'true';
      c.classList.remove('out');
    }, i * 60);
  });
}

/* =========================================================
   THEME / FLAVOR / BACKGROUND / NAME EVENTS
========================================================= */
nameInput.addEventListener('input', () => {
  state.name = nameInput.value;
  updateBanner();
  saveState();
});

flavorSelect.addEventListener('change', () => {
  state.flavor = flavorSelect.value;
  cakeEl.dataset.flavor = state.flavor;
  saveState();
});

bgSelect.addEventListener('change', () => {
  state.bg = bgSelect.value;
  document.body.dataset.bg = state.bg;
  saveState();
});

function setCandleCount(n){
  n = Math.max(1, Math.min(16, n));
  state.candleCount = n;
  candleSlider.value = n;
  candleCountEl.textContent = n;
  renderCandles(n);
  saveState();
}

candleSlider.addEventListener('input', () => setCandleCount(Number(candleSlider.value)));
candleMinus.addEventListener('click', () => setCandleCount(state.candleCount - 1));
candlePlus.addEventListener('click', () => setCandleCount(state.candleCount + 1));

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = state.theme;
  themeToggle.setAttribute('aria-pressed', state.theme === 'dark');
  saveState();
});

blowBtn.addEventListener('click', blowAllCandles);
relightBtn.addEventListener('click', relightCandles);
confettiBtn.addEventListener('click', () => launchConfetti());
balloonBtn.addEventListener('click', () => spawnBalloons(6));
fireworksBtn.addEventListener('click', () => launchFireworks(1800));

panelToggle.addEventListener('click', () => panel.classList.toggle('open'));

/* =========================================================
   CANVAS FX ENGINE (confetti + fireworks share one canvas)
========================================================= */
const canvas = $('#fx-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let fxRunning = false;

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function ensureLoop(){
  if(fxRunning) return;
  fxRunning = true;
  requestAnimationFrame(fxLoop);
}

function fxLoop(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  particles.forEach(p => p.update());
  particles.forEach(p => p.draw());
  particles = particles.filter(p => !p.dead);
  if(particles.length > 0){
    requestAnimationFrame(fxLoop);
  }else{
    fxRunning = false;
  }
}

const CONFETTI_COLORS = ['#FF6F91','#FFD966','#79D9A4','#7EA8FF','#C08CFF'];

class ConfettiPiece{
  constructor(){
    this.x = Math.random()*canvas.width;
    this.y = -20 - Math.random()*200;
    this.size = 6 + Math.random()*6;
    this.color = CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)];
    this.speedY = 2 + Math.random()*3;
    this.speedX = (Math.random()-0.5)*2.5;
    this.rotation = Math.random()*360;
    this.spin = (Math.random()-0.5)*10;
    this.life = 0;
    this.maxLife = 260 + Math.random()*80;
    this.dead = false;
  }
  update(){
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.life/18)*0.6;
    this.rotation += this.spin;
    this.life++;
    if(this.y > canvas.height + 30 || this.life > this.maxLife) this.dead = true;
  }
  draw(){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI/180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/3, this.size, this.size*0.6);
    ctx.restore();
  }
}

function launchConfetti(count = 140){
  for(let i=0;i<count;i++) particles.push(new ConfettiPiece());
  ensureLoop();
}

class Firework{
  constructor(x, y, color){
    this.x = x; this.y = y;
    this.color = color;
    this.particles = [];
    const n = 34 + Math.floor(Math.random()*14);
    for(let i=0;i<n;i++){
      const angle = (Math.PI*2*i)/n;
      const speed = 1.5 + Math.random()*3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 0,
        maxLife: 50 + Math.random()*20,
      });
    }
    this.dead = false;
  }
  update(){
    let allDead = true;
    this.particles.forEach(p => {
      p.vy += 0.045;
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if(p.life < p.maxLife) allDead = false;
    });
    this.dead = allDead;
  }
  draw(){
    this.particles.forEach(p => {
      const alpha = Math.max(0, 1 - p.life/p.maxLife);
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
}

function launchFireworks(durationMs = 2000){
  const colors = ['#FF6F91','#FFD966','#79D9A4','#7EA8FF','#C08CFF','#FF9F45'];
  const start = performance.now();
  function spawnOne(){
    const x = canvas.width*0.15 + Math.random()*canvas.width*0.7;
    const y = canvas.height*0.15 + Math.random()*canvas.height*0.35;
    const color = colors[Math.floor(Math.random()*colors.length)];
    particles.push(new Firework(x, y, color));
    ensureLoop();
    if(performance.now() - start < durationMs){
      setTimeout(spawnOne, 260 + Math.random()*260);
    }
  }
  spawnOne();
}

/* =========================================================
   BALLOONS
========================================================= */
const balloonLayer = $('#balloon-layer');
const BALLOON_COLORS = ['#FF6F91','#FFD966','#79D9A4','#7EA8FF','#C08CFF','#FF9F45'];

function spawnBalloons(count = 6){
  for(let i=0;i<count;i++){
    const b = document.createElement('div');
    b.className = 'balloon';
    const color = BALLOON_COLORS[Math.floor(Math.random()*BALLOON_COLORS.length)];
    b.style.background = `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), ${color} 60%)`;
    b.style.left = `${Math.random()*90}%`;
    const duration = 6 + Math.random()*4;
    b.style.animationDuration = `${duration}s`;
    balloonLayer.appendChild(b);
    setTimeout(() => b.remove(), duration*1000 + 200);
  }
}

/* =========================================================
   BIRTHDAY TUNE (Web Audio API — synthesized, no external file)
========================================================= */
let audioCtx = null;
let musicPlaying = false;
let musicTimeouts = [];

// Happy Birthday melody: [note, beats]. Rests are 0.
const MELODY = [
  ['C4',0.75],['C4',0.25],['D4',1],['C4',1],['F4',1],['E4',2],
  ['C4',0.75],['C4',0.25],['D4',1],['C4',1],['G4',1],['F4',2],
  ['C4',0.75],['C4',0.25],['C5',1],['A4',1],['F4',1],['E4',1],['D4',2],
  ['A#4',0.75],['A#4',0.25],['A4',1],['F4',1],['G4',1],['F4',2],
];

const NOTE_FREQ = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00,
  A4:440.00, 'A#4':466.16, B4:493.88, C5:523.25,
};

function playBirthdaySong(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();

  musicPlaying = true;
  musicBtn.setAttribute('aria-pressed','true');
  musicBtn.textContent = '⏸ Stop Tune';

  const beatMs = 340;
  let t = 0;
  musicTimeouts = [];

  MELODY.forEach(([note, beats]) => {
    const id = setTimeout(() => {
      if(!musicPlaying) return;
      const freq = NOTE_FREQ[note];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + beats*beatMs/1000*0.9);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + beats*beatMs/1000);
    }, t);
    musicTimeouts.push(id);
    t += beats*beatMs;
  });

  const endId = setTimeout(() => stopBirthdaySong(), t + 200);
  musicTimeouts.push(endId);
}

function stopBirthdaySong(){
  musicPlaying = false;
  musicTimeouts.forEach(id => clearTimeout(id));
  musicTimeouts = [];
  musicBtn.setAttribute('aria-pressed','false');
  musicBtn.textContent = '🎵 Play Tune';
}

musicBtn.addEventListener('click', () => {
  if(musicPlaying) stopBirthdaySong();
  else playBirthdaySong();
});

/* =========================================================
   DOWNLOAD AS PNG
========================================================= */
downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = 'Rendering…';
  try{
    const stage = document.getElementById('stage');
    const canvasImg = await html2canvas(stage, {
      backgroundColor: null,
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true,
    });
    const link = document.createElement('a');
    const safeName = (state.name.trim() || 'birthday-cake').replace(/[^a-z0-9\-]+/gi,'_');
    link.download = `${safeName}.png`;
    link.href = canvasImg.toDataURL('image/png');
    link.click();
  }catch(err){
    console.error('Download failed:', err);
    alert('Sorry, the image could not be generated. Please try again.');
  }finally{
    downloadBtn.disabled = false;
    downloadBtn.textContent = originalText;
  }
});

/* =========================================================
   INIT
========================================================= */
applyState();
