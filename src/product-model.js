import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Photo-derived proportions, not manufacturing dimensions or measured material properties.
export const modelSpec = Object.freeze({ half:1.65, wallHeight:.84, wall:.055, corner:.18, pitch:.112, radius:.048, rows:11, fields:4 });

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
function gridCenters(format) {
  const detail=format==='detail',n=detail?5:modelSpec.rows,p=detail?.43:modelSpec.pitch;
  const fields=detail?[[0,0]]:[[-.80,-.80],[.80,-.80],[-.80,.80],[.80,.80]];
  return fields.flatMap(([fx,fz])=>Array.from({length:n*n},(_,i)=>[fx+(i%n-(n-1)/2)*p,fz+(Math.floor(i/n)-(n-1)/2)*p]));
}
export function cavityGeometry(radius,pitch) {
  const positions=[],normals=[],uvs=[],rings=12,segments=32;
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
  const group=new THREE.Group(),detail=format==='detail';
  group.userData={format,variant,cavityCount:gridCenters(format).length};
  const clear=new THREE.MeshPhysicalMaterial({color:0xfff8e8,metalness:0,roughness:.075,transmission:.2,transparent:true,opacity:.24,depthWrite:false,thickness:.055,ior:1.47,clearcoat:.15,clearcoatRoughness:.08,envMapIntensity:1,side:THREE.DoubleSide});
  const film=new THREE.MeshPhysicalMaterial({color:0xf9fcfa,roughness:.10,metalness:0,transmission:1,thickness:.018,ior:1.46,clearcoat:.12,envMapIntensity:1,side:THREE.DoubleSide});
  const rim=new THREE.MeshPhysicalMaterial({color:0xfff3d9,roughness:.075,metalness:0,transmission:.45,transparent:true,opacity:.78,thickness:.06,ior:1.49,clearcoat:.2,envMapIntensity:1.1});
  if(format==='insert') {
    // Rounded outer wall and a shared cross divider, open at both ends.
    const walls=outline();
    for(const x of [-.80,.80])for(const z of [-.80,.80])walls.holes.push(roundedPath(new THREE.Path(),x-.756,z-.756,1.512,1.512,.12));
    const body=new THREE.Mesh(extrude(walls,modelSpec.wallHeight,.009),clear);body.position.y=-.70;group.add(body);
    const lipShape=outline(1.675,.205);lipShape.holes.push(outline(1.615,.155));
    for(const y of [-.68,.14]){const lip=new THREE.Mesh(extrude(lipShape,.027,.009),rim);lip.position.y=y;group.add(lip);}
    // The reference has two curved handling loops, not large rectangular ears.
    for(const side of [-1,1]){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.37,-.57,side*1.64),new THREE.Vector3(-.27,-.575,side*1.91),new THREE.Vector3(.05,-.575,side*2.02),new THREE.Vector3(.32,-.57,side*1.84),new THREE.Vector3(.36,-.565,side*1.64)]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,40,.027,10,false),rim));
      for(const x of [-.36,.36]){const foot=new THREE.Mesh(new RoundedBoxGeometry(.08,.18,.08,3,.018),clear);foot.position.set(x,-.67,side*1.60);group.add(foot);}
    }
  }
  const centers=gridCenters(format),pitch=detail?.43:modelSpec.pitch,radius=detail?.188:modelSpec.radius,y=format==='insert'?.08:0;
  const cupMaterial=film.clone();
  if(variant==='poro') {
    // Perforation is restricted to the curved wall; pore dimensions are illustrative.
    cupMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(length(vUv) < 0.91 && length(vUv)>0.2 && length(fract(vUv*9.0)-0.5)<0.115) discard;');};
    cupMaterial.defines={...cupMaterial.defines,USE_UV:''};
  }
  addInstances(group,cavityGeometry(radius,pitch),cupMaterial,centers,y);
  // Thin carrier sheet with four apertures leaves the domed microcavity membranes visible.
  const carrier=outline(detail?1.24:1.65,detail?.075:.18);
  if(detail)carrier.holes.push(roundedPath(new THREE.Path(),-pitch*2.5,-pitch*2.5,pitch*5,pitch*5,.005));
  else for(const x of [-.80,.80])for(const z of [-.80,.80])carrier.holes.push(roundedPath(new THREE.Path(),x-pitch*5.5,z-pitch*5.5,pitch*11,pitch*11,.006));
  const carrierMaterial=film.clone();carrierMaterial.transmission=.35;carrierMaterial.transparent=true;carrierMaterial.opacity=.25;carrierMaterial.depthWrite=false;
  const sheet=new THREE.Mesh(extrude(carrier,.012,.002),carrierMaterial);sheet.position.y=y-.012;group.add(sheet);
  if(variant==='senso') {
    const sensor=new THREE.MeshPhysicalMaterial({color:0xd5a965,metalness:0,roughness:.29,transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false,emissive:0x5c3009,emissiveIntensity:.05});
    // A restrained coating follows the bowl; colour is explanatory, not emission wavelength.
    const coating=new THREE.SphereGeometry(radius*.985,24,10,0,Math.PI*2,Math.PI*.56,Math.PI*.44);
    const sensors=addInstances(group,coating,sensor,centers,y+.002);sensors.userData.sensor=true;
  }
  if(detail) {
    const aggregate=new THREE.SphereGeometry(.088,24,16);
    const positions=aggregate.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),k=1+.047*Math.sin(x*170)*Math.sin(z*143)*Math.cos(y*155);
      positions.setXYZ(i,x*k,y*k,z*k);
    }
    aggregate.computeVertexNormals();
    const cells=new THREE.MeshPhysicalMaterial({color:0x728f88,roughness:.44,metalness:0,clearcoat:.3,clearcoatRoughness:.4});
    addInstances(group,aggregate,cells,centers,-.095);
    if(variant==='poro'){
      const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:0xdca45d}),16);particles.userData.exchange=true;group.add(particles);
    }
  }
  return group;
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
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}catch(_){element.dataset.modelStatus='fallback';mounted.set(element,()=>{document.removeEventListener('cavigen:scene',fallbackChange);mounted.delete(element);});continue;}
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
    let format=element.dataset.format||'insert',variant=element.dataset.caviModel||'micro',model=createProduct(format,variant);
    scene.add(model);
    // Broad gradient under the object reads as a studio surface, not an interface panel.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
    const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);
    gradient.addColorStop(0,'rgba(34,55,48,.27)');gradient.addColorStop(.45,'rgba(34,55,48,.15)');gradient.addColorStop(1,'rgba(34,55,48,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(5,4.3),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.95;scene.add(shadow);
    const camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(5.6,5.6,6.2);camera.lookAt(0,-.15,0);
    let frame=0,last=0,time=0,visible=false,disposed=false,lost=false,target=0,angle=0;
    const paused=()=>document.documentElement.classList.contains('motion-paused');
    function resize(){
      const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
      renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;
      camera.zoom=(format==='detail'?1.45:1.13)*Math.min(1,camera.aspect);camera.updateProjectionMatrix();
    }
    function draw(){if(disposed||lost)return;
      model.rotation.y=-.10+Math.sin(time*.10)*.11+angle;
      model.rotation.z=Math.sin(time*.08)*.013;
      model.traverse(o=>{
        if(o.userData.sensor)o.material.emissiveIntensity=.05+.018*Math.sin(time*.65);
        if(o.userData.exchange){const m=new THREE.Matrix4();for(let i=0;i<16;i++){m.makeTranslation(((i*.19+time*.055+1.1)%2.2)-1.1,-.11,(i%5-2)*.43);o.setMatrixAt(i,m);}o.instanceMatrix.needsUpdate=true;}
      });renderer.render(scene,camera);
    }
    function tick(now){frame=0;if(disposed||lost||paused()||!visible||document.hidden)return;
      if(now-last>40){time+=Math.min((now-last)/1000,.08);last=now;angle+=(target-angle)*.06;draw();}frame=requestAnimationFrame(tick);
    }
    function sync(){cancelAnimationFrame(frame);frame=0;if(paused())canvas.getAnimations().forEach(a=>a.cancel());resize();draw();if(!disposed&&!lost&&visible&&!paused()&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
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
    const contextLost=e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);element.classList.remove('model-ready');element.dataset.modelStatus='fallback';};
    canvas.addEventListener('webglcontextlost',contextLost);element.append(canvas);element.classList.add('model-ready');element.dataset.modelStatus='ready';
    element.addEventListener('pointermove',move,{passive:true});element.addEventListener('pointerleave',leave);
    document.addEventListener('cavigen:scene',change);document.addEventListener('cavigen:motion',sync);document.addEventListener('visibilitychange',sync);
    resizeObserver.observe(element);observer.observe(element);
    mounted.set(element,()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);document.removeEventListener('cavigen:scene',fallbackChange);document.removeEventListener('cavigen:scene',change);document.removeEventListener('cavigen:motion',sync);document.removeEventListener('visibilitychange',sync);disposeObject(model);shadow.geometry.dispose();shadow.material.dispose();shadowTexture.dispose();backdropTexture.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();mounted.delete(element);});
    sync();
  }
}
export function unmount(root){for(const [element,dispose] of mounted)if(root.contains(element))dispose();}
if(typeof document!=='undefined')mount();
