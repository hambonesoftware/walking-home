// Dad's head is a closed mesh. The features sample its surface so they stay
// attached when the jaw control changes proportions or the player turns.
export function createDadHead(T, { toon, ink }) {
  const head = new T.Group();
  const face = new T.Group();
  head.name = 'Head';
  face.name = 'Face proportions';
  head.add(face);

  const skin = toon('#d39060');
  const hairBase = toon('#191722');
  const hairPlane = toon('#24212e');
  const hairSheen = toon('#39303a');
  const liner = ink('#271c23');
  const sclera = ink('#f4d9b6');
  const iris = ink('#573125');
  const pupil = ink('#1b1720');
  const catchlight = ink('#ffebce');
  const crease = ink('#704332');
  const lips = ink('#a3624e');
  const earInterior = toon('#a96447');
  const cheekGlaze = toon('#dc9868');
  const hairRim = toon('#99704e');

  function surface(parent, name, vertices, triangles, material) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(triangles);
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }

  // x and z as fractions of ring widths and depths. The compact groups of
  // points near the centre give the bridge and tip their own facial planes.
  const crossSections = [
    [1, .05], [.93, .38], [.81, .65], [.62, .82], [.42, .925],
    [.24, .978], [.12, .995], [0, 1], [-.12, .995], [-.24, .978],
    [-.42, .925], [-.62, .82], [-.81, .65], [-.93, .38], [-1, .05],
    [-.94, -.39], [-.74, -.72], [-.42, -.91], [0, -1],
    [.42, -.91], [.74, -.72], [.94, -.39]
  ];
  // height, half-width, front, rear, center-depth and central nose projection
  const skullRings = [
    [.009, .064, .073, .074, .029, 0],
    [.032, .115, .122, .106, .018, 0],
    [.072, .142, .136, .134, .006, 0],
    [.111, .157, .144, .144, .002, 0],
    [.134, .158, .149, .153, 0, 0],
    [.151, .165, .147, .160, -.002, .013],
    [.169, .173, .148, .165, -.002, .051],
    [.187, .184, .150, .170, -.004, .058],
    [.212, .185, .151, .174, -.005, .037],
    [.238, .182, .146, .174, -.007, .026],
    [.259, .177, .140, .172, -.005, .020],
    [.281, .176, .153, .170, -.006, .009],
    [.313, .176, .160, .168, -.010, 0],
    [.367, .173, .149, .159, -.012, 0],
    [.417, .155, .124, .144, -.016, 0],
    [.449, .113, .091, .107, -.017, 0],
    [.471, .047, .039, .048, -.019, 0]
  ];
  const skull = skullRings.map(([y, w, front, back, center, nose]) =>
    crossSections.map(([x, z]) => [
      w*x,
      y,
      center + z * (z < 0 ? back : front)
        + (z > .95 ? nose * Math.max(0, 1 - Math.abs(x)/.3) : 0)
    ]));

  function ringSurface(parent, name, rings, material) {
    const vertices = rings.flat();
    const count = rings[0].length;
    const triangles = [];
    for (let row = 0; row < rings.length - 1; row++) {
      for (let column = 0; column < count; column++) {
        const a = row * count + column;
        const b = row * count + (column + 1) % count;
        triangles.push(a, a + count, b, b, a + count, b + count);
      }
    }
    const bottom = vertices.length;
    const top = bottom + 1;
    for (const ring of [rings[0], rings.at(-1)]) {
      vertices.push([0, 1, 2].map(axis => ring.reduce((sum, point) => sum + point[axis], 0) / count));
    }
    const last = (rings.length - 1) * count;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      triangles.push(bottom, i, j, top, last + j, last + i);
    }
    return surface(parent, name, vertices, triangles, material);
  }
  const skullMesh = ringSurface(face, 'Sculpted chin, cheeks and nose', skull, skin);
  const ray = new T.Raycaster();
  const front = new T.Vector3(0, 0, -1);

  function onSkin(x, y, offset) {
    ray.set(new T.Vector3(x, y, 1), front);
    const hit = ray.intersectObject(skullMesh, false)[0];
    return [x, y, (hit?.point.z ?? .13) + offset];
  }

  // Triangulate and subdivide graphic shapes to follow the facial planes.
  function mark(parent, name, outline, material, offset = .0015) {
    const vertices = [];
    const triangles = [];
    const contour = outline.map(([x,y]) => new T.Vector2(x,y));
    for (const corners of T.ShapeUtils.triangulateShape(contour, [])) {
      let [a,b,c] = corners.map(index => contour[index]);
      if ((b.x-a.x)*(c.y-a.y) < (b.y-a.y)*(c.x-a.x)) [b,c] = [c,b];
      const eighths = 5;
      const start = vertices.length;
      const rows = [];
      for (let i = 0; i <= eighths; i++) {
        rows.push(vertices.length - start);
        for (let j = 0; j <= eighths - i; j++) {
          vertices.push(onSkin(
            a.x + (b.x-a.x)*i/eighths + (c.x-a.x)*j/eighths,
            a.y + (b.y-a.y)*i/eighths + (c.y-a.y)*j/eighths, offset
          ));
        }
      }
      for (let i = 0; i < eighths; i++) {
        for (let j = 0; j < eighths-i; j++) {
          const p = start + rows[i] + j;
          const q = start + rows[i+1] + j;
          triangles.push(p,q,p+1);
          if (j < eighths-i-1) triangles.push(p+1,q,q+1);
        }
      }
    }
    return surface(parent, name, vertices, triangles, material);
  }
  function oval(x,y,w,h) {
    return Array.from({length:12}, (_,i) => {
      const angle = i * Math.PI/6;
      return [x + Math.cos(angle)*w, y + Math.sin(angle)*h];
    });
  }

  const expressions = { smile: new T.Group(), focus: new T.Group() };
  face.add(expressions.smile, expressions.focus);
  expressions.focus.visible = false;

  for (const sign of [-1, 1]) {
    const ear = [
      [sign*.155, .133, -.052],[sign*.184, .142, -.022],[sign*.206, .186, -.012],
      [sign*.207, .225, -.006],[sign*.192, .253, -.028],[sign*.164, .249, -.041],
      [sign*.190, .205, .032],[sign*.165, .203, -.073]
    ];
    // Closed volumes, with the back of each ear tucked into the skull.
    const earTriangles = [0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6,1,0,7,2,1,7,3,2,7,4,3,7,5,4,7,0,5,7];
    if (sign < 0) for (let i=0; i<earTriangles.length; i+=3) {
      [earTriangles[i],earTriangles[i+1]] = [earTriangles[i+1],earTriangles[i]];
    }
    surface(face, 'Ear', ear, earTriangles, skin);
    const inset = [
      [sign*.183,.170,.018],[sign*.191,.181,.026],[sign*.198,.218,.015],
      [sign*.191,.233,.016],[sign*.177,.214,.027],[sign*.185,.205,.033]
    ];
    const earMarks = sign > 0 ? [0,1,5,1,2,5,2,3,5,3,4,5] : [1,0,5,2,1,5,3,2,5,4,3,5];
    surface(face,'Ear folds',inset,earMarks,earInterior);

    const x = sign*.079;
    const y = .245 - (sign===1 ? .005 : 0);
    const eye = [
      [x-.034,y-.001],[x-.021,y+.005],[x+.002,y+.007],[x+.023,y+.004],
      [x+.034,y-.003],[x+.019,y-.008],[x-.010,y-.009],[x-.027,y-.007]
    ];
    mark(face, 'Almond eye', eye, sclera, .002);
    mark(face, 'Brown iris', oval(x+.017,y-.005,.009,.007), iris, .003);
    mark(face, 'Pupil', oval(x+.017,y-.006,.0055,.006), pupil, .004);
    mark(face, 'Eye catchlight', oval(x+.014,y-.004,.0018,.0018), catchlight, .0048);
    mark(face, 'Tapered upper eyelid', [
      eye[0], ...eye.slice(1,5), [x+.025,y+.006],[x+.004,y+.011],[x-.023,y+.010]
    ], liner, .0044);

    const brow = [
      [x-.043,y+.020],[x-.029,y+.037],[x+.008,y+.037],[x+.038,y+.023],
      [x+.045,y+.017],[x+.019,y+.021],[x-.011,y+.022]
    ];
    mark(expressions.smile, 'Angled brow', brow, liner);
    mark(expressions.focus, 'Lowered brow', brow.map(([bx,by]) => [
      bx, by - .010 + (bx-x)*sign*.13
    ]), liner, .0023);
  }
  mark(face, 'Light across left cheekbone', [
    [-.134,.213],[-.114,.219],[-.099,.212],[-.075,.210],[-.069,.204],
    [-.099,.198],[-.118,.195],[-.130,.201]
  ], cheekGlaze, .0016);
  mark(face, 'Nose shadow', [[-.025,.158],[-.015,.161],[-.006,.156],[.014,.152],[.027,.156],[.022,.150],[.007,.148],[-.010,.152]], crease, .0017);
  mark(expressions.smile, 'Asymmetric smile', [
    [-.062,.114],[-.039,.111],[-.016,.105],[.019,.105],[.046,.112],[.064,.125],
    [.053,.111],[.033,.103],[.008,.100],[-.020,.102],[-.047,.109]
  ], liner, .0024);
  mark(expressions.smile, 'Lower lip', [[-.028,.094],[.005,.092],[.031,.094],[.020,.087],[.002,.085],[-.018,.088]], lips, .0022);
  mark(expressions.focus, 'Quiet mouth', [[-.057,.105],[-.028,.110],[.006,.108],[.052,.102],[.026,.103],[-.002,.102],[-.029,.104]], liner, .0024);

  // Close-cut sides and a longer top. Hairline heights are arranged around
  // the skull, leaving an irregular brow line and an actual nape in profile.
  const hairline = [
    .220,.262,.305,.319,.354,.366,.359,.346,.352,.360,.367,.343,.312,.263,.222,
    .193,.160,.144,.143,.150,.168,.192
  ];
  const crownProfile=[...skullRings.slice(0,-1), [.480,.096,.083,.088,-.019,0], [.516,.041,.042,.046,-.028,0], [.530,.007,.008,.008,-.032,0]];
  const cap = [0,.18,.35,.51,.65,.77,.87,.94,1].map(t => crossSections.map(([x,z],i) => {
    const y = T.MathUtils.lerp(hairline[i], .527 + .001*x, t);
    const top = crownProfile.findIndex(row=>row[0] >= y);
    const before = crownProfile[top-1];
    const after = crownProfile[top];
    const weight = (y-before[0])/(after[0]-before[0]);
    const blend = index => T.MathUtils.lerp(before[index], after[index], weight);
    const swelling = t > .87 ? .007 : .016;
    return [x*(blend(1)+swelling)+.012*t,y,blend(4)+z*(blend(z>0?2:3)+swelling)];
  }));
  ringSurface(head, 'Angular swept crown and nape', cap, hairBase);

  // Each fin has front/rear thickness with a shared edge under the crown.
  // The primary lock sweeps to the right from the left temple.
  function lock(name, outline, ridge, color = hairBase) {
    const verts = [...outline, ridge];
    const ridgeIndex = outline.length;
    const tris = [];
    for (let i=0;i<outline.length;i++) {
      tris.push(i,(i+1)%outline.length,ridgeIndex);
    }
    // The fins' crests are visible from all camera angles, even where the
    // outer side crosses the sweeping hairline.
    const paint = color.clone();
    paint.side = T.DoubleSide;
    return surface(head,name,verts,tris,paint);
  }
  const mainSweep = [
    [-.196,.306,.068],[-.190,.404,.095],[-.145,.479,.101],
    [-.042,.523,.095],[.056,.522,.081],[.154,.486,.066],
    [.255,.459,.070],[.163,.468,.152],[.089,.441,.165],
    [.008,.406,.161],[-.078,.375,.163],[-.146,.331,.113]
  ];
  const sweepRidge = [-.033,.462,.186];
  lock('Main swept wave', mainSweep, sweepRidge, hairBase);
  const upperSweep = mainSweep.slice(1,5);
  const band = upperSweep.flatMap((edge,i) => {
    const width=[.022,.17,.094,.014][i];
    return [width*.18,width].map(t=>edge.map((v,axis)=>T.MathUtils.lerp(v,sweepRidge[axis],t)+(axis===2?.0012:0)));
  });
  surface(head, 'Amber edge on the swept lock', band, [0,1,2,1,3,2,2,3,4,3,5,4,4,5,6,5,7,6], hairRim);
  lock('Crown sweep', [
    [-.176,.432,.061],[-.160,.493,.018],[-.107,.531,.004],
    [-.049,.541,-.012],[.039,.522,-.030],[.092,.510,.010],
    [.168,.478,.048],[.039,.496,.102],[-.080,.484,.124]
  ],[-.041,.522,.069],hairPlane);
  lock('Fringe over left temple', [
    [-.181,.431,.092],[-.098,.431,.174],[-.026,.426,.176],
    [-.066,.392,.182],[-.110,.352,.156],[-.131,.276,.104],
    [-.141,.327,.117],[-.183,.332,.081]
  ],[-.122,.401,.160],hairBase);
  lock('Loose central lock', [
    [-.062,.434,.183],[.009,.453,.173],[.084,.438,.165],
    [.054,.403,.190],[.004,.359,.166],[.018,.399,.181],[-.027,.409,.182]
  ],[.023,.420,.211],hairPlane);
  lock('Hook over right brow', [
    [.057,.451,.162],[.137,.457,.147],[.184,.429,.086],
    [.153,.390,.144],[.106,.340,.164],[.114,.382,.176],[.082,.402,.178]
  ],[.126,.424,.191],hairBase);
  lock('Broken outer tip', [
    [.105,.491,.028],[.181,.469,.043],[.230,.470,.015],
    [.206,.446,.030],[.251,.422,.033],[.172,.429,.099]
  ],[.184,.456,.087],hairBase);
  lock('Brushed crown highlight', [
    [-.183,.420,.109],[-.136,.461,.152],[-.070,.486,.169],[.011,.485,.180],
    [-.056,.473,.194],[-.122,.439,.158]
  ],[-.085,.468,.176],hairSheen);

  const features = [];
  face.traverse(object => {
    if (!object.isMesh) return;
    const position = object.geometry.getAttribute('position');
    features.push({ geometry: object.geometry, position, neutral: position.array.slice() });
  });
  function setJaw(width) {
    for (const { geometry, position, neutral } of features) {
      for (let i = 0; i < position.count; i++) {
        const y = neutral[i*3 + 1];
        const jawWeight = 1-T.MathUtils.smoothstep(y,.059,.194);
        position.setX(i, neutral[i*3] * (1 + (width-1)*jawWeight));
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  }
  return { head, face, expressions, setJaw };
}
