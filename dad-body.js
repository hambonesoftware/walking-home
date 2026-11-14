// Authored control sections and weighted joints for the father's jacket and jeans.
export function createDadBody(T, {toon, ink}) {
  const root = new T.Group();
  const leather = toon('#4f332d'), trim = toon('#725143'), rib = toon('#332727');
  const denim = toon('#465069'), crease = ink('#232436'), stitch = ink('#594c48');
  const leatherShade=ink('#251c23'), warmEdge=ink('#a26743');
  const cotton = toon('#bca083'), collar = toon('#a68970');
  const skin = toon('#d48b54'), palm = toon('#af6848');
  const upper = toon('#3b2928'), cap = toon('#d6ad85'), rubber = toon('#bd957b'), tread = toon('#292631');
  const lace = toon('#ead0ad'), eyelet = toon('#8d786a');
  const section = [[1,0],[.94,.42],[.70,.78],[.38,.94],[0,1],[-.38,.94],[-.70,.78],[-.94,.42],[-1,0],[-.94,-.42],[-.70,-.78],[-.38,-.94],[0,-1],[.38,-.94],[.70,-.78],[.94,-.42]];
  const N=section.length;
  const bones = [];
  function bone(name, parent, x=0,y=0,z=0) {
    const b=new T.Bone();
    b.name=name; b.position.set(x,y,z); parent.add(b); bones.push(b);
    return b;
  }
  const hips=bone('Pelvis',root);
  const chest=bone('Chest',hips,0,1.60,0);
  const legs=[], arms=[];
  for(const s of [-1,1]){
    const side=s<0?'R':'L';
    const thigh=bone('Thigh.'+side,hips,s*.157,1.441,0);
    const shin=bone('Shin.'+side,thigh,0,-.668,0);
    const foot=bone('Foot.'+side,shin,0,-.629,0);
    legs.push({thigh,shin,foot,s});
    const shoulder=bone('Upper arm.'+side,chest,s*.352,.604,0);
    const elbow=bone('Forearm.'+side,shoulder,s*.102,-.359,.025);
    const wrist=bone('Hand.'+side,elbow,-s*.041,-.349,.033);
    arms.push({shoulder,elbow,wrist,s});
  }
  root.updateMatrixWorld(true);
  const skeleton=new T.Skeleton(bones);

  function shell() {
    const points=[], indices=[], joints=[], weights=[], colors=[];
    const V = (p,influences,tone=1)=>{
      points.push(...p);
      colors.push(tone,tone,tone);
      for(let i=0;i<4;i++){
        joints.push(influences[i]?bones.indexOf(influences[i][0]):0);
        weights.push(influences[i]?.[1]??0);
      }
      return points.length/3-1;
    };
    const tri=(a,b,c)=>indices.push(a,b,c);
    const quad=(a,b,c,d)=>{tri(a,b,c); tri(a,c,d);};
    function join(lower,upper,skip=()=>false){
      for(let j=0;j<lower.length;j++){
        if(skip(j)) continue;
        const k=(j+1)%lower.length;
        quad(lower[j],upper[j],upper[k],lower[k]);
      }
    }
    function cap(ids,reverse){
      for(let i=1;i<ids.length-1;i++) reverse?tri(ids[0],ids[i+1],ids[i]):tri(ids[0],ids[i],ids[i+1]);
    }
    function point(i){return new T.Vector3().fromArray(points,3*i);}
    function finish(mat, skinning=true, parent=root){
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
      geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const paint=mat.clone(); paint.vertexColors=true;
      if(mat===crease || mat===stitch) paint.side=T.DoubleSide;
      const object=skinning?new T.SkinnedMesh(geometry,paint):new T.Mesh(geometry,paint);
      parent.add(object);
      if(skinning){
        geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));
        geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
        root.updateMatrixWorld(true);
        object.bind(skeleton);
        object.frustumCulled=false;
      }
      return object;
    }
    return {V,tri,quad,join,cap,point,finish};
  }

  function profile([y,w,front,back,x=0,z=0],u,v) {
    return [x+w*u,y,z+(v>0?front:back)*v];
  }
  function ring(builder, dims, weights, tone=1){
    return section.map(([u,v])=>builder.V(profile(dims,u,v),weights,tone));
  }
  function volume(name,parent,profiles,mat){
    const b=shell(), rings=profiles.map(r=>ring(b,r,[]));
    rings.slice(1).forEach((upper,i)=>b.join(rings[i],upper));
    b.cap(rings[0],false); b.cap(rings.at(-1),true);
    const m=b.finish(mat,false,parent); m.name=name;
    return m;
  }
  function panel(parent, points, mat) {
    const b = shell();
    const ids=points.map(p=>b.V(p,[]));
    b.cap(ids,true);
    const object=b.finish(mat,false,parent);
    object.material.side=T.DoubleSide;
    return object;
  }
  function curve(parent, points, width, mat) {
    const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const m=new T.Mesh(new T.TubeGeometry(c,12,width,5,false),mat);
    parent.add(m);
    return m;
  }

  const pants=shell();
  const inside=new Map();
  const folds=shell();
  for(const {thigh,shin,foot,s} of legs){
    const rings=[];
    const mixes=[];
    const rows=[
      [.124,.124,.134,.109,.025,.010,0,1],
      [.163,.144,.160,.120,.037,.020,0,1],
      [.211,.138,.139,.123,.025,-.010,0,1],
      [.274,.151,.157,.128,.023,.005,0,1],
      [.438,.149,.142,.132,.012,.000,0,1],
      [.615,.147,.153,.137,.006,.009,0,1],
      [.741,.150,.147,.141,0,.004,0,.64],
      [.813,.151,.157,.145,-.002,-.006,0,.28],
      [.919,.153,.151,.148,-.002,.006,0,0],
      [1.085,.160,.163,.154,-.003,.007,0,0],
      [1.256,.164,.165,.167,-.003,.009,.12,0],
      [1.393,.172,.161,.175,-.004,.011,.49,0],
      [1.508,.173,.156,.168,-.005,.011,.84,0],
      [1.576,.169,.154,.157,-.005,.011,1,0],
    ];
    rows.forEach(([y,w,f,b,x,z,pelvis,lower],i)=>{
      const mix=[[hips,pelvis],[thigh,(1-pelvis)*(1-lower)],[shin,(1-pelvis)*lower]];
      mixes.push(mix);
      rings.push(section.map(([u,v],j)=>{
        const inner=u*s<0;
        const merge=i>=12 || (i===11 && Math.abs(u)>.88 && inner);
        const splitKey=i+':'+v;
        if(merge && inner && inside.has(splitKey)) return inside.get(splitKey);
        const shapeX=(inner&&merge)?0:s*(.157+x)+u*w;
        const yFold=i<4 ? .024*Math.sin(j*.67+s+i*1.8) : .014*Math.sin(j*.58+s+i*1.5);
        const height=y+(merge&&inner?0:yFold);
        const bunch=i<4 ? .013*Math.sin(j*1.20+s*1.8+i*2.1) : .005*Math.sin(j*.7+s+i*.9);
        const depth=z+((v>0?f:b)+bunch)*v;
        const id=pants.V([shapeX,height,depth],mix,1-.14*Math.abs(v<0?v:0));
        if(merge&&inner) inside.set(splitKey,id);
        return id;
      }));
    });
    rings.slice(1).forEach((upper,i)=>pants.join(rings[i],upper,j=>{
      const middle=(section[j][0]+section[(j+1)%N][0])/2*s;
      return (i>=11 && middle<-.35) || (i===10&&middle<-.88);
    }));
    pants.cap(rings[0],false);
    // A few deliberate angular cloth shadows conform to the deforming surface.
    const foldShape=(locations,shade)=>{
      const ids=locations.map(([r,k])=>{
        const point=pants.point(rings[r][k]);
        point.z+=.004;
        return folds.V(point.toArray(),mixes[r],shade);
      });
      folds.cap(ids,true);
    };
    if(s<0) {
      foldShape([[11,5],[9,4],[7,4],[8,5]],1);
      foldShape([[8,3],[6,4],[4,5],[5,4]],.94);
      foldShape([[3,1],[2,2],[1,4],[2,5],[2,3]],.94);
      foldShape([[5,2],[4,3],[3,3]],.91);
    } else {
      foldShape([[11,2],[10,3],[9,4],[8,4]],1);
      foldShape([[8,6],[6,5],[4,4],[4,5],[6,7]],1);
      foldShape([[4,3],[3,4],[1,5],[2,5]],.94);
      foldShape([[2,5],[1,6],[0,7]],.96);
    }

    const shoeAssembly=new T.Group();
    foot.add(shoeAssembly);
    shoeAssembly.scale.set(1,.89,1.16);
    shoeAssembly.position.y=-.016;
    // A low canvas sneaker with a projecting rubber toe and a flat outsole.
    volume('Charcoal tread',shoeAssembly,[[-.144,.123,.23,.091,0,.042],[-.125,.126,.232,.096,0,.041]],tread);
    volume('Warm foxing and sole',shoeAssembly,[[-.130,.124,.232,.094,0,.041],[-.086,.129,.233,.100,0,.041],[-.075,.126,.226,.096,0,.041]],rubber);
    volume('Dark canvas upper',shoeAssembly,[[-.087,.122,.226,.096,0,.038],[-.051,.115,.209,.092,0,.035],[-.015,.101,.125,.085,0,.024],[.062,.087,.082,.073,0,-.005]],upper);
    const bumper = shell();
    const bottom=ring(bumper,[-.084,.125,.229,.098,0,.042],[]);
    const top=ring(bumper,[-.049,.109,.217,.092,0,.042],[]);
    const crown=ring(bumper,[-.035,.095,.184,.091,0,.043],[]);
    bumper.join(bottom,top,j=>j<1||j>6);
    bumper.join(top,crown,j=>j<2||j>5);
    bumper.finish(cap,false,shoeAssembly).name='Rubber toe bumper';
    for(let i=0;i<4;i++){
      const z=.079+i*.031, y=.064-i*.015;
      curve(shoeAssembly,[[-.055,y,z+.016],[-.006,y+.019,z+.014],[.055,y+.001,z-.011]],.0052,lace);
      curve(shoeAssembly,[[-.054,y-.002,z-.012],[.012,y+.016,z+.015],[.054,y+.002,z+.017]],.0046,lace);
      curve(shoeAssembly,[[.079,y-.018,z-.002],[.061,y-.009,z+.018]],.0027,eyelet);
    }
  }
  volume('Denim seat',hips,[[1.348,.094,.127,.124],[1.402,.167,.150,.149],[1.486,.246,.155,.151],[1.563,.271,.158,.151]],denim);
  pants.finish(denim).name='Continuous wide-leg jeans';
  folds.finish(crease).name='Painted trouser fold accents';

  const jacket=shell();
  const R=[
    [1.480,.276,.199,.163],[1.516,.299,.205,.170],[1.699,.302,.216,.197],
    [1.917,.350,.224,.214],[2.042,.387,.219,.219],[2.138,.401,.205,.208],
    [2.218,.344,.176,.171],[2.285,.133,.104,.121],
  ];
  const J=R.map((r,i)=>section.map(([u,v],j)=>{
    const p=profile(r,u,v);
    // These front edges define the opening, including through the shoulder
    // rings, so the lapels meet the knit without exposing the backdrop.
    if(j===3||j===5){
      const opening=[.184,.184,.181,.175,.157,.145,.124,.103][i];
      p[0]=Math.sign(u)*opening;
      p[2]=r[2]*.98+.008;
    }
    return jacket.V(p,[[chest,i===0?.83:1],[hips,i===0?.17:0]],.93+i*.01);
  }));
  const holes=[{s:1,a:14,b:2},{s:-1,a:6,b:10}];
  function hole(j,{a,b}){return a>b ? j>=a||j<b : j>=a&&j<b;}
  J.slice(1).forEach((upper,i)=>jacket.join(J[i],upper,j=>(i>=3&&i<6&&holes.some(h=>hole(j,h))) || (j===3||j===4)));
  jacket.cap(J[0].filter((_,j)=>j<=3||j>=5),false);
  for (const {s,a,b} of holes){
    const {shoulder,elbow,wrist}=arms.find(item=>item.s===s);
    const cols=[a,(a+1)%N,(a+2)%N,(a+3)%N,b];
    // Trace the armhole so the sleeves share vertices with the bodice.
    const border=[
      ...cols.map(j=>J[3][j]),J[4][b],J[5][b],
      ...[...cols].reverse().map(j=>J[6][j]),J[5][a],J[4][a],
    ].reverse();
    const center=border.reduce((v,id)=>v.add(jacket.point(id)),new T.Vector3()).multiplyScalar(1/border.length);
    const axis=new T.Vector3(s*.40,-.91,.02);
    const side=new T.Vector3(.91,s*.40,0);
    const zAxis=new T.Vector3(0,0,1);
    const angles=border.map(id=>{
      const offset=jacket.point(id).sub(center);
      return Math.atan2(offset.dot(zAxis),offset.dot(side));
    });
    const sleeve=[
      [.408,2.098,.021,.132,.151,.31,0],
      [.438,1.978,.033,.138,.147,.79,.09],
      [.455,1.859,.046,.123,.132,.67,.33],
      [.453,1.798,.054,.130,.130,.41,.59],
      [.435,1.693,.066,.109,.113,0,1],
      [.419,1.561,.077,.095,.096,0,1],
      [.409,1.491,.080,.079,.084,0,1],
    ];
    let prev=border;
    const sleeveRows=[];
    const sleeveWeights=[];
    sleeve.forEach(([x,y,z,w,d,u,l],row)=>{
      const influence=[[chest,Math.max(0,1-u-l)],[shoulder,u],[elbow,l]];
      const own=angles.map((angle,j)=>{
        const taper=.006*Math.cos(j*1.68+row*1.6);
        const c=new T.Vector3(s*x,y,z).addScaledVector(side,(w+taper)*Math.cos(angle)).addScaledVector(zAxis,d*Math.sin(angle));
        c.addScaledVector(axis,.012*Math.sin(j*1.53+row*1.16));
        return jacket.V(c.toArray(),influence,.97-.09*Math.cos(j*.85+row*.9));
      });
      jacket.join(own,prev);
      prev=own;
      sleeveRows.push(own);
      sleeveWeights.push(influence);
    });
    jacket.cap(prev,false);
    // Painted wedges wrap the front of the sleeve and follow the same joints.
    const accents=shell();
    const warm=shell();
    const nearest=needle=>angles.reduce((best,a,i)=>
      Math.cos(a-needle)>Math.cos(angles[best]-needle)?i:best,0);
    function paint(builder, coords){
      const ids=coords.map(([row,angle])=>{
        const point=jacket.point(sleeveRows[row][nearest(angle)]);
        point.z+=.004;
        return builder.V(point.toArray(),sleeveWeights[row]);
      });
      builder.cap(ids,true);
    }
    paint(accents,s<0?[[1,1.35],[2,1.30],[4,1.0],[3,.61],[2,.80]]:[[1,1.62],[3,1.8],[4,1.93],[3,2.20],[2,2.03]]);
    accents.finish(leatherShade).material.side=T.DoubleSide;
    if(s<0){
      paint(warm,[[0,2.12],[1,2.12],[3,2.25],[2,2.52],[1,2.45]]);
      warm.finish(warmEdge).material.side=T.DoubleSide;
    }
    volume('Ribbed leather cuff',wrist,[[-.022,.072,.074,.072],[-.001,.077,.081,.079],[.049,.084,.091,.083]],rib);
    volume('Hand',wrist,[[-.139,.041,.042,.030,-s*.016,.009],[-.103,.063,.047,.033,-s*.009,.005],[-.043,.060,.045,.041,0,.003],[.001,.054,.046,.044,0,0]],skin);
    const thumb=volume('Thumb',wrist,[[-.094,.018,.020,.014,-s*.062,.015],[-.054,.027,.030,.023,-s*.057,.025],[-.021,.020,.022,.021,-s*.043,.018]],skin);
    thumb.rotation.z=s*.14;
    for(let f=0;f<3;f++){
      const x=s*(-.026+f*.021);
      curve(wrist,[[x,-.129,.037],[x+s*.005,-.109,.050],[x+s*.008,-.086,.050]],.0022,palm);
    }
  }
  const jacketMesh=jacket.finish(leather);
  jacketMesh.name='Continuous leather jacket and sleeves';
  // Back yoke and ribbed hem stay with the chest.
  const waistband = shell();
  const h0=ring(waistband,[-.109,.278,.192,.174],[]);
  const h1=ring(waistband,[-.060,.302,.207,.176],[]);
  waistband.join(h0,h1,j=>j>=2&&j<6);
  waistband.finish(rib,false,chest).name='Ribbed leather waistband';
  curve(chest,[[-.316,.481,-.158],[-.208,.398,-.211],[0,.381,-.222],[.208,.398,-.211],[.316,.481,-.158]],.0038,stitch);
  for(let i=-13;i<=13;i++){
    const u=i/14, x=u*.283;
    const z=-.172*Math.sqrt(1-u*u);
    curve(chest,[[x,-.12,z],[x*1.025,-.076,z-.003]],.0019,trim);
  }

  volume('Inner jacket facing',chest,[[-.032,.212,.172,.105],[.031,.224,.190,.127],[.238,.231,.205,.142],[.469,.215,.211,.143],[.610,.164,.163,.117],[.672,.111,.117,.100]],rib);
  // Close the jacket front visually using an inset knit, two overlapping lapels,
  // welt pockets, and a narrow belt that remains visible above the jeans.
  volume('Oatmeal sweater',chest,[[.004,.192,.205,.141],[.025,.195,.222,.145],[.206,.198,.237,.133],[.417,.225,.242,.134],[.546,.189,.220,.126],[.645,.124,.146,.109]],cotton);
  volume('Ribbed knit collar',chest,[[.591,.129,.143,.113],[.621,.131,.146,.118],[.657,.124,.129,.114]],collar);
  volume('Neck',chest,[[.62,.106,.101,.100],[.684,.104,.098,.101],[.793,.099,.094,.096]],skin);
  for(let i=0;i<=13;i++){
    const angle=Math.PI*i/13;
    curve(chest,[[.122*Math.cos(angle),.60,.137*Math.sin(angle)],[.125*Math.cos(angle),.643,.143*Math.sin(angle)]],.0025,cotton);
  }
  for(const s of [-1,1]){
    curve(hips,[[s*.232,1.545,.159],[s*.219,1.480,.169],[s*.151,1.422,.182]],.004,crease);
    panel(hips,[[s*.084,1.483,-.148],[s*.218,1.491,-.150],[s*.211,1.405,-.157],[s*.151,1.376,-.158],[s*.091,1.413,-.164]],denim);
    curve(hips,[[s*.087,1.474,-.154],[s*.149,1.456,-.167],[s*.211,1.480,-.154]],.0024,stitch);
    panel(chest,[[s*.098,.674,.134],[s*.188,.627,.162],[s*.309,.454,.204],[s*.223,.472,.231],[s*.147,.376,.244],[s*.128,.520,.218]],trim);
    panel(chest,[[s*.136,.530,.226],[s*.147,.376,.247],[s*.222,.471,.235],[s*.184,.476,.237]],rib);
    curve(chest,[[s*.152,.452,.232],[s*.174,.314,.231],[s*.182,.102,.225],[s*.189,-.089,.218]],.0045,rib);
    curve(chest,[[s*.285,.238,.181],[s*.265,.155,.198],[s*.243,.071,.207]],.009,rib);
    curve(chest,[[s*.286,.238,.205],[s*.265,.155,.204],[s*.243,.071,.212]],.003,trim);
  }
  volume('Dark leather belt',hips,[[1.549,.226,.187,.158],[1.594,.231,.198,.158]],rib);
  const buckle=[[-.044,1.551,.202],[-.044,1.584,.202],[.042,1.584,.202],[.042,1.551,.202]];
  panel(hips,buckle,eyelet);
  panel(hips,[[-.034,1.556,.205],[-.034,1.579,.205],[.032,1.579,.205],[.032,1.556,.205]],upper);
  return {root,hips,chest,legs,arms,jacketMesh};
}
