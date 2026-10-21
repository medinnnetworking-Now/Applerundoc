/* Shared art for the game, the share card and the poster.
   Sprites are size-agnostic: they take a 2D context and a tile size. */
(() => {
'use strict';

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

window.RR = { SUBJECTS, drawApple, drawDoctor, rrect };
})();
