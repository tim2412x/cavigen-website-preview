const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'product-model.js'),'utf8'),context);
const {createProduct,cavityGeometry}=context.CaviModels;
const cup=cavityGeometry(.048,.112);
cup.computeBoundingBox();
assert.ok(cup.boundingBox.min.y<-.047,'Microcavities must be concave.');
assert.equal(cup.boundingBox.max.y,0,'The web must remain flat.');
let checked=0;
for(const format of ['insert','film','detail'])for(const variant of ['micro','poro','senso']) {
 const model=createProduct(format,variant),meshes=[];
 model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const cups=meshes.find(m=>m.isInstancedMesh);
 assert.equal(cups.count,format==='detail'?25:484,'Dense fields and enlarged close-ups must differ.');
 assert.equal(cups.material.defines.PHYSICAL,'','Custom pore shading must retain the physical material shader.');
 if(variant==='poro')assert.equal(cups.material.defines.USE_UV,'');
 assert.equal(meshes.some(m=>m.userData.sensor),variant==='senso');
 assert.equal(meshes.some(m=>m.userData.exchange),variant==='poro'&&format==='detail');
 assert.equal(meshes.filter(m=>m.geometry.type==='TubeGeometry').length,format==='insert'?2:0,'Only inserts have handling loops.');
 if(format==='insert'){
  const wall=meshes[0];wall.geometry.computeBoundingBox();
  assert.ok(wall.geometry.boundingBox.max.y-wall.geometry.boundingBox.min.y>.8);
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
console.log(`PASS: ${checked} models, dense concave arrays, thin films, transparent walls, handles, feature separation and finite geometry; original product photos absent.`);

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
