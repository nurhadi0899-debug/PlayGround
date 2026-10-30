import * as THREE from 'three'
import { createWorld } from './world.js'
import { SkateAudio } from './audio.js'

const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt))

const RUN_TIME = 120
const GRAVITY = 27
const BEST_KEY = 'skate-session-best-v1'

const container = $('scene')
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.75 : 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
renderer.outputColorSpace = THREE.SRGBColorSpace
container.appendChild(renderer.domElement)

const scene = createWorld()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(28, 12, 30)
const cameraLook = new THREE.Vector3(0, 3, 0)
const world = scene
const audio = new SkateAudio()

const player = {
  pos: world.spawn.clone(),
  yaw: Math.PI,
  speed: 7,
  vy: 0,
  grounded: true,
  airTime: 0,
  spinAccum: 0,
  spinCount: 0,
  flipT: 0,
  flipDir: 1,
  grabT: 0,
  grabName: 0,
  grind: null,
  balance: 0,
  balanceDrift: 0,
  bail: 0,
  bailTime: 0,
  special: 0,
  specialActive: 0,
  rampRise: 0,
  normal: new THREE.Vector3(0, 1, 0),
  lastGroundY: 0,
  trickCountAir: 0,
  grabHeld: false,
  cooldown: 0,
  landPulse: 0,
}

const game = {
  mode: 'menu',
  timeLeft: RUN_TIME,
  score: 0,
  best: Number(localStorage.getItem(BEST_KEY) || 0),
  combo: { active: false, mult: 1, tricks: [], points: 0 },
  stats: { tricks: 0, bails: 0, bestCombo: 0 },
  shake: 0,
  menuTime: 0,
  goTimer: 0,
  feed: [],
}

const input = {
  steer: 0,
  stickX: 0,
  stickY: 0,
  push: 0,
  brake: 0,
  tiltSteer: 0,
  ollie: false,
  olliePressed: false,
  flipPressed: false,
  grindPressed: false,
  specialPressed: false,
  grab: false,
  grabPressed: false,
}

const keys = new Set()
const tilt = { enabled: false, baseline: null, permissionDenied: false }

// ---------------------------------------------------------------- particles
const PARTICLE_MAX = 260
const particleGeo = new THREE.BufferGeometry()
const particlePos = new Float32Array(PARTICLE_MAX * 3)
const particleColor = new Float32Array(PARTICLE_MAX * 3)
const particleData = Array.from({ length: PARTICLE_MAX }, () => ({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 0 }))
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColor, 3))
const particleMat = new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
const particles = new THREE.Points(particleGeo, particleMat)
particles.frustumCulled = false
world.scene.add(particles)
let particleCursor = 0
const tmpColor = new THREE.Color()

function spawnParticles(x, y, z, count, color, spread = 1.5, up = 2, life = 0.7, size = 1) {
  tmpColor.set(color)
  for (let i = 0; i < count; i++) {
    const idx = particleCursor++ % PARTICLE_MAX
    const p = particleData[idx]
    p.life = p.max = life * (0.6 + Math.random() * 0.8)
    p.vx = (Math.random() - 0.5) * spread
    p.vy = Math.random() * up + 0.4
    p.vz = (Math.random() - 0.5) * spread
    p.size = size
    particlePos[idx * 3] = x + (Math.random() - 0.5) * 0.35
    particlePos[idx * 3 + 1] = y + Math.random() * 0.25
    particlePos[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.35
    particleColor[idx * 3] = tmpColor.r
    particleColor[idx * 3 + 1] = tmpColor.g
    particleColor[idx * 3 + 2] = tmpColor.b
  }
  particleGeo.attributes.position.needsUpdate = true
  particleGeo.attributes.color.needsUpdate = true
}

function updateParticles(dt) {
  for (let i = 0; i < PARTICLE_MAX; i++) {
    const p = particleData[i]
    if (p.life <= 0) {
      if (particleColor[i * 3] !== 0) {
        particleColor[i * 3] = particleColor[i * 3 + 1] = particleColor[i * 3 + 2] = 0
      }
      continue
    }
    p.life -= dt
    p.vy -= 9 * dt
    particlePos[i * 3] += p.vx * dt
    particlePos[i * 3 + 1] += p.vy * dt
    particlePos[i * 3 + 2] += p.vz * dt
    if (particlePos[i * 3 + 1] < 0.02) {
      particlePos[i * 3 + 1] = 0.02
      p.vy *= -0.25
    }
    const k = Math.max(0, p.life / p.max)
    particleColor[i * 3] *= 0.96 + k * 0.04
    particleColor[i * 3 + 1] *= 0.96 + k * 0.04
    particleColor[i * 3 + 2] *= 0.96 + k * 0.04
    if (p.life <= 0) particleColor[i * 3] = particleColor[i * 3 + 1] = particleColor[i * 3 + 2] = 0
  }
  particleGeo.attributes.position.needsUpdate = true
  particleGeo.attributes.color.needsUpdate = true
}

// ---------------------------------------------------------------- terrain
const raycaster = new THREE.Raycaster()
const rayOrigin = new THREE.Vector3()
const DOWN = new THREE.Vector3(0, -1, 0)
const hitNormal = new THREE.Vector3()

function getTerrain(x, z) {
  rayOrigin.set(x, 45, z)
  raycaster.set(rayOrigin, DOWN)
  raycaster.far = 100
  const hits = raycaster.intersectObjects(world.groundMeshes, false)
  if (!hits.length) return null
  const hit = hits[0]
  hitNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
  if (hitNormal.y < 0) hitNormal.negate()
  return { y: hit.point.y, normal: hitNormal.clone(), object: hit.object }
}

// ---------------------------------------------------------------- helpers
function formatScore(n) {
  return Math.round(n).toLocaleString('en-US')
}

function formatTime(t) {
  const s = Math.max(0, Math.ceil(t))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function forward(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) }
}

function resetPlayer() {
  player.pos.copy(world.spawn)
  player.yaw = Math.PI
  player.speed = 7.5
  player.vy = 0
  player.grounded = true
  player.airTime = 0
  player.spinAccum = 0
  player.spinCount = 0
  player.flipT = 0
  player.grabT = 0
  player.grabName = 0
  player.grind = null
  player.balance = 0
  player.balanceDrift = 0
  player.bail = 0
  player.bailTime = 0
  player.special = 0
  player.specialActive = 0
  player.rampRise = 0
  player.trickCountAir = 0
  player.grabHeld = false
  player.cooldown = 0
  player.landPulse = 0
  world.skater.position.copy(player.pos)
  world.skater.rotation.set(0, player.yaw, 0)
  world.skater.visible = true
  world.shadowBlob.visible = true
}

function resetGame() {
  game.timeLeft = RUN_TIME
  game.score = 0
  game.combo = { active: false, mult: 1, tricks: [], points: 0 }
  game.stats = { tricks: 0, bails: 0, bestCombo: 0 }
  game.shake = 0
  game.goTimer = 0
  game.feed = []
  resetPlayer()
  $('trickFeed').innerHTML = ''
  updateHud()
}

function startRun() {
  audio.init()
  audio.resume()
  resetGame()
  game.mode = 'playing'
  $('startScreen').classList.add('hidden')
  $('endScreen').classList.add('hidden')
  $('pauseScreen').classList.add('hidden')
  $('hud').classList.remove('hidden')
  $('countdown').classList.remove('hidden')
  $('countdown').textContent = 'DROP IN'
  $('countdown').style.animation = 'none'
  void $('countdown').offsetWidth
  $('countdown').style.animation = 'countPop 0.9s ease both'
  game.goTimer = 0.9
  audio.countdown(true)
  updateHud()
  updateTiltButtons()
}

function endRun() {
  if (game.mode !== 'playing') return
  game.mode = 'ended'
  player.grind = null
  game.combo.active = false
  const final = Math.round(game.score)
  const isBest = final > game.best
  if (isBest) {
    game.best = final
    localStorage.setItem(BEST_KEY, String(final))
  }
  $('endScore').textContent = formatScore(final)
  $('endCombo').textContent = formatScore(game.stats.bestCombo)
  $('endTricks').textContent = String(game.stats.tricks)
  $('endBails').textContent = String(game.stats.bails)
  $('endBest').textContent = formatScore(game.best)
  $('endGrade').textContent = final >= 30000 ? 'S' : final >= 18000 ? 'A' : final >= 9000 ? 'B' : final >= 3500 ? 'C' : 'D'
  $('newBest').classList.toggle('hidden', !isBest)
  $('bestStart').textContent = formatScore(game.best)
  $('bestHud').textContent = `BEST ${formatScore(game.best)}`
  $('endScreen').classList.remove('hidden')
  $('hud').classList.add('hidden')
  $('touchControls').style.display = ''
  audio.trick()
}

function showMenu() {
  game.mode = 'menu'
  $('endScreen').classList.add('hidden')
  $('pauseScreen').classList.add('hidden')
  $('hud').classList.add('hidden')
  $('startScreen').classList.remove('hidden')
  $('bestStart').textContent = formatScore(game.best)
  resetPlayer()
  updateTiltButtons()
}

function pauseGame() {
  if (game.mode !== 'playing') return
  game.mode = 'paused'
  $('pauseScreen').classList.remove('hidden')
  audio.update({ speed: 0, grounded: true, grinding: false })
}

function resumeGame() {
  if (game.mode !== 'paused') return
  game.mode = 'playing'
  $('pauseScreen').classList.add('hidden')
  audio.resume()
}

// ---------------------------------------------------------------- scoring
function addTrick(name, base, opts = {}) {
  if (game.mode !== 'playing') return
  const combo = game.combo
  if (!combo.active) {
    combo.active = true
    combo.tricks = []
    combo.points = 0
    combo.mult = 1
  }
  combo.tricks.push(name)
  combo.mult = Math.min(12, combo.tricks.length)
  const gain = base * combo.mult * (player.specialActive > 0 ? 2 : 1)
  combo.points += gain
  player.special = Math.min(100, player.special + base * 0.035 * combo.mult)
  if (player.special >= 100) player.special = 100
  addFeed(name, gain)
  if (!opts.silent) audio.trick()
  flashScore()
}

function bankCombo() {
  const combo = game.combo
  if (!combo.active || combo.points <= 0) {
    combo.active = false
    combo.tricks = []
    combo.points = 0
    combo.mult = 1
    return
  }
  game.score += combo.points
  game.stats.bestCombo = Math.max(game.stats.bestCombo, combo.points)
  game.stats.tricks += combo.tricks.length
  addFeed(`COMBO x${combo.mult}`, combo.points, 'combo')
  combo.active = false
  combo.tricks = []
  combo.points = 0
  combo.mult = 1
  flashScore()
}

function loseCombo() {
  game.combo.active = false
  game.combo.tricks = []
  game.combo.points = 0
  game.combo.mult = 1
}

function addFeed(text, points, type = '') {
  const el = document.createElement('div')
  el.className = `feed-item ${type}`
  el.innerHTML = `${text}${points ? ` <b>+${formatScore(points)}</b>` : ''}`
  $('trickFeed').appendChild(el)
  setTimeout(() => el.remove(), 3000)
  while ($('trickFeed').children.length > 6) $('trickFeed').firstChild.remove()
}

let scoreBumpTimer = 0
function flashScore() {
  $('score').classList.add('bump')
  clearTimeout(scoreBumpTimer)
  scoreBumpTimer = setTimeout(() => $('score').classList.remove('bump'), 110)
}

function doFlip() {
  if (game.mode !== 'playing' || player.grounded || player.bail > 0 || player.grind) return
  if (player.flipT > 0.02 && player.flipT < 0.9) return
  player.flipT = 0.0001
  player.flipDir = Math.random() > 0.5 ? 1 : -1
  player.cooldown = 0.16
  const names = ['KICKFLIP', 'HEELFLIP', 'VARIAL FLIP', '360 FLIP', 'HARDFLIP']
  addTrick(names[Math.floor(Math.random() * names.length)], 140)
  spawnParticles(player.pos.x, player.pos.y + 0.25, player.pos.z, 8, 0xffd36b, 1.8, 1.5, 0.5)
}

function doGrab() {
  if (game.mode !== 'playing' || player.grounded || player.bail > 0 || player.grind) return
  player.grabT = 0.0001
  const names = ['INDY GRAB', 'MELON GRAB', 'METHOD AIR', 'NOSEGRAB', 'TAILGRAB']
  addTrick(names[player.grabName % names.length], 120)
  player.grabName++
}

function doOllie() {
  if (game.mode !== 'playing' || player.bail > 0) return
  if (player.grind) {
    exitGrind(7.4)
    addTrick('GRIND POP', 80)
    return
  }
  if (player.grounded) {
    player.vy = 7.7 + player.speed * 0.1
    player.grounded = false
    player.airTime = 0
    player.rampRise = 0
    player.spinAccum = 0
    player.spinCount = 0
    player.trickCountAir = 0
    audio.pop()
    spawnParticles(player.pos.x, player.pos.y + 0.05, player.pos.z, 10, 0xf3dfb8, 1.6, 1.2, 0.55)
  }
}

function tryGrind() {
  if (game.mode !== 'playing' || player.bail > 0 || player.grind) return
  if (player.grounded || player.airTime < 0.06) return
  let best = null
  let bestDist = 2.4
  const ab = new THREE.Vector3()
  const ap = new THREE.Vector3()
  const cp = new THREE.Vector3()
  for (const seg of world.grindables) {
    ab.subVectors(seg.b, seg.a)
    ap.set(player.pos.x - seg.a.x, 0, player.pos.z - seg.a.z)
    const t = clamp(ap.dot(new THREE.Vector3(ab.x, 0, ab.z)) / Math.max(0.001, ab.x * ab.x + ab.z * ab.z), 0, 1)
    cp.copy(seg.a).lerp(seg.b, t)
    const dx = player.pos.x - cp.x
    const dz = player.pos.z - cp.z
    const dy = player.pos.y - seg.y
    const d = Math.hypot(dx, dz)
    if (d < bestDist && dy > -1.6 && dy < 2.4) {
      bestDist = d
      best = { seg, t, point: cp.clone() }
    }
  }
  if (!best) return
  const seg = best.seg
  const dir = new THREE.Vector3().subVectors(seg.b, seg.a).normalize()
  const f = forward(player.yaw)
  if (dir.x * f.x + dir.z * f.z < 0) dir.negate()
  player.grind = {
    seg,
    t: best.t,
    dir,
    speed: Math.max(6.5, player.speed * 0.95),
    sparks: 0,
  }
  player.grounded = false
  player.vy = 0
  player.airTime = 0
  player.yaw = Math.atan2(dir.x, dir.z)
  player.balance = 0
  player.balanceDrift = (Math.random() - 0.5) * 0.9
  player.flipT = 0
  player.grabT = 0
  addTrick(best.seg.type === 'ledge' ? '5-0 GRIND' : '50-50 GRIND', 100)
  audio.land(0.6)
  spawnParticles(player.pos.x, player.pos.y + 0.1, player.pos.z, 16, 0xffb347, 2.4, 2.2, 0.5)
}

function exitGrind(vy = 6.2) {
  if (!player.grind) return
  player.grind = null
  player.grounded = false
  player.vy = vy
  player.airTime = 0
  player.spinAccum = 0
  player.spinCount = 0
  audio.pop()
}

function activateSpecial() {
  if (game.mode !== 'playing' || player.special < 100 || player.specialActive > 0) return
  player.special = 0
  player.specialActive = 8
  audio.special()
  addFeed('SPECIAL ACTIVATED', 0, 'combo')
  spawnParticles(player.pos.x, player.pos.y + 0.6, player.pos.z, 30, 0x3ddbc8, 4, 4, 0.9)
}

function bail(reason = 'BAILED') {
  if (player.bail > 0) return
  player.bail = 1.35
  player.bailTime = 0
  player.grind = null
  player.flipT = 0
  player.grabT = 0
  player.vy = Math.max(2, player.vy * 0.4)
  player.grounded = false
  game.stats.bails++
  game.shake = 0.55
  loseCombo()
  audio.bail()
  addFeed(reason, 0, 'bail')
  spawnParticles(player.pos.x, player.pos.y + 0.5, player.pos.z, 26, 0xff6a2a, 3.4, 3, 0.8)
}

// ---------------------------------------------------------------- physics
function updatePlayer(dt) {
  const p = player
  p.cooldown = Math.max(0, p.cooldown - dt)
  p.landPulse = Math.max(0, p.landPulse - dt * 3)

  if (p.bail > 0) {
    p.bail -= dt
    p.bailTime += dt
    p.speed *= Math.pow(0.06, dt)
    p.vy -= GRAVITY * dt
    const f = forward(p.yaw)
    p.pos.x += f.x * p.speed * dt
    p.pos.z += f.z * p.speed * dt
    p.pos.y += p.vy * dt
    const t = getTerrain(p.pos.x, p.pos.z)
    if (t && p.pos.y <= t.y + 0.05) {
      p.pos.y = t.y
      p.vy = 0
      if (p.bail <= 0.45) {
        p.speed = 4.5
        p.grounded = true
      }
    }
    if (p.bail <= 0) {
      p.bail = 0
      p.grounded = true
      p.vy = 0
      p.speed = 4.5
      const ground = getTerrain(p.pos.x, p.pos.z)
      if (ground) p.pos.y = ground.y
      else {
        p.pos.copy(world.spawn)
        p.yaw = Math.PI
      }
    }
    if (p.pos.y < -9) {
      p.pos.copy(world.spawn)
      p.yaw = Math.PI
      p.bail = 0
      p.speed = 6
    }
    return
  }

  if (p.grind) {
    updateGrind(dt)
    return
  }

  const steer = clamp(input.steer + input.tiltSteer, -1, 1)
  const push = clamp(input.push + input.stickY, 0, 1)
  const brake = input.brake
  const speedRatio = clamp(p.speed / 17, 0, 1)

  if (p.grounded) {
    p.speed += (push > 0.15 ? 12 * push : -1.8) * dt
    p.speed -= brake * 12 * dt
    p.speed -= p.speed * 0.035 * dt
    if (push < 0.15) p.speed = Math.max(5.4, p.speed)
    p.speed = clamp(p.speed, 0, 19)
    p.yaw -= steer * (1.25 + speedRatio * 2.0) * dt
  } else {
    p.speed *= Math.pow(0.985, dt * 60)
    if (Math.abs(steer) > 0.15) {
      const spinRate = steer * (2.5 + speedRatio * 1.2)
      p.yaw -= spinRate * dt
      p.spinAccum += Math.abs(spinRate * dt)
      const next = Math.floor(p.spinAccum / Math.PI)
      if (next > p.spinCount) {
        p.spinCount = next
        addTrick(`${p.spinCount * 180}`, 55 + p.spinCount * 20)
      }
    }
  }

  const f = forward(p.yaw)

  if (p.grounded) {
    const nextX = p.pos.x + f.x * p.speed * dt
    const nextZ = p.pos.z + f.z * p.speed * dt
    const t = getTerrain(nextX, nextZ)
    if (!t) {
      p.pos.x = nextX
      p.pos.z = nextZ
      p.grounded = false
      p.vy = clamp(p.rampRise * 0.92, 0.5, 13.5)
      p.airTime = 0
      p.spinAccum = 0
      p.spinCount = 0
    } else if (t.y - p.pos.y > 0.95) {
      p.pos.x = nextX
      p.pos.z = nextZ
      p.grounded = false
      p.vy = clamp(p.speed * 0.62, 3.5, 12.5)
      p.airTime = 0
      p.spinAccum = 0
      p.spinCount = 0
    } else if (t.y < p.pos.y - 0.62) {
      p.pos.x = nextX
      p.pos.z = nextZ
      p.grounded = false
      p.vy = 0
      p.airTime = 0
      p.spinAccum = 0
      p.spinCount = 0
    } else {
      const climb = (t.y - p.pos.y) / Math.max(dt, 0.001)
      if (climb > 0.6) p.rampRise = climb
      else p.rampRise *= Math.pow(0.05, dt)
      p.pos.x = nextX
      p.pos.z = nextZ
      p.pos.y = t.y
      p.normal.copy(t.normal)
    }
  } else {
    p.airTime += dt
    p.vy -= GRAVITY * dt
    p.pos.x += f.x * p.speed * dt
    p.pos.z += f.z * p.speed * dt
    p.pos.y += p.vy * dt

    if (p.flipT > 0) {
      p.flipT += dt / 0.58
      if (p.flipT >= 1) p.flipT = 1
    }
    if (p.grabT > 0) {
      p.grabT += dt / 0.5
      if (p.grabT >= 1) p.grabT = 1
    }

    const t = getTerrain(p.pos.x, p.pos.z)
    if (t && p.vy <= 0 && p.pos.y <= t.y + 0.22) {
      land(t)
    }
    if (p.pos.y < -9) {
      p.pos.copy(world.spawn)
      p.yaw = Math.PI
      p.speed = 6
      p.vy = 0
      p.grounded = true
      loseCombo()
    }
  }

  if (p.pos.x > 26.5 || p.pos.x < -26.5 || p.pos.z > 30.5 || p.pos.z < -30.5) {
    p.pos.x = clamp(p.pos.x, -26.5, 26.5)
    p.pos.z = clamp(p.pos.z, -30.5, 30.5)
    p.speed *= 0.4
  }

  if (p.specialActive > 0) {
    p.specialActive = Math.max(0, p.specialActive - dt)
    if (Math.random() < 0.5) {
      spawnParticles(p.pos.x, p.pos.y + 0.4, p.pos.z, 1, Math.random() > 0.5 ? 0x3ddbc8 : 0xffcf4a, 1.4, 0.7, 0.7)
    }
  }
}

function land(t) {
  const p = player
  const wasAir = !p.grounded
  p.pos.y = t.y
  p.vy = 0
  p.grounded = true
  p.normal.copy(t.normal)
  p.rampRise = 0
  const flipSketchy = p.flipT > 0 && p.flipT < 0.82
  const steep = t.normal.y < 0.32 && p.speed > 12
  if (wasAir && (flipSketchy || steep)) {
    p.airTime = 0
    p.flipT = 0
    p.grabT = 0
    bail(flipSketchy ? 'SKETCHY LANDING' : 'BAD LANDING')
    return
  }
  if (wasAir) {
    p.landPulse = 1
    game.shake = Math.max(game.shake, clamp(p.airTime * 0.14, 0.08, 0.3))
    audio.land(clamp(p.airTime, 0.3, 1))
    spawnParticles(p.pos.x, p.pos.y + 0.06, p.pos.z, 12, 0xe8d5ae, 2.2, 1.2, 0.55)
    bankCombo()
  }
  p.airTime = 0
  p.flipT = 0
  p.grabT = 0
  p.spinAccum = 0
  p.spinCount = 0
}

function updateGrind(dt) {
  const p = player
  const g = p.grind
  const seg = g.seg
  const len = seg.a.distanceTo(seg.b)
  const dirSign = 1
  g.t += (g.speed * dt * dirSign) / Math.max(0.2, len)
  if (g.t <= 0 || g.t >= 1) {
    g.t = clamp(g.t, 0, 1)
    p.pos.copy(seg.a).lerp(seg.b, g.t)
    p.pos.y = seg.y + 0.06
    exitGrind(6.2)
    bankCombo()
    return
  }
  const point = seg.a.clone().lerp(seg.b, g.t)
  p.pos.set(point.x, seg.y + 0.06, point.z)
  p.yaw = Math.atan2(g.dir.x, g.dir.z)
  p.speed = g.speed

  const steer = clamp(input.steer + input.tiltSteer, -1, 1)
  p.balanceDrift += (Math.random() - 0.5) * 1.4 * dt
  p.balanceDrift = clamp(p.balanceDrift, -0.7, 0.7)
  p.balance += (p.balanceDrift - steer * 1.7) * dt
  p.balance = clamp(p.balance, -1.25, 1.25)
  if (Math.abs(p.balance) >= 1.05) {
    bail('LOST BALANCE')
    return
  }

  if (game.combo.active) {
    game.combo.points += 55 * dt * game.combo.mult * (p.specialActive > 0 ? 2 : 1)
    p.special = Math.min(100, p.special + 2.6 * dt)
  }
  g.sparks += dt
  if (g.sparks > 0.035) {
    g.sparks = 0
    spawnParticles(p.pos.x, p.pos.y + 0.04, p.pos.z, 2, Math.random() > 0.4 ? 0xffc04a : 0xff7a2a, 1.7, 1.8, 0.35, 0.7)
  }
  if (p.specialActive > 0) {
    p.specialActive = Math.max(0, p.specialActive - dt)
    if (Math.random() < 0.4) spawnParticles(p.pos.x, p.pos.y + 0.5, p.pos.z, 1, 0x3ddbc8, 1, 1, 0.6)
  }
}

// ---------------------------------------------------------------- visuals
const skater = world.skater
const bodyData = skater.userData

function updateSkaterVisual(dt, time) {
  const p = player
  const u = bodyData
  skater.position.copy(p.pos)
  let yaw = p.yaw
  let roll = 0
  let pitch = 0
  let boardRoll = 0
  let boardPitch = 0
  let crouch = 0
  let lean = 0
  const steer = clamp(input.steer + input.tiltSteer, -1, 1)

  if (p.bail > 0) {
    roll = Math.sin(p.bailTime * 12) * 0.7
    pitch = Math.sin(p.bailTime * 9) * 0.5
    crouch = 0.2
    skater.position.y = p.pos.y + 0.12
  } else if (p.grind) {
    crouch = 0.62
    lean = steer * 0.16
    roll = -p.balance * 0.22
  } else if (!p.grounded) {
    crouch = 0.42 + Math.sin(time * 9) * 0.04
    lean = steer * 0.2
    roll = -steer * 0.12
    boardRoll = p.flipT > 0 ? p.flipT * Math.PI * 2 * p.flipDir : 0
    boardPitch = p.grabT > 0 ? Math.sin(p.grabT * Math.PI) * 0.72 : 0
    if (p.grabT > 0) crouch = 0.55
  } else {
    crouch = input.push > 0.15 ? 0.42 : 0.25
    lean = steer * 0.18
    roll = -steer * 0.04
  }

  if (p.landPulse > 0) crouch = Math.max(crouch, p.landPulse * 0.55)

  skater.rotation.set(0, yaw, 0)
  u.body.rotation.z = roll + lean * 0.5
  u.body.rotation.x = pitch * 0.5
  u.hips.position.y = 0.9 - crouch * 0.22 + Math.sin(time * 2.2) * 0.008
  u.hips.rotation.x = crouch * 0.42
  u.hips.rotation.z = lean * 0.6
  u.board.rotation.z = boardRoll
  u.board.rotation.x = boardPitch
  u.board.rotation.y = 0
  u.board.position.y = p.grabT > 0 ? Math.sin(p.grabT * Math.PI) * 0.18 : 0

  for (const [i, leg] of u.legs.entries()) {
    leg.thigh.rotation.x = crouch * 0.8 + (i ? 0.1 : -0.06)
    leg.shin.rotation.x = -crouch * 1.0
    leg.foot.rotation.x = crouch * 0.2
  }
  for (const [i, arm] of u.arms.entries()) {
    const side = i === 0 ? -1 : 1
    arm.upper.rotation.z = side * (0.72 + crouch * 0.5 + (p.grounded ? 0 : 0.4))
    arm.upper.rotation.x = p.grabT > 0 ? -1.2 : Math.sin(time * 2.4 + i) * 0.06
    arm.fore.rotation.z = side * (0.2 + crouch * 0.3)
    arm.fore.rotation.x = p.grabT > 0 ? (i === 1 ? -1.1 : 0.3) : 0
    arm.hand.rotation.x = 0
  }

  if (p.grabT > 0) {
    u.hips.rotation.z += 0.16
  }

  const ground = p.grind ? { y: p.grind.seg.y } : getTerrain(p.pos.x, p.pos.z)
  if (ground) {
    world.shadowBlob.visible = true
    world.shadowBlob.position.set(p.pos.x, ground.y + 0.025, p.pos.z)
    const height = Math.max(0, p.pos.y - ground.y)
    const s = clamp(1 - height * 0.06, 0.45, 1)
    world.shadowBlob.scale.setScalar(s)
    world.shadowBlob.material.opacity = 0.3 * clamp(1 - height * 0.12, 0.1, 1)
  } else {
    world.shadowBlob.visible = false
  }
}

function updateCamera(dt, time) {
  if (game.mode === 'menu') {
    game.menuTime += dt
    const a = 0.62 + game.menuTime * 0.055
    const target = new THREE.Vector3(Math.cos(a) * 29, 10.5 + Math.sin(game.menuTime * 0.18) * 1.1, Math.sin(a) * 29 + 3)
    camera.position.lerp(target, 1 - Math.exp(-1.4 * dt))
    cameraLook.lerp(new THREE.Vector3(0, 3.0, 0), 1 - Math.exp(-1.8 * dt))
    camera.fov = damp(camera.fov, 56, 2, dt)
    camera.updateProjectionMatrix()
    camera.lookAt(cameraLook)
    return
  }

  const p = player
  const f = forward(p.yaw)
  const speedT = clamp((p.speed - 5) / 13, 0, 1)
  const back = 7.4 + speedT * 2.4
  const height = 3.5 + speedT * 0.7 + (p.grounded ? 0 : 0.55)
  const desired = new THREE.Vector3(
    p.pos.x - f.x * back,
    p.pos.y + height,
    p.pos.z - f.z * back,
  )
  if (p.bail > 0) {
    desired.x += Math.sin(p.bailTime * 7) * 0.6
    desired.z += Math.cos(p.bailTime * 7) * 0.6
  }
  camera.position.lerp(desired, 1 - Math.exp(-5.2 * dt))
  const look = new THREE.Vector3(p.pos.x + f.x * (4.2 + speedT * 2.6), p.pos.y + 1.15 + (p.grounded ? 0 : 0.7), p.pos.z + f.z * (4.2 + speedT * 2.6))
  cameraLook.lerp(look, 1 - Math.exp(-7 * dt))
  const targetFov = 58 + speedT * 10 + (p.grounded ? 0 : 4)
  camera.fov = damp(camera.fov, targetFov, 3, dt)
  camera.updateProjectionMatrix()
  camera.lookAt(cameraLook)

  if (game.shake > 0) {
    const s = game.shake * 0.5
    camera.position.x += (Math.random() - 0.5) * s
    camera.position.y += (Math.random() - 0.5) * s
    camera.position.z += (Math.random() - 0.5) * s
    game.shake = Math.max(0, game.shake - dt * 2.4)
  }
}

// ---------------------------------------------------------------- HUD
function updateHud() {
  const displayScore = game.score + (game.combo.active ? game.combo.points : 0)
  $('score').textContent = formatScore(displayScore)
  $('timer').textContent = formatTime(game.timeLeft)
  $('timer').classList.toggle('low', game.timeLeft <= 15)
  $('timerFill').style.transform = `scaleX(${clamp(game.timeLeft / RUN_TIME, 0, 1)})`
  $('bestHud').textContent = `BEST ${formatScore(game.best)}`

  const combo = game.combo
  const show = combo.active && combo.points > 0
  $('comboPanel').classList.toggle('hidden', !show)
  if (show) {
    $('comboMult').textContent = `x${combo.mult}`
    $('comboTricks').textContent = combo.tricks.join(' + ')
    $('comboPoints').textContent = formatScore(combo.points)
    $('comboFill').style.transform = `scaleX(${clamp(combo.tricks.length / 10, 0.05, 1)})`
  }

  $('specialFill').style.width = `${player.specialActive > 0 ? (player.specialActive / 8) * 100 : player.special}%`
  const specialWrap = document.querySelector('.special-wrap')
  const ready = player.special >= 100 && player.specialActive <= 0
  specialWrap.classList.toggle('full', ready)
  $('specialText').textContent = player.specialActive > 0 ? `${player.specialActive.toFixed(1)}s x2` : ready ? 'READY — TAP' : `${Math.floor(player.special)}%`
  document.querySelector('.special-btn')?.classList.toggle('ready', ready)

  $('balanceWrap').classList.toggle('hidden', !player.grind)
  if (player.grind) {
    const x = clamp((player.balance + 1.05) / 2.1, 0, 1)
    $('balanceNeedle').style.left = `${8 + x * 84}%`
  }

  const nearGrind = player.grind || (!player.grounded && player.airTime > 0.1 && nearestGrindDistance() < 2.4)
  document.querySelector('[data-act="grind"]')?.classList.toggle('near', Boolean(nearGrind))
  $('prompt').classList.toggle('hidden', !(nearGrind && !player.grind && game.mode === 'playing'))
  if (nearGrind && !player.grind) $('prompt').textContent = 'TAP GRIND TO LOCK'
  if (ready && game.mode === 'playing') {
    $('prompt').classList.remove('hidden')
    $('prompt').textContent = 'SPECIAL READY — DOUBLE POINTS'
  }
}

function nearestGrindDistance() {
  let best = 99
  for (const seg of world.grindables) {
    const abx = seg.b.x - seg.a.x
    const abz = seg.b.z - seg.a.z
    const t = clamp(((player.pos.x - seg.a.x) * abx + (player.pos.z - seg.a.z) * abz) / Math.max(0.001, abx * abx + abz * abz), 0, 1)
    const cx = seg.a.x + abx * t
    const cz = seg.a.z + abz * t
    const d = Math.hypot(player.pos.x - cx, player.pos.z - cz)
    const dy = player.pos.y - seg.y
    if (dy > -1.6 && dy < 2.4) best = Math.min(best, d)
  }
  return best
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock()
let elapsed = 0

function handleActions() {
  if (game.mode !== 'playing') {
    input.olliePressed = input.flipPressed = input.grindPressed = input.specialPressed = false
    return
  }
  if (input.olliePressed) {
    input.olliePressed = false
    doOllie()
  }
  if (input.flipPressed) {
    input.flipPressed = false
    doFlip()
  }
  if (input.grindPressed) {
    input.grindPressed = false
    tryGrind()
  }
  if (input.specialPressed) {
    input.specialPressed = false
    activateSpecial()
  }
  if (input.grab && !player.grabHeld) {
    player.grabHeld = true
    doGrab()
  } else if (!input.grab) {
    player.grabHeld = false
  }
}

function tick() {
  requestAnimationFrame(tick)
  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt

  handleActions()
  if (game.mode === 'playing') {
    game.timeLeft -= dt
    if (game.timeLeft <= 0) {
      game.timeLeft = 0
      endRun()
    }
    if (game.goTimer > 0) {
      game.goTimer -= dt
      if (game.goTimer <= 0) $('countdown').classList.add('hidden')
    }
    updatePlayer(dt)
    audio.update({ speed: player.speed, grounded: player.grounded, grinding: Boolean(player.grind) })
  } else if (game.mode === 'menu' || game.mode === 'ended') {
    if (game.mode === 'menu') {
      const ground = getTerrain(player.pos.x, player.pos.z)
      if (ground) player.pos.y = ground.y
      player.speed = 0
      player.yaw = Math.PI
    }
    audio.update({ speed: 0, grounded: true, grinding: false })
  }

  updateSkaterVisual(dt, elapsed)
  updateCamera(dt, elapsed)
  world.update(elapsed, dt)
  updateParticles(dt)
  updateHud()
  renderer.render(world.scene, camera)
}

// ---------------------------------------------------------------- input
function pressAction(act) {
  if (game.mode !== 'playing') return
  if (act === 'ollie') input.olliePressed = true
  else if (act === 'flip') input.flipPressed = true
  else if (act === 'grind') input.grindPressed = true
  else if (act === 'special') input.specialPressed = true
  else if (act === 'grab') input.grab = true
  if (navigator.vibrate) navigator.vibrate(8)
}

function releaseAction(act) {
  if (act === 'grab') input.grab = false
}

document.querySelectorAll('.action').forEach((btn) => {
  const act = btn.dataset.act
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    btn.setPointerCapture?.(e.pointerId)
    btn.classList.add('pressed')
    pressAction(act)
  })
  const end = (e) => {
    btn.classList.remove('pressed')
    releaseAction(act)
  }
  btn.addEventListener('pointerup', end)
  btn.addEventListener('pointercancel', end)
  btn.addEventListener('pointerleave', (e) => {
    if (e.buttons === 0) end(e)
  })
  btn.addEventListener('contextmenu', (e) => e.preventDefault())
})

const stick = $('stick')
const knob = $('knob')
let stickPointer = null
let stickCenter = { x: 0, y: 0 }
function setStickFromEvent(e) {
  const r = stick.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const max = r.width * 0.32
  let dx = e.clientX - cx
  let dy = e.clientY - cy
  const d = Math.hypot(dx, dy)
  if (d > max) {
    dx = (dx / d) * max
    dy = (dy / d) * max
  }
  knob.style.transform = `translate(${dx}px, ${dy}px)`
  input.stickX = clamp(dx / max, -1, 1)
  input.stickY = clamp(-dy / max, -1, 1)
  input.steer = input.stickX
  input.push = clamp(input.stickY, 0, 1)
  input.brake = clamp(-input.stickY, 0, 1)
}
stick.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  stickPointer = e.pointerId
  stick.setPointerCapture?.(e.pointerId)
  setStickFromEvent(e)
})
stick.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stickPointer) return
  e.preventDefault()
  setStickFromEvent(e)
})
function resetStick(e) {
  if (e && stickPointer !== null && e.pointerId !== stickPointer) return
  stickPointer = null
  knob.style.transform = 'translate(0px, 0px)'
  input.stickX = 0
  input.stickY = 0
  input.steer = 0
  input.push = 0
  input.brake = 0
}
stick.addEventListener('pointerup', resetStick)
stick.addEventListener('pointercancel', resetStick)

const keyAction = { Space: 'ollie', KeyJ: 'flip', KeyK: 'grab', KeyL: 'grind', KeyE: 'special' }
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault()
    if (game.mode === 'playing') pauseGame()
    else if (game.mode === 'paused') resumeGame()
    return
  }
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.muted)
    $('soundState').textContent = audio.muted ? 'OFF' : 'ON'
    return
  }
  const act = keyAction[e.code]
  if (act) {
    e.preventDefault()
    if (!e.repeat) pressAction(act)
    if (act === 'grab') input.grab = true
    return
  }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault()
    keys.add(e.code)
    updateKeyboardAxes()
  }
})
window.addEventListener('keyup', (e) => {
  const act = keyAction[e.code]
  if (act) {
    if (act === 'grab') input.grab = false
    return
  }
  if (keys.delete(e.code)) updateKeyboardAxes()
})
function updateKeyboardAxes() {
  const left = keys.has('KeyA') || keys.has('ArrowLeft')
  const right = keys.has('KeyD') || keys.has('ArrowRight')
  const up = keys.has('KeyW') || keys.has('ArrowUp')
  const down = keys.has('KeyS') || keys.has('ArrowDown')
  if (stickPointer === null) {
    input.steer = (right ? 1 : 0) - (left ? 1 : 0)
    input.push = up ? 1 : 0
    input.brake = down ? 1 : 0
    input.stickX = input.steer
    input.stickY = up ? 1 : down ? -1 : 0
  }
}

// ---------------------------------------------------------------- buttons
$('startBtn').addEventListener('click', startRun)
$('againBtn').addEventListener('click', startRun)
$('menuBtn').addEventListener('click', showMenu)
$('resumeBtn').addEventListener('click', resumeGame)
$('restartBtn').addEventListener('click', startRun)
$('pauseBtn').addEventListener('click', pauseGame)
$('soundBtn').addEventListener('click', () => {
  audio.setMuted(!audio.muted)
  $('soundState').textContent = audio.muted ? 'OFF' : 'ON'
})
$('tiltBtn').addEventListener('click', () => toggleTilt())
$('pauseTiltBtn').addEventListener('click', () => toggleTilt())

function updateTiltButtons() {
  $('tiltState').textContent = tilt.enabled ? 'ON' : 'OFF'
  $('pauseTiltState').textContent = tilt.enabled ? 'ON' : 'OFF'
  $('tiltBtn').setAttribute('aria-pressed', String(tilt.enabled))
  $('pauseTiltBtn').setAttribute('aria-pressed', String(tilt.enabled))
  $('tiltBtn').classList.toggle('active', tilt.enabled)
  $('pauseTiltBtn').classList.toggle('active', tilt.enabled)
}

function motionNote(text) {
  $('motionNote').textContent = text
  $('pauseMotionNote').textContent = text
}

async function toggleTilt() {
  if (tilt.enabled) {
    tilt.enabled = false
    tilt.baseline = null
    input.tiltSteer = 0
    localStorage.setItem('skate-session-tilt', '0')
    updateTiltButtons()
    motionNote('Tilt steering off. Tap to request motion access on iPhone/iPad.')
    return
  }
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const result = await DeviceMotionEvent.requestPermission()
      if (result !== 'granted') {
        motionNote('Motion access was denied. Enable Motion & Orientation in Safari settings, or use touch controls.')
        return
      }
    }
  } catch (error) {
    motionNote('Motion permission unavailable here. Touch and keyboard controls still work.')
    return
  }
  tilt.enabled = true
  tilt.baseline = null
  localStorage.setItem('skate-session-tilt', '1')
  updateTiltButtons()
  motionNote('Tilt steering on. Hold your phone level to calibrate, then lean to steer.')
  if (navigator.vibrate) navigator.vibrate([12, 30, 12])
}

function onOrientation(e) {
  if (!tilt.enabled) return
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0
  let raw
  if (Math.abs(angle) === 90) raw = e.beta
  else raw = e.gamma
  if (raw == null || Number.isNaN(raw)) return
  if (tilt.baseline === null) tilt.baseline = raw
  const delta = raw - tilt.baseline
  const dead = 0.06
  const n = clamp(delta / 24, -1, 1)
  input.tiltSteer = Math.abs(n) < dead ? 0 : (n - Math.sign(n) * dead) / (1 - dead)
}
window.addEventListener('deviceorientation', onOrientation)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.75 : 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.mode === 'playing') pauseGame()
})

// Restore tilt preference only if it is already granted; iOS needs a gesture.
if (localStorage.getItem('skate-session-tilt') === '1') {
  const isIOS = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'
  if (!isIOS) {
    tilt.enabled = true
    motionNote('Tilt steering on. Hold your device level to calibrate, then lean to steer.')
  }
}
$('bestStart').textContent = formatScore(game.best)
$('bestHud').textContent = `BEST ${formatScore(game.best)}`
updateTiltButtons()
resetPlayer()
updateHud()
tick()

window.__skate = {
  game, player, input, tilt,
  startRun, endRun, showMenu, pauseGame, resumeGame,
  getTerrain, world,
}
