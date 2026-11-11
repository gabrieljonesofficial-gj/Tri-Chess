const R=12,C=16,G={K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟\uFE0E'};
const NAME={A:'Alpha (Computer)',L:'You (Lone Kingdom)',B:'Beta (Computer)'};
const N8=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]],D4=[[1,0],[-1,0],[0,1],[0,-1]],DG=[[1,1],[1,-1],[-1,1],[-1,-1]],D8=D4.concat(DG);
const valid=(r,c)=>r>=0&&c>=0&&c<C&&((r<8)||(r<R&&c>=4&&c<12));
const inZone=(r,c)=>r>=0&&r<8&&c>=4&&c<12;
const team=s=>s==='L'?0:1, allyOf=s=>s==='L'?null:s==='A'?'B':'A';
let B,dead,idx,over,lcap,resur,sel,moves,pend,seq=['A','L','B','L'];
const pc=(t,s,dir)=>({t,s,col:s,dir,chosen:false,moved:false,gen:false});
function init(){
  B=Array.from({length:R},()=>Array(C).fill(null));dead={A:false,B:false};idx=0;over=null;lcap=[];resur=false;sel=null;moves=[];pend=null;
  const LA=['R','N','B','Q','K','B','N','R'],LB=['R','N','B','K','Q','B','N','R'];
  for(let i=0;i<8;i++){
    B[i][0]=pc(LA[i],'A');B[i][1]=pc('P','A',[0,1]);
    B[i][15]=pc(LB[i],'B');B[i][14]=pc('P','B',[0,-1]);
    B[11][4+i]=pc(LB[i],'L');B[10][4+i]=pc('P','L',[-1,0]);
  }
  hist=[];grave={L:[],U:[]};clearTimeout(tid);clearHint();pts=5;resShown=false;closeRes();log=[];frames=[cl(B)];rvStop();started=false;document.getElementById('lvl').disabled=false;document.getElementById('startBtn').disabled=false;level=document.getElementById('lvl').value;next(false);draw();
}
const pdiag=([a,b])=>[[a+b,b+a],[a-b,b-a]];
function pseudo(r,c){
  const p=B[r][c],o=[],tm=team(p.s);
  const add=(rr,cc)=>{if(!valid(rr,cc))return false;const q=B[rr][cc];if(!q){o.push({r:rr,c:cc});return true}if(team(q.s)!==tm)o.push({r:rr,c:cc});return false};
  if(p.t==='N')for(const[a,b]of N8)add(r+a,c+b);
  else if(p.t==='K')for(const[a,b]of D8)add(r+a,c+b);
  else if(p.t==='P'){
    const[dr,dc]=p.dir,free=(a,b)=>valid(a,b)&&!B[a][b];
    const dirs=(!p.chosen&&inZone(r,c))?[[dr,dc],[dc,dr],[-dc,-dr]]:[[dr,dc]];
    for(const d of dirs){
      if(free(r+d[0],c+d[1])){o.push({r:r+d[0],c:c+d[1],dir:d});
        if(!p.moved&&!inZone(r,c)&&dirs.length===1&&free(r+2*d[0],c+2*d[1]))o.push({r:r+2*d[0],c:c+2*d[1],dir:d})}
    }
    for(const[a,b]of pdiag(p.dir)){const rr=r+a,cc=c+b;if(valid(rr,cc)){const q=B[rr][cc];if(q&&team(q.s)!==tm)o.push({r:rr,c:cc,dir:p.dir})}}
  }else for(const[a,b]of(p.t==='R'?D4:p.t==='B'?DG:D8)){let rr=r+a,cc=c+b;while(add(rr,cc)){rr+=a;cc+=b}}
  return o;
}
function inCheck(S){
  let kr=-1,kc=-1;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(p&&p.t==='K'&&p.s===S){kr=r;kc=c}}
  if(kr<0)return false;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(!p||team(p.s)===team(S))continue;
    if(p.t==='P'){for(const[a,b]of pdiag(p.dir))if(r+a===kr&&c+b===kc)return true}
    else if(pseudo(r,c).some(m=>m.r===kr&&m.c===kc))return true}
  return false;
}
function apply(fr,fc,m){
  const p=B[fr][fc],cap=B[m.r][m.c],sv={dir:p.dir,chosen:p.chosen,moved:p.moved};
  B[m.r][m.c]=p;B[fr][fc]=null;
  if(p.t==='P'&&!p.chosen&&inZone(fr,fc)&&m.dir&&(m.dir[0]!==p.dir[0]||m.dir[1]!==p.dir[1])){p.chosen=true;p.dir=m.dir}
  p.moved=true;
  return()=>{B[fr][fc]=p;B[m.r][m.c]=cap;Object.assign(p,sv)};
}
function gen(S){
  const al=allyOf(S),out=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(!p||p.s!==S)continue;
    for(const m of pseudo(r,c)){const u=apply(r,c,m);const ok=!inCheck(S),okA=!al||dead[al]||!inCheck(al);u();if(ok)out.push({fr:r,fc:c,m,okA})}}
  return out;
}
function legal(S){
  const l=gen(S),al=allyOf(S);
  if(al&&!dead[al]&&inCheck(al)){const r=l.filter(x=>x.okA);if(r.length)return r}
  return l;
}
function mated(S){
  if(!inCheck(S)||gen(S).length)return false;
  const al=allyOf(S);
  return !(al&&!dead[al]&&gen(al).some(x=>x.okA));
}
function next(adv=true){
  if(adv)idx=(idx+1)%4;
  for(let i=0;i<8;i++){
    const s=seq[idx];
    if(!dead[s]){
      if(legal(s).length)return;
      if(s==='L'){over='Draw by stalemate: Lone Kingdom has no legal moves.';return}
    }
    idx=(idx+1)%4;
  }
}
function kill(S){
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(p&&p.t==='K'&&p.s===S)B[r][c]=null}
  dead[S]=true;pts+=10;grave.U.push({t:'K',col:S});const al=allyOf(S);
  if(dead[al]){over='⚔ PERFECT VICTORY for the Lone Kingdom! Both allied kings are checkmated.';return}
  for(const row of B)for(const p of row)if(p&&p.s===S)p.s=al;
  if(!resur){resur=true;
    const spots=[];for(const r of[9,8,10,11])for(let c=4;c<12;c++)if(!B[r][c])spots.push([r,c]);
    for(const t of lcap){const s=spots.shift();if(!s)break;const p=pc(t,'L',[-1,0]);p.gen=true;p.moved=true;p.chosen=true;B[s[0]][s[1]]=p}
    lcap=[];grave.L=grave.L.filter(g=>g.t==='P'||g.t==='K');
  }
}
function finish(){
  const E=log[log.length-1];E.chk=['A','B','L'].some(s=>!dead[s]&&team(s)!==team(E.s)&&inCheck(s));
  if(!dead.A&&!dead.B&&mated('A')&&mated('B')){
    E.mate=true;
    for(const row of B)for(let c=0;c<C;c++){const p=row[c];if(p&&p.t==='K'&&p.s!=='L')row[c]=null}
    dead.A=dead.B=true;pts+=20;grave.U.push({t:'K',col:'A'},{t:'K',col:'B'});
    over='👑 PERFECT VICTORY for the Lone Kingdom! Both allied kings were checkmated at the same time.';
  }
  for(const S of['A','B','L']){
    if(over)break;if(dead[S])continue;
    if(mated(S)){E.mate=true;
      if(S==='L'){over=(dead.A||dead.B)?'Draw: Lone Kingdom was checkmated, but the United Kingdom had already lost one king, so the game is recorded as a draw.':'🏰 PERFECT VICTORY for the United Kingdom: Lone Kingdom is checkmated with both allied kings alive!';}
      else kill(S);
    }
  }
  frames.push(cl(B));playFor(E);
  if(!over)next();
  sel=null;moves=[];draw();sched();
}
function doMove(m){clearHint();
  if(B[m.fr][m.fc].s==='L')hist.push(snap());
  const{fr,fc,m:mv}=m,p=B[fr][fc],cap=B[mv.r][mv.c];
  log.push({s:p.s,t:p.t,f:sqn(fr,fc),to:sqn(mv.r,mv.c),fr,fc,tr:mv.r,tc:mv.c,cap:cap?cap.t:null});
  if(cap)grave[cap.s==='L'?'L':'U'].push({t:cap.t,col:cap.col,gen:cap.gen});
  if(cap&&p.s==='L')pts+=VAL[cap.t];
  if(cap&&cap.s==='L'&&cap.t!=='P'&&cap.t!=='K')lcap.push(cap.t);
  apply(fr,fc,mv);
  if(p.t==='P'&&(team(p.s)===0?(mv.c===0||mv.c===15):mv.r===11)){if(p.s==='L'){pend=p;showPromo();return}p.t='Q';p.gen=true;log[log.length-1].promo='Q'}
  finish();
}
let tid,hist=[],grave={L:[],U:[]};
const cl=b=>b.map(r=>r.map(p=>p&&{...p,dir:p.dir&&[...p.dir]}));
function snap(){return{B:cl(B),dead:{...dead},idx,over,lcap:[...lcap],resur,pts,ll:log.length,grave:{L:[...grave.L],U:[...grave.U]}}}
function undo(){
  if(rv!==null||pend||!hist.length)return;
  clearTimeout(tid);clearHint();const s=hist.pop();
  B=cl(s.B);dead=s.dead;idx=s.idx;over=s.over;lcap=s.lcap;resur=s.resur;grave=s.grave;pts=s.pts;resShown=false;closeRes();log.length=s.ll;frames.length=s.ll+1;rvStop();sel=null;moves=[];
  draw();sched();
}
function sched(){clearTimeout(tid);if(started&&!over&&!pend&&seq[idx]!=='L')tid=setTimeout(aiMove,650)}
const VAL={P:1,N:3,B:3,R:5,Q:9,K:100};
let level='normal',started=false;
let hintEval=false,hint=null,pts=5;
const NM={K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'},UKN={A:'Alpha',B:'Beta'};
const sqn=(r,c)=>String.fromCharCode(97+c)+(12-r);
function clearHint(){hint=null;document.getElementById('hintbox').style.display='none'}
function sqAtt(r,c,tm){
  for(let i=0;i<R;i++)for(let j=0;j<C;j++){const p=B[i][j];if(!p||team(p.s)!==tm)continue;
    if(p.t==='P'){if(pdiag(p.dir).some(([a,b])=>i+a===r&&j+b===c))return true}
    else if(pseudo(i,j).some(m=>m.r===r&&m.c===c))return true}
  return false;
}
function hintMove(){
  if(rv!==null||!started||over||pend||seq[idx]!=='L')return;
  const l=legal('L');if(!l.length)return;
  if(hint)return;
  if(pts<1){const hb0=document.getElementById('hintbox');hb0.innerHTML='<p><b>💡 Not enough points.</b> Capture enemy pieces to earn points. A hint costs 1.</p>';hb0.style.display='block';return}
  pts-=1;
  const pl=['L'];let j=idx;for(let k=0;k<3;k++){j=(j+1)%4;while(dead[seq[j]])j=(j+1)%4;pl.push(seq[j])}
  hintEval=true;let best=l[0],bm=1e9;
  try{for(const x of l){const u=apply(x.fr,x.fc,x.m);const v=search(pl,1,-1e9,bm+.001);u();if(v<bm){bm=v;best=x}}}finally{hintEval=false}
  const x=best,p=B[x.fr][x.fc],cap=B[x.m.r][x.m.c],why=[];
  const chk0=inCheck('L'),thr0=p.t!=='K'&&sqAtt(x.fr,x.fc,1);
  if(chk0)why.push('it gets your king out of check');
  if(cap)why.push('it captures their '+NM[cap.t]+(cap.gen?' (a General)':''));
  const u=apply(x.fr,x.fc,x.m);
  const safe=!sqAtt(x.m.r,x.m.c,1);
  const ck=['A','B'].filter(s=>!dead[s]&&inCheck(s));
  if(ck.length)why.push('it puts '+ck.map(s=>UKN[s]).join(' and ')+'’s king in check');
  const tg=new Set();
  for(const m of pseudo(x.m.r,x.m.c)){const t=B[m.r][m.c];if(t&&team(t.s)===1&&t.t!=='K'&&VAL[t.t]>=3)tg.add(NM[t.t])}
  if(tg.size)why.push('it now threatens their '+[...tg].join(' and '));
  if(thr0&&safe)why.push('it moves your threatened '+NM[p.t]+' to safety');
  if(p.t==='P'&&(x.m.c===0||x.m.c===15))why.push('it promotes a pawn to a General');
  else if(p.t==='P'&&!why.length)why.push('it advances a pawn toward promotion');
  if(!safe)why.push(cap?'it can be recaptured, so this is a trade the search judges worthwhile':'the piece can be attacked there, but the search judges it worth the risk');
  if(!why.length)why.push(inZone(x.m.r,x.m.c)&&!inZone(x.fr,x.fc)?'it brings a piece into the War Zone to fight for the centre':'it improves your position and keeps your pieces safe');
  let rep='',rb=-1e9;const n1=pl[1];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const q=B[r][c];if(!q||q.s!==n1)continue;
    for(const m of pseudo(r,c)){const t=B[m.r][m.c];let v;
      if(t&&t.t==='K')v=1e4;else{const u2=apply(r,c,m);v=search(pl,2,-1e9,1e9);u2()}
      if(v>rb){rb=v;rep=UKN[n1]+' will probably play '+NM[q.t]+' '+sqn(r,c)+' → '+sqn(m.r,m.c)+(t?', capturing your '+NM[t.t]:'')}}}
  u();
  const plan=(dead.A||dead.B)?'One ally has fallen. Press your advantage and hunt the last king.':'Try to split the allies and trap one king. Checkmating the first king hands your captured Generals back to you.';
  const w=why.join('; ');
  const hb=document.getElementById('hintbox');
  hb.innerHTML='<p><b>💡 Suggested: '+NM[p.t]+' '+sqn(x.fr,x.fc)+' → '+sqn(x.m.r,x.m.c)+'</b></p><p><b>Why:</b> '+w.charAt(0).toUpperCase()+w.slice(1)+'.</p>'+(rep?'<p><b>Expect:</b> '+rep+'.</p>':'')+'<p><b>Plan:</b> '+plan+'</p>';
  hb.style.display='block';hint=x;sel=null;moves=[];draw();
}
function closeCf(){document.getElementById('cf').style.display='none'}
let resShown=false;
function closeRes(){document.getElementById('res').style.display='none'}
function confetti(cols){
  const cv=document.getElementById('conf'),x=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;cv.style.display='block';
  const P=Array.from({length:140},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.6,w:6+Math.random()*6,h:8+Math.random()*8,vy:2+Math.random()*3,vx:-1.5+Math.random()*3,a:Math.random()*6,va:-.2+Math.random()*.4,c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0=performance.now();
  (function f(t){x.clearRect(0,0,cv.width,cv.height);
    for(const p of P){p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h);x.restore()}
    if(t-t0<4500)requestAnimationFrame(f);else{x.clearRect(0,0,cv.width,cv.height);cv.style.display='none'}})(t0);
}
function showResult(){
  if(!over)return;
  let ic,t,m,cols;const both=!dead.A&&!dead.B,sur=over.includes('surrendered');
  if(over.includes('PERFECT VICTORY for the Lone')){ic='👑';t='Perfect Victory: Lone Kingdom!';m=over.includes('same time')?'You checkmated both allied kings at the same time. The Lone Kingdom stands unconquered.':'You checkmated and eliminated both allied kings, one after another. The Lone Kingdom stands unconquered.';cols=['#ffffff','#f0dab5','#b78a66','#2a7de1']}
  else if(over.includes('Draw')){ic='🤝';t='Draw';m=over.includes('already lost one king')?((sur?'You surrendered, but ':'')+'the United Kingdom had already lost one king, so the game is recorded as a draw.'):'Neither side achieved its winning objective.';cols=null}
  else{const perfect=over.includes('PERFECT')||(sur&&both);
    ic=sur?'🏳️':(perfect?'🏰':'⚔️');t=(perfect?'Perfect':'Costly')+' Victory: United Kingdom!';
    m=(sur?'You surrendered. ':'')+(perfect?'The alliance defeated the Lone Kingdom with both allied kings still standing.':'The alliance defeated the Lone Kingdom, but lost an allied king along the way.');
    cols=['#f5c400','#111111','#f0dab5','#c0392b']}
  document.getElementById('resi').textContent=ic;document.getElementById('rest').textContent=t;document.getElementById('resm').textContent=m;
  document.getElementById('resp').textContent='⭐ '+pts+' points left';
  document.getElementById('res').style.display='flex';
  snd(over.includes('for the Lone')?'win':over.includes('Draw')?'draw':'lose');
  if(cols)confetti(cols);
}
let log=[],frames=[],rv=null,rvT=null,AC=null,muted=false;
const SN={A:'Alpha',L:'Lone',B:'Beta'};
function fmt(e){return(e.t==='P'?'':e.t)+e.f+(e.cap?'x':'→')+e.to+(e.promo?'='+e.promo:'')+(e.mate?'#':e.chk?'+':'')}
function renderLog(){
  const h=document.getElementById('hlist');
  document.getElementById('hcount').textContent=log.length+' moves';
  h.innerHTML=log.length?log.map((e,i)=>'<span class="mv '+e.s+(rv===i+1?' cur':'')+'" onclick="rvGo('+(i+1)+')">'+(i+1)+'. '+fmt(e)+'</span>').join(''):'<span style="opacity:.7">No moves yet.</span>';
  if(rv===null)h.scrollTop=h.scrollHeight;
}
function stopAuto(){clearInterval(rvT);rvT=null}
function rvStop(){stopAuto();rv=null}
function rvExit(){rvStop();draw()}
function rvStart(){if(!log.length)return;stopAuto();rv=0;draw();document.getElementById('rvbox').scrollIntoView({block:'nearest',behavior:'smooth'})}
function rvGo(i){stopAuto();rv=Math.max(0,Math.min(frames.length-1,i));if(rv>0)playFor(log[rv-1]);draw()}
function rvStep(d){rvGo((rv===null?frames.length-1:rv)+d)}
function rvAuto(){
  if(rvT){stopAuto();draw();return}
  if(rv>=frames.length-1)rv=0;
  rvT=setInterval(()=>{if(rv>=frames.length-1){stopAuto();draw();return}rv++;if(rv>0)playFor(log[rv-1]);draw()},900);draw();
}
function renderRv(){
  const b=document.getElementById('rvbox');
  if(rv===null){b.style.display='none';return}
  const e=rv>0?log[rv-1]:null,st={L:[0,0],U:[0,0]};let chk=0,pro=0;
  log.forEach(x=>{if(x.cap){const k=x.s==='L'?'L':'U';st[k][0]++;st[k][1]+=VAL[x.cap]}if(x.chk)chk++;if(x.promo)pro++});
  const km=log.map((x,i)=>({x,i})).filter(o=>o.x.mate||o.x.promo||(o.x.cap&&VAL[o.x.cap]>=5)).slice(0,12)
    .map(o=>'<button class="n sm" onclick="rvGo('+(o.i+1)+')">#'+(o.i+1)+' '+(o.x.mate?'♚ checkmate':o.x.promo?'♛ promotion':'⚔ '+NM[o.x.cap]+' taken')+'</button>').join('');
  b.innerHTML='<p><b>🎬 Play review</b> · move '+rv+' of '+(frames.length-1)+'</p>'
   +'<p>'+(e?SN[e.s]+': <b>'+fmt(e)+'</b>'+(e.cap?' — captured a '+NM[e.cap]:'')+(e.promo?' — promoted to '+NM[e.promo]:'')+(e.mate?' — checkmate, king eliminated':e.chk?' — check':''):'Starting position')+'</p>'
   +'<div class="ctl"><button class="n sm" onclick="rvGo(0)">⏮</button><button class="n sm" onclick="rvStep(-1)">◀</button><button class="n sm" onclick="rvAuto()">'+(rvT?'⏸ Pause':'▶ Auto-play')+'</button><button class="n sm" onclick="rvStep(1)">▶</button><button class="n sm" onclick="rvGo(frames.length-1)">⏭</button><button class="n sm" onclick="rvExit()">✕ Exit review</button></div>'
   +'<p>Summary: Lone captured '+st.L[0]+' pieces ('+st.L[1]+' pts) · United Kingdom captured '+st.U[0]+' ('+st.U[1]+' pts) · '+chk+' checks · '+pro+' promotions</p>'
   +(km?'<p>Key moments:</p><div class="km">'+km+'</div>':'');
  b.style.display='block';
}
function ctx(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function tn(f,d,o={}){const a=ctx();if(!a)return;const t=a.currentTime+(o.at||0),os=a.createOscillator(),g=a.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+d);g.gain.setValueAtTime(o.v||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+d);os.connect(g);g.connect(a.destination);os.start(t);os.stop(t+d+.02)}
function nz(d,v){const a=ctx();if(!a)return;const n=Math.floor(a.sampleRate*d),b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),g=a.createGain();s.buffer=b;g.gain.value=v;s.connect(g);g.connect(a.destination);s.start()}
function snd(k){
  if(muted)return;
  if(k==='move')tn(300,.07,{type:'triangle',to:180});
  else if(k==='cap'){nz(.09,.25);tn(160,.14,{type:'square',v:.1,to:70})}
  else if(k==='check'){tn(660,.12,{type:'square',v:.08});tn(880,.18,{type:'square',v:.08,at:.13})}
  else if(k==='mate'){nz(.2,.3);tn(110,.5,{type:'sawtooth',v:.15,to:55});tn(330,.3,{at:.2,type:'square',v:.08})}
  else if(k==='promo')[523,659,784,1047].forEach((f,i)=>tn(f,.14,{type:'triangle',at:i*.09}));
  else if(k==='win')[523,659,784,1047,784,1047,1319].forEach((f,i)=>tn(f,.22,{type:'triangle',at:i*.14,v:.18}));
  else if(k==='lose')[392,330,262,196].forEach((f,i)=>tn(f,.3,{type:'sawtooth',at:i*.22,v:.1}));
  else if(k==='draw'){tn(392,.3);tn(392,.3,{at:.3})}
}
function playFor(e){snd(e.mate?'mate':e.chk?'check':e.promo?'promo':e.cap?'cap':'move')}
function toggleSnd(){muted=!muted;document.getElementById('sndBtn').textContent=muted?'🔇':'🔊';if(!muted)snd('move')}
let cfAct=null;
function ask(t,m,y,f){document.getElementById('cft').textContent=t;document.getElementById('cfm').textContent=m;document.getElementById('cfy').textContent=y;cfAct=f;document.getElementById('cf').style.display='flex'}
function askNew(){if(started&&!over)ask('Start a new game?','Your current game is in progress and its progress will be lost.','Yes, new game',init);else init()}
function askSurrender(){if(rv!==null||!started||over||pend)return;ask('Surrender?','You will lose this game and the United Kingdom will be declared the winner.','Yes, surrender',surrender)}
function surrender(){if(!started||over||pend)return;over=(dead.A||dead.B)?'🏳 You surrendered. Draw: the United Kingdom had already lost one king.':'🏳 You surrendered. The United Kingdom wins.';clearTimeout(tid);draw()}
function start(){started=true;ctx();document.getElementById('lvl').disabled=true;document.getElementById('startBtn').disabled=true;draw();sched()}
function evalU(){
  let s=0;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(!p)continue;
    let v=p.t==='K'?0:VAL[p.t];
    if(p.t==='P')v+=p.s==='L'?((c===0||c===15)?8:(11-r)*.05):(r===11?8:r*.05);
    if(hintEval&&p.s==='L'&&p.t!=='P'&&p.t!=='K'&&inZone(r,c))v+=.15;
    s+=p.s==='L'?-v:v}
  return s;
}
function search(pl,d,a,b){
  if(d===pl.length)return evalU();
  const X=pl[d],mx=X!=='L',mv=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(p&&p.s===X)for(const m of pseudo(r,c)){const t=B[m.r][m.c];mv.push({r,c,m,s:t?VAL[t.t]*10-VAL[p.t]:0})}}
  if(!mv.length)return evalU();
  mv.sort((x,y)=>y.s-x.s);
  let best=mx?-1e9:1e9;
  for(const x of mv){
    const t=B[x.m.r][x.m.c];
    if(t&&t.t==='K')return mx?1e4-d:-1e4+d;
    const u=apply(x.r,x.c,x.m),v=search(pl,d+1,a,b);u();
    if(mx){if(v>best)best=v;if(best>a)a=best}else{if(v<best)best=v;if(best<b)b=best}
    if(a>=b)break;
  }
  return best;
}
function hardPick(S,l){
  const al=allyOf(S),pl=[S,'L',(al&&!dead[al])?al:S];
  let best=l[0],bs=-1e9;
  for(const x of l){
    const u=apply(x.fr,x.fc,x.m);
    const v=search(pl,1,bs-.001,1e9)+Math.random()*.1;
    u();
    if(v>bs){bs=v;best=x}
  }
  return best;
}
function aiMove(){
  const S=seq[idx];if(over||pend||S==='L')return;
  const l=legal(S);if(!l.length)return;
  if(level==='easy'){
    let pick;
    if(Math.random()<.4)pick=l[Math.floor(Math.random()*l.length)];
    else{let b=-1e9;for(const x of l){const c=B[x.m.r][x.m.c],s=(c?VAL[c.t]:0)+Math.random()*3;if(s>b){b=s;pick=x}}}
    doMove(pick);return;
  }
  if(level==='hard'){doMove(hardPick(S,l));return}
  let best=null,bs=-1e9;
  for(const x of l){
    const cap=B[x.m.r][x.m.c],p=B[x.fr][x.fc];
    let s=(cap?VAL[cap.t]*10:0)+Math.random()*.8;
    const u=apply(x.fr,x.fc,x.m);
    if(p.t==='P'){s+=(x.m.r-x.fr)*.8+.2;if(x.m.r===11)s+=80}
    else s-=(Math.abs(x.m.r-5.5)+Math.abs(x.m.c-7.5))*.05;
    if(inCheck('L')){s+=5;if(!gen('L').length)s+=1000}
    let exp=false;
    for(let r=0;r<R&&!exp;r++)for(let c=0;c<C&&!exp;c++){const q=B[r][c];if(q&&q.s==='L')for(const m of pseudo(r,c))if(m.r===x.m.r&&m.c===x.m.c){exp=true;break}}
    if(exp)s-=VAL[p.t]*9;
    u();
    if(s>bs){bs=s;best=x}
  }
  doMove(best);
}
function showPromo(){
  const o=document.getElementById('opts');o.innerHTML='';
  for(const t of['Q','R','B','N']){const b=document.createElement('button');b.textContent=G[t];b.onclick=()=>{pend.t=t;pend.gen=true;log[log.length-1].promo=t;pend=null;document.getElementById('modal').style.display='none';finish()};o.appendChild(b)}
  document.getElementById('modal').style.display='flex';
}
function click(r,c){
  if(rv!==null||!started||over||pend||seq[idx]!=='L')return;
  const m=moves.find(x=>x.m.r===r&&x.m.c===c);
  if(m&&sel){doMove(m);return}
  const p=B[r][c];
  if(p&&p.s===seq[idx]){sel=[r,c];moves=legal(seq[idx]).filter(x=>x.fr===r&&x.fc===c)}else{sel=null;moves=[]}
  draw();
}
function odds(){
  let mL=0,mU=0;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const p=B[r][c];if(!p||p.t==='K')continue;if(p.s==='L')mL+=VAL[p.t];else mU+=VAL[p.t]}
  let s=4*(mL/39-mU/78)+(dead.A?1.2:0)+(dead.B?1.2:0);
  if(inCheck('L'))s-=.7;if(inCheck('A'))s+=.7;if(inCheck('B'))s+=.7;
  let l=Math.round(100/(1+Math.exp(-s)));
  if(over)l=over.includes('for the Lone')?100:over.includes('Draw')?50:0;
  l=Math.max(l,0);const u=100-l;
  document.getElementById('oL').style.width=l+'%';
  document.getElementById('oL').textContent=l>=15?'Lone '+l+'%':(l?l+'%':'');
  document.getElementById('oU').textContent=u>=15?'United Kingdom '+u+'%':(u?u+'%':'');
}
function draw(){
  const real=B;if(rv!==null&&frames[rv])B=frames[rv];
  try{drawInner()}finally{B=real}
  renderLog();renderRv();
}
function drawInner(){
  const bd=document.getElementById('board');
  document.getElementById('zone').style.display=B.some((row,r)=>r<8&&row.slice(4,12).some(Boolean))?'':'none';
  bd.querySelectorAll('.sq').forEach(e=>e.remove());
  odds();
  if(over&&!resShown){resShown=true;setTimeout(showResult,600)}
  document.getElementById('pts').textContent='⭐ '+pts+(pts===1?' pt':' pts');
  const gv=(id,title,arr)=>{document.getElementById(id).innerHTML='<div class="gt">'+title+'</div>'+arr.map(g=>'<span class="p '+g.col+(g.gen?' g':'')+'">'+G[g.t]+'</span>').join('')};
  gv('gL','LONE · FALLEN',grave.L);gv('gU','UNITED KINGDOM · FALLEN',grave.U);
  const chk=['A','B','L'].filter(s=>!dead[s]&&inCheck(s));
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    const d=document.createElement('div'),p=valid(r,c)?B[r][c]:null;
    d.className='sq '+(valid(r,c)?((r+c)%2?'d':'l'):'x');
    d.style.gridRow=r+1;d.style.gridColumn=c+1;
    if(sel&&sel[0]===r&&sel[1]===c)d.classList.add('sel');
    if(hint){if(hint.fr===r&&hint.fc===c)d.classList.add('hf');if(hint.m.r===r&&hint.m.c===c)d.classList.add('ht')}
    if(rv!==null&&rv>0){const e=log[rv-1];if(e.fr===r&&e.fc===c)d.classList.add('hf');if(e.tr===r&&e.tc===c)d.classList.add('ht')}
    if(moves.some(x=>x.m.r===r&&x.m.c===c))d.classList.add(p?'cp':'mv');
    if(p&&p.t==='K'&&chk.includes(p.s))d.classList.add('chk');
    if(p){const s=document.createElement('span');s.className='p '+p.col+(p.gen?' g':'');s.textContent=G[p.t];d.appendChild(s)}
    if(valid(r,c)){
      if(c===(r<8?0:4)){const e=document.createElement('i');e.className='co n';e.textContent=12-r;d.appendChild(e)}
      if(r===((c>=4&&c<12)?11:7)){const e=document.createElement('i');e.className='co f';e.textContent=String.fromCharCode(97+c);d.appendChild(e)}
    }
    d.onclick=()=>click(r,c);bd.appendChild(d);
  }
  const st=document.getElementById('status');
  st.textContent=!started?'Choose a difficulty, then press Start game. It can’t be changed once the game begins.':over||(NAME[seq[idx]]+' to move'+(chk.length?' — CHECK on '+chk.map(s=>NAME[s].split(' ')[0]).join(' & '):'')+(dead.A||dead.B?' · '+(dead.A?'Alpha':'Beta')+' has fallen':''));
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('side').classList.remove('open')});
init();
