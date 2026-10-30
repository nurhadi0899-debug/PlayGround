import * as THREE from 'three'

const C = {
  concrete: 0xb9b1a1,
  concreteDark: 0x8f887b,
  concreteLight: 0xcfc7b7,
  metal: 0x6f7377,
  coping: 0xd8d2c4,
  orange: 0xf27a32,
  teal: 0x1f9a9a,
  yellow: 0xf5c542,
  pink: 0xe85d8a,
  navy: 0x24324a,
  wood: 0x8a5a35,
}

function canvasTexture(width, height, draw, repeat = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.anisotropy = 8
  return texture
}

function noise(ctx, w, h, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3 + 1, Math.random() * 3 + 1)
  }
}

function makeConcrete() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#c9c1b0'
    ctx.fillRect(0, 0, w, h)
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, 'rgba(255,255,255,.12)')
    grad.addColorStop(0.5, 'rgba(120,110,95,.05)')
    grad.addColorStop(1, 'rgba(70,62,52,.12)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    noise(ctx, w, h, 26000, 0.11)
    for (let i = 0; i < 44; i++) {
      ctx.strokeStyle = `rgba(75,68,58,${0.04 + Math.random() * 0.09})`
      ctx.lineWidth = 0.7 + Math.random() * 2
      ctx.beginPath()
      let x = Math.random() * w
      let y = Math.random() * h
      ctx.moveTo(x, y)
      for (let j = 0; j < 4 + Math.random() * 5; j++) {
        x += (Math.random() - 0.5) * 90
        y += (Math.random() - 0.5) * 90
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = 20 + Math.random() * 90
      const stain = ctx.createRadialGradient(x, y, 0, x, y, r)
      stain.addColorStop(0, `rgba(70,62,50,${0.03 + Math.random() * 0.06})`)
      stain.addColorStop(1, 'rgba(70,62,50,0)')
      ctx.fillStyle = stain
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.strokeStyle = 'rgba(70,64,55,.22)'
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,.18)'
    ctx.lineWidth = 2
    ctx.strokeRect(5, 5, w - 10, h - 10)
  }, 8)
}

function makeGraffiti(text, colors, opts = {}) {
  const w = 1024, h = 512
  return canvasTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2 + 12)
    ctx.rotate((opts.rotate || 0) * Math.PI / 180)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `900 ${opts.size || 190}px Impact, "Arial Black", sans-serif`
    ctx.lineJoin = 'round'
    ctx.lineWidth = 28
    ctx.strokeStyle = 'rgba(30,22,34,.9)'
    ctx.strokeText(text, 0, 0)
    const grad = ctx.createLinearGradient(-380, -120, 380, 120)
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c))
    ctx.fillStyle = grad
    ctx.fillText(text, 0, 0)
    ctx.lineWidth = 7
    ctx.strokeStyle = 'rgba(255,255,255,.7)'
    ctx.strokeText(text, 0, 0)
    if (opts.drips !== false) {
      for (let i = 0; i < 12; i++) {
        const x = (Math.random() - 0.5) * 600
        const len = 10 + Math.random() * 55
        ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)]
        ctx.lineWidth = 3 + Math.random() * 7
        ctx.beginPath()
        ctx.moveTo(x, 40 + Math.random() * 30)
        ctx.lineTo(x + (Math.random() - 0.5) * 10, 40 + len)
        ctx.stroke()
      }
    }
    ctx.restore()
    noise(ctx, w, h, 5000, 0.06)
  })
}

function makeChainLink() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(70,78,84,.85)'
    ctx.lineWidth = 2
    for (let i = -h; i < w + h; i += 22) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke()
    }
  }, 1)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function makeSky() {
  const geo = new THREE.SphereGeometry(360, 48, 24)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2f72b0) },
      mid: { value: new THREE.Color(0xffa363) },
      bottom: { value: new THREE.Color(0xffd7a4) },
      sunDir: { value: new THREE.Vector3(-0.45, 0.26, -0.85).normalize() },
      sunColor: { value: new THREE.Color(0xfff1c9) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      uniform vec3 sunDir; uniform vec3 sunColor;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        float h = clamp(vWorld.y, -0.15, 1.0);
        vec3 col = mix(bottom, mid, smoothstep(-0.02, 0.16, h));
        col = mix(col, top, smoothstep(0.12, 0.5, h));
        float sun = max(dot(normalize(vWorld), sunDir), 0.0);
        col += sunColor * pow(sun, 900.0) * 3.0;
        col += sunColor * pow(sun, 12.0) * 0.22;
        float glow = pow(sun, 3.0) * 0.10;
        col += vec3(1.0,0.55,0.28) * glow;
        float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col + dither, 1.0);
      }
    `,
  })
  return new THREE.Mesh(geo, mat)
}

function makeCloudTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < 22; i++) {
      const x = 60 + Math.random() * (w - 120)
      const y = 70 + Math.random() * (h - 140)
      const r = 25 + Math.random() * 70
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,244,225,.34)')
      g.addColorStop(0.6, 'rgba(255,235,215,.16)')
      g.addColorStop(1, 'rgba(255,235,215,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
}

function addGraffitiPlane(parent, text, colors, w, h, pos, rot, opts) {
  const tex = makeGraffiti(text, colors, opts)
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.96 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
  mesh.position.set(pos[0], pos[1], pos[2])
  mesh.rotation.set(rot[0], rot[1], rot[2])
  mesh.renderOrder = 2
  parent.add(mesh)
  return mesh
}

function buildSkaterModel(THREE) {
  const root = new THREE.Group()
  const board = new THREE.Group()
  const body = new THREE.Group()
  root.add(board, body)

  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.55, metalness: 0.05 })
  const deckBottomMat = new THREE.MeshStandardMaterial({ color: 0xf05a2b, roughness: 0.45 })
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 1 })
  const truckMat = new THREE.MeshStandardMaterial({ color: 0xc9c5bb, roughness: 0.35, metalness: 0.8 })
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.7 })

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.075, 2.05), [deckMat, deckMat, gripMat, deckBottomMat, deckMat, deckMat])
  deck.position.y = 0.16
  deck.castShadow = true
  board.add(deck)

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.065, 0.3), deckBottomMat)
  nose.position.set(0, 0.19, -1.12)
  nose.rotation.x = -0.18
  board.add(nose)
  const tail = nose.clone()
  tail.position.z = 1.12
  tail.rotation.x = 0.18
  board.add(tail)

  for (const z of [-0.62, 0.62]) {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.16), truckMat)
    truck.position.set(0, 0.10, z)
    board.add(truck)
    for (const x of [-0.34, 0.34]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 12), wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 0.075, z)
      wheel.castShadow = true
      board.add(wheel)
    }
  }

  const skin = new THREE.MeshStandardMaterial({ color: 0xb8744f, roughness: 0.8 })
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf2a33a, roughness: 0.75 })
  const shirtDark = new THREE.MeshStandardMaterial({ color: 0xd68420, roughness: 0.75 })
  const pants = new THREE.MeshStandardMaterial({ color: 0x2b6f78, roughness: 0.85 })
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.7 })
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d3, roughness: 0.4 })
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1b13, roughness: 0.9 })

  const hips = new THREE.Group()
  hips.position.y = 0.92
  body.add(hips)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.45, 4, 10), shirt)
  torso.position.y = 0.34
  torso.castShadow = true
  hips.add(torso)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.08), shirtDark)
  stripe.position.set(0, 0.34, 0.22)
  hips.add(stripe)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), skin)
  head.position.y = 0.8
  head.castShadow = true
  hips.add(head)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat)
  hair.position.y = 0.84
  hips.add(hair)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMat)
  helmet.position.y = 0.855
  helmet.scale.y = 0.85
  hips.add(helmet)
  const helmetStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.35), new THREE.MeshStandardMaterial({ color: 0xff6a2a, roughness: 0.5 }))
  helmetStripe.position.set(0, 0.99, 0.02)
  hips.add(helmetStripe)
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.18), helmetMat)
  brim.position.set(0, 0.86, -0.17)
  brim.rotation.x = -0.12
  hips.add(brim)

  const limb = (r, len, mat) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat)
    mesh.castShadow = true
    return mesh
  }

  const legs = []
  for (const side of [-1, 1]) {
    const thigh = limb(0.105, 0.28, pants)
    thigh.position.set(side * 0.17, -0.14, 0)
    hips.add(thigh)
    const shin = limb(0.085, 0.3, pants)
    shin.position.set(side * 0.19, -0.46, 0.02)
    hips.add(shin)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.42), shoe)
    foot.position.set(side * 0.2, -0.72, -0.06)
    foot.rotation.y = side * 0.13
    foot.castShadow = true
    hips.add(foot)
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), new THREE.MeshStandardMaterial({ color: 0x222a30, roughness: 0.8 }))
    knee.scale.set(1, 0.8, 0.75)
    knee.position.set(side * 0.185, -0.32, 0.06)
    hips.add(knee)
    legs.push({ thigh, shin, foot })
  }

  const arms = []
  for (const side of [-1, 1]) {
    const upper = limb(0.075, 0.26, shirt)
    upper.position.set(side * 0.33, 0.46, 0)
    hips.add(upper)
    const fore = limb(0.065, 0.25, skin)
    fore.position.set(side * 0.42, 0.2, 0.02)
    hips.add(fore)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skin)
    hand.position.set(side * 0.46, 0.05, 0.03)
    hips.add(hand)
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshStandardMaterial({ color: 0x222a30, roughness: 0.8 }))
    elbow.position.set(side * 0.385, 0.32, 0.04)
    hips.add(elbow)
    arms.push({ upper, fore, hand })
  }

  root.userData = { board, body, hips, legs, arms, deck, head }
  return root
}

function palmTree(x, z, scale = 1) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.scale.setScalar(scale)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4c31, roughness: 1 })
  let py = 0
  let px = 0
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - i * 0.012, 0.22 - i * 0.012, 1.25, 7), trunkMat)
    seg.position.set(px, py + 0.6, 0)
    seg.rotation.z = -0.035 * i
    seg.castShadow = true
    group.add(seg)
    py += 1.15
    px -= 0.05 * i
  }
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6d43, roughness: 0.9, side: THREE.DoubleSide })
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4a8c55, roughness: 0.9, side: THREE.DoubleSide })
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3b6138, roughness: 1 }))
  crown.position.set(px, py - 0.05, 0)
  group.add(crown)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.12
    const len = 3.2 + (i % 3) * 0.55
    const droop = 1.15 + (i % 4) * 0.28
    const segs = 7
    const verts = []
    const idx = []
    for (let s = 0; s <= segs; s++) {
      const t = s / segs
      const x = t * len
      const y = -droop * t * t - Math.sin(t * Math.PI) * 0.22
      const w = 0.46 * Math.pow(Math.sin(Math.PI * t), 0.55) * (1 - t * 0.18) + 0.02
      verts.push(x, y, -w, x, y, w)
    }
    for (let s = 0; s < segs; s++) {
      const q = s * 2
      idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const leaf = new THREE.Mesh(geo, i % 2 ? leafMat : leafMat2)
    leaf.position.set(px, py + 0.08, 0)
    leaf.rotation.y = a
    leaf.rotation.z = -0.05 - (i % 3) * 0.04
    leaf.castShadow = true
    group.add(leaf)
  }
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x4d3321 })
  for (let i = 0; i < 5; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), nutMat)
    nut.position.set(px + Math.cos(i * 1.8) * 0.3, py - 0.14, Math.sin(i * 1.8) * 0.3)
    group.add(nut)
  }
  return group
}

export function createWorld() {
  const scene = new THREE.Scene()
  const sunDir = new THREE.Vector3(-0.45, 0.32, -0.84).normalize()
  scene.fog = new THREE.Fog(0xf0b98c, 72, 235)

  const sky = makeSky()
  scene.add(sky)

  const hemi = new THREE.HemisphereLight(0xa8d4f5, 0xa5855f, 1.9)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffc98f, 2.7)
  sun.position.copy(sunDir).multiplyScalar(60)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -42
  sun.shadow.camera.right = 42
  sun.shadow.camera.top = 42
  sun.shadow.camera.bottom = -42
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 150
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.035
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x86bcff, 1.15)
  fill.position.set(26, 18, 42)
  scene.add(fill)
  const ambient = new THREE.AmbientLight(0xffe1bd, 0.35)
  scene.add(ambient)

  const groundMeshes = []
  const grindables = []
  const animated = []
  const decals = []

  const concrete = makeConcrete()
  const concreteMat = new THREE.MeshStandardMaterial({ map: concrete, color: 0xfff8ea, roughness: 0.9, metalness: 0.02 })
  const concreteDarkMat = new THREE.MeshStandardMaterial({ color: 0x928a7c, roughness: 0.95 })
  const concreteSideMat = new THREE.MeshStandardMaterial({ color: 0xa49b8b, roughness: 0.95 })
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x7d8488, roughness: 0.38, metalness: 0.75 })
  const copingMat = new THREE.MeshStandardMaterial({ color: 0xe4ddcd, roughness: 0.28, metalness: 0.55 })
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6338, roughness: 0.85 })
  const paintOrange = new THREE.MeshStandardMaterial({ color: 0xe66a2c, roughness: 0.8 })
  const paintTeal = new THREE.MeshStandardMaterial({ color: 0x1f8c8c, roughness: 0.8 })

  const world = new THREE.Group()
  scene.add(world)

  function addBox(w, h, d, x, y, z, mat, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = opts.castShadow !== false
    mesh.receiveShadow = true
    world.add(mesh)
    if (opts.ground) groundMeshes.push(mesh)
    return mesh
  }

  const plaza = addBox(58, 1, 66, 0, -0.5, 0, concreteMat, { ground: true, castShadow: false })
  plaza.material.map.repeat.set(9, 10)

  const outer = addBox(120, 0.8, 130, 0, -1.2, 0, new THREE.MeshStandardMaterial({ color: 0x9b8f79, roughness: 1 }), { castShadow: false })
  outer.receiveShadow = true

  function makeRampGeometry(width, zA, yA, zB, yB) {
    const w = width / 2
    const v = [
      -w, yA, zA, w, yA, zA, w, yB, zB, -w, yB, zB,
      -w, 0, zA, w, 0, zA, w, 0, zB, -w, 0, zB,
    ]
    const idx = [
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 3, 7, 0, 7, 4,
      1, 5, 6, 1, 6, 2,
      3, 2, 6, 3, 6, 7,
      0, 4, 5, 0, 5, 1,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }

  function addRamp(width, x, z, zA, yA, zB, yB, mat = concreteSideMat) {
    const mesh = new THREE.Mesh(makeRampGeometry(width, zA, yA, zB, yB), mat)
    mesh.position.set(x, 0, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    world.add(mesh)
    groundMeshes.push(mesh)
    return mesh
  }

  function makeQuarterGeometry(radius, width, segs = 26) {
    const positions = []
    const indices = []
    const zs = [-width / 2, width / 2]
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI / 2
      const x = Math.sin(t) * radius
      const y = (1 - Math.cos(t)) * radius
      for (const z of zs) positions.push(x, y, z)
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, c, b, b, c, d)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  function addQuarter(x, z, radius, width, rotY, color = concreteSideMat) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = rotY
    const surface = new THREE.Mesh(makeQuarterGeometry(radius, width), color)
    surface.castShadow = true
    surface.receiveShadow = true
    group.add(surface)
    groundMeshes.push(surface)
    const coping = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, width + 0.3, 10), copingMat)
    coping.rotation.x = Math.PI / 2
    coping.position.set(radius, radius, 0)
    coping.castShadow = true
    group.add(coping)
    const lipWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, radius + 0.6, width + 0.3), concreteDarkMat)
    lipWall.position.set(radius + 0.12, radius / 2 - 0.25, 0)
    lipWall.castShadow = true
    group.add(lipWall)
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([
        new THREE.Vector2(0, 0), new THREE.Vector2(radius, 0), new THREE.Vector2(radius, radius),
        new THREE.Vector2(radius * 0.7, radius * 0.55), new THREE.Vector2(radius * 0.4, radius * 0.18),
      ])), concreteDarkMat)
      wall.position.z = side * (width / 2 + 0.001)
      wall.rotation.y = side > 0 ? 0 : Math.PI
      wall.material = concreteDarkMat
      group.add(wall)
    }
    world.add(group)
    return group
  }

  function addBowl(cx, cz, radius, depth) {
    const rings = 18
    const segs = 40
    const positions = [cx, -depth, cz]
    const indices = []
    for (let r = 1; r <= rings; r++) {
      const rr = (r / rings) * radius
      const y = -depth * (1 - (rr / radius) ** 2)
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2
        positions.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr)
      }
    }
    for (let s = 0; s < segs; s++) {
      const a = 1 + s
      const b = 1 + (s + 1) % segs
      indices.push(0, b, a)
    }
    for (let r = 1; r < rings; r++) {
      const baseA = 1 + (r - 1) * segs
      const baseB = 1 + r * segs
      for (let s = 0; s < segs; s++) {
        const s2 = (s + 1) % segs
        const a = baseA + s, b = baseA + s2, c = baseB + s, d = baseB + s2
        indices.push(a, c, b, b, c, d)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, concreteSideMat)
    mesh.receiveShadow = true
    mesh.castShadow = true
    world.add(mesh)
    groundMeshes.push(mesh)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.05, 0.13, 8, 64), copingMat)
    rim.rotation.x = Math.PI / 2
    rim.position.set(cx, 0.02, cz)
    rim.castShadow = true
    world.add(rim)
    const pool = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.24, 24), new THREE.MeshStandardMaterial({ color: 0x5d8f94, roughness: 0.2, metalness: 0.1 }))
    pool.rotation.x = -Math.PI / 2
    pool.position.set(cx, -depth + 0.03, cz)
    world.add(pool)
    return mesh
  }

  function addRail(x1, z1, x2, z2, y, opts = {}) {
    const a = new THREE.Vector3(x1, y, z1)
    const b = new THREE.Vector3(x2, y, z2)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const len = a.distanceTo(b)
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 8), metalMat)
    rail.position.copy(mid)
    rail.rotation.z = Math.PI / 2
    rail.rotation.y = Math.atan2(b.z - a.z, b.x - a.x)
    rail.castShadow = true
    world.add(rail)
    if (opts.posts !== false) {
      for (const t of [0.08, 0.92]) {
        const p = a.clone().lerp(b, t)
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, y, 8), metalMat)
        post.position.set(p.x, y / 2, p.z)
        post.castShadow = true
        world.add(post)
      }
    }
    grindables.push({ a, b, y, type: opts.type || 'rail' })
    return rail
  }

  function addLedge(w, h, d, x, y, z, opts = {}) {
    const mesh = addBox(w, h, d, x, y + h / 2, z, opts.mat || concreteDarkMat, { ground: true })
    const top = y + h
    if (opts.grind !== false) {
      grindables.push({ a: new THREE.Vector3(x - w / 2, top, z), b: new THREE.Vector3(x + w / 2, top, z), y: top, type: 'ledge' })
    }
    if (opts.coping !== false) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d + 0.08), copingMat)
      edge.position.set(x, top + 0.02, z)
      edge.castShadow = true
      world.add(edge)
    }
    return mesh
  }

  // Funbox with banks on both sides.
  addBox(7, 1.2, 4, 0, 0.6, 0, concreteDarkMat, { ground: true })
  addRamp(7, 0, 0, 5, 0, 2, 1.2)
  addRamp(7, 0, 0, -5, 0, -2, 1.2)
  addRail(-2.7, 0, 2.7, 0, 1.48, { type: 'rail' })
  for (const x of [-3.5, 3.5]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 4), copingMat)
    edge.position.set(x, 1.22, 0)
    world.add(edge)
  }

  // Kicker + launch ramp.
  addRamp(4, 9, 10, 13, 0, 10.2, 1.75)
  addRamp(3.2, -9, 10, 12.5, 0, 10.6, 1.45)
  addRail(7.3, 10.4, 10.7, 10.4, 2.35, { type: 'rail' })

  // Side quarter pipes.
  addQuarter(15, 0, 4.6, 13, 0)
  addQuarter(-15, 0, 4.6, 13, Math.PI)
  // Back wall quarter pipe, approached from +z.
  addQuarter(0, -21, 4.8, 15, -Math.PI / 2)
  // Small banked roller on the left side.
  addRamp(6, -20.5, -7, 4, 0, 1, 1.15)

  // Bowl.
  addBowl(-11.5, 13.5, 5.2, 1.7)

  // Street section: ledges, manual pad, stairs.
  addLedge(7, 0.6, 1.1, -6.5, 0, -9.5)
  addLedge(4.5, 0.45, 2.8, 6.2, 0, -10.2)
  addBox(4.5, 0.45, 2.8, 6.2, 0.225, -10.2, concreteSideMat, { ground: true })
  addRail(4, 0, 8, 0, 0.55, { type: 'rail' })

  // Stairs and handrail.
  for (let i = 0; i < 3; i++) {
    addBox(5, 1.1 - i * 0.3, 1.6, 10, (1.1 - i * 0.3) / 2, -8.4 - i * 1.6, concreteSideMat, { ground: true })
  }
  addRail(11.6, -7.6, 11.6, -13.2, 1.35, { type: 'rail' })

  // Long grind rail across the flat.
  addRail(-7, 5.5, -2, 5.5, 0.72, { type: 'rail' })
  addRail(-2, 5.5, -2, 1.0, 0.72, { type: 'rail' })

  // Painted markings and pads.
  const padMat = new THREE.MeshStandardMaterial({ color: 0x7c8a86, roughness: 0.9 })
  for (const [x, z, w, d, rot] of [[0, 14, 8, 4, 0], [-18, 20, 5, 7, 0.1], [17, -12, 6, 6, -0.2]]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), padMat)
    pad.position.set(x, 0.012, z)
    pad.rotation.y = rot
    pad.receiveShadow = true
    world.add(pad)
  }

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf3e8c9, transparent: true, opacity: 0.65 })
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 9), lineMat)
    line.rotation.x = -Math.PI / 2
    line.position.set(i * 2.2, 0.02, 23)
    world.add(line)
  }

  // Graffiti decals.
  addGraffitiPlane(world, 'VENICE', ['#ff8a3d', '#ffd45e'], 8.8, 4.4, [0, 2.6, -15.86], [0, 0, 0], { size: 210 })
  addGraffitiPlane(world, 'SK8', ['#57e2d6', '#2a9fd6'], 6, 3, [19.35, 2.3, 1.0], [0, -Math.PI / 2, 0], { size: 210, rotate: -8 })
  addGraffitiPlane(world, 'HAWK', ['#ff4f87', '#ffb347'], 6.5, 3.2, [-19.35, 2.4, -1.0], [0, Math.PI / 2, 0], { size: 210, rotate: 6 })
  addGraffitiPlane(world, 'NO FEAR', ['#f5c542', '#f27a32'], 5.2, 2.6, [-6.5, 1.02, -8.93], [0, 0, 0], { size: 180, drips: true })
  addGraffitiPlane(world, 'STAY RAD', ['#3ddbc8', '#f5c542'], 5.4, 2.7, [-15.0, 1.9, 6.7], [0, Math.PI / 2, 0], { size: 170, rotate: -4 })
  addGraffitiPlane(world, '2:00', ['#e9e2d3', '#ffb347'], 3.4, 1.7, [0, 4.5, -15.86], [0, 0, 0], { size: 170, drips: false })

  // Props and street furniture.
  function addBench(x, z, rot = 0) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = rot
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.62), woodMat)
    seat.position.y = 0.52
    seat.castShadow = true
    g.add(seat)
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.1), woodMat)
    back.position.set(0, 0.85, -0.28)
    back.rotation.x = -0.12
    back.castShadow = true
    g.add(back)
    for (const sx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.5), metalMat)
      leg.position.set(sx, 0.26, 0)
      leg.castShadow = true
      g.add(leg)
    }
    world.add(g)
  }
  addBench(-22, 13, Math.PI / 2)
  addBench(22.5, -14, -Math.PI / 2)
  addBench(5, 27, 0)

  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a2a, roughness: 0.75 })
  const coneStripe = new THREE.MeshStandardMaterial({ color: 0xfff3dc, roughness: 0.7 })
  for (const [x, z] of [[-4.5, 17], [4.5, 17], [-8.5, -4], [8.2, -5.5], [17.5, 16.5], [-17.5, -13]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 12), coneMat)
    cone.position.set(x, 0.31, z)
    cone.castShadow = true
    world.add(cone)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.09, 12), coneStripe)
    band.position.set(x, 0.32, z)
    world.add(band)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), coneMat)
    base.position.set(x, 0.025, z)
    world.add(base)
  }

  for (const [x, z] of [[-23.6, 20], [23.6, 8], [-23.6, -17], [16, 27]]) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x33444c, roughness: 0.8, metalness: 0.2 }))
    can.position.set(x, 0.5, z)
    can.castShadow = true
    world.add(can)
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 12), metalMat)
    lid.position.set(x, 1.03, z)
    world.add(lid)
  }

  // Painted arrows and a sunburst plaza mark.
  function decalTexture(draw, size = 512) {
    const tex = canvasTexture(size, size, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      draw(ctx, w, h)
    })
    return tex
  }
  const arrowTex = decalTexture((ctx, w, h) => {
    ctx.fillStyle = 'rgba(255, 207, 74, 0.62)'
    ctx.beginPath()
    ctx.moveTo(w * 0.5, h * 0.06)
    ctx.lineTo(w * 0.88, h * 0.52)
    ctx.lineTo(w * 0.64, h * 0.52)
    ctx.lineTo(w * 0.64, h * 0.94)
    ctx.lineTo(w * 0.36, h * 0.94)
    ctx.lineTo(w * 0.36, h * 0.52)
    ctx.lineTo(w * 0.12, h * 0.52)
    ctx.closePath()
    ctx.fill()
  })
  for (const [x, z, rot] of [[0, 12.5, 0], [0, 7.5, 0], [7.5, 16.5, -0.5], [-7.5, 16.5, 0.5]]) {
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, opacity: 0.72, depthWrite: false }))
    arrow.rotation.x = -Math.PI / 2
    arrow.rotation.z = rot
    arrow.position.set(x, 0.025, z)
    world.add(arrow)
  }
  const burstTex = decalTexture((ctx, w, h) => {
    ctx.translate(w / 2, h / 2)
    for (let i = 0; i < 24; i++) {
      ctx.rotate(Math.PI / 12)
      ctx.fillStyle = i % 2 ? 'rgba(255,207,74,.5)' : 'rgba(255,106,42,.42)'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(w * 0.09, -w * 0.44)
      ctx.lineTo(w * 0.19, -w * 0.44)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(20,32,40,.8)'
    ctx.beginPath()
    ctx.arc(0, 0, w * 0.19, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffcf4a'
    ctx.font = `900 ${w * 0.11}px Impact, Arial Black, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SKATE', 0, 0)
  })
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: burstTex, transparent: true, opacity: 0.9, depthWrite: false }))
  burst.rotation.x = -Math.PI / 2
  burst.position.set(-7, 0.028, 19)
  world.add(burst)

  // Perimeter fence with entrance.
  const chainTex = makeChainLink()
  chainTex.repeat.set(24, 1)
  const chainMat = new THREE.MeshStandardMaterial({ map: chainTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.2, color: 0xaab4b8 })
  const postMat = new THREE.MeshStandardMaterial({ color: 0x59636a, roughness: 0.6, metalness: 0.5 })
  function fenceSegment(x, z, w, rotY) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = rotY
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), chainMat)
    mesh.position.y = 1.2
    group.add(mesh)
    for (let i = 0; i <= Math.round(w / 4); i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.7, 6), postMat)
      post.position.set(-w / 2 + (i / Math.round(w / 4)) * w, 1.35, 0)
      post.castShadow = true
      group.add(post)
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, w, 6), postMat)
    top.rotation.z = Math.PI / 2
    top.position.y = 2.6
    group.add(top)
    world.add(group)
  }
  fenceSegment(-27, 0, 58, Math.PI / 2)
  fenceSegment(27, 0, 58, Math.PI / 2)
  fenceSegment(0, -31, 54, 0)
  fenceSegment(-16, 32, 22, 0)
  fenceSegment(16, 32, 22, 0)

  // Entrance sign.
  const signGroup = new THREE.Group()
  signGroup.position.set(0, 0, 31.5)
  const signMat = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.65, metalness: 0.2 })
  for (const x of [-4.2, 4.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.3), postMat)
    post.position.set(x, 2.3, 0)
    post.castShadow = true
    signGroup.add(post)
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(10, 2.1, 0.24), signMat)
  board.position.y = 4.0
  board.castShadow = true
  signGroup.add(board)
  addGraffitiPlane(signGroup, 'SKATE PARK', ['#f5c542', '#f27a32'], 8.8, 1.8, [0, 4.0, -0.13], [0, Math.PI, 0], { size: 190, drips: false })
  addGraffitiPlane(signGroup, 'VENICE BEACH', ['#66e0d5', '#3a8ee6'], 6.4, 0.95, [0, 2.8, -0.13], [0, Math.PI, 0], { size: 110, drips: false })
  world.add(signGroup)

  // Light poles.
  for (const [x, z] of [[-21, 24], [21, 24], [-21, -24], [21, -24]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 8), postMat)
    pole.position.set(x, 3.5, z)
    pole.castShadow = true
    world.add(pole)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), postMat)
    arm.position.set(x, 7.0, z)
    world.add(arm)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffcf7a, emissiveIntensity: 1.8 }))
    lamp.position.set(x + (x > 0 ? -0.5 : 0.5), 6.9, z)
    world.add(lamp)
  }

  // Flags.
  const flagMats = [paintOrange, paintTeal, new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.9 })]
  for (const [i, [x, z]] of [[-20, 6], [20, 6], [-20, -6], [20, -6]].entries()) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.5, 6), postMat)
    pole.position.set(x, 2.25, z)
    world.add(pole)
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85, 8, 2), flagMats[i % flagMats.length])
    flag.position.set(x + 0.75, 4.0, z)
    flag.castShadow = true
    world.add(flag)
    animated.push({ type: 'flag', mesh: flag, phase: i * 1.7 })
  }

  // Bleachers.
  for (let i = 0; i < 4; i++) {
    const step = addBox(12, 0.5, 1.2, -23.2, 0.25 + i * 0.45, -2 + i * 1.2, concreteDarkMat)
    step.castShadow = true
  }
  const crowdColors = [0x3b4b63, 0xd05a43, 0x3d8a73, 0xe0a33b, 0x7a4c77, 0x4f6f8e]
  for (let i = 0; i < 12; i++) {
    const x = -26.5 + (i % 3) * 1.2
    const z = -3.6 + Math.floor(i / 3) * 1.8
    const person = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: crowdColors[i % crowdColors.length], roughness: 0.9 })
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 3, 7), bodyMat)
    torso.position.y = 0.6
    person.add(torso)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc9916b, roughness: 0.9 }))
    head.position.y = 1.0
    person.add(head)
    person.position.set(x, 1.8, z)
    world.add(person)
    animated.push({ type: 'crowd', mesh: person, phase: Math.random() * 10, baseY: 1.8 })
  }

  // Palm trees around the park.
  const palms = [[-34, 24, 1.15], [-38, 6, 0.95], [-33, -18, 1.05], [35, 20, 1.1], [38, -2, 0.9], [33, -22, 1.2], [-12, -38, 1.0], [12, -38, 1.1], [30, 34, 1.0], [-28, 36, 0.9]]
  for (const [x, z, s] of palms) scene.add(palmTree(x, z, s))

  // Distant city and hills.
  const cityMat = new THREE.MeshStandardMaterial({ color: 0x5e6478, roughness: 1 })
  const cityMat2 = new THREE.MeshStandardMaterial({ color: 0x747a8d, roughness: 1 })
  for (let i = 0; i < 26; i++) {
    const w = 3 + Math.random() * 8
    const h = 7 + Math.random() * 20
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4 + Math.random() * 6), i % 3 ? cityMat : cityMat2)
    const a = (i / 26) * Math.PI * 2
    b.position.set(Math.cos(a) * (155 + Math.random() * 60), h / 2 - 1.5, Math.sin(a) * (155 + Math.random() * 60))
    b.rotation.y = Math.random() * Math.PI
    scene.add(b)
  }
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6b6472, roughness: 1 })
  for (let i = 0; i < 8; i++) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(30 + Math.random() * 26, 22 + Math.random() * 24, 5), hillMat)
    const a = -0.8 + (i / 8) * 3.2
    hill.position.set(Math.cos(a) * 225, 2, Math.sin(a) * 225 - 20)
    hill.rotation.y = Math.random() * Math.PI
    scene.add(hill)
  }

  // Clouds.
  const cloudTex = makeCloudTexture()
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.8, color: 0xffe5c7 })
  for (let i = 0; i < 18; i++) {
    const sprite = new THREE.Sprite(cloudMat)
    const a = Math.random() * Math.PI * 2
    const r = 90 + Math.random() * 130
    sprite.position.set(Math.cos(a) * r, 28 + Math.random() * 48, Math.sin(a) * r)
    sprite.scale.set(40 + Math.random() * 50, 14 + Math.random() * 18, 1)
    scene.add(sprite)
  }

  // Floating dust.
  const dustCount = 240
  const dustPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60
    dustPos[i * 3 + 1] = Math.random() * 12
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 70
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe4b8, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }))
  scene.add(dust)

  const skater = buildSkaterModel(THREE)
  skater.position.set(0, 0, 20)
  skater.rotation.y = Math.PI
  scene.add(skater)

  const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: 0x2a2118, transparent: true, opacity: 0.28, depthWrite: false }))
  shadowBlob.rotation.x = -Math.PI / 2
  shadowBlob.position.y = 0.018
  scene.add(shadowBlob)

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,250,225,1)')
    g.addColorStop(0.18, 'rgba(255,235,180,.9)')
    g.addColorStop(0.5, 'rgba(255,180,100,.25)')
    g.addColorStop(1, 'rgba(255,140,80,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  sunSprite.scale.set(30, 30, 1)
  sunSprite.material.opacity = 0.7
  sunSprite.material.color.set(0xffc98a)
  sunSprite.position.copy(sunDir).multiplyScalar(260)
  scene.add(sunSprite)

  const spawn = new THREE.Vector3(0, 0, 20)

  function update(time, dt) {
    for (const item of animated) {
      if (item.type === 'flag') {
        const p = item.mesh.geometry.attributes.position
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i)
          p.setZ(i, Math.sin(time * 3 + item.phase + x * 2.5) * 0.12 * (x + 0.75))
        }
        p.needsUpdate = true
      } else if (item.type === 'crowd') {
        item.mesh.position.y = item.baseY + Math.sin(time * 2.2 + item.phase) * 0.04
        item.mesh.rotation.z = Math.sin(time * 1.7 + item.phase) * 0.03
      }
    }
    const p = dustGeo.attributes.position
    for (let i = 0; i < dustCount; i++) {
      let y = p.getY(i) + dt * 0.14
      if (y > 12) y = 0
      p.setY(i, y)
      p.setX(i, p.getX(i) + Math.sin(time * 0.2 + i) * dt * 0.08)
    }
    p.needsUpdate = true
  }

  return {
    scene, groundMeshes, grindables, skater, shadowBlob, spawn, update, sun, hemi,
    sunDir, materials: { concreteMat, concreteDarkMat, concreteSideMat, metalMat, copingMat, paintOrange, paintTeal },
  }
}
