const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../motion.js'),'utf8');
for(const scene of ['hero','invitation']){
 let arcs=0,draws=0,maxRadius=0;const gradient={addColorStop(){}};
 const ctx=new Proxy({createRadialGradient:()=>gradient,drawImage(image,...args){assert.ok(args.every(Number.isFinite));draws++;},arc(x,y,r){assert.ok([x,y,r].every(Number.isFinite));assert.ok(r>0);arcs++;maxRadius=Math.max(maxRadius,r);},ellipse(...args){assert.ok(args.every(Number.isFinite));}}, {get:(t,k)=>t[k]||(()=>{})});
 const canvas={dataset:{scene},getContext:()=>ctx,getBoundingClientRect:()=>({width:1280,height:800}),parentElement:{addEventListener(){}}};
 const sandbox={document:{querySelectorAll:()=>[canvas],createElement:()=>({getContext:()=>new Proxy({createRadialGradient:()=>gradient},{get:(t,k)=>t[k]||(()=>{})})}),documentElement:{classList:{contains:()=>false}},addEventListener(){}},window:{devicePixelRatio:1,addEventListener(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0}};
 vm.runInNewContext(source,sandbox);
 assert.ok(scene==='hero'?draws>800:arcs>1000);
 if(scene==='invitation')assert.ok(maxRadius<8,'Invitation must use small independent particles');
}
console.log('PASS: finite coordinates and separate particle sizes for hero and invitation.');
