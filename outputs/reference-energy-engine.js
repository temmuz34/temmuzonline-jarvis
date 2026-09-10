(() => {
  'use strict';
  const canvas = document.getElementById('aiHumanoid');
  const ctx = canvas.getContext('2d', { alpha: false });
  const replay = document.getElementById('replay');
  const label = document.getElementById('state');
  const TAU = Math.PI * 2;
  const clamp = v => Math.max(0, Math.min(1, v));
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;
  const point = (x, y) => ({ x, y });
  let seed = 48131;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const curves = [];
  const fibers = [];
  const sparks = [];
  const crown = Array.from({length:1400}, () => ({
    spread:rand()*2-1, phase:rand(), speed:.16+rand()*.23,
    lift:65+rand()*145, size:.65+rand()*1.3, sway:rand()*TAU
  }));
  const coreDust = Array.from({length:1900}, () => ({
    angle:rand()*TAU, radius:Math.pow(rand(),.7), depth:rand(), phase:rand()*TAU
  }));
  let width = 1, height = 1, scale = 1, offsetY = 0, raf = 0;
  let started = performance.now() + 500;
  let lastFrame = -Infinity;

  function bezier(a, b, c, d, t) {
    const q = 1 - t;
    return point(q*q*q*a.x + 3*q*q*t*b.x + 3*q*t*t*c.x + t*t*t*d.x,
      q*q*q*a.y + 3*q*q*t*b.y + 3*q*t*t*c.y + t*t*t*d.y);
  }
  function sample(a, b, c, d, count = 64) {
    return Array.from({ length: count }, (_, i) => bezier(a, b, c, d, i / (count - 1)));
  }
  function add(points, start, duration, color = '#10cfff', strength = .6, weight = .85, kind = 'body') {
    curves.push({ points, flowing: points.map(p => point(p.x,p.y)), start, duration, color, strength, weight, kind, seed: rand() * TAU });
  }
  function mirror(points) { return points.map(p => point(1000 - p.x, p.y)); }

  // A continuous cranial profile with temples and a tapered jaw, not an ellipse.
  const skull = [
    ...sample(point(500,195),point(361,190),point(354,302),point(365,399)),
    ...sample(point(365,399),point(370,471),point(415,550),point(500,564)).slice(1)
  ];
  function halfWidth(y) {
    const index = skull.findIndex(p => p.y >= y);
    if (index <= 0) return 0;
    const a = skull[index - 1], b = skull[index];
    return 500 - mix(a.x, b.x, (y - a.y) / Math.max(.001, b.y - a.y));
  }

  for (const side of [-1, 1]) {
    const sx = x => side < 0 ? x : 1000 - x;
    const start = side < 0 ? 4800 : 5550;
    // Fine parallel capillaries concentrate light at the silhouette edge.
    for (let j = 0; j < 2; j++) {
      const rim = skull.map(p => point(sx(p.x - j * 1.5), p.y));
      add(side < 0 ? rim.reverse() : rim, start + j * 18, 960, '#22c8ff', .78, .38, 'rim');
    }
    // Ear contours stay abstract and contain no portrait features.
    for (let j = 0; j < 1; j++) {
      const ear = sample(point(sx(367),365), point(sx(337-j),327), point(sx(350-j),441), point(sx(382),460));
      add(ear, start + 240 + j * 24, 750, '#22c8ff', .64, .38, 'rim');
    }
    // Jaw-to-clavicle flow continues into the rounded shoulder and upper chest.
    for (let i = 0; i < 38; i++) {
      const u = i / 37;
      let body = sample(
        point(405 + 86*u, 491 + 76*u),
        point(420 + 51*u, 590 + 92*u),
        point(421 - 147*u, 625 + 85*u),
        point(234 - 108*u, 645 + 125*u));
      const tail = sample(body[body.length-1],
        point(108 + 79*u, 640 + 93*u),
        point(93 + 320*u, 832 + 120*u),
        point(278 + 209*u, 896 + 85*u));
      body = body.concat(tail.slice(1));
      if (side > 0) body = mirror(body);
      add(body, (side < 0 ? 4550 : 5660) + u*380, 1130, i % 6 ? '#087cff' : '#1de4ff', .22 + (1-u)*.16, .72);
    }
    // Separate hairline fibers follow the neck into the shoulder crest.
    for (let i = 0; i < 2; i++) {
      let p = sample(point(402-i*.8,504),point(418-i,597),point(386-i,617),point(260-i,642+i*1.5));
      p = p.concat(sample(p[p.length-1],point(159,643+i*1.5),point(119,673+i*1.5),point(106,760+i*1.5)).slice(1));
      add(side < 0 ? p : mirror(p), side < 0 ? 4750 : 5900, 1160, '#22c8ff', .76, .38, 'rim');
    }
  }

  // Nested pectoral contours fill the chest volume under the clavicles.
  for(const side of [-1,1]) for(let i=0;i<30;i++){
    const u=i/29;
    let p=sample(point(497-12*u,891+u*91),point(435-40*u,705+u*123),
      point(239-43*u,603+u*187),point(139-25*u,790+u*147),96);
    for(let j=1;j<p.length-1;j++)p[j].y+=Math.sin(j*.18+i*.35)*1.1;
    if(side>0)p=mirror(p);
    add(p,(side<0?5050:6020)+i*7,1070,i%9?'#0087e6':'#10ccff',.38,.45,'chest');
  }

  // Face bands reveal from their shared center toward both sides.
  for (let i = 0; i < 42; i++) {
    const u = i / 41, y = 207 + u*343, hw = halfWidth(y);
    const bulge = Math.sin((u-.42)*Math.PI)*24;
    const left = [];
    for (let j = 0; j <= 52; j++) {
      const x = j / 52;
      left.push(point(500-x*hw, y+(1-x*x)*bulge + Math.sin(x*15+u*9)*.6));
    }
    const reveal = 5400 + Math.abs(u-.56)*560;
    add(left, reveal, 1070, '#16cfff', .52, .55, 'face');
    add(mirror(left), reveal+55, 1070, '#16cfff', .52, .55, 'face');
  }

  // Gold neural branches are actual curved paths, spread through the neck/chest.
  for (let i = 0; i < 16; i++) {
    const side = i%2 ? 1 : -1, u = Math.floor(i/2)/7;
    const p = sample(point(500+side*(12+u*62),566+u*42),
      point(500+side*40,636+u*45),point(500+side*(4+u*24),748),point(500+side*4,810+u*25));
    for (let j=1; j<p.length-1; j++) p[j].x += Math.sin(j*.83+i*1.7)*(1+u*2.4);
    add(p, 5900 + u*410, 1040, i%5 ? '#ff9c20' : '#ffcf6c', .4, .48, 'throat');
  }
  const throatPaths=curves.filter(c=>c.kind==='throat');
  const chestPaths=curves.filter(c=>c.kind==='chest');
  // Junctions attach to real points on both networks, including during motion.
  for(const side of [-1,1])for(let i=0;i<12;i++){
    const throat=throatPaths[(i%8)*2+(side>0?1:0)];
    const chest=chestPaths[(side>0?30:0)+i*2];
    const rootIndex=36+i*2,tipIndex=38+i;
    const root=throat.points[rootIndex],tip=chest.points[tipIndex];
    const p=sample(root,point(root.x+side*(25+i*2),root.y-32),
      point(tip.x-side*35,tip.y-55),tip,72);
    for(let j=1;j<p.length-1;j++){
      p[j].y+=Math.sin(j*.49+i)*1.5*Math.sin(j/(p.length-1)*Math.PI);
    }
    add(p,6350+i*30,1000,'#35caff',.54,.42,'junction');
    curves[curves.length-1].attachment={throat,chest,rootIndex,tipIndex};
  }
  // Short tributaries share the parent anatomy and taper into neighboring fibers.
  for(const parent of curves.filter(c=>c.kind==='body').filter((_,i)=>i%5===0)){
    const first=Math.floor(parent.points.length*.27),last=Math.floor(parent.points.length*.58);
    const branch=parent.points.slice(first,last).map((p,i,all)=>{
      const u=i/(all.length-1),side=p.x<500?-1:1;
      return point(p.x+side*Math.sin(u*Math.PI*.5)*14,p.y+u*u*9);
    });
    add(branch,parent.start+parent.duration*.27,620,'#21bcff',.3,.45,'vein');
  }
  // Coherent branched fiber fields behind the body, with independent phases.
  for (const side of [-1,1]) for (let i=0; i<100; i++) {
    fibers.push({ side, family:i%7, spread:rand(), jitter:rand(), phase:rand()*TAU,
      warm:i%13===0, flare:i%25===3, speed:.35+rand()*.65 });
  }
  for (let i=0;i<950;i++) sparks.push({ x:rand()*1000,y:rand()*1000,phase:rand()*TAU,r:.4+rand()*.9 });

  function resize() {
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.75);
    width=Math.max(1,r.width);height=Math.max(1,r.height);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    scale=Math.min(width/1000,height/1000);offsetY=(height-1000*scale)/2;
  }
  function path(points, progress, color, alpha, weight=1) {
    if(progress<=0||alpha<=0)return;
    const end=(points.length-1)*clamp(progress),last=Math.floor(end);
    ctx.fillStyle=color;ctx.shadowBlur=0;
    // Arc-length spacing with stable jitter prevents a regular dot matrix.
    const displaySpacing=Math.max(1,Math.min(1.7,.72/scale));
    let carry=2.5, serial=0;
    for(let j=1;j<=Math.min(last+1,points.length-1);j++){
      const a=points[j-1],b=points[j],fraction=Math.min(1,end-j+1);
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if(len<.001||fraction<=0)continue;
      const limit=len*fraction;
      while(carry<limit){
        const u=carry/len;
        const hash=Math.sin(serial*127.1+points[0].y*31.7+points[0].x*17.3)*43758.5453;
        const noise=hash-Math.floor(hash);
        const jitter=(noise-.5)*2.2;
        const x=a.x+dx*u-dy/len*jitter,y=a.y+dy*u+dx/len*jitter;
        const radius=(.95+noise*.35)*Math.max(.95,weight)*Math.sqrt(displaySpacing);
        ctx.globalAlpha=Math.min(1,alpha*(.8+noise*1.6));
        ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
        carry+=(7.5+noise*3.5)*displaySpacing;serial++;
      }
      carry-=limit;
    }
  }
  function glow(x,y,r,color,alpha) {
    ctx.shadowBlur=0;ctx.globalAlpha=alpha;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color);g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  function capillary(points,progress,color,alpha,weight,clock,seed,kind){
    if(progress<=0)return;
    const end=(points.length-1)*clamp(progress),last=Math.floor(end);
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<=last;i++){
      const p=points[i];
      const gap=kind!=='rim'&&Math.sin(i*1.31+seed*11)>.92;
      if(gap)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    if(last<points.length-1){
      const a=points[last],b=points[last+1];
      ctx.lineTo(mix(a.x,b.x,end-last),mix(a.y,b.y,end-last));
    }
    const edge=kind==='rim',pulse=.9+.1*Math.sin(clock*1.3+seed);
    ctx.strokeStyle=edge?'#007aff':color;
    ctx.lineWidth=edge?2.2:1.8;ctx.globalAlpha=Math.min(1,alpha*(edge?.55:.12)*pulse);
    ctx.shadowColor='#008cff';ctx.shadowBlur=(edge?17:3)*scale;ctx.stroke();
    if(edge){
      ctx.lineWidth=.9;ctx.globalAlpha=alpha*.65*pulse;
      ctx.strokeStyle='#009dff';ctx.shadowBlur=6*scale;ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.strokeStyle=color;ctx.lineWidth=weight;
    ctx.globalAlpha=Math.min(.9,alpha*(edge?1.25:1)*pulse);ctx.stroke();
  }
  const route = [
    [point(-80,650),point(230,740),point(535,575),point(818,589)],
    [point(818,589),point(950,476),point(850,195),point(630,156)],
    [point(630,156),point(354,42),point(266,431),point(433,459)]
  ];
  function routePoint(time) {
    const n=time<2200?0:time<3400?1:2;
    const times=[[600,2200],[2200,3400],[3400,4600]][n];
    return bezier(...route[n],smooth(phase(time,...times)));
  }
  function stream(time) {
    if(time<600||time>4860)return;
    const fade=1-phase(time,4600,4860);
    for(let lane=0;lane<22;lane++){
      const pts=[];
      for(let j=0;j<52;j++){
        const t=time-520+j*10,p=routePoint(t),sp=(lane-11)*1.7;
        pts.push(point(p.x+Math.sin(t*.011+lane)*sp*.45,p.y+Math.cos(t*.009+lane)*sp));
      }
      path(pts,1,lane%9?'#00dfff':'#ffa63a',fade*.22,.8,4);
    }
    const front=routePoint(time);
    glow(front.x,front.y,28,'#06cfff',.8*fade);
  }
  function energy(time, clock) {
    for(const f of fibers){
      const reveal=phase(time,f.side<0?1800:2650,7100);
      if(!reveal)continue;
      const pts=[];
      for(let j=0;j<64;j++){
        const u=j/63,extent=u*(440+f.spread*90);
        const base=598 + f.family*28;
        const spread=(f.spread-.5)*90;
        const wave=Math.sin(u*10+f.family*1.4+clock*f.speed)*u*58
          +Math.sin(u*28+f.family*.8-clock*.6+f.phase*.15)*u*23
          +Math.sin(u*51+f.phase-clock*.8)*u*5;
        pts.push(point(500+f.side*(105+extent),base+spread*u-100*u+wave+f.jitter*8));
      }
      const col=f.warm?'#ff9d32':f.family%2?'#0080ff':'#00bfff';
      if(f.family%3===0)capillary(pts,reveal,col,.17,.42,clock,f.phase,'vein');
      path(pts,reveal,col,.13+(f.warm?.12:0),.7,3);
      if(f.flare&&time>6900){
        const cycle=((clock+f.phase*.8)%4.8)/4.8;
        const burst=Math.pow(Math.max(0,Math.sin(cycle*Math.PI)),10)*phase(time,6900,8000);
        capillary(pts,reveal,'#39caff',.28+burst*.68,.5,clock,f.phase,'rim');
        const head=Math.floor(8+cycle*54),start=Math.max(0,head-8);
        capillary(pts.slice(start,head+1),1,'#9be9ff',burst,.65,clock,0,'vein');
        const at=pts[head];
        glow(at.x,at.y,12+burst*17,'#008cff',burst*.52);
        for(let k=0;k<9;k++){
          const angle=k/9*TAU+f.phase,r=(6+cycle*22)*(1+k%3*.22);
          ctx.fillStyle='#6adfff';ctx.globalAlpha=burst*(.3+k%3*.13);
          ctx.beginPath();ctx.arc(at.x+Math.cos(angle)*r,at.y+Math.sin(angle)*r,.9,0,TAU);ctx.fill();
        }
      }
      if(time>6000){const idx=Math.floor(((clock*.07+f.spread)%1)*62),p=pts[idx];glow(p.x,p.y,4,col,.6);}
    }
  }
  function halo(time,clock) {
    const t=phase(time,6400,6800);if(!t)return;
    const pop=t<.7?mix(.02,1.10,smooth(t/.7)):mix(1.10,1,(t-.7)/.3);
    for(let i=7;i>=0;i--){
      const visible=i===0?t:phase(time,6800+i*45,7450+i*45);if(!visible)continue;
      ctx.globalAlpha=(.28-i*.024)*visible;ctx.fillStyle='#087fc9';ctx.shadowBlur=0;
      const radius=(199+i*33)*pop;
      ctx.beginPath();
      for(let j=0;j<360;j++){
        const angle=j/360*TAU+clock*.008;
        const x=500+Math.cos(angle)*radius,y=391+Math.sin(angle)*radius;
        ctx.moveTo(x+.6,y);ctx.arc(x,y,.6,0,TAU);
      }
      ctx.fill();
    }
  }
  function core(time,clock) {
    const p=smooth(phase(time,5400,7050));if(!p)return;
    const pulse=.92+Math.sin(clock*2)*.08;
    ctx.save();
    // Keep the enlarged light inside the existing head silhouette.
    ctx.beginPath();ctx.moveTo(skull[0].x,skull[0].y);
    for(const v of skull)ctx.lineTo(v.x,v.y);
    for(let i=skull.length-1;i>=0;i--)ctx.lineTo(1000-skull[i].x,skull[i].y);
    ctx.closePath();ctx.clip();
    ctx.translate(500+Math.sin(clock*.7)*2,435);ctx.scale(.95,1.08);
    glow(0,0,mix(6,181,p),'#c75600',p*.5*pulse);
    glow(0,0,mix(3,132,p),'#ff8c06',p*.56*pulse);
    for(const s of coreDust){
      const r=s.radius*115*p;
      const x=Math.cos(s.angle)*r*.76+Math.sin(clock+s.phase)*2;
      const y=Math.sin(s.angle)*r;
      ctx.globalAlpha=p*pulse*(1-s.radius)*(.18+s.depth*.3);
      ctx.fillStyle=s.radius<.27?'#ffe2a2':s.depth>.6?'#ffb02e':'#ff7900';
      ctx.beginPath();ctx.arc(x,y,.6+s.depth*.75,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  function flowContour(c,clock) {
    const n=c.points.length;
    for(let i=0;i<n;i++){
      const base=c.points[i],before=c.points[Math.max(0,i-1)],after=c.points[Math.min(n-1,i+1)];
      const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
      const distance=Math.abs(base.x-500),body=phase(base.y,525,680);
      const taper=Math.sin(Math.PI*i/(n-1));
      // Spatially coherent waves keep adjacent fibers flowing together.
      const wave=Math.sin(distance*.052+base.y*.027-clock*1.1)*(1.7+body*4.2)
        +Math.sin(distance*.13-base.y*.019+clock*.75+c.seed*.1)*(0.65+body*1.5);
      const shift=wave*taper;
      c.flowing[i].x=base.x-dy/length*shift;
      c.flowing[i].y=base.y+dx/length*shift;
    }
    if(c.attachment){
      const {throat,chest,rootIndex,tipIndex}=c.attachment;
      const root=throat.flowing[rootIndex],tip=chest.flowing[tipIndex];
      const dx0=root.x-c.flowing[0].x,dy0=root.y-c.flowing[0].y;
      const dx1=tip.x-c.flowing[n-1].x,dy1=tip.y-c.flowing[n-1].y;
      for(let i=0;i<n;i++){
        c.flowing[i].x+=mix(dx0,dx1,i/(n-1));
        c.flowing[i].y+=mix(dy0,dy1,i/(n-1));
      }
    }
    return c.flowing;
  }
  function entity(time,clock) {
    const flightOrigin=routePoint(4600);
    for(const c of curves){
      const progress=phase(time,c.start,c.start+c.duration);
      if(time<c.start-620)continue;
      const flowing=flowContour(c,clock);
      if(progress>0){
        const pulse=.86+.14*Math.sin(clock*1.6+c.seed);
        let vesselColor=c.color;
        if(c.kind==='junction'){
          const a=flowing[0],b=flowing[flowing.length-1];
          vesselColor=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
          vesselColor.addColorStop(0,'#ffb13d');vesselColor.addColorStop(.28,'#e9be6c');
          vesselColor.addColorStop(.6,'#32cfff');vesselColor.addColorStop(1,'#008aff');
        }
        capillary(flowing,progress,vesselColor,c.strength,c.weight,clock,c.seed,c.kind);
        path(flowing,progress,c.color,c.strength*.95*pulse,c.weight);
        if(progress<1){
          const at=(flowing.length-1)*progress,j=Math.floor(at),p=flowing[j],b=flowing[Math.min(j+1,flowing.length-1)];
          glow(mix(p.x,b.x,at-j),mix(p.y,b.y,at-j),5,c.color,.65);
        }
      }
      // Each arriving particle shares its arrival time with the corresponding path segment.
      if(time<c.start-530||time>c.start+c.duration)continue;
      for(let k=0;k<5;k++){
        const along=(k+1)/5,arrival=c.start+c.duration*along;
        const f=phase(time,arrival-620,arrival);if(f<=0||f>=1)continue;
        const target=flowing[Math.floor(along*(flowing.length-1))];
        const p=bezier(flightOrigin,point(240+Math.sin(c.seed)*220,190),
          point(target.x+Math.sin(c.seed)*80,target.y-115),target,smooth(f));
        ctx.globalAlpha=.6;ctx.fillStyle=c.color;ctx.shadowBlur=0;ctx.fillRect(p.x,p.y,1.65,1.65);
      }
    }
  }
  function shimmer(time,clock) {
    ctx.shadowBlur=0;
    for(let i=0;i<sparks.length;i++){
      const s=sparks[i];let a=.07;
      if(time>4700){const nearHead=Math.abs(s.x-500)<190&&s.y>110&&s.y<580;a=nearHead?.5:.13;}
      ctx.globalAlpha=a*(.3+.7*Math.pow(.5+.5*Math.sin(clock*2+s.phase),3));
      ctx.fillStyle=i%19?'#009dff':'#ffb343';ctx.fillRect(s.x+Math.sin(clock+s.phase)*2,s.y+Math.cos(clock*.8+s.phase)*2,s.r,s.r);
    }
    const p=phase(time,4800,6700);if(!p)return;
    for(let i=0;i<140;i++){
      const u=(i%127)/126,y=195+u*356,side=i%2?1:-1;
      const x=500+side*(halfWidth(y)+3+Math.sin(i*14.7)*9);
      ctx.globalAlpha=p*(.12+.3*(.5+.5*Math.sin(clock*1.4+i)));
      ctx.fillStyle='#00cfff';ctx.fillRect(x,y+Math.sin(clock+i)*2,1,1);
    }
  }
  function crownFlow(time,clock){
    const visible=smooth(phase(time,5350,7300));if(!visible)return;
    // A visual pulse, independent of microphone input.
    const pulse=.65+.35*Math.pow(.5+.5*Math.sin(clock*2.7),2);
    ctx.shadowBlur=0;
    for(const s of crown){
      const age=(clock*s.speed+s.phase)%1;
      const spread=s.spread*(107+age*58);
      const rootY=198+Math.pow(Math.abs(s.spread),2)*67;
      const x=500+spread+Math.sin(clock*1.5+s.sway+age*7)*(3+age*12);
      const y=rootY-age*s.lift*(.65+pulse*.55);
      ctx.globalAlpha=visible*Math.sin(Math.PI*age)*(.4+.5*pulse)*(1-age*.65);
      ctx.fillStyle=s.size>1.6?'#7cefff':'#009dff';
      ctx.beginPath();ctx.arc(x,y,s.size*(1-age*.3),0,TAU);ctx.fill();
    }
  }
  function render(now){
    raf=requestAnimationFrame(render);
    if(now-lastFrame<1000/30)return;lastFrame=now;
    const elapsed=Math.max(0,Math.min(now-started,10000)),clock=now*.001;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.fillStyle='#02090d';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate((width-1000*scale)/2,offsetY);ctx.scale(scale,scale);
    ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
    energy(elapsed,clock);halo(elapsed,clock);core(elapsed,clock);stream(elapsed);entity(elapsed,clock);shimmer(elapsed,clock);crownFlow(elapsed,clock);
    ctx.restore();
    const state=elapsed<600?'BAŞLATILIYOR':elapsed<4600?'ENERJİ AKIŞI':elapsed<7600?'OLUŞUM':'TEMMUZONLINE / HAZIR';
    if(label.textContent!==state)label.textContent=state;
    canvas.dataset.phase=elapsed<600?'blank':elapsed<2200?'sweep':elapsed<3400?'rise':elapsed<4600?'orbit':elapsed<7600?'formation':'ready';
  }
  function restart(){cancelAnimationFrame(raf);started=performance.now()+500;lastFrame=-Infinity;render(performance.now());}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  replay.onclick=restart;raf=requestAnimationFrame(render);
  window.__restartAIHumanoid=restart;
  window.__destroyAIHumanoid=()=>{cancelAnimationFrame(raf);observer.disconnect();};
  window.addEventListener('pagehide',window.__destroyAIHumanoid,{once:true});
})();
