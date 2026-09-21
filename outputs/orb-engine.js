(()=>{'use strict';
const LABEL={IDLE:'HAZIR',WAITING_WAKE_WORD:'UYANDIRMA BEKLİYOR',LISTENING:'DİNLİYOR',THINKING:'DÜŞÜNÜYOR',SPEAKING:'KONUŞUYOR',ERROR:'SİSTEM UYARISI'};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function compactOrb(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)return;let mode='IDLE',level=0,frame=0,w=1,h=1;
 const particles=Array.from({length:180},(_,i)=>({a:i*2.3999,r:.55+(i%19)/40,s:1+(i%3)}));
 function size(){const rect=canvas.parentElement.getBoundingClientRect();w=Math.max(1,rect.width);h=Math.max(1,rect.height);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
 const ro=new ResizeObserver(size);ro.observe(canvas.parentElement);size();
 window.addEventListener('jarvis-state',e=>{mode=String(e.detail?.state||'IDLE').toUpperCase();level=e.detail?.level||0;canvas.dataset.state=mode;const state=document.getElementById('state');if(state)state.textContent=LABEL[mode]||mode;});
 window.addEventListener('jarvis-level',e=>{level=clamp(Number(e.detail?.level)||0);});
 function render(now){if(!canvas.isConnected)return;ctx.clearRect(0,0,w,h);const x=w/2,y=h/2,r=Math.min(w,h)*.31,t=now/1000,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;const pulse=['SPEAKING','LISTENING'].includes(mode)?level:motion?Math.sin(t)*.025:0;ctx.save();ctx.translate(x,y);const glow=ctx.createRadialGradient(0,0,r*.15,0,0,r*1.4);glow.addColorStop(0,'#00dfff30');glow.addColorStop(.7,'#009de315');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);for(let ring=0;ring<7;ring++){const radius=r*(.50+ring*.092)*(1+pulse*.1);ctx.strokeStyle=ring===1?'#efffff':ring%2?'#03baff':'#37eaff';ctx.globalAlpha=.85-ring*.075;ctx.lineWidth=ring===1?2:1;ctx.shadowColor='#00c8ff';ctx.shadowBlur=ring===1?18:6;ctx.beginPath();const offset=(motion?t*(mode==='THINKING'?.6:.07):0)*(ring%2?1:-1);ctx.arc(0,0,radius,offset,offset+Math.PI*(ring%2?1.72:2));ctx.stroke();}ctx.shadowBlur=0;ctx.globalAlpha=.7;for(const p of particles){const a=p.a+(motion?t*.03:0),radius=r*(p.r+.3+pulse*.15);ctx.fillStyle=p.s===3?'#e5ffff':'#19caff';ctx.beginPath();ctx.arc(Math.cos(a)*radius,Math.sin(a)*radius,p.s*.55,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.fillStyle='#d9fbff';ctx.textAlign='center';ctx.font='600 16px Arial';ctx.fillText('J.A.R.V.I.S',0,0);ctx.font='10px Arial';ctx.fillStyle='#64ddef';ctx.fillText(LABEL[mode]||mode,0,25);ctx.restore();frame=requestAnimationFrame(render);}frame=requestAnimationFrame(render);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);ro.disconnect();},{once:true});
 window.JarvisOrb={getState:()=>mode};
}
function boot(){const canvas=document.getElementById('jarvis-orb');if(canvas)compactOrb(canvas);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
