const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),sandbox={};vm.runInNewContext(fs.readFileSync(path.join(root,'product-model.js'),'utf8'),sandbox);
const points=sandbox.CaviModels.packedCells();assert.ok(points.length<=100);
for(let angle=0;angle<Math.PI*2;angle+=.1)for(const [x,y,z] of points){
 const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=z*Math.cos(angle)-x*Math.sin(angle);
 assert.ok([rx,y,rz].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(rx,y,rz)-Math.hypot(x,y,z))<1e-9,'Rotation must preserve the aggregate without wobble.');
}
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')))assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/class="cell-field"|src="motion.js/);
console.log('PASS: maximum 100 cells, rigid rotation and no old particle-field renderer.');

const {homePose,createStoryProduct,exchangePoint}=sandbox.CaviModels;
assert.equal(homePose(0).chapter,0);assert.equal(homePose(.4).chapter,1);assert.equal(homePose(.72).chapter,2);assert.equal(homePose(.96).chapter,3);
assert.equal(homePose(.4).porosity,0);assert.equal(homePose(.4).flow,0);assert.equal(homePose(.4).coating,1);
assert.equal(homePose(.72).porosity,1);assert.equal(homePose(1).oxygen,1);assert.equal(homePose(1).flow,0);
let last=homePose(0);
for(let t=.001;t<=1;t+=.001){const next=homePose(t);for(const k of ['distance','elevation','azimuth','cut']){assert.ok(Number.isFinite(next[k]));assert.ok(Math.abs(next[k]-last[k])<.04,`Discontinuous hero ${k}`);}last=next;}
const hero=createStoryProduct(true),material=hero.children.find(o=>o.userData.cavities).material;
assert.equal(material.userData.frequency.value,48);assert.equal(material.userData.poreSize.value,.11);assert.equal(material.userData.pores.value,0);
assert.ok(.11/48<(.19/24)/3,'Hero pores must be more than three times smaller in radius.');
for(let i=0;i<80;i++){
 const phase=(.5-i*.127%1+1)%1,p=exchangePoint(i,phase/.18,.048,48);
 assert.ok(Math.abs(Math.hypot(...p)-.048)<1e-8);
 for(const a of [p[0],p[2]])assert.ok(Math.abs(((a/.048*48)%1+1)%1-.5)<1e-8);
}
assert.ok(.000085<.048*.11/48,'Molecules must fit through the smaller hero pores.');
assert.ok(hero.children.some(o=>o.userData.heroFlow));assert.ok(hero.children.some(o=>o.userData.heroHalo));
console.log('PASS: hero chapter order, continuous zoom, coating before pores, small-pore crossings and oxygen finale.');
const {mediumPoint,mediumWidth}=sandbox.CaviModels;
assert.ok(homePose(.5).porosity>0,'Pores should open earlier in the PoroSphere chapter.');
assert.equal(homePose(.55).porosity,1);assert.equal(homePose(.5).chapter,2);
assert.equal(homePose(.72).interaction,1);assert.equal(homePose(1).interaction,0);
for(let lane=0;lane<10;lane++)for(const centre of [-.112,0,.112])for(const side of [-1,1]){
 const x=centre+side*32.5/48*.048,p=mediumPoint(lane,(x+.19)/.38);
 assert.ok(Math.abs(Math.hypot(p[0]-centre,p[1],p[2])-.048)<1e-9,'Medium must enter and leave each cavity through its wall.');
 for(const v of [(p[0]-centre)/.048,p[2]/.048])assert.ok(Math.abs(((v*48)%1+1)%1-.5)<1e-9,'Flow must meet a real pore.');
 assert.ok(mediumWidth(x,lane)<.048*.11/48,'Stream must narrow at the fine pores.');
}
assert.ok(hero.children.some(o=>o.userData.heroNeighbours));
console.log('PASS: earlier porosity, three connected cavities, inward/outward flow through actual fine pores and interaction phase.');

for(let lane=0;lane<10;lane++)for(let t=0;t<=1;t+=.01){
 const p=mediumPoint(lane,t);
 for(const c of points){
  const ratio=.048/.188,centre=[c[0]*ratio,c[1]*ratio-.101*ratio,c[2]*ratio];
  assert.ok(Math.hypot(...p.map((v,i)=>v-centre[i]))>.0185*ratio*1.1,'Nutrients must flow around retained cells.');
 }
}
console.log('PASS: nutrient paths clear the retained cell aggregate.');
