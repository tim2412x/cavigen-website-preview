'use strict';
// Illustrative multicellular volumes, not microscopy or measured biological geometry.
for (const canvas of document.querySelectorAll('.cell-field')) {
  const ctx = canvas.getContext('2d');
  if (!ctx) continue;
  const sceneType = canvas.dataset.scene;
  const light = sceneType !== 'hero';
  let width=1, height=1, ratio=1, visible=false, raf=0, previous=0, time=0;
  let scene='neutral', blend=1, pointer={x:0,y:0}, eased={x:0,y:0};
  const count=sceneType==='hero'?10000:1800, golden=Math.PI*(3-Math.sqrt(5));
  function formation(mode) {
    return Array.from({length:count},(_,i)=>{
      const sphere=(index,n)=>{const hash=k=>{const v=Math.sin(k*127.1+311.7)*43758.5453;return v-Math.floor(v);};const y=1-2*hash(index*3+1),r=Math.sqrt(1-y*y),angle=hash(index*3+2)*Math.PI*2,depth=Math.cbrt(hash(index*3+3));return {x:Math.cos(angle)*r*depth,y:y*depth,z:Math.sin(angle)*r*depth};};
      if (mode==='culture') {
        const n=count/4,p=sphere(i%n,n), group=Math.floor(i/n);
        return {x:p.x*.47+(group%2? .57:-.57),y:p.y*.47+(group>1? .53:-.53),z:p.z*.47};
      }
      if (mode==='exchange') {
        const layer=i%2, n=Math.floor(i/2), r=Math.sqrt((n+.5)/(count/2)), a=n*golden;
        return {x:Math.cos(a)*r,y:Math.sin(a)*r,z:layer?.34:-.34};
      }
      return sphere(i,count);
    });
  }
  let points=formation(scene), from=points, target=points;
  function paused(){return document.documentElement.classList.contains('motion-paused');}
  function resize(){
    const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
    ratio=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  }
  function draw(){
    if(!width||!height)return;
    ctx.clearRect(0,0,width,height);
    const mobile=width<700 && sceneType!=='finder';
    const compact=sceneType==='finder' && height<350;
    let cx=sceneType==='hero'?(mobile?.57:.79):sceneType==='invitation'?(mobile?.5:.23):compact?.72:.51;
    let cy=sceneType==='hero'?(mobile?.20:.46):sceneType==='invitation'?(mobile?.22:.50):compact?.49:.41;
    const radius=sceneType==='hero'?Math.min(width*(mobile?.32:.18),height*.28):sceneType==='invitation'?Math.min(width*(mobile?.40:.23),height*.38):Math.min(width*.39,height*.31);
    const rotation=.35+time*.075+eased.x*.13, tilt=-.16+eased.y*.10;
    const sin=Math.sin(rotation),cos=Math.cos(rotation),st=Math.sin(tilt),ct=Math.cos(tilt);
    cx*=width;cy*=height;
    const halo=ctx.createRadialGradient(cx-radius*.2,cy-radius*.2,radius*.04,cx,cy,radius*1.3);
    halo.addColorStop(0, light?'rgba(246,251,249,.7)':'rgba(177,210,215,.16)');halo.addColorStop(.7,light?'rgba(87,133,143,.09)':'rgba(177,210,215,.06)');halo.addColorStop(1,'rgba(140,177,181,0)');
    ctx.fillStyle=halo;ctx.fillRect(cx-radius*1.5,cy-radius*1.5,radius*3,radius*3);
    const dots=points.map((p,i)=>{
      const x=p.x*cos+p.z*sin,z=p.z*cos-p.x*sin,y=p.y*ct-z*st,depth=p.y*st+z*ct;
      const perspective=3.8/(3.8-depth);
      return {x:cx+x*radius*perspective,y:cy+y*radius*perspective,z:depth,i,perspective};
    }).sort((a,b)=>a.z-b.z);
    for(const p of dots){
      const focus=Math.max(0,Math.min(1,(p.z+1)/2));
      const size=(sceneType==='hero'?3.7:6.5)*(radius/230)*p.perspective;
      const alpha=.82+focus*.18;
      const oxygen=scene==='oxygen' && p.i%9===0;
      ctx.fillStyle=sceneType==='hero'?`hsl(${164+Math.sin(p.i*2.1)*9} 15% ${19+focus*54+Math.sin(p.i*3.1)*4}%)`:oxygen?`rgba(255,140,0,${alpha})`:light?`rgba(27,85,100,${alpha})`:`rgba(235,249,249,${alpha})`;
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,size),0,Math.PI*2);ctx.fill();
      if(p.z>.1 && p.i%3===0){ctx.strokeStyle=light?'rgba(37,104,117,.14)':'rgba(231,249,249,.19)';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(p.x,p.y,size*.42,0,Math.PI*2);ctx.stroke();}
    }
    // Defocused foreground membranes create depth without obscuring the copy.
    if(sceneType==='hero'){
      for(const [dx,dy,r] of [[.96,.04,.29],[.99,.92,.25]]){
        const x=width*dx,y=height*dy,rr=Math.min(width,height)*r;
        const fog=ctx.createRadialGradient(x,y,rr*.55,x,y,rr);
        fog.addColorStop(0,'rgba(218,233,232,0)');fog.addColorStop(.7,'rgba(218,233,232,.12)');fog.addColorStop(.85,'rgba(218,233,232,.06)');fog.addColorStop(1,'rgba(218,233,232,0)');
        ctx.fillStyle=fog;ctx.fillRect(x-rr,y-rr,rr*2,rr*2);
      }
    }
  }
  function tick(stamp){
    raf=0;if(!visible||document.hidden||paused())return;
    if(stamp-previous>=30){
      const delta=Math.min((stamp-previous)/1000,.05);previous=stamp;time+=delta;
      eased.x+=(pointer.x-eased.x)*.05;eased.y+=(pointer.y-eased.y)*.05;
      if(blend<1){blend=Math.min(1,blend+delta/1.2);const t=1-Math.pow(1-blend,4);points=target.map((p,i)=>({x:from[i].x+(p.x-from[i].x)*t,y:from[i].y+(p.y-from[i].y)*t,z:from[i].z+(p.z-from[i].z)*t}));}
      draw();
    }
    raf=requestAnimationFrame(tick);
  }
  function sync(){if(raf)cancelAnimationFrame(raf);raf=0;if(paused()){points=target;blend=1;draw();}else if(visible&&!document.hidden){previous=performance.now();raf=requestAnimationFrame(tick);}}
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'50px'}).observe(canvas);else visible=true;
  canvas.parentElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const rect=canvas.getBoundingClientRect();pointer={x:(e.clientX-rect.left)/width-.5,y:(e.clientY-rect.top)/height-.5};},{passive:true});
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('cavigen:motion',sync);
  document.addEventListener('cavigen:scene',event=>{if(sceneType!=='finder')return;scene=event.detail.scene;from=points.map(p=>({...p}));target=formation(scene);blend=0;sync();});
  resize();sync();
}
