// ====== DOM ======
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const aboutBtn = document.getElementById('aboutBtn');
const modalAbout = document.getElementById('modalAbout');
const closeAbout = document.getElementById('closeAbout');

const gameEl = document.getElementById('game');
const worldEl = document.getElementById('world');
const playerEl = document.getElementById('player');
const giftEl = document.getElementById('gift');

const modalEl = document.getElementById('modal');
const msgTitle = document.getElementById('msgTitle');
const msgText = document.getElementById('msgText');
const closeModal = document.getElementById('closeModal');

const confettiEl = document.getElementById('confetti');
const controlsEl = document.getElementById('controls');
const jumpBtn = document.getElementById('jumpBtn');
const resetBtn = document.getElementById('resetBtn');

// NES Buttons (ganti analog)
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

// ====== Nama via URL (opsional) ======
const params = new URLSearchParams(location.search);
const BDAY_NAME = params.get("to") || "Salsa";
const BDAY_MESSAGE = "Haii, sekarang 4 November kamu ultahh kann??? Happy birthday yaa, sall. semoga hari hari nya selalu dilancarkann, dan semua hal baik pelan pelan dateng ke kamuu. makasii yaa udaa jadi orang baikk buat akuu, semoga kamu juga dikelilingi orang orang baikk jugaa yaaa!!! jangan lupaa jaga diri di sanaaa. aku tau kamu kuatt, tapi tetep ajaa haruss jaga makann, jangan terlalu kecapeann, ingett istirahat nyaa!!";
msgTitle.textContent = `Happy Birthday, ${BDAY_NAME}! 🎉`;
msgText.textContent = BDAY_MESSAGE + " 🎂✨";

// ====== World & Player ======
const GROUND_Y = 90;
const WORLD_WIDTH = 2200; // samakan dengan CSS .world width
worldEl.style.width = WORLD_WIDTH + 'px';

const player = { w:34, h:44, x:40, y:GROUND_Y, vx:0, vy:0, speed:320, jump:600, onGround:true };
let started = false, won = false;

// ====== Eyelid Blink ======
(function addEyelid(){
  const head = playerEl.querySelector('.head');
  if(!head) return;
  const eyelid = document.createElement('div');
  Object.assign(eyelid.style, {
    position:'absolute', left:0, top:0, width:'100%', height:'100%',
    background:'#000', opacity:.15, transformOrigin:'top', animation:'blink 4s infinite'
  });
  head.appendChild(eyelid);
})();

// ====== Audio FX (Jump + Gift) ======
let actx = null, master = null;
function ensureAudio(){
  const AudioCTX = window.AudioContext || window.webkitAudioContext;
  if(!AudioCTX) return;
  if(!actx){
    actx = new AudioCTX();
    master = actx.createGain();
    master.gain.value = 0.3;
    master.connect(actx.destination);
  }
  if(actx.state === 'suspended') actx.resume();
}
function jumpSound(){
  if(!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type='square';
  o.frequency.setValueAtTime(780, actx.currentTime);
  o.frequency.exponentialRampToValueAtTime(340, actx.currentTime+0.12);
  g.gain.setValueAtTime(0.001, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.5, actx.currentTime+0.05);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+0.2);
  o.connect(g).connect(master);
  o.start(); o.stop(actx.currentTime+0.25);
}
function chimeSound(){
  if(!actx) return;
  const tones = [523.25,659.25,783.99,1046.5];
  let t = actx.currentTime;
  for(const f of tones){
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.2);
    o.connect(g).connect(master);
    o.start(t); o.stop(t+0.25);
    t += 0.07;
  }
}

// ====== Obstacles & Hazards ======
let obstacles = [], hazards = [];
function makeRect(o){
  const el = document.createElement('div');
  el.className = `obstacle ${o.type}`;
  el.style.left = o.x + 'px';
  el.style.bottom = o.y + 'px';
  el.style.width = o.w + 'px';
  el.style.height = o.h + 'px';
  worldEl.appendChild(el);
  o._el = el;
  return o;
}
function buildLevel(){
  [...obstacles, ...hazards].forEach(o => o._el && o._el.remove());
  obstacles = []; hazards = [];

  // Rintangan
  const items = [
    {x:200,y:GROUND_Y,w:90,h:60, type:'block'},
    {x:340,y:GROUND_Y,w:60,h:80,type:'block'},
    {x:470,y:GROUND_Y,w:70,h:80,type:'pipe'},
    {x:620,y:GROUND_Y,w:70,h:100,type:'block'},
    {x:700,y:GROUND_Y,w:70,h:115,type:'block'},
    {x:780,y:GROUND_Y,w:70,h:120,type:'block'},
    {x:920,y:GROUND_Y,w:70,h:80,type:'pipe'},
    {x:1040,y:GROUND_Y,w:70,h:60,type:'pipe'},
    {x:1160,y:GROUND_Y,w:70,h:90,type:'pipe'},
    {x:1260,y:GROUND_Y,w:140,h:60,type:'block'},
    {x:1420,y:GROUND_Y,w:60,h:80,type:'block'},
    {x:1520,y:GROUND_Y,w:60,h:95,type:'block'},
    {x:1600,y:GROUND_Y,w:120,h:60,type:'block'},
    {x:1740,y:GROUND_Y,w:60,h:100,type:'block'}
  ];
  // Scale block 70%
  items.forEach(o => { if(o.type==='block'){ o.w*=0.7; o.h*=0.7; } });

  // Pohon dekoratif
  items.push({ x: 1850, y: GROUND_Y, w: 50, h: 50, type: 'tree-trunk' });
  items.push({ x: 1810, y: GROUND_Y + 30, w: 130, h: 70, type: 'tree-leaf' });

  items.forEach(o => obstacles.push(makeRect(o)));

  // Lava
  [{x:560,w:40},{x:835,w:75},{x:1370,w:40},{x:1690,w:50}].forEach(seg=>{
    hazards.push(makeRect({x:seg.x,y:GROUND_Y,w:seg.w,h:14,type:'lava'}));
  });

  // Cake di atas daun
  giftEl.style.left = (1850 + 20) + "px";
  giftEl.style.bottom = (GROUND_Y + 90) + "px";
  giftEl.classList.add('pulse');
}

// ====== Input System ======
const input = { ax:0 };
const keys = new Set();
window.addEventListener('keydown', e=>{
  if(['ArrowLeft','ArrowRight','Space','KeyA','KeyD'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if(!started) beginGame();
});
window.addEventListener('keyup', e=> keys.delete(e.code));
function readKeyboard(){
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const jump = keys.has('Space');
  return { ax: (right?1:0) - (left?1:0), jump };
}

// ====== NES Buttons (ganti analog) ======
function holdLeft(){ input.ax = -1; }
function holdRight(){ input.ax = 1; }
function releaseLR(){ input.ax = 0; }

btnLeft.addEventListener('pointerdown', holdLeft);
btnRight.addEventListener('pointerdown', holdRight);
window.addEventListener('pointerup', (e)=> {
  if (e.target === btnLeft || e.target === btnRight) releaseLR();
});
window.addEventListener('pointercancel', releaseLR);
window.addEventListener('blur', releaseLR);

// Jump & Reset
jumpBtn.addEventListener('pointerdown',()=>{ if(!started) beginGame(); doJump(); });
resetBtn.addEventListener('click', resetToStart);

// ====== Physics & Collision ======
const GRAV = 1900;
function doJump(){
  if(player.onGround){
    playerEl.classList.add('squash');
    setTimeout(()=>{
      ensureAudio();
      player.vy = player.jump;
      player.onGround = false;
      playerEl.classList.remove('squash');
      jumpSound();
    }, 60);
  }
}

function centerCamera(){
  const viewW = gameEl.clientWidth;
  const isMobile = window.innerWidth < 768;

  const offset = isMobile ? 140 : 120; 
  let camX = player.x - viewW / 2 + player.w / 2 - offset;
  camX = Math.max(0, Math.min(camX, WORLD_WIDTH - viewW));


  // Kalau HP → geser dunia sedikit ke atas (biar karakter kelihatan)
  if (isMobile) {
    worldEl.style.transform = `translateX(${-camX}px) translateY(-60px) scale(0.8)`;
  } else {
    worldEl.style.transform = `translateX(${-camX}px) scale(1)`;
  }
}





function aabb(ax,ay,aw,ah, bx,by,bw,bh){
  return !(ax+aw <= bx || ax >= bx+bw || ay+ah <= by || ay >= by+bh);
}
function resolveHorizontal(nx){
  let px = nx, py = player.y;
  for(const o of obstacles){
    if(aabb(px,py,player.w,player.h, o.x,o.y,o.w,o.h)){
      if(player.vx > 0) px = o.x - player.w;
      else if(player.vx < 0) px = o.x + o.w;
      player.vx = 0;
    }
  }
  player.x = px;
}
function resolveVertical(ny){
  let px = player.x, py = ny, grounded=false;
  for(const o of obstacles){
    if(aabb(px,py,player.w,player.h, o.x,o.y,o.w,o.h)){
      if(player.vy > 0){ py = o.y - player.h; }
      else if(player.vy < 0){ py = o.y + o.h; grounded = true; }
      player.vy = 0;
    }
  }
  if(py < GROUND_Y){ py = GROUND_Y; grounded = true; }
  player.y = py;
  player.onGround = grounded;
}
function hitHazard(){
  for(const h of hazards){
    if(aabb(player.x,player.y,player.w,player.h, h.x,h.y,h.w,h.h)) return true;
  }
  return false;
}

// ====== Game Loop ======
let last = performance.now();
function step(now){
  const dt = Math.min(0.032, (now-last)/1000); last = now;

  const kb = readKeyboard();
  if(started && Math.abs(input.ax) < 0.01) input.ax = kb.ax; // keyboard override hanya saat tombol NES tidak ditekan
  const wantJump = started ? kb.jump : false;

  // Horizontal
  player.vx = input.ax * player.speed;
  resolveHorizontal(player.x + player.vx * dt);

  // Flip
  if(player.vx < -1) playerEl.classList.add('flip');
  else if(player.vx > 1) playerEl.classList.remove('flip');

  // Jump
  if(wantJump && player.onGround) doJump();

  // Vertical
  player.vy -= GRAV * dt;
  resolveVertical(player.y + player.vy * dt);

  // Limits
  if(player.x < 0) player.x = 0;
  if(player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;

  // Render
  playerEl.style.left = player.x + 'px';
  playerEl.style.bottom = player.y + 'px';
  playerEl.classList.toggle('walking', Math.abs(player.vx) > 5 && player.onGround);

  centerCamera();

  // Hazard & Gift
  if(started && hitHazard()) resetToStart(true);
  if(!won && isCollide(playerEl, giftEl)){ won = true; openGift(); }

  requestAnimationFrame(step);
}
requestAnimationFrame(step);

function isCollide(a,b){
  const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}

// ====== Gift Flow ======
function openGift(){
  giftEl.classList.remove('pulse');
  giftEl.classList.add('open');
  ensureAudio();
  chimeSound();
  spawnConfetti(200);
  setTimeout(()=> modalEl.classList.add('show'), 380);
}
function hideModal(){ modalEl.classList.remove('show'); }
closeModal.addEventListener('click', hideModal);
modalEl.addEventListener('click', e=>{ if(e.target===modalEl) hideModal(); });

// ====== Reset Game ======
function resetToStart(hit=false){
  won = false; hideModal(); clearConfetti();
  giftEl.classList.add('pulse'); giftEl.classList.remove('open');
  player.x=40; player.y=GROUND_Y; player.vx=0; player.vy=0; player.onGround=true;
  centerCamera();
  if(hit){
    ensureAudio();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sawtooth'; o.frequency.value=220; g.gain.value=0.15;
    o.connect(g).connect(master); o.start(); o.stop(actx.currentTime+0.15);
  }
}

// ====== Start & About ======
function beginGame(){
  started = true;
  ensureAudio();

  // Optional: Fullscreen + lock landscape (Android Chrome)
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(()=>{});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(()=>{});
  }

  startScreen.style.display = 'none';
  controlsEl.style.display = 'flex';
  gameEl.focus();
}
startBtn.addEventListener('click', beginGame);

function showAbout(){
  startScreen.classList.add("hidden");
  modalAbout.classList.add("show");
}
function hideAbout(){
  modalAbout.classList.remove("show");
  startScreen.classList.remove("hidden");
}
aboutBtn.addEventListener('click', showAbout);
closeAbout.addEventListener('click', hideAbout);
modalAbout.addEventListener('click', (e)=>{ if(e.target===modalAbout) hideAbout(); });

// ====== Confetti ======
function spawnConfetti(n=150){
  const W = innerWidth, H = innerHeight;
  const colors = ['#e74c3c','#f1c40f','#2ecc71','#3498db','#9b59b6'];
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='piece';
    d.style.position='absolute'; d.style.width='10px'; d.style.height='14px'; d.style.opacity='0.9';
    d.style.left=(Math.random()*W)+'px'; d.style.top=(-20-Math.random()*200)+'px';
    d.style.background=colors[i%colors.length];
    d.style.transform=`rotate(${Math.random()*360}deg)`;
    confettiEl.appendChild(d);
    const fall = 2 + Math.random()*2.5;
    d.animate(
      [{transform:d.style.transform+' translateY(0)'},
       {transform:d.style.transform+` translateY(${H+100}px)`}],
      {duration:fall*1000, easing:'linear'}
    );
    setTimeout(()=>d.remove(), fall*1000 + 120);
  }
}
function clearConfetti(){ confettiEl.innerHTML=''; }


// ====== Boot ======
window.addEventListener('load', ()=>{
  controlsEl.style.display = 'none';
  buildLevel();
  gameEl.focus();
});
window.addEventListener('resize', centerCamera);
