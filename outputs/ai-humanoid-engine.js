(() => {
  const canvas = document.getElementById('aiHumanoid');
  if (!canvas) throw new Error('Canvas #aiHumanoid bulunamadı');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const DURATION = 10000;
  const START_DELAY = 500;
  let W = 1, H = 1, DPR = 1, S = 1, cx = 0, hy = 0, raf = 0;
  let animationStart = performance.now() + START_DELAY;
  let headLines = [], neckLines = [], leftShoulders = [], rightShoulders = [];
  let leftOutline = [], rightOutline = [], goldLines = [], targets = [], formationParticles = [];

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInOut = t => (t = clamp(t)) < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
  const mix = (a, b, t) => a + (b - a) * t;
  const cubic = (a,b,c,d,t) => { const q=1-t; return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d; };
  function seeded(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
  const rnd = seeded(77531);
  const ambient = Array.from({length:420},()=>({x:rnd(),y:rnd(),r:.35+rnd()*1.1,p:rnd()*TAU,w:rnd()<.06}));
  const stream = Array.from({length:1050},(_,i)=>({u:rnd(),lane:(rnd()-.5),speed:.76+rnd()*.48,phase:rnd()*TAU,size:.5+rnd()*1.35,warm:rnd()<.045,index:i}));
  const ribbons = Array.from({length:54},()=>({y:rnd(),bend:.4+rnd()*.9,p:rnd()*TAU,warm:rnd()<.11,a:.08+rnd()*.22}));

  function headHalfWidth(y){
    const top=hy-S*.205, chin=hy+S*.205, u=clamp((y-top)/(chin-top)), q=u*2-1;
    const skull=Math.pow(Math.max(0,1-Math.pow(Math.abs(q),2.45)),.52);
    const jaw=1-.25*Math.pow(clamp((u-.62)/.38),1.35);
    return S*.154*skull*jaw*(.93+.07*Math.sin(u*Math.PI));
  }
  function sampleBezier(p0,p1,p2,p3,n=50){const out=[];for(let i=0;i<n;i++){const t=i/(n-1);out.push({x:cubic(p0.x,p1.x,p2.x,p3.x,t),y:cubic(p0.y,p1.y,p2.y,p3.y,t)});}return out;}
  function buildGeometry(){
    headLines=[];neckLines=[];leftShoulders=[];rightShoulders=[];goldLines=[];targets=[];
    const top=hy-S*.19,bottom=hy+S*.19;
    for(let i=0;i<52;i++){
      const u=i/51,y=mix(top,bottom,u),hw=headHalfWidth(y),line=[];
      for(let j=0;j<=64;j++){const xn=j/64*2-1,edge=Math.pow(Math.abs(xn),1.8);line.push({x:cx+xn*hw,y:y+(1-edge)*Math.sin((u-.5)*Math.PI)*S*.01});}
      headLines.push(line);
    }
    const outlineLeft=[],outlineRight=[];
    for(let i=0;i<90;i++){const y=mix(top,hy+S*.205,i/89),hw=headHalfWidth(y);outlineLeft.push({x:cx-hw,y});outlineRight.push({x:cx+hw,y});}
    leftOutline=outlineLeft.reverse(); rightOutline=outlineRight;
    const chin=hy+S*.205,neckBottom=hy+S*.33;
    for(let i=0;i<24;i++){
      const u=i/23,y=mix(chin+S*.008,neckBottom,u),w=mix(S*.078,S*.112,u),line=[];
      for(let j=0;j<=40;j++){const x=-1+2*j/40;line.push({x:cx+x*w,y:y+(1-x*x)*S*.012});}
      neckLines.push(line);
    }
    const shoulderY=hy+S*.295,count=68;
    for(const side of [-1,1]){
      const bank=side<0?leftShoulders:rightShoulders;
      for(let i=0;i<count;i++){
        const u=i/(count-1),p0={x:cx+side*mix(S*.022,S*.115,u),y:chin+S*(.035+u*.155)};
        const p1={x:cx+side*S*mix(.09,.18,u),y:p0.y+S*(.02+.03*u)};
        const p2={x:cx+side*S*mix(.19,.37,u),y:shoulderY-S*(.02-.08*u)};
        const p3={x:cx+side*mix(S*.17,S*.455,u),y:shoulderY+S*(.008+u*.22)};
        bank.push(sampleBezier(p0,p1,p2,p3,56));
      }
    }
    for(let k=-3;k<=3;k++){
      goldLines.push(sampleBezier(
        {x:cx+k*1.8,y:chin+S*.055},
        {x:cx+k*1.1+Math.sin(k)*S*.01,y:hy+S*.31},
        {x:cx+Math.sin(k*2.1)*S*.02,y:hy+S*.43},
        {x:cx+k*S*.005,y:hy+S*.55},58));
    }
    const groups=[
      ...leftShoulders.map(line=>({line,type:'leftShoulder'})),
      ...neckLines.map(line=>({line,type:'neck'})),
      {line:leftOutline,type:'leftHead'},
      ...headLines.map((line,i)=>({line,type:i<26?'leftHead':'rightHead'})),
      {line:rightOutline,type:'rightHead'},
      ...rightShoulders.map(line=>({line,type:'rightShoulder'})),
      ...goldLines.map(line=>({line,type:'gold'}))
    ];
    for(const g of groups)for(let i=0;i<g.line.length;i+=Math.max(2,Math.floor(g.line.length/7)))targets.push({...g.line[i],type:g.type});
    formationParticles=Array.from({length:1150},(_,i)=>{
      const target=targets[i%targets.length],a=rnd()*TAU,r=S*(.18+rnd()*.22);
      const sx=cx+Math.cos(a)*r,sy=hy-S*.14+Math.sin(a)*r*.75;
      return {target,sx,sy,c1x:sx+(rnd()-.5)*S*.3,c1y:sy+(rnd()-.5)*S*.22,c2x:target.x+(rnd()-.5)*S*.15,c2y:target.y-S*(.08+rnd()*.14),delay:rnd()*.32,size:.5+rnd()*1.25,warm:target.type==='gold'||rnd()<.05};
    });
  }
  function resize(){const r=canvas.getBoundingClientRect();DPR=Math.min(devicePixelRatio||1,2);W=Math.max(1,r.width);H=Math.max(1,r.height);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);S=Math.min(W,H);cx=W*.5;hy=H*.36;buildGeometry();}
  function stroke(points,color,width,alpha,glow=0,progress=1,fromCenter=false,wave=0){
    if(alpha<=0||progress<=0||points.length<2)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.beginPath();
    if(fromCenter){const c=Math.floor((points.length-1)/2),span=Math.max(1,Math.floor(c*easeOut(progress))),lo=c-span,hi=c+span;ctx.moveTo(points[lo].x,points[lo].y);for(let i=lo+1;i<=hi;i++)ctx.lineTo(points[i].x,points[i].y+Math.sin(i*.65+wave)*.55);}
    else{const max=Math.max(2,Math.floor(points.length*easeOut(progress)));ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<max;i++)ctx.lineTo(points[i].x,points[i].y+Math.sin(i*.55+wave)*.38);}
    ctx.stroke();ctx.restore();
  }
  function background(now){ctx.fillStyle='#02090d';ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(cx,hy,S*.03,cx,hy,S*.72);g.addColorStop(0,'rgba(0,105,145,.09)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalCompositeOperation='lighter';for(const p of ambient){ctx.globalAlpha=.12+.24*Math.pow(.5+.5*Math.sin(now*.001+p.p),4);ctx.fillStyle=p.w?'#ff9b24':'#14dfff';ctx.fillRect(p.x*W+Math.sin(now*.0004+p.p)*2,p.y*H+Math.cos(now*.0005+p.p)*2,p.r,p.r);}ctx.restore();}
  function streamPoint(p,t,mode){
    if(mode==='left'){
      const q=clamp(t*p.speed-p.u*.22),x=cubic(-W*.08,W*.14,W*.55,W*.82,q),y=cubic(H*(.55+p.lane*.22),H*(.68+p.lane*.14),H*(.38+p.lane*.12),H*(.57+p.lane*.16),q);return{x,y,q};
    }
    if(mode==='up'){
      const q=clamp(t*p.speed-p.u*.18),x=cubic(W*.78,W*.92,W*.72,cx+S*.14,q),y=cubic(H*.58,H*.48,H*.22,hy-S*.18,q);return{x,y,q};
    }
    const q=clamp(t*p.speed-p.u*.15),a=mix(.15,-Math.PI*1.35,q)+p.lane*.12,r=S*(.19+p.lane*.04);return{x:cx+Math.cos(a)*r,y:hy-S*.02+Math.sin(a)*r*.84,q};
  }
  function drawStream(t,mode){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of stream){const v=streamPoint(p,t,mode),prev=streamPoint(p,Math.max(0,t-.025),mode);if(v.q<=0||v.q>=1)continue;const fade=Math.sin(v.q*Math.PI),col=p.warm?'#ff9a25':'#16e8ff';ctx.globalAlpha=fade*(p.warm?.55:.38);ctx.strokeStyle=col;ctx.lineWidth=p.size*.7;ctx.shadowColor=col;ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(v.x,v.y);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(v.x,v.y,p.size,p.size);}ctx.restore();}
  function drawFormationParticles(elapsed){const global=phase(elapsed,4500,6900);if(global<=0||global>=1)return;ctx.save();ctx.globalCompositeOperation='lighter';for(const p of formationParticles){const q=easeInOut(clamp((global-p.delay)/(1-p.delay))),x=cubic(p.sx,p.c1x,p.c2x,p.target.x,q),y=cubic(p.sy,p.c1y,p.c2y,p.target.y,q),col=p.warm?'#ff9b24':'#18e8ff';ctx.globalAlpha=(1-q)*.65+.12;ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=8;ctx.fillRect(x,y,p.size,p.size);}ctx.restore();}
  function drawRibbons(now,elapsed,fade){const reveal=phase(elapsed,1400,7000)*fade,shoulderY=hy+S*.245;if(reveal<=0)return;for(const side of[-1,1])ribbons.forEach((r,i)=>{const local=side<0?phase(elapsed,1400,5200):phase(elapsed,2500,6500),x0=cx+side*S*.13,y0=shoulderY+(r.y-.52)*S*.11,x1=cx+side*S*(.33+r.bend*.12),y1=y0-S*(.015+r.y*.11),wave=Math.sin(now*.0015+r.p)*S*.015,path=sampleBezier({x:x0,y:y0},{x:cx+side*S*.2,y:y0-S*(.05+r.y*.035)+wave},{x:cx+side*S*.3,y:y1+S*(.04-r.y*.07)-wave},{x:x1,y:y1},45);stroke(path,r.warm?'#ff9d28':i%3?'#087cff':'#16d7ff',r.warm?.7:.55,reveal*local*r.a,r.warm?8:7,1,false,now*.001+r.p);});}
  function segmentProgress(elapsed,type){if(type==='leftShoulder')return phase(elapsed,4600,5400);if(type==='neck')return phase(elapsed,4800,5650);if(type==='leftHead')return phase(elapsed,5000,6000);if(type==='topHead')return phase(elapsed,5350,6200);if(type==='rightHead')return phase(elapsed,5650,6550);if(type==='rightShoulder')return phase(elapsed,6000,7000);return phase(elapsed,5850,7200);}
  function drawHumanoid(now,elapsed,fade){
    const leftS=segmentProgress(elapsed,'leftShoulder'),neck=segmentProgress(elapsed,'neck'),leftH=segmentProgress(elapsed,'leftHead'),rightH=segmentProgress(elapsed,'rightHead'),rightS=segmentProgress(elapsed,'rightShoulder');
    leftShoulders.forEach((l,i)=>stroke(l,i%9?'#08cfff':'#53efff',.62,fade*.42,7,clamp(leftS-i/leftShoulders.length*.22),false,now*.0017+i*.37));
    neckLines.forEach((l,i)=>stroke(l,'#12dfff',.65,fade*.48,7,clamp(neck-i/neckLines.length*.16),true,now*.0014+i));
    stroke(leftOutline,'#47edff',1.05,fade*.72,13,leftH);stroke(rightOutline,'#47edff',1.05,fade*.72,13,rightH);
    headLines.forEach((l,i)=>{const centerOrder=1-Math.abs(i/51-.5)*2,base=phase(elapsed,5350+Math.abs(i-25.5)*12,6650+Math.abs(i-25.5)*9),sideGate=i<26?leftH:rightH;stroke(l,i%7===0?'#ffad2d':'#18ddff',i%7===0?.58:.66,fade*(i%7===0?.35:.58),i%7===0?5:7,Math.min(base,sideGate),true,now*.0014+i*.3+centerOrder);});
    rightShoulders.forEach((l,i)=>stroke(l,i%9?'#08cfff':'#53efff',.62,fade*.42,7,clamp(rightS-i/rightShoulders.length*.22),false,now*.0017+i*.37));
    const gold=phase(elapsed,5700,7300);goldLines.forEach((l,i)=>stroke(l,i===3?'#ffd35b':'#ff9d21',i===3?1:.66,fade*(.42-Math.abs(i-3)*.035),10,clamp(gold-Math.abs(i-3)*.035),false,now*.002));
  }
  function drawCore(now,elapsed,fade){const p=easeOut(phase(elapsed,5400,7000));if(p<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';const pulse=.92+Math.sin(now*.002)*.08,r=S*mix(.012,.135,p),g=ctx.createRadialGradient(cx,hy+S*.012,0,cx,hy+S*.012,r);g.addColorStop(0,`rgba(255,244,170,${.65*p*pulse*fade})`);g.addColorStop(.2,`rgba(255,170,35,${.5*p*fade})`);g.addColorStop(.62,`rgba(240,90,0,${.18*p*fade})`);g.addColorStop(1,'rgba(255,90,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,hy+S*.012,r,0,TAU);ctx.fill();ctx.restore();}
  function drawHalo(now,elapsed,fade){const p=phase(elapsed,6400,7600);if(p<=0)return;const pop=p<.34?easeOut(p/.34)*1.12:mix(1.12,1,(p-.34)/.66),base=S*.22*pop,count=p<.38?1:8;for(let i=0;i<count;i++){const r=base+i*S*.038,path=[];for(let j=0;j<150;j++){const a=j/149*TAU;path.push({x:cx+Math.cos(a)*r,y:hy-S*.005+Math.sin(a)*r});}stroke(path,'#08cfff',i? .72:1,fade*(i?(.2-i*.014):.42)*(.9+Math.sin(now*.0013+i)*.1),5,1,false,0);}}
  function drawDissolve(elapsed){const p=phase(elapsed,9400,10000);if(p<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<650;i++){const a=(i*2.399)+p*1.5,r=S*(.05+(i%97)/97*.52)*p,x=cx+Math.cos(a)*r,y=hy+S*.1+Math.sin(a)*r*.8-p*S*.16;ctx.globalAlpha=p*(1-p)*.85;ctx.fillStyle=i%17===0?'#ff9624':'#16dfff';ctx.fillRect(x,y,1+(i%3)*.4,1+(i%3)*.4);}ctx.restore();}
  function render(now){const raw=now-animationStart,elapsed=raw<0?0:Math.min(raw,DURATION);ctx.clearRect(0,0,W,H);background(now);if(raw>=0){const fade=1;if(elapsed>=600&&elapsed<2450)drawStream(phase(elapsed,600,2200),'left');if(elapsed>=2000&&elapsed<3600)drawStream(phase(elapsed,2200,3400),'up');if(elapsed>=3200&&elapsed<4800)drawStream(phase(elapsed,3400,4600),'orbit');drawRibbons(now,elapsed,fade);drawHalo(now,elapsed,fade);drawCore(now,elapsed,fade);drawFormationParticles(elapsed);drawHumanoid(now,elapsed,fade);const label=document.getElementById('state');if(label)label.textContent=elapsed<600?'AMBIENT FIELD':elapsed<2200?'LEFT TO RIGHT ENERGY':elapsed<3400?'ASCENDING ARC':elapsed<4600?'CRANIAL ORBIT':elapsed<6800?'HUMANOID FORMING':elapsed<8000?'CORE SYNCHRONIZING':'NEURAL CONSCIOUSNESS ONLINE';}raf=requestAnimationFrame(render);}
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();raf=requestAnimationFrame(render);window.__destroyAIHumanoid=()=>{cancelAnimationFrame(raf);ro.disconnect();};window.__restartAIHumanoid=()=>{animationStart=performance.now()+START_DELAY;};const replay=document.getElementById('replay');if(replay)replay.onclick=window.__restartAIHumanoid;
})();
