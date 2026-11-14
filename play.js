import * as T from './three.module.js';

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
const ramp = new T.DataTexture(new Uint8Array([72, 146, 224]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.needsUpdate = true;
const toon = color => new T.MeshToonMaterial({ color, gradientMap: ramp });
const ink = color => new T.MeshBasicMaterial({color});
const leather = toon('#654031'), collar = toon('#825644'), knit = toon('#c5a180');
const denim = toon('#4e5b79'), skin = toon('#dc975f'), hair = toon('#1e202e');
const sole = toon('#e1c3a0'), shoe = toon('#3a2a30'), black = ink('#211a26'), ivory = ink('#ffe4b8');
const ambient = new T.AmbientLight('#9db1ed', 1.15);
const key = new T.DirectionalLight('#ffd1a0', 2.0);
const rim = new T.DirectionalLight('#e59361', 1.2);
key.position.set(-4, 6, 5);
rim.position.set(2, 4, -5);
scene.add(ambient, key, rim);

function group(parent, x=0, y=0, z=0) {
  const node = new T.Group();
  node.position.set(x,y,z);
  parent.add(node);
  return node;
}
function mesh(parent, geometry, material) {
  const object = new T.Mesh(geometry, material);
  parent.add(object);
  return object;
}
// A closed loft with independently authored front, rear and side profiles.
function loft(parent, rings, material) {
  const section = [[1,0],[.87,.55],[.52,.87],[0,1],[-.52,.87],[-.87,.55],[-1,0],[-.87,-.55],[-.52,-.87],[0,-1],[.52,-.87],[.87,-.55]];
  const n = section.length;
  const xyz = [];
  for (const [y,w,front,back,x=0,z=0] of rings) {
    for (const [u,v] of section) xyz.push(x+w*u,y,z+(v>0?front:back)*v);
  }
  const indices = [];
  for(let i=0;i<rings.length-1;i++) for(let j=0;j<n;j++) {
    const a=i*n+j,b=i*n+(j+1)%n;
    indices.push(a,a+n,b,b,a+n,b+n);
  }
  for(let j=1;j<n-1;j++) {
    const top=(rings.length-1)*n;
    indices.push(0,j,j+1,top,top+j+1,top+j);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return mesh(parent,geo,material);
}
function plate(parent, points, material) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(points.flat(),3));
  const indices = [];
  for(let i=1;i<points.length-1;i++) indices.push(0,i,i+1);
  g.setIndex(indices);
  g.computeVertexNormals();
  const paint = material.clone();
  paint.side = T.DoubleSide;
  return mesh(parent,g,paint);
}
function box(parent,x,y,z,w,h,d,mat) {
  const obj=mesh(parent,new T.BoxGeometry(w,h,d),mat);
  obj.position.set(x,y,z);
  return obj;
}
function stroke(parent, points, width, material) {
  const curve = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return mesh(parent,new T.TubeGeometry(curve,10,width,5,false),material);
}

const player=group(scene);
player.name='Father';
const body=group(player);
loft(body,[[1.14,.23,.13,.14],[1.27,.30,.15,.16],[1.61,.34,.18,.17],[1.86,.41,.19,.18],[1.99,.38,.16,.15],[2.09,.17,.12,.12]],leather);
loft(body,[[1.15,.23,.14,.13],[1.26,.24,.14,.14],[1.39,.25,.14,.14]],denim);
loft(body,[[1.25,.15,.179,.09],[1.48,.15,.199,.10],[1.8,.142,.216,.09],[2.03,.114,.159,.08],[2.09,.115,.15,.09]],knit);
for (const sign of [-1,1]) {
  plate(body,[[sign*.1,2.12,.124],[sign*.25,2.016,.153],[sign*.27,1.88,.204],[sign*.13,1.951,.213]],collar);
  stroke(body,[[sign*.139,1.91,.207],[sign*.163,1.60,.197],[sign*.162,1.29,.177]],.008,collar);
}
loft(body,[[2.02,.11,.085,.09],[2.21,.105,.094,.09]],skin);
const head=group(body,0,2.19,.007);
const face=group(head);
loft(face,[[0,.075,.111,.087,0,.012],[.047,.127,.134,.111,0,.005],[.139,.181,.144,.151],[.244,.187,.154,.163],[.365,.171,.142,.157],[.433,.122,.102,.116],[.46,.035,.045,.051]],skin);
for (const sign of [-1,1]) {
  const ear=group(face,sign*.172,.164,-.004);
  loft(ear,[[-.056,.023,.018,.023],[-.025,.04,.034,.025],[.05,.034,.03,.026],[.077,.013,.013,.012]],skin);
  const x=sign*.082;
  plate(face,[[x-.038,.229,.145],[x+.024,.235,.15],[x+.039,.223,.144],[x+.015,.213,.154],[x-.029,.214,.154]],ivory);
  plate(face,[[x-.006,.229,.156],[x+.014,.231,.156],[x+.013,.214,.159],[x-.006,.216,.159]],black);
  plate(face,[[x-.044,.249,.147],[x-.023,.265,.153],[x+.028,.263,.148],[x+.04,.247,.144],[x+.006,.253,.158]],black);
}
plate(face,[[-.023,.23,.151],[.013,.226,.156],[.029,.157,.169],[.004,.145,.213],[-.022,.159,.166]],skin);
const expressions={
  smile:stroke(face,[[-.052,.104,.135],[-.022,.094,.151],[.025,.093,.151],[.061,.107,.135]],.006,black),
  focus:stroke(face,[[-.044,.096,.14],[0,.101,.151],[.044,.099,.143]],.006,black)
};
expressions.focus.visible=false;
loft(head,[[.231,.173,.11,.168],[.31,.199,.137,.18],[.396,.197,.164,.173],[.467,.148,.135,.149],[.493,.051,.07,.081]],hair);
function wedge(parent, coords, material) {
  const [a,b,c,d,e] = coords;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([a,b,c,d,e].flat(),3));
  g.setIndex([0,2,1,0,1,3,1,2,3,2,4,3,4,0,3,0,4,2]);
  g.computeVertexNormals();
  return mesh(parent,g,material);
}
for(const [x,y,z,w] of [[-.135,.405,.102,.071],[-.071,.433,.132,.085],[.018,.446,.145,.092],[.094,.439,.14,.092],[.143,.406,.111,.071]]) {
  wedge(head,[[x-w,y-.04,z-.027],[x,y+.027,z+.018],[x+.062,y-.09,z+.044],[x+.032,y-.006,z+.066],[x-.051,y-.082,z-.042]],hair);
}
const legs=[],arms=[];
for(const sign of [-1,1]) {
  const hip=group(player,sign*.143,1.22,0);
  const knee=group(hip,0,-.57,0);
  const foot=group(knee,0,-.52,0);
  loft(hip,[[-.60,.116,.119,.105],[-.43,.121,.124,.112],[-.11,.139,.146,.134],[.07,.149,.145,.143]],denim);
  loft(knee,[[-.54,.087,.087,.082],[-.40,.108,.098,.097],[-.13,.113,.105,.103],[.03,.118,.119,.106]],denim);
  loft(foot,[[-.111,.117,.201,.112,0,.045],[-.068,.12,.204,.115,0,.045]],sole);
  loft(foot,[[-.066,.112,.199,.107,0,.04],[-.018,.104,.19,.1,0,.042],[.07,.084,.085,.085]],shoe);
  for(let i=0;i<3;i++) stroke(foot,[[-.054,.041-i*.01,.078+i*.027],[0,.048-i*.01,.085+i*.027],[.054,.041-i*.01,.092+i*.027]],.005,sole);
  const shoulder=group(body,sign*.309,1.91,0);
  const elbow=group(shoulder,sign*.046,-.39,.002);
  const wrist=group(elbow,0,-.347,0);
  loft(shoulder,[[-.416,.108,.114,.103,sign*.046],[-.25,.113,.123,.106,sign*.038],[-.06,.132,.141,.128,sign*.025],[.083,.125,.133,.12]],leather);
  loft(elbow,[[-.36,.078,.082,.069],[-.27,.088,.098,.086],[-.06,.108,.114,.1],[.044,.111,.114,.104]],leather);
  loft(wrist,[[-.135,.048,.043,.038],[-.098,.066,.052,.042],[-.015,.054,.049,.045],[.023,.055,.05,.049]],skin);
  legs.push({hip,knee,foot,sign});
  arms.push({shoulder,elbow,sign});
}
const ground=toon('#4a4556');
box(scene,0,-.072,0,14,.12,24,ground);
const seam=ink('#353447');
for(let x=-6;x<=6;x+=2) box(scene,x,-.009,0,.018,.003,23.8,seam);
for(let z=-11;z<12;z+=2) box(scene,0,-.008,z,13.9,.003,.018,seam);
const amber=ink('#d99555'), frame=toon('#352a37'), stone=toon('#493642');
box(scene,-5.7,2.55,0,.6,5.1,24,stone);
for(let z=-10;z<=10;z+=3){
  box(scene,-5.35,1.94,z,.09,2.85,2.7,amber);
  for(const y of [.52,1.45,2.35,3.35]) box(scene,-5.26,y,z,.13,.07,2.75,frame);
  for(const dz of [-1.36,0,1.36]) box(scene,-5.24,1.94,z+dz,.13,2.85,.07,frame);
}
for(let i=0;i<16;i++){
  const x=-13+i*1.72;
  const h=3.5+((i*67)%49)/10;
  box(scene,x,h/2,-13-i%3,1.55,h,2,ink(i%2?'#19243a':'#1c283e'));
  for(let row=1;row<h-1;row+=.7) if((i+Math.round(row*10))%3!==0)
    box(scene,x+.27,row,-11.98-i%3,.1,.24,.03,ink('#a87962'));
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
let orbit=.29,elevation=.10,drag=false;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag=true;});
canvas.addEventListener('pointermove',e=>{if(drag){orbit-=e.movementX*.012;elevation=T.MathUtils.clamp(elevation+e.movementY*.006,-.25,.62);}});
for(const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{drag=false;});
document.querySelector('#reset').onclick=()=>{orbit=.29;elevation=.10;player.position.set(0,0,0);player.rotation.y=0;document.activeElement.blur();};
document.querySelector('#coat').onchange=e=>{leather.color.set(e.target.value);e.target.blur();};
document.querySelector('#jaw').oninput=e=>{face.scale.x=Number(e.target.value);};
document.querySelector('#expression').onchange=e=>{for(const [name,obj] of Object.entries(expressions)) obj.visible=name===e.target.value;e.target.blur();};

const clock=new T.Clock();
const target=new T.Vector3();
let phase=0, gait=0;
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
    const angle=Math.atan2(x,z)+orbit;
    const velocity=running?3.65:1.95;
    player.position.x=T.MathUtils.clamp(player.position.x+Math.sin(angle)*dt*velocity,-4.5,5.4);
    player.position.z=T.MathUtils.clamp(player.position.z+Math.cos(angle)*dt*velocity,-9,9);
    const delta=angle-player.rotation.y;
    player.rotation.y+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-13*dt));
  }
  gait=T.MathUtils.damp(gait,moving?(running?1.28:1):0,11,dt);
  phase+=dt*(running?12:8.7);
  const swing=Math.sin(phase);
  body.position.y=.039*gait*Math.abs(swing);
  body.rotation.y=.052*gait*swing;
  head.rotation.z=-.058-.027*gait*swing;
  head.rotation.y=.10;
  for(const {hip,knee,foot,sign} of legs){
    hip.rotation.x=sign*swing*.54*gait;
    knee.rotation.x=-Math.max(0,-sign*swing)*.74*gait;
    foot.rotation.x=-.28*(hip.rotation.x+knee.rotation.x);
  }
  for(const {shoulder,elbow,sign} of arms){
    shoulder.rotation.x=-sign*swing*.43*gait;
    shoulder.rotation.z=sign*.10;
    elbow.rotation.x=-.12-gait*(.15+.11*sign*swing);
  }
  shadow.position.x=player.position.x;
  shadow.position.z=player.position.z;
  target.set(player.position.x,1.33,player.position.z);
  const radius=Math.max(width<650?6.6:5.6, 4.3/camera.aspect);
  camera.position.set(target.x+Math.sin(orbit)*radius,target.y+.56+elevation*radius,target.z+Math.cos(orbit)*radius);
  camera.lookAt(target);
  status.textContent=running?'Running':moving?'Walking':'Ready to walk';
  renderer.render(scene,camera);
});
