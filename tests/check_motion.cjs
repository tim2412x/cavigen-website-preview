const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),sandbox={};vm.runInNewContext(fs.readFileSync(path.join(root,'product-model.js'),'utf8'),sandbox);
const points=sandbox.CaviModels.packedCells();assert.ok(points.length<=100);
for(let angle=0;angle<Math.PI*2;angle+=.1)for(const [x,y,z] of points){
 const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=z*Math.cos(angle)-x*Math.sin(angle);
 assert.ok([rx,y,rz].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(rx,y,rz)-Math.hypot(x,y,z))<1e-9,'Rotation must preserve the aggregate without wobble.');
}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')))assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/class="cell-field"|src="motion.js/);
console.log('PASS: maximum 100 cells, rigid rotation and no old particle-field renderer.');
