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

const SUBJECTS = [
  {k:'anatomy',  label:'Anatomy',            doc:'Dr. Bones',    color:'#f97316', icon:'🦴'},
  {k:'biochem',  label:'Biochemistry',       doc:'Dr. Enzyme',   color:'#eab308', icon:'🧪'},
  {k:'physio',   label:'Physiology',         doc:'Dr. Pulse',    color:'#3b82f6', icon:'🫀'},
  {k:'patho',    label:'Pathology',          doc:'Dr. Slide',    color:'#8b5cf6', icon:'🔬'},
  {k:'micro',    label:'Microbiology',       doc:'Dr. Culture',  color:'#22c55e', icon:'🦠'},
  {k:'pharma',   label:'Pharmacology',       doc:'Dr. Dose',     color:'#ec4899', icon:'💊'},
  {k:'spm',      label:'Community Medicine', doc:'Dr. Outbreak', color:'#06b6d4', icon:'🌍'},
  {k:'forensic', label:'Forensic Medicine',  doc:'Dr. Autopsy',  color:'#475569', icon:'🔍'},
  {k:'ent',      label:'ENT',                doc:'Dr. Otoscope', color:'#b45309', icon:'👂'},
  {k:'ophthal',  label:'Ophthalmology',      doc:'Dr. Retina',   color:'#84cc16', icon:'👁️'},
];
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

function renderLB(el, meId){
  el.innerHTML = '';
  const lb = loadLB().slice(0,8);
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

/* =====================================================================
   Sprites (size-agnostic: take a context and a tile size)
   ===================================================================== */
function drawApple(g,T,cx,cy,ang,open,t,sc=1){
  const r = T*.44*sc, mouth = open*Math.PI;
  g.save(); g.translate(cx,cy);
  g.fillStyle = '#e5383b'; g.strokeStyle = '#7a1013'; g.lineWidth = Math.max(1.5,T*.06); g.lineJoin='round';
  g.beginPath(); g.moveTo(0,0); g.arc(0,0,r,ang+mouth,ang+Math.PI*2-mouth); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.ellipse(-r*.42,-r*.42,r*.15,r*.26,-.7,0,Math.PI*2); g.fill();
  g.strokeStyle = '#5b3a1c'; g.lineWidth = Math.max(2,T*.08); g.lineCap='round';
  g.beginPath(); g.moveTo(0,-r*.9); g.quadraticCurveTo(r*.05,-r*1.2,r*.18,-r*1.3); g.stroke();
  g.fillStyle = '#2f9e5b'; g.strokeStyle='#17592f'; g.lineWidth=Math.max(1,T*.04);
  const sway = Math.sin(t*6)*r*.06;
  g.beginPath(); g.moveTo(r*.12,-r*1.08); g.quadraticCurveTo(r*.5,-r*1.5+sway,r*.85,-r*1.1); g.quadraticCurveTo(r*.5,-r*.9,r*.12,-r*1.08); g.fill(); g.stroke();
  const ex_ = Math.cos(ang-1.15)*r*.5, ey_ = Math.sin(ang-1.15)*r*.5;
  g.fillStyle='#fff'; g.beginPath(); g.arc(ex_,ey_,r*.2,0,Math.PI*2); g.fill();
  g.fillStyle='#111'; g.beginPath(); g.arc(ex_+Math.cos(ang)*r*.06,ey_+Math.sin(ang)*r*.06,r*.1,0,Math.PI*2); g.fill();
  g.restore();
}
function rrect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function drawDoctor(g,T,cx,cy,color,icon,t,i,dir,sc=1,alpha=1){
  const r = T*.44*sc, wob = Math.sin(t*13+i*2);
  g.save(); g.globalAlpha = alpha; g.translate(cx, cy + wob*T*.02);
  g.lineWidth = Math.max(1.5,T*.055); g.strokeStyle = '#0f3f42'; g.lineJoin='round';
  g.fillStyle = '#334155';
  g.beginPath(); g.ellipse(-r*.38, r*.98 + wob*r*.07, r*.28, r*.15, 0,0,Math.PI*2); g.fill();
  g.beginPath(); g.ellipse( r*.38, r*.98 - wob*r*.07, r*.28, r*.15, 0,0,Math.PI*2); g.fill();
  g.fillStyle = '#fbfdfc'; rrect(g,-r*.85,-r*.15,r*1.7,r*1.1,r*.42); g.fill(); g.stroke();
  g.lineWidth=Math.max(1,T*.035); g.beginPath(); g.moveTo(0,-r*.12); g.lineTo(0,r*.9); g.stroke();
  g.strokeStyle = '#1e293b'; g.lineWidth = Math.max(1.5,T*.05);
  g.beginPath(); g.arc(0,-r*.05,r*.45,.2*Math.PI,.8*Math.PI); g.stroke();
  g.fillStyle='#94a3b8'; g.beginPath(); g.arc(r*.3,r*.5,T*.055,0,Math.PI*2); g.fill(); g.stroke();
  g.strokeStyle='#0f3f42'; g.lineWidth = Math.max(1.5,T*.055);
  g.fillStyle = '#fcd9b6'; g.beginPath(); g.arc(0,-r*.45,r*.55,0,Math.PI*2); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(0,-r*.55,r*.58,Math.PI,0); g.closePath(); g.fill(); g.stroke();
  if(icon){ g.font = `${Math.round(T*.26)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#fff'; g.fillText(icon,0,-r*.86); }
  const lx = dir.x*r*.05, ly = dir.y*r*.05;
  g.fillStyle='#fff'; g.beginPath(); g.arc(-r*.22,-r*.38,r*.17,0,Math.PI*2); g.arc(r*.22,-r*.38,r*.17,0,Math.PI*2); g.fill();
  g.fillStyle='#111'; g.beginPath(); g.arc(-r*.22+lx,-r*.38+ly,r*.08,0,Math.PI*2); g.arc(r*.22+lx,-r*.38+ly,r*.08,0,Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(0,-r*.1,r*.1,r*.13,0,0,Math.PI*2); g.fill();
  g.restore();
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
$('share').onclick = async () => {
  const f = finalTotals; if(!f) return;
  const txt = `I scored ${f.total} as ${f.rank} in An Apple a Day: ${f.right}/${TOTAL} questions right, all ${TOTAL} doctors caught. Beat that.`;
  try{
    if(navigator.share){ await navigator.share({title:'An Apple a Day', text:txt, url:location.href}); return; }
    await navigator.clipboard.writeText(txt+' '+location.href);
    $('share').textContent = 'Copied. Paste it anywhere.';
    setTimeout(()=>$('share').textContent='Challenge a friend',2200);
  }catch(e){}
};

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
  finalTotals = {total, rank, right: rightN, time: chaseTime, timeBonus};
  sfx.win();
  if(!reduceMotion) for(let i=0;i<5;i++) setTimeout(()=>burst(3+Math.random()*(W-6), 3+Math.random()*(H-6), SUBJECTS[Math.floor(Math.random()*TOTAL)].color, 22), i*140);
  const lb = loadLB();
  const entry = {id:Date.now()+'-'+Math.random().toString(36).slice(2,6), name:(nameEl.value.trim()||'Apple'), score:total, right:rightN, time:chaseTime};
  lb.push(entry); lb.sort((a,b)=>b.score-a.score || a.time-b.time); saveLB(lb.slice(0,25));
  setTimeout(() => {
    $('rWho').textContent = entry.name; $('rRank').textContent = rank;
    $('rTotal').innerHTML = `${total}<small>pts</small>`;
    $('rCatch').textContent = catchPts;
    $('rRightL').textContent = `Answers right (${rightN}/${TOTAL})`; $('rRight').textContent = quizPts;
    $('rSpeed').textContent = speedPts;
    $('rTimeL').textContent = `Time bonus (${chaseTime.toFixed(1)}s)`; $('rTime').textContent = timeBonus;
    $('rSum').textContent = total;
    renderLB($('lb2'), entry.id);
    resultScr.classList.add('on');
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

if(/[?&]debug\b/.test(location.search)) window.__g = { get state(){return state}, get apple(){return apple}, get docs(){return doctors}, open, W, H, steer };
resize(); reset(); state = 'title'; renderLB($('lb1'));
if(document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
requestAnimationFrame(frame);
})();
