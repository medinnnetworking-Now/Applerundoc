(() => {
'use strict';

/* =====================================================================
   Config
   ===================================================================== */
const MAZE = [
"###################",
"#........#........#",
"#.##.###.#.###.##.#",
"#.................#",
"#.##.#.#####.#.##.#",
"#....#...#...#....#",
"####.###.#.###.####",
"####.#.......#.####",
"####.#.##.##.#.####",
"#......#...#......#",
"####.#.#####.#.####",
"####.#.......#.####",
"####.#.#####.#.####",
"#........#........#",
"#.##.###.#.###.##.#",
"#..#.........#..#.#",
"##.#.#.#####.#.#.##",
"#....#...#...#....#",
"#.######.#.######.#",
"#.................#",
"###################"
];
const W = MAZE[0].length, H = MAZE.length;
const DIRS = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
const open = (x,y) => x>=0 && x<W && y>=0 && y<H && MAZE[y][x] !== '#';
const exitsAt = (x,y) => DIRS.reduce((n,d)=>n+(open(x+d.x,y+d.y)?1:0),0);

const { SUBJECTS, drawApple, drawDoctor, rrect } = window.RR;
const TOTAL = SUBJECTS.length;
const SPAWNS = [[9,7],[8,9],[10,9],[9,9]];
const ACTIVE_MAX = 4;

const APPLE_SPEED = 5.8;        // tiles per second
const DOC_BASE = 4.1, DOC_STEP = 0.12;
const CATCH_PTS = 50, RIGHT_PTS = 200, SPEED_MAX = 100;
const Q_TIME = 12, PENALTY = 5;
const TIME_BASE = 2000, TIME_RATE = 15;     // time bonus = 2000 - 15 * chaseSeconds
const RANKS = [[4200,'Head of Department'],[3200,'Consultant'],[2200,'Resident'],[1200,'Intern'],[0,'Fresher']];

const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   DOM
   ===================================================================== */
const $ = id => document.getElementById(id);
const canvas = $('c'), ctx = canvas.getContext('2d');
const stage = $('stage'), clockEl = $('clock'), scoreEl = $('score'), pipsEl = $('pips');
const titleScr = $('title'), mcqScr = $('mcq'), resultScr = $('result');
const nameEl = $('name'), heroCv = $('hero'), hctx = heroCv.getContext('2d');
const ecgCv = $('ecg'), ex = ecgCv.getContext('2d');
const avatarCv = $('mcqAvatar'), actx = avatarCv.getContext('2d');

/* =====================================================================
   Storage
   ===================================================================== */
const LB_KEY = 'apple-a-day-lb-v2', NAME_KEY = 'apple-a-day-name';
const loadLB = () => { try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch(e){ return []; } };
const saveLB = a => { try { localStorage.setItem(LB_KEY, JSON.stringify(a)); } catch(e){} };
try { nameEl.value = localStorage.getItem(NAME_KEY) || ''; } catch(e){}

// Shared board lives in Supabase (table rundocrun_scores, see supabase/schema.sql).
// The URL and the public anon / publishable key are safe to ship in the page: Row Level Security only allows
// reading the board and adding scores. Leave them empty and the board falls back to this device.
const SUPABASE_URL = 'https://xukbrkwtayrjbkttfakm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_41KBwbN5oT0N76_2YBr7Iw_nUv1gpBs';
const TABLE = SUPABASE_URL && SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rundocrun_scores';
let sharedLB = null;
async function sb(path, opts = {}){
  if(!TABLE) throw new Error('no board');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
  const headers = {apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opts.headers || {})};
  if(SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + SUPABASE_KEY;   // legacy anon JWT keys
  try{
    const r = await fetch(TABLE + path, {...opts, headers, signal: ctl.signal, cache: 'no-store'});
    if(!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const fromRow = r => ({id: String(r.id), name: r.name, score: r.score, right: r.right_answers, time: Number(r.time_s)});
async function fetchLB(){
  try{ sharedLB = (await sb('?select=id,name,score,right_answers,time_s&order=score.desc,time_s.asc&limit=8')).map(fromRow); }
  catch(e){ sharedLB = null; }
  return sharedLB;
}
async function submitScore(entry){
  try{
    const [row] = await sb('', {method: 'POST', headers: {Prefer: 'return=representation'},
      body: JSON.stringify({name: entry.name.slice(0,14), score: entry.score, right_answers: entry.right, time_s: Math.round(entry.time*100)/100})});
    await fetchLB();
    return String(row.id);
  }catch(e){ return null; }
}

function renderLB(el, meId){
  el.innerHTML = '';
  const lb = (sharedLB || loadLB()).slice(0,8);
  if(!lb.length){
    const li = document.createElement('li'); li.style.background='none';
    const s = document.createElement('span'); s.className='nm'; s.style.cssText='font-weight:500;opacity:.7';
    s.textContent = 'No scores yet. Set the first one.'; li.appendChild(s); el.appendChild(li); return;
  }
  lb.forEach((r,i) => {
    const li = document.createElement('li'); if(r.id===meId) li.className='me';
    const mk = (cls,txt) => { const s=document.createElement('span'); s.className=cls; s.textContent=txt; return s; };
    li.append(mk('rk',i+1), mk('nm',r.name), mk('sc',r.score), mk('meta',`${r.right}/${TOTAL} · ${r.time.toFixed(1)}s`));
    el.appendChild(li);
  });
}

/* =====================================================================
   Promo link (optional)
   Set url to show a link on the title card and a button on the result card. Leave url empty to hide both.
   ===================================================================== */
const PROMO = { url: 'https://medinn-sandy.vercel.app/?utm_source=rundocrun&utm_medium=game', title: 'Developed by Medinn', button: 'Developed by Medinn' };
const GAME_URL = 'applerundoc.vercel.app';   // printed on the share card
if(PROMO.url){
  const t = $('promoTitle'), b = $('promoBtn');
  t.href = b.href = PROMO.url;
  $('promoTitleText').textContent = PROMO.title; b.textContent = PROMO.button;
  t.hidden = b.hidden = false;
}

/* =====================================================================
   Audio
   ===================================================================== */
let ac = null, muted = false;
function tone(f, d=.09, type='square', v=.05, f2, delay=0){
  if(muted) return;
  try{
    ac = ac || new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t+d+.03);
  }catch(e){}
}
const sfx = {
  tick:  () => tone(520,.08,'triangle',.07),
  go:    () => tone(880,.25,'square',.06,1320),
  catch: () => { tone(300,.1,'sawtooth',.06,900); tone(660,.12,'square',.05,1320,.07); },
  right: () => [659,784,988].forEach((f,i)=>tone(f,.14,'triangle',.08,0,i*.08)),
  wrong: () => { tone(220,.22,'sawtooth',.07,110); },
  spawn: () => tone(400,.1,'sine',.05,800),
  win:   () => [523,659,784,1047,1319].forEach((f,i)=>tone(f,.2,'triangle',.08,0,i*.1)),
};
$('mute').onclick = () => { muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊'; };

/* Exit: leave a run at any point and go back to the title card. Two taps, so a stray touch doesn't end a run. */
const exitBtn = $('exit');
let exitArmT = null;
function disarmExit(){ clearTimeout(exitArmT); exitArmT = null; exitBtn.classList.remove('armed'); exitBtn.textContent = '✕ Exit'; }
function exitGame(){
  disarmExit();
  mcqScr.classList.remove('on'); resultScr.classList.remove('on');
  quiz = null; curDoc = null;
  reset(); state = 'title';
  titleScr.classList.add('on');
  renderLB($('lb1')); fetchLB().then(() => renderLB($('lb1')));
}
exitBtn.onclick = () => {
  if(exitArmT){ exitGame(); return; }
  exitBtn.classList.add('armed'); exitBtn.textContent = 'Tap again to quit';
  exitArmT = setTimeout(disarmExit, 2500);
};

/* =====================================================================
   Sizing
   ===================================================================== */
let T = 20, cw = 0, ch = 0, dpr = 1;
const bg = document.createElement('canvas');
function sizeCanvas(cv, w, h){ cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
function resize(){
  dpr = Math.min(window.devicePixelRatio||1, 3);
  const aw = stage.clientWidth - 16, ah = stage.clientHeight - 6;
  T = Math.max(12, Math.floor(Math.min(aw/W, ah/H)));
  cw = T*W; ch = T*H;
  canvas.style.width = cw+'px'; canvas.style.height = ch+'px';
  sizeCanvas(canvas, cw, ch);
  buildBG();
  sizeECG();
  const hr = heroCv.getBoundingClientRect(); if(hr.width) sizeCanvas(heroCv, hr.width, hr.height);
}
function buildBG(){
  bg.width = canvas.width; bg.height = canvas.height;
  const g = bg.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle = '#d9efe6'; g.fillRect(0,0,cw,ch);
  // tiled floor
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(open(x,y) && (x+y)%2){ g.fillStyle='rgba(15,63,66,.05)'; g.fillRect(x*T,y*T,T,T); }
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = Math.max(1.5, T*.07); g.lineCap='round';
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!open(x,y)) continue;
    const cx=(x+.5)*T, cy=(y+.5)*T, a=T*.1;
    g.beginPath(); g.moveTo(cx-a,cy); g.lineTo(cx+a,cy); g.moveTo(cx,cy-a); g.lineTo(cx,cy+a); g.stroke();
  }
  // walls
  g.fillStyle = '#0f3f42';
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(!open(x,y)) g.fillRect(x*T,y*T,T+.5,T+.5);
  // glowing edges
  g.save();
  g.strokeStyle = '#46c2b4'; g.lineWidth = Math.max(2, T*.1); g.lineCap='round';
  g.shadowColor = 'rgba(124,245,200,.9)'; g.shadowBlur = T*.45;
  g.beginPath();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(open(x,y)) continue;
    if(open(x+1,y)){ g.moveTo((x+1)*T,y*T+1); g.lineTo((x+1)*T,(y+1)*T-1); }
    if(open(x-1,y)){ g.moveTo(x*T,y*T+1); g.lineTo(x*T,(y+1)*T-1); }
    if(open(x,y+1)){ g.moveTo(x*T+1,(y+1)*T); g.lineTo((x+1)*T-1,(y+1)*T); }
    if(open(x,y-1)){ g.moveTo(x*T+1,y*T); g.lineTo((x+1)*T-1,y*T); }
  }
  g.stroke(); g.restore();
  // vignette
  const v = g.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*.35,cw/2,ch/2,Math.max(cw,ch)*.75);
  v.addColorStop(0,'rgba(7,31,33,0)'); v.addColorStop(1,'rgba(7,31,33,.35)');
  g.fillStyle = v; g.fillRect(0,0,cw,ch);
}

const easeOutBack = t => { const c1=1.7, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };

/* =====================================================================
   Movement + AI
   ===================================================================== */
const mk = (tx,ty) => ({tx,ty,nx:null,ny:null,p:0,dir:{x:0,y:0}});
const posOf = e => e.nx===null ? {x:e.tx,y:e.ty} : {x:e.tx+(e.nx-e.tx)*e.p, y:e.ty+(e.ny-e.ty)*e.p};
function advance(e, dist, choose){
  let guard = 0;
  while(dist > 1e-6 && guard++ < 8){
    if(e.nx === null){
      const d = choose(e); if(!d) return;
      e.dir = d; e.nx = e.tx+d.x; e.ny = e.ty+d.y; e.p = 0;
    }
    const mv = Math.min(1-e.p, dist); e.p += mv; dist -= mv;
    if(e.p >= 1-1e-9){ e.tx=e.nx; e.ty=e.ny; e.nx=null; e.ny=null; e.p=0; }
  }
}
function bfs(sx,sy){
  const d = new Int16Array(W*H).fill(999), q=[[sx,sy]]; d[sy*W+sx]=0;
  for(let i=0;i<q.length;i++){
    const [x,y]=q[i];
    for(const k of DIRS){ const nx=x+k.x, ny=y+k.y;
      if(open(nx,ny) && d[ny*W+nx]===999){ d[ny*W+nx]=d[y*W+x]+1; q.push([nx,ny]); } }
  }
  return d;
}

/* =====================================================================
   Game state
   ===================================================================== */
let state = 'title';   // title | countdown | play | hit | quiz | reveal | ready | won
let apple, doctors = [], order = [], nextIdx = 0, distMap, lastKey = '', want = null;
let particles = [], floaters = [], trail = [];
let cdT = 0, goT = 99, hitT = 0, readyT = 0, revealT = 0, shake = 0, animT = 0, appleAng = 0;
let chaseTime = 0, caughtN = 0, rightN = 0, catchPts = 0, quizPts = 0, speedPts = 0, shownScore = 0;
let curDoc = null, quiz = null, pipEls = [];
let finalTotals = null;

const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const liveScore = () => catchPts + quizPts + speedPts;

function buildPips(){
  pipsEl.innerHTML = ''; pipEls = [];
  order.forEach(si => { const p = document.createElement('div'); p.className='pip'; p.style.setProperty('--c', SUBJECTS[si].color); pipsEl.appendChild(p); pipEls.push(p); });
}

function spawnDoctor(){
  if(nextIdx >= TOTAL) return;
  const pi = nextIdx++, si = order[pi];
  let best = null, bd = -1;
  for(const s of SPAWNS){
    if(doctors.some(d => d.alive && d.tx===s[0] && d.ty===s[1])) continue;
    const dd = distMap[s[1]*W+s[0]]; if(dd>bd){ bd=dd; best=s; }
  }
  if(!best) best = SPAWNS[0];
  const e = mk(best[0],best[1]); e.alive = true; e.sub = si; e.pi = pi; e.jit = (Math.random()-.5)*.3; e.inv = .9; e.age = 0;
  doctors.push(e); pipEls[pi].classList.add('cur');
}

function reset(){
  apple = mk(9,15); want = null; lastKey = '';
  particles = []; floaters = []; trail = []; doctors = [];
  chaseTime = 0; caughtN = 0; rightN = 0; catchPts = quizPts = speedPts = 0; shownScore = 0; shake = 0; appleAng = 0; goT = 99;
  order = shuffle(SUBJECTS.map((_,i)=>i)); nextIdx = 0;
  distMap = bfs(apple.tx, apple.ty);
  buildPips();
  for(let i=0;i<ACTIVE_MAX;i++) spawnDoctor();
  clockEl.textContent = '0.00'; scoreEl.textContent = '0';
}

function startGame(){
  try{ localStorage.setItem(NAME_KEY, nameEl.value.trim()); }catch(e){}
  titleScr.classList.remove('on'); resultScr.classList.remove('on'); mcqScr.classList.remove('on');
  reset(); state = 'countdown'; cdT = 0; lastCd = 4;
  tone(1,.01,'sine',.001);
}

/* =====================================================================
   Input
   ===================================================================== */
const KEYS = {ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
const VEC = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
function steer(name){
  const v = VEC[name]; if(!v || !apple) return;
  want = v;
  if(apple.nx!==null && v.x===-apple.dir.x && v.y===-apple.dir.y){      // instant U-turn
    [apple.tx,apple.nx]=[apple.nx,apple.tx]; [apple.ty,apple.ny]=[apple.ny,apple.ty];
    apple.p = 1-apple.p; apple.dir = v;
  }
}
window.addEventListener('keydown', e => {
  if(e.code==='Escape' && !exitBtn.hidden){ e.preventDefault(); exitBtn.click(); return; }
  if(state==='quiz' && quiz && !quiz.locked){
    const m = {Digit1:0,Digit2:1,Digit3:2,Digit4:3,KeyA:0,KeyB:1,KeyC:2,KeyD:3}[e.code];
    if(m!==undefined){ e.preventDefault(); answer(m); return; }
  }
  if(state==='reveal' && (e.code==='Enter'||e.code==='Space')){ e.preventDefault(); proceed(); return; }
  const k = KEYS[e.code];
  if(k && (state==='play'||state==='countdown'||state==='ready')){ e.preventDefault(); steer(k); return; }
  if((e.code==='Enter'||e.code==='Space') && document.activeElement!==nameEl && document.activeElement.tagName!=='BUTTON'){
    if(titleScr.classList.contains('on')||resultScr.classList.contains('on')){ e.preventDefault(); startGame(); }
  }
  if(e.code==='Enter' && document.activeElement===nameEl) startGame();
});
let sw = null;
canvas.addEventListener('pointerdown', e => { sw = {x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if(!sw) return;
  const dx=e.clientX-sw.x, dy=e.clientY-sw.y;
  if(Math.max(Math.abs(dx),Math.abs(dy)) > 14){
    steer(Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up'));
    sw = {x:e.clientX,y:e.clientY};
  }
});
['pointerup','pointercancel'].forEach(t => canvas.addEventListener(t, () => sw=null));
document.querySelectorAll('#pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); steer(b.dataset.d); }));
$('go').onclick = startGame;
$('again').onclick = startGame;
$('mcqNext').onclick = () => proceed();
$('share').onclick = shareCard;

/* =====================================================================
   Challenge links + "Beat my time" share card
   ===================================================================== */
const BASE_URL = location.origin + location.pathname;
const challenge = (() => {
  const q = new URLSearchParams(location.search), t = parseFloat(q.get('beat'));
  if(!(t > 0 && t < 10000)) return null;
  return { time: t, by: (q.get('by') || 'A friend').replace(/[\u0000-\u001f<>]/g,'').slice(0,14) };
})();
const challengeURL = f => `${BASE_URL}?beat=${f.time.toFixed(1)}&by=${encodeURIComponent(f.name)}`;
if(challenge){
  $('challenge').hidden = false;
  $('chBy').textContent = challenge.by; $('chTime').textContent = challenge.time.toFixed(1) + 's';
}
function beatLine(f){
  if(!challenge) return '';
  const d = challenge.time - f.time;
  return d > 0 ? `You beat ${challenge.by} by ${d.toFixed(1)}s` : `${challenge.by} is still ${(-d).toFixed(1)}s ahead. Chase again.`;
}

const qrImg = new Image(); qrImg.src = 'qr.svg';
function wrapText(g, text, x, y, maxW, lh){
  let line = '';
  for(const w of text.split(' ')){
    const t = line ? line + ' ' + w : w;
    if(g.measureText(t).width > maxW && line){ g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
}
function ecgLine(g, x0, x1, y, amp){
  const gauss = (x,m,s,a) => a*Math.exp(-((x-m)*(x-m))/(2*s*s));
  g.beginPath();
  for(let x = x0; x <= x1; x += 2){
    const f = ((x - x0) / 260) % 1;
    const v = gauss(f,.12,.03,.14)+gauss(f,.215,.008,-.25)+gauss(f,.24,.011,1)+gauss(f,.268,.01,-.35)+gauss(f,.45,.05,.28);
    x === x0 ? g.moveTo(x, y - v*amp) : g.lineTo(x, y - v*amp);
  }
  g.stroke();
}
async function drawCard(f){
  try{ await Promise.all(['400 100px Bungee','800 40px Figtree','600 30px Figtree'].map(x => document.fonts.load(x))); }catch(e){}
  if(!qrImg.complete) await new Promise(r => { qrImg.onload = qrImg.onerror = r; });
  const Wc = 1080, Hc = 1350, cv = document.createElement('canvas'); cv.width = Wc; cv.height = Hc;
  const g = cv.getContext('2d');
  const bgr = g.createRadialGradient(Wc/2, 0, 60, Wc/2, 300, 1300);
  bgr.addColorStop(0,'#14585a'); bgr.addColorStop(.45,'#0f3f42'); bgr.addColorStop(1,'#082a2c');
  g.fillStyle = bgr; g.fillRect(0,0,Wc,Hc);

  // wordmark + ECG
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '400 128px Bungee, Impact, sans-serif';
  const wa = g.measureText('RUNDOC').width, wb = g.measureText('RUN').width, wx = (Wc - wa - wb)/2;
  g.textAlign = 'left';
  g.fillStyle = '#f4faf7'; g.fillText('RUNDOC', wx, 170);
  g.fillStyle = '#e5383b'; g.fillText('RUN', wx + wa, 170);
  g.save(); g.strokeStyle = '#7cf5c8'; g.lineWidth = 5; g.lineJoin = 'round'; g.shadowColor = '#7cf5c8'; g.shadowBlur = 18;
  ecgLine(g, 60, Wc-60, 262, 70); g.restore();

  // triage-tag card
  const cx = 64, cy = 312, cw_ = Wc - 128, ch_ = 984;
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
  g.fillStyle = '#f4faf7'; rrect(g, cx, cy, cw_, ch_, 48); g.fill(); g.restore();
  g.save(); rrect(g, cx, cy, cw_, ch_, 48); g.clip();
  g.fillStyle = '#e5383b'; g.fillRect(cx, cy, cw_, 96); g.restore();
  g.fillStyle = 'rgba(7,31,33,.9)'; rrect(g, Wc/2 - 50, cy - 1, 100, 32, 16); g.fill();
  g.fillStyle = '#fff'; g.font = '800 34px Figtree, system-ui, sans-serif';
  g.textAlign = 'left'; g.fillText('Code red: doctor hunt', cx + 40, cy + 64);
  g.textAlign = 'right'; g.fillText(f.name, cx + cw_ - 40, cy + 64);

  g.textAlign = 'center';
  g.fillStyle = '#0f3f42'; g.font = '400 64px Bungee, Impact, sans-serif'; g.fillText('BEAT MY TIME', Wc/2, cy + 196);
  g.fillStyle = '#e5383b'; g.font = '400 210px Bungee, Impact, sans-serif'; g.fillText(f.time.toFixed(1) + 's', Wc/2, cy + 400);
  g.fillStyle = '#071f21'; g.font = '800 42px Figtree, system-ui, sans-serif';
  g.fillText(`${f.rank} · ${f.total} pts · ${f.right}/${TOTAL} right`, Wc/2, cy + 470);

  // chase scene
  const sx = cx + 40, sy = cy + 510, sw_ = cw_ - 80, sh = 190;
  g.fillStyle = '#d9efe6'; rrect(g, sx, sy, sw_, sh, 28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 4; g.lineCap = 'round';
  for(let x = sx + 40; x < sx + sw_; x += 64) for(const y of [sy + 34, sy + sh - 34]){
    g.beginPath(); g.moveTo(x-8,y); g.lineTo(x+8,y); g.moveTo(x,y-8); g.lineTo(x,y+8); g.stroke();
  }
  const mid = sy + sh/2 + 8, T2 = 128;
  [[.46,2],[.66,5],[.86,0]].forEach(([fx_, si], i) => { const s = SUBJECTS[si]; drawDoctor(g, T2, sx + sw_*fx_, mid, s.color, s.icon, 0, i, {x:1,y:0}); });
  drawApple(g, T2, sx + sw_*.18, mid, 0, .2, 0);

  // QR + call to action
  const qy = cy + 740, qs = 196;
  if(qrImg.naturalWidth){ g.fillStyle = '#fff'; rrect(g, sx, qy, qs, qs, 18); g.fill(); g.drawImage(qrImg, sx + 8, qy + 8, qs - 16, qs - 16); }
  const tx = qrImg.naturalWidth ? sx + qs + 36 : sx;
  g.textAlign = 'left'; g.fillStyle = '#0f3f42'; g.font = '400 50px Bungee, Impact, sans-serif'; g.fillText('Scan to play', tx, qy + 58);
  g.fillStyle = '#071f21'; g.font = '600 31px Figtree, system-ui, sans-serif';
  wrapText(g, 'You are the apple. Catch ten doctors, answer their questions, beat my time.', tx, qy + 106, cx + cw_ - 40 - tx, 40);

  // barcode
  g.fillStyle = 'rgba(7,31,33,.8)';
  for(let x = cx + 40, i = 0; x < cx + cw_ - 40; i++){ const w = [2,1,3,2,1][i%5]; g.fillRect(x, cy + ch_ - 44, w, 26); x += w + [2,4,1,3,2][i%5]; }

  g.textAlign = 'center'; g.fillStyle = 'rgba(244,250,247,.85)'; g.font = '700 30px Figtree, system-ui, sans-serif';
  g.fillText('Play at ' + GAME_URL + ' · Developed by Medinn', Wc/2, Hc - 18);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
async function shareCard(){
  const f = finalTotals; if(!f) return;
  const btn = $('share'), label = btn.textContent;
  const url = challengeURL(f);
  const txt = `I caught all ${TOTAL} doctors in ${f.time.toFixed(1)}s on RundocRun (${f.total} pts, ${f.right}/${TOTAL} right). Beat my time:`;
  btn.textContent = 'Making your card…';
  try{
    const blob = await drawCard(f);
    const file = new File([blob], 'rundocrun-beat-my-time.png', {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'RundocRun', text:`${txt} ${url}`});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      try{ await navigator.clipboard.writeText(`${txt} ${url}`); }catch(e){}
      btn.textContent = 'Card saved. Link copied.';
      setTimeout(() => btn.textContent = label, 2600);
      return;
    }
  }catch(e){}
  btn.textContent = label;
}

/* =====================================================================
   Chase logic
   ===================================================================== */
function appleChoose(e){
  if(want && open(e.tx+want.x,e.ty+want.y)) return want;
  const d = e.dir;
  if((d.x||d.y) && open(e.tx+d.x,e.ty+d.y)) return d;
  return null;
}
function docChoose(e){
  const opts = DIRS.filter(d => open(e.tx+d.x,e.ty+d.y));
  let c = opts.filter(d => !(d.x===-e.dir.x && d.y===-e.dir.y && (e.dir.x||e.dir.y)));
  if(!c.length) c = opts;
  let best=null, bs=-1e9;
  for(const d of c){
    const nx=e.tx+d.x, ny=e.ty+d.y, dist=distMap[ny*W+nx];
    const s = dist + exitsAt(nx,ny)*.9 + Math.random()*(dist<5 ? .8 : 2.4);
    if(s>bs){ bs=s; best=d; }
  }
  return best;
}

let lastCd = 4;
function step(h){
  if(state==='countdown'){
    cdT += h; const n = 3-Math.floor(cdT/.7);
    if(n!==lastCd && n>=1){ lastCd=n; sfx.tick(); }
    if(cdT >= 2.1){ state='play'; goT = 0; sfx.go(); }
  } else if(state==='ready'){
    readyT -= h; if(readyT<=0){ state='play'; goT = 0; }
  } else if(state==='hit'){
    hitT -= h; if(hitT<=0) openQuiz();
  } else if(state==='quiz'){
    if(quiz && !quiz.locked){ quiz.left -= h; if(quiz.left<=0) answer(-1); }
  } else if(state==='reveal'){
    revealT -= h; if(revealT<=0) proceed();
  } else if(state==='play'){
    chaseTime += h;
    advance(apple, APPLE_SPEED*h, appleChoose);
    const key = apple.tx+','+apple.ty;
    if(key!==lastKey){ lastKey=key; distMap = bfs(apple.tx,apple.ty); }
    const ap = posOf(apple), speed = DOC_BASE + DOC_STEP*caughtN;
    for(const d of doctors){
      if(!d.alive) continue;
      d.age += h; if(d.inv>0) d.inv -= h;
      advance(d, (speed + d.jit)*h, docChoose);
      if(d.inv<=0){
        const dp = posOf(d);
        if(Math.hypot(dp.x-ap.x, dp.y-ap.y) < .72){ catchDoctor(d, dp); return; }
      }
    }
  }
}

function burst(x,y,color,n=18){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, s = 2+Math.random()*4.5;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color:i%3?color:'#ffffff',rot:Math.random()*6,type:i%2});
  }
}
function catchDoctor(d, dp){
  d.alive = false; curDoc = d; caughtN++; catchPts += CATCH_PTS;
  burst(dp.x+.5, dp.y+.5, SUBJECTS[d.sub].color);
  floaters.push({x:dp.x+.5,y:dp.y+.5,text:'+'+CATCH_PTS,life:1});
  if(!reduceMotion) shake = 7;
  sfx.catch(); hitT = .16; state = 'hit';
}

/* =====================================================================
   MCQ
   ===================================================================== */
function openQuiz(){
  const sub = SUBJECTS[curDoc.sub], pool = window.QUESTIONS[sub.k];
  const q = pool[Math.floor(Math.random()*pool.length)];
  const idx = shuffle([0,1,2,3]);
  quiz = {q, sub, opts: idx.map(i=>q.o[i]), correct: idx.indexOf(q.a), left: Q_TIME, locked:false};
  $('mcqCount').textContent = `Question ${caughtN} of ${TOTAL}`;
  $('mcqSub').textContent = sub.label;
  $('mcqWho').textContent = `${sub.doc} has a question`;
  $('mcqQ').textContent = q.q;
  $('mcqFb').innerHTML = ''; $('mcqNext').style.display = 'none';
  const wrap = $('mcqOpts'); wrap.innerHTML = '';
  quiz.opts.forEach((txt,i) => {
    const b = document.createElement('button'); b.className='opt'; b.type='button';
    const k = document.createElement('span'); k.className='k'; k.textContent = 'ABCD'[i];
    const t = document.createElement('span'); t.textContent = txt;
    b.append(k,t); b.onclick = () => answer(i); wrap.appendChild(b);
  });
  // avatar
  actx.setTransform(1,0,0,1,0,0); actx.clearRect(0,0,112,112);
  drawDoctor(actx, 100, 56, 60, sub.color, sub.icon, 0, 0, {x:0,y:0}, 1, 1);
  mcqScr.classList.add('on');
  updateQuizHud(); state = 'quiz';
}
function updateQuizHud(){
  if(!quiz) return;
  const f = Math.max(0, quiz.left/Q_TIME), bar = $('mcqBar');
  bar.style.transform = `scaleX(${f})`; bar.classList.toggle('low', f<.3);
  $('mcqSecs').textContent = Math.ceil(Math.max(0,quiz.left)) + 's';
}
function answer(i){
  if(!quiz || quiz.locked) return;
  quiz.locked = true;
  const ok = i === quiz.correct, btns = [...$('mcqOpts').children];
  btns.forEach((b,j) => { b.disabled = true; if(j===quiz.correct) b.classList.add('right'); else if(j===i) b.classList.add('wrong'); else b.classList.add('dim'); });
  const fb = $('mcqFb'); fb.innerHTML = '';
  const pts = document.createElement('span'), why = document.createElement('span');
  why.textContent = quiz.q.w || '';
  if(ok){
    const sp = Math.round(SPEED_MAX * Math.max(0,quiz.left)/Q_TIME);
    rightN++; quizPts += RIGHT_PTS; speedPts += sp;
    pts.className='pts good'; pts.textContent = `+${RIGHT_PTS} right` + (sp ? `, +${sp} speed` : '');
    floaters.push({x:curDoc.tx+.5, y:curDoc.ty-.2, text:'+'+(RIGHT_PTS+sp), life:1.3});
    pipEls[curDoc.pi].classList.add('ok'); sfx.right(); revealT = 1.2;
  } else {
    chaseTime += PENALTY;
    pts.className='pts bad'; pts.textContent = i<0 ? `Time up. +${PENALTY}s on the clock` : `Not quite. +${PENALTY}s on the clock`;
    pipEls[curDoc.pi].classList.add('bad'); sfx.wrong(); revealT = 2.4;
    clockEl.classList.remove('pen'); void clockEl.offsetWidth; clockEl.classList.add('pen');
  }
  pipEls[curDoc.pi].classList.remove('cur');
  fb.append(pts, why);
  $('mcqNext').style.display = 'block';
  state = 'reveal';
}
function proceed(){
  if(state!=='reveal') return;
  mcqScr.classList.remove('on');
  doctors = doctors.filter(d => d.alive);
  if(caughtN >= TOTAL){ win(); return; }
  if(nextIdx < TOTAL){ spawnDoctor(); sfx.spawn(); }
  state = 'ready'; readyT = .7;
}

/* =====================================================================
   Win
   ===================================================================== */
function win(){
  state = 'won';
  const timeBonus = Math.max(0, TIME_BASE - Math.round(chaseTime*TIME_RATE));
  const total = liveScore() + timeBonus;
  const rank = RANKS.find(r => total >= r[0])[1];
  finalTotals = {total, rank, right: rightN, time: chaseTime, timeBonus, name: nameEl.value.trim() || 'Apple'};
  sfx.win();
  if(!reduceMotion) for(let i=0;i<5;i++) setTimeout(()=>burst(3+Math.random()*(W-6), 3+Math.random()*(H-6), SUBJECTS[Math.floor(Math.random()*TOTAL)].color, 22), i*140);
  const lb = loadLB();
  const entry = {id:Date.now()+'-'+Math.random().toString(36).slice(2,6), name:(nameEl.value.trim()||'Apple'), score:total, right:rightN, time:chaseTime};
  lb.push(entry); lb.sort((a,b)=>b.score-a.score || a.time-b.time); saveLB(lb.slice(0,25));
  const sent = submitScore(entry);
  setTimeout(async () => {
    $('rWho').textContent = entry.name; $('rRank').textContent = rank;
    $('rTotal').innerHTML = `${total}<small>pts</small>`;
    $('rCatch').textContent = catchPts;
    $('rRightL').textContent = `Answers right (${rightN}/${TOTAL})`; $('rRight').textContent = quizPts;
    $('rSpeed').textContent = speedPts;
    $('rTimeL').textContent = `Time bonus (${chaseTime.toFixed(1)}s)`; $('rTime').textContent = timeBonus;
    $('rSum').textContent = total;
    $('rBeat').textContent = beatLine(finalTotals); $('rBeat').hidden = !challenge;
    renderLB($('lb2'), entry.id);
    resultScr.classList.add('on');
    const sharedId = await sent;
    renderLB($('lb2'), sharedId || entry.id);
  }, 1000);
}

/* =====================================================================
   ECG monitor
   ===================================================================== */
let ecgW = 140, ecgH = 40, ecgBuf = [], ecgPhase = 0, ecgAcc = 0, bpm = 72, bpmT = 72;
function sizeECG(){
  const r = ecgCv.getBoundingClientRect(); ecgW = Math.max(60, Math.floor(r.width)); ecgH = Math.max(30, Math.floor(r.height));
  sizeCanvas(ecgCv, ecgW, ecgH); ecgBuf = new Array(ecgW).fill(0);
}
const gauss = (x,m,s,a) => a*Math.exp(-((x-m)*(x-m))/(2*s*s));
const beat = f => gauss(f,.12,.03,.14)+gauss(f,.215,.008,-.25)+gauss(f,.24,.011,1)+gauss(f,.268,.01,-.35)+gauss(f,.45,.05,.28);
function drawECG(dt){
  bpm += (bpmT-bpm)*Math.min(1,dt*3);
  const pxps = 70; ecgAcc += dt*pxps; const n = Math.floor(ecgAcc); ecgAcc -= n;
  for(let i=0;i<n;i++){ ecgPhase = (ecgPhase + (bpm/60)/pxps) % 1; ecgBuf.push(beat(ecgPhase)); ecgBuf.shift(); }
  ex.setTransform(dpr,0,0,dpr,0,0); ex.clearRect(0,0,ecgW,ecgH);
  ex.strokeStyle = '#7cf5c8'; ex.lineWidth = 1.8; ex.lineJoin = 'round'; ex.shadowColor = '#7cf5c8'; ex.shadowBlur = 7;
  ex.beginPath();
  for(let i=0;i<ecgBuf.length;i++){ const y = ecgH*.66 - ecgBuf[i]*ecgH*.52; i ? ex.lineTo(i,y) : ex.moveTo(i,y); }
  ex.stroke(); ex.shadowBlur = 0;
  ex.fillStyle = 'rgba(124,245,200,.95)'; ex.font = '800 11px Figtree, system-ui, sans-serif'; ex.textAlign = 'right';
  ex.fillText('♥ ' + Math.round(bpm), ecgW-2, 11);
}

/* =====================================================================
   Per-frame effects
   ===================================================================== */
function fx(dt){
  animT += dt;
  // apple facing + trail
  if(apple && (apple.dir.x||apple.dir.y)){
    const target = Math.atan2(apple.dir.y, apple.dir.x);
    let diff = target - appleAng; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI;
    appleAng += diff*Math.min(1,dt*20);
  }
  if(apple){
    const p = posOf(apple);
    if(state==='play' && apple.nx!==null){ trail.push({x:p.x,y:p.y,a:.5}); if(trail.length>7) trail.shift(); }
    trail.forEach(t => t.a -= dt*2.2); trail = trail.filter(t => t.a>0);
  }
  // particles / floaters / shake
  particles.forEach(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=Math.pow(.03,dt); p.vy*=Math.pow(.03,dt); p.life-=dt*1.4; p.rot+=dt*7; });
  particles = particles.filter(p => p.life>0);
  floaters.forEach(f => { f.y -= dt*.9; f.life -= dt; });
  floaters = floaters.filter(f => f.life>0);
  shake = Math.max(0, shake - dt*30);
  goT += dt;
  // heart rate follows the nearest doctor
  if(state==='play' && distMap){
    let m = 99; for(const d of doctors){ if(d.alive) m = Math.min(m, distMap[d.ty*W+d.tx]); }
    bpmT = 72 + 98*Math.max(0,Math.min(1,(9-m)/8));
  } else if(state==='quiz' || state==='reveal') bpmT = 105; else bpmT = 72;
  drawECG(dt);
  // HUD
  clockEl.textContent = chaseTime.toFixed(2);
  shownScore += (liveScore()-shownScore)*Math.min(1,dt*9);
  if(Math.abs(liveScore()-shownScore) < .5) shownScore = liveScore();
  scoreEl.textContent = Math.round(shownScore);
  if(state==='quiz') updateQuizHud();
  const inRun = state!=='title' && state!=='won';
  if(exitBtn.hidden === inRun){ exitBtn.hidden = !inRun; if(!inRun) disarmExit(); }
}

/* =====================================================================
   Render
   ===================================================================== */
function bigText(txt,x,y,size,alpha){
  ctx.save(); ctx.globalAlpha = Math.max(0,alpha); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font = `${Math.round(size)}px Bungee, Impact, sans-serif`;
  ctx.lineWidth = size*.14; ctx.lineJoin='round'; ctx.strokeStyle='#0f3f42'; ctx.strokeText(txt,x,y);
  ctx.fillStyle='#e5383b'; ctx.fillText(txt,x,y); ctx.restore();
}
function render(now){
  const t = now/1000;
  const sx = shake ? (Math.random()-.5)*shake : 0, sy = shake ? (Math.random()-.5)*shake : 0;
  ctx.setTransform(dpr,0,0,dpr,sx*dpr,sy*dpr);
  ctx.fillStyle = '#0a2a2c'; ctx.fillRect(-20,-20,cw+40,ch+40);
  ctx.drawImage(bg,0,0,cw,ch);
  if(!apple) return;

  for(const d of doctors){
    if(!d.alive) continue;
    const p = posOf(d), s = SUBJECTS[d.sub];
    const sc = easeOutBack(Math.min(1, d.age/.4));
    const alpha = d.inv>0 && Math.floor(now/90)%2 ? .55 : 1;
    drawDoctor(ctx,T,(p.x+.5)*T,(p.y+.5)*T,s.color,s.icon,t,d.pi,d.dir,Math.max(.01,sc),alpha);
  }
  // apple trail + apple
  for(const tr of trail){ ctx.globalAlpha = Math.max(0,tr.a*.45); ctx.fillStyle='#e5383b'; ctx.beginPath(); ctx.arc((tr.x+.5)*T,(tr.y+.5)*T,T*.3*tr.a+T*.1,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const ap = posOf(apple), moving = state==='play' && apple.nx!==null;
  const open_ = moving ? .06 + .27*Math.abs(Math.sin(animT*15)) : .09;
  const squash = moving ? 1 + .04*Math.sin(animT*30) : 1;
  drawApple(ctx,T,(ap.x+.5)*T,(ap.y+.5)*T,appleAng,open_,t,squash);

  for(const p of particles){
    ctx.save(); ctx.globalAlpha=Math.max(0,p.life); ctx.translate((p.x)*T,(p.y)*T); ctx.rotate(p.rot); ctx.fillStyle=p.color;
    const s=T*.13; if(p.type){ ctx.fillRect(-s,-s/3,s*2,s*.66); ctx.fillRect(-s/3,-s,s*.66,s*2); } else { ctx.beginPath(); ctx.arc(0,0,s*.7,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font = `800 ${Math.round(T*.62)}px Figtree, system-ui, sans-serif`;
  for(const f of floaters){
    ctx.globalAlpha = Math.min(1,f.life*1.6);
    const x = Math.min(cw-T*1.5, Math.max(T*1.5, (f.x)*T)), y = f.y*T;
    ctx.lineWidth = T*.2; ctx.strokeStyle='#0f3f42'; ctx.lineJoin='round'; ctx.strokeText(f.text,x,y);
    ctx.fillStyle='#ffd166'; ctx.fillText(f.text,x,y); ctx.globalAlpha=1;
  }
  if(state==='countdown'){
    const el = cdT/.7, n = 3-Math.floor(el), fr = el-Math.floor(el);
    if(n>=1) bigText(String(n), cw/2, ch/2, T*(5.8 - fr*1.4), 1-fr*.5);
  } else if(state==='ready'){
    bigText('Ready', cw/2, ch/2, T*2.6, Math.min(1,readyT*3));
  } else if(state==='play' && goT<.6){
    bigText('GO', cw/2, ch/2, T*(4.2+goT*2.2), 1-goT/.6);
  }
}
function renderHero(now){
  const w = heroCv.width/dpr, h = heroCv.height/dpr; if(!w) return;
  const t = now/1000;
  hctx.setTransform(dpr,0,0,dpr,0,0);
  hctx.fillStyle = '#d9efe6'; hctx.fillRect(0,0,w,h);
  hctx.strokeStyle='rgba(255,255,255,.95)'; hctx.lineWidth=2; hctx.lineCap='round';
  const gap = 34, off = (t*70) % gap;
  for(let x=-gap; x<w+gap; x+=gap){ const cx = x - off, cy1 = h*.2, cy2 = h*.8;
    for(const cy of [cy1,cy2]){ hctx.beginPath(); hctx.moveTo(cx-4,cy); hctx.lineTo(cx+4,cy); hctx.moveTo(cx,cy-4); hctx.lineTo(cx,cy+4); hctx.stroke(); } }
  const TT = 62, cy = h*.54, lunge = Math.sin(t*2.2)*10;
  const cast = [[.56,3],[.74,6],[.92,1]];
  cast.forEach(([fx_,si],i) => { const s = SUBJECTS[si]; drawDoctor(hctx,TT,w*fx_ + Math.sin(t*2.2+i)*6,cy,s.color,s.icon,t,i,{x:1,y:0},1,1); });
  drawApple(hctx,TT,w*.26+lunge,cy,0,.06+.27*Math.abs(Math.sin(t*15)),t,1);
}

/* =====================================================================
   Main loop
   ===================================================================== */
let last = performance.now();
function frame(now){
  let dt = Math.min(.05,(now-last)/1000); last = now;
  const n = Math.max(1,Math.ceil(dt/(1/90))), h = dt/n;
  if(apple) for(let i=0;i<n;i++) step(h);
  fx(dt);
  render(now);
  if(titleScr.classList.contains('on') && !reduceMotion) renderHero(now);
  requestAnimationFrame(frame);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize,200));
document.addEventListener('visibilitychange', () => { last = performance.now(); });

if(/[?&]debug\b/.test(location.search)) window.__g = { drawCard, get state(){return state}, get apple(){return apple}, get docs(){return doctors}, open, W, H, steer };
resize(); reset(); state = 'title'; renderLB($('lb1'));
fetchLB().then(() => renderLB($('lb1')));
setInterval(() => { if(titleScr.classList.contains('on')) fetchLB().then(() => renderLB($('lb1'))); }, 15000);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
requestAnimationFrame(frame);
})();
