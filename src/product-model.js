import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Photo-derived proportions, not manufacturing dimensions or measured material properties.
export const modelSpec = Object.freeze({ outerRadius:1.24, innerRadius:1.17, wallHeight:2.20, pitch:.112, radius:.048, tabHeight:.52, poreFrequency:24, poreFraction:.19 });

function roundedPath(path,x,z,w,d,r) {
  path.moveTo(x+r,z);path.lineTo(x+w-r,z);path.quadraticCurveTo(x+w,z,x+w,z+r);
  path.lineTo(x+w,z+d-r);path.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
  path.lineTo(x+r,z+d);path.quadraticCurveTo(x,z+d,x,z+d-r);
  path.lineTo(x,z+r);path.quadraticCurveTo(x,z,x+r,z);
  return path;
}
function outline(half=1.65,corner=.18) {return roundedPath(new THREE.Shape(),-half,-half,half*2,half*2,corner);}
function extrude(shape,depth,bevel=.008) {
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:18,steps:1});
  g.rotateX(-Math.PI/2);return g;
}
function circle(radius, hole=false) {
  const path=hole?new THREE.Path():new THREE.Shape();path.absarc(0,0,radius,0,Math.PI*2,hole);return path;
}
export function gridCenters(format) {
  if(format==='detail')return Array.from({length:25},(_,i)=>[(i%5-2)*.43,(Math.floor(i/5)-2)*.43]);
  const centers=[];
  for(let z=format==='insert'?-9:-8;z<=(format==='insert'?9:8);z++)for(let x=-11;x<=11;x++){
    const px=x*modelSpec.pitch,pz=z*modelSpec.pitch;
    if(format!=='insert'||Math.hypot(px,pz)<1.02)centers.push([px,pz]);
  }
  return centers;
}
export function cavityGeometry(radius,pitch) {
  const positions=[],normals=[],uvs=[],rings=24,segments=64;
  function point(u,v) {
    const a=u*Math.PI*2;
    // The hemisphere continues into a narrow flat web between neighbouring cups.
    if(v<=1){const t=v*Math.PI/2;return {p:[radius*Math.sin(t)*Math.cos(a),-radius*Math.cos(t),radius*Math.sin(t)*Math.sin(a)],n:[-Math.sin(t)*Math.cos(a),Math.cos(t),-Math.sin(t)*Math.sin(a)]};}
    const boundary=pitch*.5/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));
    return {p:[boundary*Math.cos(a),0,boundary*Math.sin(a)],n:[0,1,0]};
  }
  function put(p){positions.push(...p.p);normals.push(...p.n);uvs.push(p.p[0]/radius,p.p[2]/radius);}
  for(let j=0;j<=rings;j++)for(let i=0;i<segments;i++){
    const v=j/rings,w=j===rings?2:(j+1)/rings;
    const a=point(i/segments,v),b=point((i+1)/segments,v),c=point((i+1)/segments,w),d=point(i/segments,w);
    for(const p of [a,b,c,a,c,d])put(p);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return g;
}
function addInstances(group,geometry,material,centers,y=0,scale=1) {
  const m=new THREE.InstancedMesh(geometry,material,centers.length),matrix=new THREE.Matrix4();
  centers.forEach(([x,z],i)=>{matrix.compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(scale,scale,scale));m.setMatrixAt(i,matrix);});
  m.instanceMatrix.needsUpdate=true;m.castShadow=false;m.receiveShadow=false;group.add(m);return m;
}
export function createProduct(format='insert',variant='micro') {
  if(format==='aggregate')return createCellAggregate([[0,0,0]],1,48);
  if(format==='application')return createApplication(variant);
  const group=new THREE.Group(),detail=format==='detail';
  group.userData={format,variant,cavityCount:gridCenters(format).length};
  const clear=new THREE.MeshPhysicalMaterial({color:0xf4f9fc,metalness:0,roughness:.075,transmission:.2,transparent:true,opacity:.28,depthWrite:false,thickness:.055,ior:1.47,clearcoat:.15,clearcoatRoughness:.08,envMapIntensity:1,side:THREE.DoubleSide});
  const film=new THREE.MeshPhysicalMaterial({color:0xf9fcfa,roughness:.10,metalness:0,transmission:1,thickness:.018,ior:1.46,clearcoat:.12,envMapIntensity:1,side:THREE.DoubleSide});
  const rim=new THREE.MeshPhysicalMaterial({color:0xe6eef2,roughness:.075,metalness:0,transmission:.45,transparent:true,opacity:.57,thickness:.06,ior:1.49,clearcoat:.2,envMapIntensity:1.1});
  if(format==='insert') {
    // A tall open cylinder carries the film at its base; three top flanges hang outward.
    const positions=[],segments=144;
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const top=t=>2.12+.30*Math.pow((1+Math.cos(3*(t-.20)))/2,5);
      const point=(t,y,r)=>[Math.sin(t)*r,y,Math.cos(t)*r];
      for(const r of [1.24,1.19]){
        const p=point(a,0,r),q=point(b,0,r),u=point(b,top(b),r),v=point(a,top(a),r);
        for(const vertex of [p,q,u,p,u,v])positions.push(...vertex);
      }
    }
    const wall=new THREE.BufferGeometry();wall.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));wall.computeVertexNormals();
    const body=new THREE.Mesh(wall,clear);body.userData.insertBody=true;group.add(body);
    for(const [r,h] of [[1.255,.025],[1.245,.095]]){
      const shape=circle(r);shape.holes.push(circle(r-.055,true));
      const lip=new THREE.Mesh(extrude(shape,.025,.006),rim);lip.position.y=h;group.add(lip);
    }
    for(let i=0;i<3;i++){
      const support=new THREE.Group(),a=i*Math.PI*2/3+.20;
      const tab=new THREE.Mesh(new RoundedBoxGeometry(.38,.52,.075,4,.025),clear);
      tab.position.set(0,2.36,1.26);tab.rotation.x=.23;support.add(tab);
      const hook=new THREE.Mesh(new RoundedBoxGeometry(.42,.065,.65,4,.05),rim);hook.position.set(0,2.62,1.52);support.add(hook);
      support.rotation.y=a;support.userData.mountingTab=true;group.add(support);
    }
  }
  const centers=gridCenters(format),pitch=detail?.43:modelSpec.pitch,radius=detail?.188:modelSpec.radius,y=0;
  const cupMaterial=film.clone();
  if(variant==='poro') {
    const cut={value:2};cupMaterial.userData.cut=cut;
    cupMaterial.onBeforeCompile=shader=>{
      shader.uniforms.caviCut=cut;
      shader.fragmentShader='uniform float caviCut;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif(vUv.y > caviCut) discard;\nif(length(vUv)<0.96 && length(vUv)>0.15 && length(fract(vUv*24.0)-0.5)<0.19) discard;');
    };
    cupMaterial.defines={...cupMaterial.defines,USE_UV:''};
  }
  const cups=addInstances(group,cavityGeometry(radius,pitch),cupMaterial,centers,y);cups.userData.cavities=true;
  // A continuous, unstructured margin extends beyond the final row of cavities.
  const carrier=format==='insert'?circle(1.21):roundedPath(new THREE.Shape(),detail?-1.32:-1.55,detail?-1.32:-1.16,detail?2.64:3.10,detail?2.64:2.32,.065);
  if(format==='insert'){
    centers.forEach(([x,z])=>{const hole=new THREE.Path();hole.absarc(x,z,radius*1.001,0,Math.PI*2,true);carrier.holes.push(hole);});
  }else{const hx=detail?pitch*2.5:modelSpec.pitch*11.5,hz=detail?pitch*2.5:modelSpec.pitch*8.5;carrier.holes.push(roundedPath(new THREE.Path(),-hx,-hz,2*hx,2*hz,.001));}
  const carrierMaterial=film.clone();carrierMaterial.transmission=.6;carrierMaterial.transparent=true;carrierMaterial.opacity=.40;carrierMaterial.depthWrite=false;
  const sheet=new THREE.Mesh(extrude(carrier,.008,.0003),carrierMaterial);sheet.position.y=-.009;sheet.userData.filmMargin=true;group.add(sheet);
  if(variant==='senso') {
    const sensor=new THREE.MeshPhysicalMaterial({color:0xd5a965,metalness:0,roughness:.29,transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false,emissive:0x5c3009,emissiveIntensity:.05});
    // A restrained coating follows the bowl; colour is explanatory, not emission wavelength.
    const coating=new THREE.SphereGeometry(radius*.985,24,10,0,Math.PI*2,Math.PI*.56,Math.PI*.44);
    const sensors=addInstances(group,coating,sensor,centers,y+.002);sensors.userData.sensor=true;
  }
  if(detail) {
    group.add(createCellAggregate(centers.map(([x,z])=>[x,-.101,z])));
    if(variant==='poro'){
      const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.0009,8,6),new THREE.MeshBasicMaterial({color:0xdca45d}),80);particles.userData.exchange=true;group.add(particles);
    }
  }
  return group;
}
export const cellRadius=.0185;
export function packedCells() {
  // 79 overlapping cells in a compact close-packed volume; an illustration, not a cell count claim.
  const points=[];
  for(let z=-3;z<=3;z++)for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
    if((x+y+z)%2!==0||x*x+y*y+z*z>10)continue;
    points.push([x*.019+.0008*Math.sin(y*8+z*2),y*.019+.0008*Math.sin(x*3+z*5),z*.019+.0008*Math.sin(x*7+y*3)]);
  }
  return points;
}
export function createCellAggregate(centers=[[0,0,0]],scale=1,segments=24) {
  const geometry=new THREE.SphereGeometry(1,segments,Math.ceil(segments*2/3)),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=1+.035*Math.sin(x*3+y*2)*Math.cos(z*3-y);
    positions.setXYZ(i,x*r,y*r,z*r);
  }
  geometry.computeVertexNormals();
  const material=new THREE.MeshPhysicalMaterial({color:0xd3dde0,roughness:.38,metalness:0,clearcoat:.08,clearcoatRoughness:.5});
  const points=packedCells(),cells=new THREE.InstancedMesh(geometry,material,points.length*centers.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  centers.forEach(([cx,cy,cz],c)=>points.forEach(([x,y,z],i)=>{
    q.setFromEuler(new THREE.Euler(i*1.7,i*.83,i*.41));
    const a=1+.055*Math.sin(i*2.3),b=1+.045*Math.cos(i*1.7);
    matrix.compose(new THREE.Vector3(cx+x*scale,cy+y*scale,cz+z*scale),q,new THREE.Vector3(cellRadius*a*scale,cellRadius*b*scale,cellRadius/(a*b)*scale));cells.setMatrixAt(c*points.length+i,matrix);
  }));
  cells.userData={aggregate:true,cellsPerAggregate:points.length,cellRadius,spacing:.019};cells.instanceMatrix.needsUpdate=true;return cells;
}
// Schematic application contexts, not a representation of a particular partner device.
export function createApplication(variant) {
  const model=new THREE.Group(),film=createProduct('detail',variant);model.add(film);
  const glass=new THREE.MeshPhysicalMaterial({color:0xdcebf0,roughness:.16,transmission:.45,transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x244b59,roughness:.32,metalness:.25});
  function box(w,h,d,x,y,z,material){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,.06),material);m.position.set(x,y,z);model.add(m);return m;}
  if(variant==='poro'){
    model.userData.application='organ-on-chip';
    box(3.5,.16,3.05,0,-.46,0,glass);box(3.5,.10,3.05,0,.31,0,glass);
    for(const z of [-1.42,1.42])box(3.5,.7,.16,0,-.05,z,glass);
    for(const x of [-1.65,1.65]){
      const port=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.3,32),dark);port.rotation.z=Math.PI/2;port.position.set(x,-.25,0);model.add(port);
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-.25,0),new THREE.Vector3(x*1.25,-.25,0),new THREE.Vector3(x*1.45,-.23,x>0?.65:-.65)]);
      const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.07,12,false),new THREE.MeshPhysicalMaterial({color:0x65a9b4,roughness:.3}));model.add(tube);
    }
    const points=new THREE.InstancedMesh(new THREE.SphereGeometry(.017,10,8),new THREE.MeshBasicMaterial({color:0x008099}),36);points.userData.chipFlow=true;model.add(points);
    for(const z of [-.6,0,.6]){
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.6,-.28,z),new THREE.Vector3(1.6,-.28,z)]),new THREE.LineBasicMaterial({color:0x008099,transparent:true,opacity:.28}));model.add(line);
    }
  }else{
    model.userData.application='oxygen-readout';
    const objective=new THREE.Mesh(new THREE.CylinderGeometry(.33,.43,.65,48),dark);objective.position.set(0,-1.03,0);model.add(objective);
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.025,40),new THREE.MeshPhysicalMaterial({color:0x80bdcf,roughness:.1,metalness:.5}));lens.position.y=-.695;model.add(lens);
    for(const [x,color] of [[-.09,0x008099],[.09,0xff8c00]]){
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.055,.11,.5,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.32,depthWrite:false}));beam.position.set(x,-.43,0);model.add(beam);
    }
    const signals=new THREE.InstancedMesh(new THREE.SphereGeometry(.032,10,8),new THREE.MeshBasicMaterial({color:0xffffff}),12);
    for(let i=0;i<12;i++)signals.setColorAt(i,new THREE.Color(i%2?0xff8c00:0x008099));signals.userData.opticalSignal=true;model.add(signals);
  }
  return model;
}
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function storyPose(progress) {
  const t=smooth(progress/.78),distance=Math.exp(THREE.MathUtils.lerp(Math.log(8.5),Math.log(.215),t));
  const elevation=THREE.MathUtils.lerp(.85,.25,t),azimuth=THREE.MathUtils.lerp(.65,.16,t);
  return {distance,elevation,azimuth,cut:THREE.MathUtils.lerp(2,.22,smooth((progress-.62)/.19))};
}
export function exchangePoint(i,time,radius=.048) {
  // Each path crosses an actual shader pore; motion alternates inward and outward.
  const u=(i%2?1:-1)*(12.5+(Math.floor(i/2)%4))/24,v=-(8.5+Math.floor(i/8)%5)/24;
  const phase=(time*.18+i*.127)%1,t=i%2?1-phase:phase,scale=1.20-.40*t;
  return [u*radius*scale,-Math.sqrt(1-u*u-v*v)*radius*scale,v*radius*scale];
}
export function createStoryProduct() {
  const model=new THREE.Group(),context=createProduct('film','poro');context.userData.context=true;model.add(context);
  const source=context.children.find(o=>o.userData.cavities),material=source.material.clone();
  material.defines={...source.material.defines};material.onBeforeCompile=source.material.onBeforeCompile;material.userData=source.material.userData;
  material.transmission=.22;material.roughness=.30;material.color.set(0xdceae1);material.transparent=true;material.opacity=.92;
  const central=addInstances(model,cavityGeometry(.048,.112),material,[[0,0]]);central.userData.cavities=true;
  // The central cavity stays fixed while its surroundings recede during the macro reveal.
  const gone=new THREE.Matrix4().makeScale(0,0,0),centers=gridCenters('film');
  source.setMatrixAt(centers.findIndex(([x,z])=>x===0&&z===0),gone);source.instanceMatrix.needsUpdate=true;
  const ratio=.048/.188;
  model.add(createCellAggregate([[0,-.101*ratio,0]],ratio));
  context.add(createCellAggregate(centers.filter(([x,z])=>x!==0||z!==0).map(([x,z])=>[x,-.101*ratio,z]),ratio,12));
  context.traverse(o=>{if(o.material){const compile=o.material.onBeforeCompile,defines={...o.material.defines};o.material=o.material.clone();o.material.defines=defines;o.material.onBeforeCompile=compile;o.material.transparent=true;o.material.userData.baseOpacity=o.material.opacity;}});
  const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.00032,8,6),new THREE.MeshBasicMaterial({color:0xffa330}),80);
  const exchangeColor=new THREE.Color();for(let i=0;i<80;i++){exchangeColor.set(i%2?0xffa330:0x008099);particles.setColorAt(i,exchangeColor);}
  particles.material.color.set(0xffffff);particles.userData.exchange=true;particles.userData.story=true;model.add(particles);
  const flow=new THREE.InstancedMesh(new THREE.SphereGeometry(.004,8,6),new THREE.MeshBasicMaterial({color:0x008099,transparent:true,opacity:.55}),48);flow.userData.perfusion=true;context.add(flow);
  flow.material.userData.baseOpacity=.55;
  for(const z of [-.32,0,.32]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.5,-.09,z),new THREE.Vector3(-.5,-.095,z+.06),new THREE.Vector3(.5,-.085,z-.06),new THREE.Vector3(1.5,-.09,z)]);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),new THREE.LineBasicMaterial({color:0x008099,transparent:true,opacity:.13}));line.material.userData.baseOpacity=.13;context.add(line);
  }
  return model;
}
function disposeObject(group){
  const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
const mounted=new Map();
export function mount(root=document){
  for(const element of root.querySelectorAll('[data-cavi-model]')){
    if(mounted.has(element))continue;
    const fallbackChange=e=>{if(!element.hasAttribute('data-finder-model'))return;
      const variant=e.detail.scene==='oxygen'?'senso':e.detail.scene==='exchange'?'poro':'micro',format=e.detail.format==='film'?'film':'insert';
      const image=element.querySelector('.model-fallback');if(image)image.src=`assets/cavi-${format}-${variant}.jpg`;
      element.dataset.caviModel=variant;element.dataset.format=format;
    };
    document.addEventListener('cavigen:scene',fallbackChange);
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch(_){element.dataset.modelStatus='fallback';mounted.set(element,()=>{document.removeEventListener('cavigen:scene',fallbackChange);mounted.delete(element);});continue;}
    const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    const scene=new THREE.Scene();
    const backdrop=document.createElement('canvas');backdrop.width=2;backdrop.height=256;
    const backdropContext=backdrop.getContext('2d'),wash=backdropContext.createLinearGradient(0,0,0,256);
    wash.addColorStop(0,'#edf1ed');wash.addColorStop(.5,'#c8d5ce');wash.addColorStop(1,'#b4c4bd');backdropContext.fillStyle=wash;backdropContext.fillRect(0,0,2,256);
    const backdropTexture=new THREE.CanvasTexture(backdrop);backdropTexture.colorSpace=THREE.SRGBColorSpace;scene.background=backdropTexture;
    const room=new RoomEnvironment();
    room.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial)o.material.color.set(0x313a35);});
    const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.015);
    scene.environment=env.texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff,0xa8b8b1,.45));
    const key=new THREE.DirectionalLight(0xfffbef,1.7);key.position.set(-3,5,4);scene.add(key);
    const fill=new THREE.DirectionalLight(0xe2f1ff,.4);fill.position.set(4,2,-3);scene.add(fill);
    const story=element.closest('[data-poro-story]'),steps=story?[...story.querySelectorAll('.poro-step')]:[];
    let progress=0;
    let format=element.dataset.format||'insert',variant=element.dataset.caviModel||'micro',model=story?createStoryProduct():createProduct(format,variant);
    scene.add(model);
    const aggregate=format==='aggregate';
    if(aggregate){scene.background=null;model.scale.setScalar(10);}
    // Broad gradient under the object reads as a studio surface, not an interface panel.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
    const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);
    gradient.addColorStop(0,'rgba(34,55,48,.27)');gradient.addColorStop(.45,'rgba(34,55,48,.15)');gradient.addColorStop(1,'rgba(34,55,48,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(5,4.3),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.95;scene.add(shadow);if(aggregate)shadow.visible=false;
    const camera=new THREE.PerspectiveCamera(31,1,.001,50);camera.position.set(5.6,5.6,6.2);camera.lookAt(0,-.15,0);
    let frame=0,last=0,time=0,visible=false,disposed=false,lost=false,target=0,angle=0;
    const paused=()=>document.documentElement.classList.contains('motion-paused');
    function resize(){
      const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
      renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;
      camera.zoom=(story?1:format==='aggregate'?1.05:format==='application'?(variant==='poro'?1.05:1.36):format==='detail'?1.75:format==='film'?1.40:1.05)*Math.min(1,camera.aspect);camera.updateProjectionMatrix();
    }
    function draw(){if(disposed||lost)return;
      if(story){
        const pose=storyPose(paused()?.88:progress);
        const d=pose.distance;camera.position.set(Math.sin(pose.azimuth)*d,Math.sin(pose.elevation)*d-.02,Math.cos(pose.azimuth)*Math.cos(pose.elevation)*d);camera.lookAt(0,-.022,0);
        model.children.find(o=>o.userData.cavities).material.userData.cut.value=pose.cut;
        const context=model.children.find(o=>o.userData.context),fade=1-smooth(((paused()?.88:progress)-.47)/.23);
        context.visible=fade>.005;context.traverse(o=>{if(o.material)o.material.opacity=o.material.userData.baseOpacity*fade;});
      }else if(aggregate){
        camera.position.set(0,.15,3.55);camera.lookAt(0,0,0);model.rotation.set(.18,.4+time*.035,-.12);
      }else{
        const view=element.dataset.view||(format==='film'?'low':variant==='senso'?'sensor':'orbit');
        const travel=Math.sin(time*.14)*.16+angle;
        camera.position.set(view==='overhead'?1.8:view==='sensor'?2.8:view==='low'?5.3:4.6,view==='overhead'?8.5:view==='sensor'?3.1:view==='low'?3.3:6.3,view==='overhead'?4.0:view==='sensor'?7.0:6.2);camera.lookAt(0,format==='insert'?1.20:format==='application'&&variant==='senso'?-.35:-.10,0);
        model.rotation.y=(view==='sensor'?-.55:view==='low'?.38:-.2)+travel;
        model.rotation.z=Math.sin(time*.11)*.024;
      }
      model.traverse(o=>{
        if(o.userData.chipFlow){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){m.makeTranslation(((i*.27+time*.32)%3.2)-1.6,-.28,(i%3-1)*.6);o.setMatrixAt(i,m);}o.instanceMatrix.needsUpdate=true;}
        if(o.userData.opticalSignal){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){const p=(time*.5+i/12)%1;m.makeTranslation(i%2?.09:-.09,-.68+(i%2?1-p:p)*.49,0);o.setMatrixAt(i,m);}o.instanceMatrix.needsUpdate=true;}
        if(o.userData.perfusion){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){const x=((i*.19+time*.075+1.5)%3)-1.5;m.makeTranslation(x,-.09,(i%3-1)*.32+Math.sin(x*2)*.04);o.setMatrixAt(i,m);}o.instanceMatrix.needsUpdate=true;}
        if(o.userData.sensor)o.material.emissiveIntensity=.05+.018*Math.sin(time*.65);
        if(o.userData.exchange){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){m.makeTranslation(...exchangePoint(i,time,o.userData.story?.048:.188));o.setMatrixAt(i,m);}o.instanceMatrix.needsUpdate=true;}
      });renderer.render(scene,camera);
    }
    function tick(now){frame=0;if(disposed||lost||paused()||!visible||document.hidden)return;
      if(now-last>40){time+=Math.min((now-last)/1000,.08);last=now;angle+=(target-angle)*.06;draw();}frame=requestAnimationFrame(tick);
    }
    function sync(){if(story)scrollStory();cancelAnimationFrame(frame);frame=0;if(paused())canvas.getAnimations().forEach(a=>a.cancel());resize();draw();if(!disposed&&!lost&&visible&&!paused()&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
    function scrollStory(){
      if(!story||lost)return;
      const bounds=story.getBoundingClientRect(),stage=story.querySelector('.poro-stage');
      const top=parseFloat(getComputedStyle(stage).top)||0;
      progress=THREE.MathUtils.clamp((top-bounds.top)/Math.max(1,bounds.height-stage.offsetHeight),0,1);
      story.style.setProperty('--story-progress',progress);
      const active=paused()?2:progress<.30?0:progress<.68?1:2;
      steps.forEach((step,i)=>{step.classList.toggle('is-active',i===active);step.setAttribute('aria-hidden',i!==active);step.inert=i!==active;});
      story.querySelectorAll('[data-story-jump]').forEach((button,i)=>button.setAttribute('aria-pressed',i===active));
      if(visible)draw();
    }
    const jump=e=>{const button=e.target.closest('[data-story-jump]');if(!button)return;
      const stage=story.querySelector('.poro-stage'),top=parseFloat(getComputedStyle(stage).top)||0;
      window.scrollTo({top:window.scrollY+story.getBoundingClientRect().top-top+Number(button.dataset.storyJump)*(story.offsetHeight-stage.offsetHeight),behavior:paused()?'instant':'smooth'});
    };
    if(story){story.classList.add('story-ready');window.addEventListener('scroll',scrollStory,{passive:true});window.addEventListener('resize',scrollStory);story.addEventListener('click',jump);scrollStory();}
    const resizeObserver=new ResizeObserver(sync),observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'50px'});
    const move=e=>{if(e.pointerType!=='touch'){const r=element.getBoundingClientRect();target=((e.clientX-r.left)/r.width-.5)*.18;}};
    const leave=()=>{target=0;};
    const change=e=>{if(!element.hasAttribute('data-finder-model'))return;
      const goal=e.detail.scene,nextVariant=goal==='oxygen'?'senso':goal==='exchange'?'poro':'micro',nextFormat=e.detail.format==='film'?'film':'insert';
      if(nextFormat===format&&nextVariant===variant)return;
      scene.remove(model);disposeObject(model);format=nextFormat;variant=nextVariant;model=createProduct(format,variant);scene.add(model);
      element.dataset.caviModel=variant;element.dataset.format=format;sync();
      if(!paused())canvas.animate([{opacity:0,filter:'blur(9px)'},{opacity:1,filter:'blur(0)'}],{duration:700,easing:'cubic-bezier(.16,1,.3,1)'});
    };
    const contextLost=e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);element.classList.remove('model-ready');element.dataset.modelStatus='fallback';if(story){story.classList.remove('story-ready');steps.forEach(step=>{step.removeAttribute('aria-hidden');step.inert=false;});}};
    canvas.addEventListener('webglcontextlost',contextLost);element.append(canvas);element.classList.add('model-ready');element.dataset.modelStatus='ready';
    element.addEventListener('pointermove',move,{passive:true});element.addEventListener('pointerleave',leave);
    document.addEventListener('cavigen:scene',change);document.addEventListener('cavigen:motion',sync);document.addEventListener('visibilitychange',sync);
    resizeObserver.observe(element);observer.observe(element);
    mounted.set(element,()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);document.removeEventListener('cavigen:scene',fallbackChange);document.removeEventListener('cavigen:scene',change);document.removeEventListener('cavigen:motion',sync);document.removeEventListener('visibilitychange',sync);if(story){window.removeEventListener('scroll',scrollStory);window.removeEventListener('resize',scrollStory);story.removeEventListener('click',jump);}disposeObject(model);shadow.geometry.dispose();shadow.material.dispose();shadowTexture.dispose();backdropTexture.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();mounted.delete(element);});
    sync();
  }
}
export function unmount(root){for(const [element,dispose] of mounted)if(root.contains(element))dispose();}
if(typeof document!=='undefined')mount();
