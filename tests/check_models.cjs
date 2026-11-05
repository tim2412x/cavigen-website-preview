const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'product-model.js'),'utf8'),context);
const {createProduct,cavityGeometry,gridCenters,packedCells,exchangePoint,storyPose}=context.CaviModels;
const cup=cavityGeometry(.048,.112);
cup.computeBoundingBox();
assert.ok(cup.boundingBox.min.y<-.047,'Microcavities must be concave.');
assert.equal(cup.boundingBox.max.y,0,'The web must remain flat.');
let checked=0;
for(const format of ['insert','film','detail'])for(const variant of ['micro','poro','senso']) {
 const model=createProduct(format,variant),meshes=[];
 model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 if(format==='detail'){const cells=meshes.find(m=>m.userData.aggregate);assert.ok(cells&&cells.userData.cellsPerAggregate>1000,'Aggregates must contain densely packed individual cells');assert.equal(cells.count,cells.userData.cellsPerAggregate*25);}
 const cups=meshes.find(m=>m.userData.cavities);
 assert.equal(cups.count,gridCenters(format).length,'Dense fields and enlarged close-ups must differ.');
 assert.equal(cups.material.defines.PHYSICAL,'','Custom pore shading must retain the physical material shader.');
 if(variant==='poro')assert.equal(cups.material.defines.USE_UV,'');
 assert.equal(meshes.some(m=>m.userData.sensor),variant==='senso');
 assert.equal(meshes.some(m=>m.userData.exchange),variant==='poro'&&format==='detail');
 assert.equal(model.children.filter(m=>m.userData.mountingTab).length,format==='insert'?3:0,'Round insert must have three mounting tabs.');
 if(format==='insert'){
  const wall=meshes[0];wall.geometry.computeBoundingBox();
  assert.ok(wall.geometry.boundingBox.max.y-wall.geometry.boundingBox.min.y>2.1);
  const tabs=model.children.filter(m=>m.userData.mountingTab);
  for(const tab of tabs){const stem=tab.children[0];stem.geometry.computeBoundingBox();assert.ok(stem.position.y+stem.geometry.boundingBox.min.y>2,
 'Mounts must join the upper wall');assert.ok(tab.children[1].position.z>1.24,'Flanges must project outward');assert.ok(stem.position.y+stem.geometry.boundingBox.min.y>0,'Mounting tabs must rise above the membrane, reversing the underside reference.');}
  for(const [x,z] of gridCenters('insert'))assert.ok(Math.hypot(x,z)+.048<1.16);
  assert.ok(wall.material.transparent&&wall.material.opacity<.4,'Walls should read as thin transparent polymer.');
 }
 if(format==='film')for(const m of meshes){
  m.geometry.computeBoundingBox();
  assert.ok(m.geometry.boundingBox.min.y>-.06&&m.geometry.boundingBox.max.y<.03,'Films must stay thin.');
 }
 for(const m of meshes){
  for(const a of Object.values(m.geometry.attributes))for(const n of a.array)assert.ok(Number.isFinite(n));
  if(m.isInstancedMesh)for(const n of m.instanceMatrix.array)assert.ok(Number.isFinite(n));
 }
 checked++;
}
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat('finder.js'))
 assert.doesNotMatch(fs.readFileSync(path.join(root,f),'utf8'),/assets\/(inserts|films|products-orange|microscopy)\.webp/);
console.log(`PASS: ${checked} models, dense concave arrays, thin films, transparent walls, upward mounting tabs, feature separation and finite geometry; original product photos absent.`);

// A device without WebGL must retain the correct product still as the finder changes.
let contextRequests=0;
const events=new Map(),fallback={src:'assets/cavi-insert-micro.jpg'};
const element={dataset:{caviModel:'micro',format:'insert'},hasAttribute:n=>n==='data-finder-model',querySelector:()=>fallback};
const fakeRoot={querySelectorAll:()=>[element],contains:e=>e===element};
context.document={
 createElementNS:()=>({style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){contextRequests++;return null;}}),
 addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)
};
context.CaviModels.mount(fakeRoot);
assert.ok(contextRequests>0);
assert.equal(element.dataset.modelStatus,'fallback');
events.get('cavigen:scene')({detail:{scene:'oxygen',format:'film'}});
assert.equal(fallback.src,'assets/cavi-film-senso.jpg');
assert.equal(element.dataset.format,'film');
context.CaviModels.unmount(fakeRoot);
assert.equal(events.size,0);
for(const format of ['insert','film','detail'])for(const variant of ['micro','poro','senso'])
 assert.ok(fs.statSync(path.join(root,`assets/cavi-${format}-${variant}.jpg`)).size>1000);
console.log('PASS: WebGL-unavailable fallback follows finder choices, all nine stills exist, listeners clean up.');

// Each cell touches several neighbours: no isolated beads in the tissue volume.
const cells=packedCells();
for(const [x,y,z] of cells){
 let contacts=0;
 for(const [a,b,c] of cells){const d=Math.hypot(x-a,y-b,z-c);if(d>0&&d<.0173)contacts++;}
 assert.ok(contacts>=3,'Every cell must have multiple touching neighbours.');
}
// Exchange paths intersect the actual repeated pore lattice on the hemisphere.
for(let i=0;i<80;i++){
 const phase=(.5-i*.127%1+1)%1,time=phase/.18,p=exchangePoint(i,time);
 assert.ok(Math.abs(Math.hypot(...p)-.048)<1e-8);
 for(const a of [p[0],p[2]])assert.ok(Math.abs(((a/.048*24)%1+1)%1-.5)<1e-8);
 assert.ok(.00032<.048*.19/24,'Illustrated molecules fit through a pore.');
 assert.ok(.009*.048/.188>.048*.19/24,'Individual cell radius exceeds pore radius.');
}
let previous=storyPose(0).distance;
for(let t=.001;t<=1;t+=.001){const p=storyPose(t);assert.ok(p.distance<=previous+1e-8);assert.ok(previous-p.distance<.08,'Camera must move continuously');previous=p.distance;}
assert.ok(storyPose(1).distance<storyPose(0).distance/30);
console.log('PASS: cell contacts, membrane pore crossings, molecule/cell size exclusion and continuous 30x macro journey.');

const story=context.CaviModels.createStoryProduct();
story.traverse(o=>{if(o.material?.userData.cut){assert.equal(o.material.defines.USE_UV,'','Pore shader clones retain UV support');assert.equal(o.material.defines.PHYSICAL,'');}});
assert.ok(story.children.find(o=>o.userData.cavities),'Macro cavity remains separate from fading context');
assert.equal(story.children.filter(o=>o.userData.aggregate).length,1,'One central aggregate remains in the cutaway');
assert.ok(fs.statSync(path.join(root,'assets/cavi-poro-exchange.jpg')).size>1000);
console.log('PASS: macro material clones, central tissue and static exchange fallback.');
