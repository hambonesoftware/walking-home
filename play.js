import * as T from './three.module.js';
import {createDadBody} from './dad-body.js';
import {createDadHead} from './dad-head.js';

const canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
const scene = new T.Scene();
scene.background = new T.Color('#232f50');
scene.fog = new T.Fog('#232f50', 16, 38);
const camera = new T.PerspectiveCamera(35, 1, .1, 70);
let renderer;
try {
  renderer = new T.WebGLRenderer({canvas, antialias: true});
} catch (error) {
  status.textContent = 'WebGL is unavailable';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(pointer: coarse)").matches ? 1.5 : 2));
const ramp = new T.DataTexture(new Uint8Array([45, 143, 232]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.needsUpdate = true;
const toon = color => new T.MeshToonMaterial({ color, gradientMap: ramp });
const ink = color => new T.MeshBasicMaterial({color});
const ambient = new T.AmbientLight('#aab9eb', .84);
const key = new T.DirectionalLight('#ffd4a2', 2.45);
const rim = new T.DirectionalLight('#e59361', 1.2);
key.position.set(-6, 4, 4);
rim.position.set(2, 4, -5);
scene.add(ambient, key, rim);

function mesh(parent, geometry, material) {
  const object = new T.Mesh(geometry, material);
  parent.add(object);
  return object;
}
function box(parent,x,y,z,w,h,d,mat) {
  const obj=mesh(parent,new T.BoxGeometry(w,h,d),mat);
  obj.position.set(x,y,z);
  return obj;
}
const {root:player,hips,chest,legs,arms,jacketMesh}=createDadBody(T,{toon,ink});
player.name='Father';
scene.add(player);
const {head,expressions,setJaw}=createDadHead(T,{toon,ink});
head.position.set(0,.702,.007);
head.scale.setScalar(.90);
chest.add(head);

const ground=toon('#4a4556');
box(scene,0,-.072,0,14,.12,24,ground);
const seam=ink('#353447');
for(let x=-6;x<=6;x+=2) box(scene,x,-.009,0,.018,.003,23.8,seam);
for(let z=-11;z<12;z+=2) box(scene,0,-.008,z,13.9,.003,.018,seam);
const amber=ink('#d99555'), frame=toon('#352a37'), stone=toon('#493642');
const storefront = new T.Group();
scene.add(storefront);
box(storefront,-5.7,2.55,0,.6,5.1,24,stone);
for(let z=-10;z<=10;z+=3){
  box(storefront,-5.35,1.94,z,.09,2.85,2.7,amber);
  for(const y of [.52,1.45,2.35,3.35]) box(storefront,-5.26,y,z,.13,.07,2.75,frame);
  for(const dz of [-1.36,0,1.36]) box(storefront,-5.24,1.94,z+dz,.13,2.85,.07,frame);
}
const skyline = new T.Group();
scene.add(skyline);
for(let i=0;i<16;i++){
  const x=-13+i*1.72;
  const h=3.5+((i*67)%49)/10;
  box(skyline,x,h/2,-13-i%3,1.55,h,2,ink(i%2?'#19243a':'#1c283e'));
  for(let row=1;row<h-1;row+=.7) if((i+Math.round(row*10))%3!==0)
    box(skyline,x+.27,row,-11.98-i%3,.1,.24,.03,ink('#a87962'));
}
const shadow=mesh(scene,new T.CircleGeometry(.48,36),new T.MeshBasicMaterial({color:'#141928',transparent:true,opacity:.5,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;
shadow.scale.y=.65;
shadow.position.y=.003;

const keys=new Set();
const allowed=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','shift']);
addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(!allowed.has(key) || /SELECT|INPUT|BUTTON/.test(document.activeElement.tagName)) return;
  e.preventDefault();
  keys.add(key);
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
  for(const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name,()=>keys.delete(button.dataset.key));
}
const referenceOrbit=.24;
let orbit=referenceOrbit,elevation=-.075,drag=null;
let referencePose=true;
const poseButton=document.querySelector('#reference-pose');
canvas.addEventListener('pointerdown',e=>{
  if(drag) return;
  canvas.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId) return;
  orbit-=(e.clientX-drag.x)*.012;
  elevation=T.MathUtils.clamp(elevation+(e.clientY-drag.y)*.006,-.25,.62);
  drag.x=e.clientX;
  drag.y=e.clientY;
});
for(const name of ['pointerup','pointercancel','lostpointercapture']){
  canvas.addEventListener(name,e=>{if(drag?.id===e.pointerId) drag=null;});
}
function resetView(){
  orbit=referenceOrbit;
  elevation=referencePose?-.075:.015;
  player.position.set(0,0,0);
  player.rotation.y=0;
  phase=0;
  gait=0;
  document.activeElement.blur();
}
document.querySelector('#reset').onclick=resetView;
poseButton.onclick=()=>{
  referencePose=!referencePose;
  poseButton.setAttribute('aria-pressed',String(referencePose));
  resetView();
};
document.querySelector('#coat').onchange=e=>{jacketMesh.material.color.set(e.target.value);e.target.blur();};
document.querySelector('#jaw').oninput=e=>{setJaw(Number(e.target.value));};
document.querySelector('#expression').onchange=e=>{for(const [name,obj] of Object.entries(expressions)) obj.visible=name===e.target.value;e.target.blur();};

const clock=new T.Clock();
const target=new T.Vector3();
let phase=0, gait=0, poseBlend=1;
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.04);
  const width=canvas.clientWidth,height=canvas.clientHeight;
  const ratio=renderer.getPixelRatio();
  if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio)){
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const moving=x!==0||z!==0;
  const running=moving&&keys.has('shift');
  if(moving){
    if(referencePose){
      referencePose=false;
      poseButton.setAttribute('aria-pressed','false');
    }
    const angle=Math.atan2(x,z)+orbit;
    const velocity=running?2.85:1.55;
    player.position.x=T.MathUtils.clamp(player.position.x+Math.sin(angle)*dt*velocity,-4.5,5.4);
    player.position.z=T.MathUtils.clamp(player.position.z+Math.cos(angle)*dt*velocity,-9,9);
    const delta=angle-player.rotation.y;
    player.rotation.y+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-13*dt));
  }
  gait=T.MathUtils.damp(gait,moving?(running?1.28:1):0,11,dt);
  if(moving) phase+=dt*(running?10.5:7.3);
  const swing=Math.sin(phase);
  poseBlend=T.MathUtils.damp(poseBlend,referencePose?1:0,13,dt);
  const mix=(a,b)=>T.MathUtils.lerp(a,b,poseBlend);
  const hipDrop=mix(gait*(running?.075:.043),.079);
  hips.position.y=-hipDrop;
  chest.rotation.y=mix(.048*gait*swing,.11);
  chest.rotation.z=mix(0,-.036);
  head.rotation.z=mix(-.07-.022*gait*swing,-.117);
  head.rotation.y=mix(.245,.46);
  head.rotation.x=mix(.06,.163);
  // The same knee solver is used for the display pose and the moving stride.
  const upper=.668,lower=.629;
  for(const {thigh,shin,foot,s} of legs){
    const cycle=(phase/(2*Math.PI)+(s>0?.5:0))%1;
    const stance=.61;
    const step=gait*(running?.47:.40);
    const progress=cycle<stance?cycle/stance:(cycle-stance)/(1-stance);
    const swingProgress=progress*progress*(3-2*progress);
    const travel=cycle<stance?step*(1-2*progress):step*(2*swingProgress-1);
    const lift=cycle<stance?0:Math.sin(Math.PI*progress)**1.5*.133*gait;
    const z=mix(travel,s<0?.405:-.336);
    const down=upper+lower-hipDrop-mix(lift,s<0?0:.024);
    const reach=Math.min(upper+lower,Math.hypot(z,down));
    const knee=Math.acos(T.MathUtils.clamp((reach*reach-upper*upper-lower*lower)/(2*upper*lower),-1,1));
    const pitch=Math.atan2(-z,down)-Math.atan2(lower*Math.sin(knee),upper+lower*Math.cos(knee));
    thigh.rotation.x=pitch;
    thigh.rotation.z=mix(0,s<0?-.035:-.085);
    shin.rotation.x=knee;
    foot.rotation.x=-(pitch+knee)+mix(0,s<0?0:.105);
    foot.rotation.z=-thigh.rotation.z;
  }
  for(const {shoulder,elbow,wrist,s} of arms){
    shoulder.rotation.x=mix(-s*swing*.22*gait,s<0?.018:.24);
    shoulder.rotation.z=mix(-s*(.035+(s<0?.07:0)*(1-Math.min(gait,1))),s<0?-.175:.56);
    elbow.rotation.x=mix(-.13-gait*(.10+.09*s*swing),s<0?-.56:-.20);
    elbow.rotation.z=mix(-s*(s<0?.17:.075)*(1-Math.min(gait*.65,1)),s<0?.69:-.53);
    wrist.rotation.x=mix(0,s<0?.12:.16);
    wrist.rotation.z=mix(-s*.05,s<0?.04:-.18);
  }
  shadow.position.x=player.position.x;
  shadow.position.z=player.position.z;
  target.set(player.position.x,1.40,player.position.z);
  const radius=Math.max(width<650?6.6:5.6, 3.6/camera.aspect);
  camera.position.set(target.x+Math.sin(orbit)*radius,target.y+.56+elevation*radius,target.z+Math.cos(orbit)*radius);
  // Hide foreground scenery if the orbit places the camera behind it.
  storefront.visible=camera.position.x > -5.10;
  skyline.visible=camera.position.z > -11.90;
  camera.lookAt(target);
  status.textContent=running?'Running':moving?'Walking':referencePose?'Reference pose':'Ready to walk';
  renderer.render(scene,camera);
});
