(()=>{'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const ASSEMBLY_MS=6000;
const SHOCK_MS=2500;
const FIGURE_SRC='assets/artwork-candidates/humanoid-figure-transparent.webp';
const BACKDROP_SRC='assets/artwork-candidates/mountains.webp';
const VERSION='15.0';

class ArtworkHumanoidEngine{
  constructor({container,canvas,backdrop,label,mode='fullscreen'}){
    this.container=container;this.canvas=canvas;this.backdrop=backdrop;this.label=label;this.mode=mode;
    this.ctx=canvas.getContext('2d',{alpha:true});
    this.figure=new Image();this.figure.decoding='async';this.figure.src=FIGURE_SRC;
    this.backdropImage=new Image();this.backdropImage.decoding='async';this.backdropImage.src=BACKDROP_SRC;
    this.off=document.createElement('canvas');this.off.width=640;this.off.height=400;this.offctx=this.off.getContext('2d',{willReadFrequently:true});
    this.bodyOff=document.createElement('canvas');this.bodyOff.width=640;this.bodyOff.height=400;this.bodyCtx=this.bodyOff.getContext('2d');
    this.bgOff=document.createElement('canvas');this.bgOff.width=640;this.bgOff.height=360;this.bgCtx=this.bgOff.getContext('2d',{willReadFrequently:true});
    this.points=[];this.headPoints=[];this.bgHighlights=[];this.agents=[];
    this.loaded=false;this.effects=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state='IDLE';this.level=0;this.lastLevelAt=0;this.speechPhase=0;
    this.assemblyActive=false;this.assemblyStart=0;this.shockActive=false;this.shockStart=0;
    this.targetYaw=0;this.yaw=0;this.targetPitch=0;this.pitch=0;this.lastPointerAt=0;
    this.w=1;this.h=1;this.dpr=1;this.rect={x:0,y:0,w:1,h:1,s:1};this.raf=0;
    this.performance={frames:0,lastFpsAt:performance.now(),fps:60,frameMs:0};this.pendingReplay=false;
    const waitImage=(img,required=false)=>new Promise((res,rej)=>{if(img.complete&&img.naturalWidth>0)return res();const ok=()=>res();const bad=()=>required?rej(new Error('Humanoid artwork yüklenemedi')):res();img.addEventListener('load',ok,{once:true});img.addEventListener('error',bad,{once:true});});
    Promise.all([waitImage(this.figure,true),waitImage(this.backdropImage,false)])
      .then(()=>{this.prepare();this.resize();this.loaded=true;if(this.pendingReplay)this.replay();else this.draw(performance.now());})
      .catch(()=>{this.loaded=false;});
    this._loop=this._loop.bind(this);this.raf=requestAnimationFrame(this._loop);
    this._onPointerMove=e=>this.pointer(e);
    this._onPointerLeave=()=>{this.targetYaw=0;this.targetPitch=0;};
    container.addEventListener('pointermove',this._onPointerMove,{passive:true});
    container.addEventListener('pointerleave',this._onPointerLeave,{passive:true});
  }
  prepare(){
    this.offctx.clearRect(0,0,640,400);this.offctx.drawImage(this.figure,0,0,640,400);
    const data=this.offctx.getImageData(0,0,640,400).data;
    this.bodyCtx.clearRect(0,0,640,400);this.bodyCtx.drawImage(this.figure,0,0,640,400);
    this.bodyCtx.save();this.bodyCtx.globalCompositeOperation='destination-out';
    this.bodyCtx.beginPath();this.bodyCtx.ellipse(320,170,82,116,0,0,Math.PI*2);this.bodyCtx.fill();this.bodyCtx.restore();
    const step=this.mode==='inline'?5:4;
    for(let y=0;y<400;y+=step){for(let x=0;x<640;x+=step){
      const i=(y*640+x)*4,a=data[i+3];if(a<42)continue;
      const r=data[i],g=data[i+1],b=data[i+2];
      const head=((x-320)/82)**2+((y-170)/116)**2<=1;
      const seed=((x*73856093)^(y*19349663))>>>0;const rnd=(seed%1000)/1000;
      const xnorm=x/640;
      const delay=clamp(.04+xnorm*.58+((400-y)/400)*.05+(rnd-.5)*.025,0,.68);
      const travel=.30+.11*(1-rnd);
      const sx=320+(rnd-.5)*14,sy=378+(rnd-.5)*5;
      const arch=(75+95*rnd)*(head?1.18:1);
      const cpX=lerp(sx,x,.46)+(x<320?-1:1)*(18+32*rnd);
      const cpY=Math.min(sy,y)-arch;
      const p={x,y,r,g,b,a:a/255,head,delay,travel,sx,sy,cpX,cpY,rnd};
      this.points.push(p);if(head)this.headPoints.push(p);
    }}
    if(this.backdropImage.complete&&this.backdropImage.naturalWidth){
      this.bgCtx.clearRect(0,0,640,360);this.bgCtx.drawImage(this.backdropImage,0,0,640,360);
      try{const bd=this.bgCtx.getImageData(0,0,640,360).data;for(let y=0;y<360;y+=11){for(let x=0;x<640;x+=11){const i=(y*640+x)*4,r=bd[i],g=bd[i+1],b=bd[i+2],m=Math.max(r,g,b);if(m<112)continue;const cyan=b>r*1.12&&g>r*.9,amber=r>b*1.25&&g>b*.9;if(!cyan&&!amber)continue;if(((x*17+y*13)%7)>2)continue;this.bgHighlights.push({x:x/640,y:y/360,r,g,b,a:clamp((m-100)/255,.08,.45)});}}}catch{}
    }
    const names=['STRATEGY','SALES','ADS','SEO','FINANCE','STOCK','CONTENT','ANALYTICS','CRM','OPS','SEARCH','REPORTS'];
    names.forEach((name,i)=>{const a=-Math.PI*.92+i/(names.length-1)*Math.PI*1.84;this.agents.push({name,a,phase:i*.63});});
  }
  resize(){
    const r=this.container.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.dpr=Math.min(devicePixelRatio||1,this.mode==='inline'?1.5:1.75);
    this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    const widthRatio=this.mode==='inline'?.92:.58;const heightRatio=this.mode==='inline'?.90:.78;
    const s=Math.min((this.w*widthRatio)/640,(this.h*heightRatio)/400);
    const fw=640*s,fh=400*s;const cx=this.w*.5;const cy=this.mode==='inline'?this.h*.51:this.h*.52;
    this.rect={x:cx-fw/2,y:cy-fh/2,w:fw,h:fh,s};
  }
  setState(s){this.state=String(s||'IDLE').toUpperCase();}
  setLevel(v){this.level=clamp(Number(v)||0);this.lastLevelAt=performance.now();}
  setEffects(v){this.effects=!!v;if(!this.effects){this.cancel(true);this.targetYaw=this.yaw=0;this.targetPitch=this.pitch=0;}}
  setReduced(v){this.reduced=!!v;if(this.reduced)this.cancel(true);}
  replay(){if(!this.loaded){this.pendingReplay=true;return;}this.pendingReplay=false;if(this.reduced||!this.effects){this.cancel(true);return;}this.assemblyActive=true;this.assemblyStart=performance.now();this.shockActive=false;this.targetYaw=this.yaw=0;this.targetPitch=this.pitch=0;if(this.label){this.label.textContent='ASSEMBLY // 0%';this.label.classList.add('show');}if(this.backdrop)this.backdrop.style.opacity=this.mode==='inline'?'.24':'.18';}
  skip(){this.cancel(true);}
  cancel(toIdle=false){this.pendingReplay=false;this.assemblyActive=false;this.shockActive=false;if(this.label)this.label.classList.remove('show');if(this.backdrop)this.backdrop.style.opacity=this.mode==='inline'?'.58':'.64';if(toIdle)this.setState('IDLE');}
  pointer(e){if(this.reduced||!this.effects||this.assemblyActive||this.shockActive)return;const r=this.container.getBoundingClientRect();const px=e.clientX-r.left,py=e.clientY-r.top;const hx=this.mapX(320),hy=this.mapY(170),hw=this.rect.s*120,hh=this.rect.s*150;const inside=px>=hx-hw&&px<=hx+hw&&py>=hy-hh&&py<=hy+hh;if(!inside){this.targetYaw=0;this.targetPitch=0;return;}const nx=clamp((px-hx)/hw,-1,1),ny=clamp((py-hy)/hh,-1,1);this.targetYaw=nx*20;this.targetPitch=ny*-5;this.lastPointerAt=performance.now();}
  mapX(x){return this.rect.x+x*this.rect.s}mapY(y){return this.rect.y+y*this.rect.s}
  drawStaticFigure(alpha=1){const c=this.ctx;c.save();c.globalAlpha=alpha;const breath=(!this.reduced&&this.effects)?1+Math.sin(performance.now()*.00108)*.0045:1;const h=this.rect.h*breath,y=this.rect.y-(h-this.rect.h)*.36;c.drawImage(this.figure,this.rect.x,y,this.rect.w,h);c.restore();}
  drawBodyOnly(){const c=this.ctx;c.save();const breath=(!this.reduced&&this.effects)?1+Math.sin(performance.now()*.00108)*.0045:1;const h=this.rect.h*breath,y=this.rect.y-(h-this.rect.h)*.36;c.drawImage(this.bodyOff,this.rect.x,y,this.rect.w,h);c.restore();}
  drawHeadTurn(){
    const c=this.ctx,maxAngle=20,ang=this.yaw*Math.PI/180,abs=Math.min(1,Math.abs(this.yaw)/maxAngle);
    this.drawBodyOnly();

    // Keep the approved front artwork visible through the turn.
    // The head image itself is perspective-compressed, while sampled tiles add depth/detail.
    const cx=320,cy=170,rx=82,ry=116,depth=52;
    const headCX=this.mapX(cx),headCY=this.mapY(cy);
    const scaleX=Math.max(.70,Math.cos(ang)*.98);
    const shiftX=Math.sin(ang)*this.rect.s*depth*.42;

    c.save();
    c.translate(headCX+shiftX,headCY+this.pitch*.20);
    c.scale(scaleX,1);
    c.beginPath();
    c.ellipse(0,0,this.rect.s*rx,this.rect.s*ry,0,0,Math.PI*2);
    c.clip();
    c.drawImage(
      this.figure,
      cx-rx,cy-ry,rx*2,ry*2,
      -this.rect.s*rx,-this.rect.s*ry,this.rect.s*rx*2,this.rect.s*ry*2
    );

    // Clean far-side shadow rather than erasing detail.
    if(abs>.02){
      const side=this.yaw>=0?1:-1;
      const x0=-this.rect.s*rx,x1=this.rect.s*rx;
      const g=c.createLinearGradient(side>0?x0:x1,0,side>0?x1:x0,0);
      g.addColorStop(0,'rgba(0,0,0,.02)');
      g.addColorStop(.52,`rgba(0,0,0,${.05+abs*.08})`);
      g.addColorStop(1,`rgba(0,0,0,${.18+abs*.24})`);
      c.fillStyle=g;
      c.fillRect(x0,-this.rect.s*ry,this.rect.s*rx*2,this.rect.s*ry*2);
    }
    c.restore();

    // Depth tiles preserve local artwork patches and slightly grow to cover rotation gaps.
    const cos=Math.cos(ang),sin=Math.sin(ang);
    const pointSize=Math.max(1.0,this.rect.s*(1.12+abs*.20));
    c.save();
    c.globalCompositeOperation='source-over';
    c.globalAlpha=.22;
    for(const p of this.headPoints){
      const dx=p.x-cx,nx=dx/rx;
      const nz=Math.sqrt(Math.max(0,1-nx*nx));
      const z=nz*depth;
      const rdx=dx*cos+z*sin;
      const rz=-dx*sin+z*cos;
      const normalZ=nz*cos-nx*sin;
      if(normalZ<-.28)continue;
      const shade=clamp(.30+.70*((normalZ+0.28)/1.28),.30,1);
      const px=this.mapX(cx+rdx)+shiftX*.12;
      const py=this.mapY(p.y+this.pitch*.22);
      const alpha=clamp(p.a*(.34+.66*shade),.16,1);
      c.fillStyle=`rgba(${Math.round(p.r*shade)},${Math.round(p.g*shade)},${Math.round(p.b*shade)},${alpha})`;
      c.fillRect(px-pointSize*.5,py-pointSize*.5,pointSize,pointSize);
    }
    c.restore();

    // Bright leading profile line.
    if(abs>.04){
      const side=this.yaw>=0?1:-1;
      const px=this.mapX(cx)+shiftX+side*(this.rect.s*rx*scaleX*.96);
      const py=this.mapY(cy);
      c.save();
      c.globalCompositeOperation='lighter';
      c.strokeStyle=`rgba(83,237,255,${.20+abs*.60})`;
      c.lineWidth=Math.max(1,this.rect.s*(1.15+abs*.65));
      c.shadowBlur=10+abs*18;
      c.shadowColor='#47eaff';
      c.beginPath();
      c.ellipse(px,py,Math.max(3,this.rect.s*5.5),this.rect.s*ry*.92,0,-Math.PI/2,Math.PI/2);
      c.stroke();
      c.restore();
    }
  }
  drawIdleOrTurn(){
    if(this.reduced||!this.effects){this.drawStaticFigure(1);return;}
    this.yaw+=(this.targetYaw-this.yaw)*.075;this.pitch+=(this.targetPitch-this.pitch)*.07;
    if(Math.abs(this.targetYaw)<.03&&Math.abs(this.yaw)<.12){this.yaw=0;this.pitch=0;this.drawStaticFigure(1);}else this.drawHeadTurn();
  }
  drawSourceGlow(intensity=1){const c=this.ctx,cx=this.mapX(320),cy=this.mapY(380);c.save();c.globalCompositeOperation='lighter';const r=Math.max(18,this.rect.s*25)*(1+.25*Math.sin(performance.now()*.012));const g=c.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(235,255,255,${.75*intensity})`);g.addColorStop(.2,`rgba(50,232,255,${.55*intensity})`);g.addColorStop(1,'rgba(0,180,255,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();c.restore();}
  quad(a,b,c,t){const m=1-t;return m*m*a+2*m*t*b+t*t*c}
  drawAssembly(now){
    const p=clamp((now-this.assemblyStart)/ASSEMBLY_MS);if(this.label)this.label.textContent='ASSEMBLY // '+Math.round(p*100)+'%';
    const c=this.ctx;this.drawSourceGlow(1-p*.55);c.save();c.globalCompositeOperation='lighter';
    const settle=smooth(clamp((p-.925)/.075));
    for(const q of this.points){const local=clamp((p-q.delay)/q.travel);if(local<=0)continue;const t=smooth(local);let x,y;if(local<1){x=this.quad(q.sx,q.cpX,q.x,t);y=this.quad(q.sy,q.cpY,q.y,t);}else{x=q.x;y=q.y;}const px=this.mapX(x),py=this.mapY(y);const sz=Math.max(.8,this.rect.s*(q.head?1.15:1.0));const fade=local>=1?(1-settle*.72):1;c.fillStyle=`rgba(${q.r},${q.g},${q.b},${clamp(q.a*fade,0,1)})`;c.fillRect(px-sz*.5,py-sz*.5,sz,sz);}
    c.restore();
    // Dome closes, then the amber face ignites near completion.
    const ignite=smooth(clamp((p-.82)/.18));if(ignite>0){const cx=this.mapX(320),cy=this.mapY(178),r=this.rect.s*(58+24*ignite);c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(cx,cy,4,cx,cy,r);g.addColorStop(0,`rgba(255,241,174,${.20+.34*ignite})`);g.addColorStop(.28,`rgba(255,171,35,${.18+.30*ignite})`);g.addColorStop(1,'rgba(255,100,0,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();c.restore();}
    if(settle>0)this.drawStaticFigure(settle);
    if(p>=1){this.assemblyActive=false;if(this.label)this.label.classList.remove('show');this.shockActive=this.effects&&!this.reduced;this.shockStart=now;if(!this.shockActive&&this.backdrop)this.backdrop.style.opacity=this.mode==='inline'?'.58':'.64';}
  }
  drawShock(now){
    const e=clamp((now-this.shockStart)/SHOCK_MS);const c=this.ctx,cx=this.mapX(320),cy=this.mapY(177),maxR=Math.hypot(this.w,this.h)*.62,r=12+maxR*(1-Math.pow(1-e,2)),a=Math.sin(Math.PI*e)*.58;
    this.drawStaticFigure(1);c.save();c.globalCompositeOperation='lighter';c.lineWidth=1.5+1.4*(1-e);c.shadowBlur=22;c.shadowColor='#35e6ff';c.strokeStyle=`rgba(70,232,255,${a})`;c.beginPath();c.ellipse(cx,cy,r,r*.72,0,0,Math.PI*2);c.stroke();c.shadowColor='#ffaf2f';c.strokeStyle=`rgba(255,174,47,${a*.52})`;c.lineWidth=1;c.beginPath();c.ellipse(cx,cy,r+9,(r+9)*.72,0,0,Math.PI*2);c.stroke();c.restore();
    this.drawBackdropHighlights(r,a);
    if(this.backdrop)this.backdrop.style.opacity=String(lerp(this.mode==='inline'?.30:.24,this.mode==='inline'?.58:.64,smooth(e)));
    if(e>=1){this.shockActive=false;if(this.backdrop)this.backdrop.style.opacity=this.mode==='inline'?'.58':'.64';}
  }
  drawBackdropHighlights(shockR=0,shockA=0){if(!this.effects||this.reduced||!this.bgHighlights.length)return;const c=this.ctx;c.save();c.globalCompositeOperation='lighter';for(const p of this.bgHighlights){const x=p.x*this.w,y=p.y*this.h;let amp=.12+.08*Math.sin(performance.now()*.0009+(x+y)*.015);if(shockR>0){const d=Math.hypot(x-this.mapX(320),(y-this.mapY(177))/.72);const near=Math.max(0,1-Math.abs(d-shockR)/90);amp+=near*shockA*.8;}c.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.a*amp})`;c.beginPath();c.arc(x,y,1.1+(amp*.8),0,Math.PI*2);c.fill();}c.restore();}
  drawAgents(now){return;}
  drawStateFx(now){if(!this.effects||this.reduced||this.assemblyActive||this.shockActive)return;const c=this.ctx,cx=this.mapX(320),cy=this.mapY(176);c.save();c.globalCompositeOperation='lighter';if(this.state==='LISTENING'){for(let i=0;i<4;i++){const rr=this.rect.s*(74+i*22)+Math.sin(now*.003+i)*4;c.strokeStyle=`rgba(52,229,255,${.16-i*.025})`;c.lineWidth=1;c.beginPath();c.ellipse(cx,cy,rr*.77,rr,0,0,Math.PI*2);c.stroke();}}else if(this.state==='THINKING'){const pulse=.5+.5*Math.sin(now*.0042);for(let i=0;i<4;i++){const rr=this.rect.s*(39+i*15+pulse*4);c.strokeStyle=`rgba(255,174,45,${.16-i*.027})`;c.lineWidth=1;c.beginPath();c.arc(cx,cy,rr,0,Math.PI*2);c.stroke();}}else if(this.state==='SPEAKING'){const live=(performance.now()-this.lastLevelAt)<460;let lv=live?this.level:(.22+.15*Math.sin((this.speechPhase+=.11)*2)+.06*Math.sin(this.speechPhase*5.1));lv=clamp(lv);const rr=this.rect.s*(48+lv*34),g=c.createRadialGradient(cx,cy,3,cx,cy,rr);g.addColorStop(0,`rgba(255,238,169,${.18+lv*.32})`);g.addColorStop(.32,`rgba(255,162,26,${.12+lv*.20})`);g.addColorStop(1,'rgba(255,100,0,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,rr,0,Math.PI*2);c.fill();}c.restore();}
  draw(now){
    if(!this.loaded)return;const c=this.ctx;c.clearRect(0,0,this.w,this.h);this.drawBackdropHighlights();this.drawAgents(now);
    if(this.assemblyActive)this.drawAssembly(now);else if(this.shockActive)this.drawShock(now);else{this.drawIdleOrTurn();this.drawStateFx(now);}
  }
  _loop(now){const t0=performance.now();this.draw(now);this.performance.frames++;if(now-this.performance.lastFpsAt>1000){this.performance.fps=this.performance.frames*1000/(now-this.performance.lastFpsAt);this.performance.frames=0;this.performance.lastFpsAt=now;}this.performance.frameMs=performance.now()-t0;this.raf=requestAnimationFrame(this._loop);}
}

const view=$('humanoid-view'),open=$('humanoid-open'),exit=$('humanoid-exit'),stage=$('humanoid-stage'),fullCanvas=$('humanoid-fx');
const inlineWrap=$('main-humanoid-inline'),inlineCanvas=$('main-humanoid-fx');
if(!view||!open||!exit||!stage||!fullCanvas||!inlineWrap||!inlineCanvas)return;

// The old image/SVG layers are preserved in the DOM for rollback, but the artwork-driven renderer is now authoritative.
const oldFull=view.querySelector('.humanoid-entity-wrap');if(oldFull)oldFull.style.display='none';
const oldInline=inlineWrap.querySelector('.main-humanoid-figure');if(oldInline)oldInline.style.display='none';
const oldEnergy=inlineWrap.querySelector('.main-humanoid-energy-lines');if(oldEnergy)oldEnergy.style.display='none';
const original=$('humanoid-original-reference');if(original)original.src=FIGURE_SRC;

const full=new ArtworkHumanoidEngine({container:stage,canvas:fullCanvas,backdrop:$('humanoid-backdrop'),label:$('humanoid-assembly-label'),mode:'fullscreen'});
const inline=new ArtworkHumanoidEngine({container:inlineWrap,canvas:inlineCanvas,backdrop:inlineWrap.querySelector('.main-humanoid-backdrop'),label:$('main-humanoid-assembly-label'),mode:'inline'});
let realState='IDLE',visualState='IDLE',effects=true,comparing=false,lastFocus=null;
const statusEl=$('humanoid-status'),liveStateEl=$('humanoid-live-state'),voiceHud=$('humanoid-voice-hud'),techState=$('humanoid-tech-state'),techAudio=$('humanoid-tech-audio');

function updateUI(next,{preview=false}={}){next=String(next||'IDLE').toUpperCase();visualState=next;full.setState(next);inline.setState(realState);document.querySelectorAll('[data-humanoid-preview]').forEach(b=>b.classList.toggle('active',b.dataset.humanoidPreview===next));if(techState)techState.textContent=next;if(liveStateEl)liveStateEl.textContent=(preview?'Önizleme: ':'Gerçek durum: ')+next;if(voiceHud)voiceHud.textContent=next==='SPEAKING'?'PLAYBACK':next==='LISTENING'?'MIC LIVE':'STANDBY';if(statusEl)statusEl.textContent=({IDLE:'IDLE // STABLE',WAITING_WAKE_WORD:'WAITING // HEY JARVIS',LISTENING:'LISTENING // INPUT ACTIVE',THINKING:'THINKING // REASONING WEB',SPEAKING:'SPEAKING // OUTPUT ACTIVE',ERROR:'ERROR // VISUAL SAFE MODE'})[next]||next;}
function show(){lastFocus=document.activeElement;view.hidden=false;document.body.classList.add('humanoid-open');full.resize();exit.focus({preventScroll:true});full.replay();updateUI(realState,{preview:false});}
function hide(){view.hidden=true;document.body.classList.remove('humanoid-open');full.cancel(false);lastFocus?.focus?.({preventScroll:true});}
open.addEventListener('click',e=>e.preventDefault());exit.addEventListener('click',hide);$('main-humanoid-replay')?.addEventListener('click',()=>inline.replay());view.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hide();}});
$('humanoid-replay')?.addEventListener('click',()=>full.replay());$('humanoid-skip')?.addEventListener('click',()=>full.skip());
document.querySelectorAll('[data-humanoid-preview]').forEach(btn=>btn.addEventListener('click',()=>updateUI(btn.dataset.humanoidPreview,{preview:true})));
$('humanoid-effects')?.addEventListener('click',e=>{effects=!effects;full.setEffects(effects);view.classList.toggle('effects-off',!effects);e.currentTarget.setAttribute('aria-pressed',String(effects));e.currentTarget.textContent=effects?'Efektler açık':'Efektler kapalı';if(!effects)updateUI(realState);});
$('humanoid-compare')?.addEventListener('click',e=>{comparing=!comparing;view.classList.toggle('is-comparing',comparing);e.currentTarget.setAttribute('aria-pressed',String(comparing));e.currentTarget.textContent=comparing?'Görünüme dön':'Karşılaştır';});
$('humanoid-diagnostics')?.addEventListener('click',()=>{const out=$('humanoid-diagnostics-output');if(!out)return;out.textContent=[`Çalıştırma zamanı: ${new Date().toLocaleTimeString('tr-TR')}`,`Renderer: real-artwork particle engine`, `Assembly: 6.0 s`, `Shockwave: 2.5 s`,`Sampled particles: ${full.points.length}`,`Head samples: ${full.headPoints.length}`,`FPS (yaklaşık): ${full.performance.fps.toFixed(1)}`,`Render süresi: ${full.performance.frameMs.toFixed(2)} ms`,`Reduced motion: ${full.reduced?'açık':'kapalı'}`,`Efektler: ${effects?'açık':'kapalı'}`,`Gerçek durum: ${realState}`,`Görsel durum: ${visualState}`,`Voice energy: ${techAudio?.textContent||'event/fallback'}`,`Not: diagnostics yalnızca bu düğmeyle çalışır.`].join('\n');});

window.addEventListener('jarvis-state',e=>{realState=String(e.detail?.state||'IDLE').toUpperCase();inline.setState(realState);if(!full.assemblyActive&&!full.shockActive)updateUI(realState,{preview:false});});
window.addEventListener('jarvis-level',e=>{const v=clamp(Number(e.detail?.level)||0);full.setLevel(v);inline.setLevel(v);if(techAudio)techAudio.textContent='jarvis-level / playback';});
const mq=matchMedia('(prefers-reduced-motion: reduce)');const syncReduced=()=>{full.setReduced(mq.matches);inline.setReduced(mq.matches);view.classList.toggle('reduced-motion',mq.matches);if($('humanoid-tech-reduced'))$('humanoid-tech-reduced').textContent=mq.matches?'Açık':'Kapalı';};mq.addEventListener?.('change',syncReduced);syncReduced();
addEventListener('resize',()=>{inline.resize();if(!view.hidden)full.resize();});

// Every page load reconstructs the inline humanoid. Every Humanoid open reconstructs the fullscreen scene.
setTimeout(()=>inline.replay(),220);
updateUI('IDLE');
if(new URLSearchParams(location.search).get('humanoid')==='1')setTimeout(show,90);
window.JarvisHumanoidView={open:show,close:hide,replay:()=>full.replay(),skip:()=>full.skip(),setPreview:s=>updateUI(s,{preview:true}),isOpen:()=>!view.hidden,version:VERSION};
window.JarvisInlineHumanoid={replay:()=>inline.replay(),skip:()=>inline.skip(),version:VERSION};
})();
