import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { SECTORS } from './data.js'

// ---------- geometria dello stadio (metri). x = asse lungo (x<0 Curva Nord), z<0 Tribuna A, y in alto ----------
export const H = 41                       // metà dei rettilinei della "pista" (capsula)
export const PITCH = [105, 68]
export const TRACK = [37, 48]
const LO = { r0: 51.5, rows: 14, depth: 0.8, rise: 0.42, y0: 1.4 }
const UP = { rows: 14, depth: 0.8, rise: 0.55, y0: 9.0 }
const WALK = 2.5
export const ROWS = []                    // [tier][row-1] = { r, y }
ROWS[0] = []; ROWS[1] = []
for (let i = 0; i < LO.rows; i++) ROWS[0].push({ r: LO.r0 + i * LO.depth, y: LO.y0 + (i + 1) * LO.rise })
const UR0 = LO.r0 + LO.rows * LO.depth + WALK
for (let j = 0; j < UP.rows; j++) ROWS[1].push({ r: UR0 + j * UP.depth, y: UP.y0 + (j + 1) * UP.rise })
export const R_OUT = UR0 + UP.rows * UP.depth + 1.2
const TOP_Y = ROWS[1][13].y + 1.6

// punto + normale verso il campo su un lato, alla frazione f e distanza r dal "centro" della capsula
export function sidePoint(side, f, r) {
  if (side === 'A') return { x: -H + 2 * H * f, z: -r, nx: 0, nz: 1 }
  if (side === 'B') return { x: H - 2 * H * f, z: r, nx: 0, nz: -1 }
  if (side === 'N') { const t = Math.PI / 2 + Math.PI * f; return { x: -H + r * Math.cos(t), z: r * Math.sin(t), nx: -Math.cos(t), nz: -Math.sin(t) } }
  const t = -Math.PI / 2 + Math.PI * f; return { x: H + r * Math.cos(t), z: r * Math.sin(t), nx: -Math.cos(t), nz: -Math.sin(t) }
}
// contorno chiuso della capsula a distanza r (punti x,z + normale verso l'esterno)
function perim(r, ns = 48, na = 40) {
  const p = []
  for (let i = 0; i < ns; i++) { const x = -H + 2 * H * i / ns; p.push([x, -r, 0, -1]) }
  for (let i = 0; i < na; i++) { const t = -Math.PI / 2 + Math.PI * i / na; p.push([H + r * Math.cos(t), r * Math.sin(t), Math.cos(t), Math.sin(t)]) }
  for (let i = 0; i < ns; i++) { const x = H - 2 * H * i / ns; p.push([x, r, 0, 1]) }
  for (let i = 0; i < na; i++) { const t = Math.PI / 2 + Math.PI * i / na; p.push([-H + r * Math.cos(t), r * Math.sin(t), Math.cos(t), Math.sin(t)]) }
  return p
}
function capsuleShape(r, hole) {
  const s = new THREE.Shape(); const p = perim(r)
  p.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  if (hole) { const h = new THREE.Path(); perim(hole).reverse().forEach(([x, z], i) => (i ? h.lineTo(x, -z) : h.moveTo(x, -z))); s.holes.push(h) }
  return s
}
function flat(shape, y, material) {
  const g = new THREE.ShapeGeometry(shape, 1); g.rotateX(-Math.PI / 2); g.translate(0, y, 0)
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; return m
}
// fascia lungo la capsula tra r0 e r1 (orizzontale a y) oppure parete verticale a r tra y0 e y1
function ringStrip(pos, idx, r0, r1, ya, yb) {
  const a = perim(r0), b = perim(r1), base = pos.length / 3, n = a.length
  for (let i = 0; i < n; i++) { pos.push(a[i][0], ya, a[i][1], b[i][0], yb, b[i][1]) }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, A = base + i * 2, B = base + j * 2; idx.push(A, B, A + 1, B, B + 1, A + 1) }
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping }
  return t
}
export function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- campo ----------
function pitchTexture() {
  return canvasTex(2048, 1024, (g, W, Hh) => {
    const sx = W / 160, sz = Hh / 80, X = (x) => (x + 80) * sx, Z = (z) => (z + 40) * sz
    g.fillStyle = '#2f6d2a'; g.fillRect(0, 0, W, Hh)
    for (let k = -12; k < 12; k++) { g.fillStyle = k % 2 ? '#357a2f' : '#2c6627'; g.fillRect(X(k * 6.5), 0, 6.5 * sx, Hh) }
    const rnd = mulberry(4)
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '20,40,15' : '120,170,90'},${0.05 + rnd() * 0.06})`; g.fillRect(rnd() * W, rnd() * Hh, 2, 2) }
    const wear = (x, z, r) => { const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), r * sx); gr.addColorStop(0, 'rgba(110,100,60,.35)'); gr.addColorStop(1, 'rgba(110,100,60,0)'); g.fillStyle = gr; g.fillRect(X(x - r), Z(z - r), 2 * r * sx, 2 * r * sz) }
    wear(-50, 0, 6); wear(50, 0, 6); wear(0, 0, 5)
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 0.14 * sx
    const L = 52.5, Wd = 34, rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sz)
    rect(-L, -Wd, L, Wd); g.beginPath(); g.moveTo(X(0), Z(-Wd)); g.lineTo(X(0), Z(Wd)); g.stroke()
    g.beginPath(); g.arc(X(0), Z(0), 9.15 * sx, 0, Math.PI * 2); g.stroke()
    for (const s of [-1, 1]) {
      rect(s > 0 ? L - 16.5 : -L, -20.16, s > 0 ? L : -L + 16.5, 20.16); rect(s > 0 ? L - 5.5 : -L, -9.16, s > 0 ? L : -L + 5.5, 9.16)
      g.beginPath(); g.arc(X(s * (L - 11)), Z(0), 9.15 * sx, s > 0 ? Math.PI - 0.93 : -0.93, s > 0 ? Math.PI + 0.93 : 0.93); g.stroke()
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(s * (L - 11)), Z(0), 0.25 * sx, 0, 7); g.fill()
    }
    g.beginPath(); g.arc(X(0), Z(0), 0.25 * sx, 0, 7); g.fill()
  })
}

// ---------- persone (low-poly ma con proporzioni umane) ----------
function part(geo, x, y, z, rx = 0, rz = 0) { geo.rotateX(rx); geo.rotateZ(rz); geo.translate(x, y, z); return geo }
function fanGeoms(variant) {
  // seduto, guarda verso +z. origine = gradino
  const up = variant === 1
  const torso = [part(new THREE.CapsuleGeometry(0.16, 0.3, 3, 10), 0, 0.82, -0.08, -0.08)]
  const sl = [-1, 1].flatMap((s) => up
    ? [part(new THREE.CapsuleGeometry(0.05, 0.28, 2, 6), s * 0.22, 1.13, -0.07, 0, s * 0.35), part(new THREE.CapsuleGeometry(0.045, 0.26, 2, 6), s * 0.27, 1.42, -0.04, 0, -s * 0.1)]
    : [part(new THREE.CapsuleGeometry(0.05, 0.26, 2, 6), s * 0.21, 0.82, -0.02, 0.35, s * 0.08), part(new THREE.CapsuleGeometry(0.045, 0.24, 2, 6), s * 0.17, 0.62, 0.15, 1.3, 0)])
  const legs = [-1, 1].flatMap((s) => [part(new THREE.CapsuleGeometry(0.075, 0.36, 2, 6), s * 0.1, 0.52, 0.16, Math.PI / 2), part(new THREE.CapsuleGeometry(0.06, 0.36, 2, 6), s * 0.1, 0.27, 0.38, 0.1), part(new THREE.BoxGeometry(0.1, 0.07, 0.24), s * 0.1, 0.04, 0.46)])
  const head = [part(new THREE.SphereGeometry(0.1, 12, 10), 0, 1.2, -0.04), part(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8), 0, 1.07, -0.06)]
  if (!up) head.push(...[-1, 1].map((s) => part(new THREE.SphereGeometry(0.045, 8, 6), s * 0.16, 0.56, 0.24)))      // mani sulle gambe
  else head.push(...[-1, 1].map((s) => part(new THREE.SphereGeometry(0.045, 8, 6), s * 0.28, 1.58, -0.03)))
  const hair = [part(new THREE.SphereGeometry(0.106, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 1.215, -0.055, -0.35)]
  return { body: mergeGeometries([...torso, ...sl]), legs: mergeGeometries(legs), head: mergeGeometries(head), hair: mergeGeometries(hair) }
}
export function makePlayer(kit, shorts, socks, skin, hair) {
  const g = new THREE.Group(), M = (c) => (c.isMaterial ? c : new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }))
  const add = (geo, mat, parent = g) => { const m = new THREE.Mesh(geo, M(mat)); m.castShadow = true; parent.add(m); return m }
  add(part(new THREE.CapsuleGeometry(0.17, 0.42, 3, 12), 0, 1.3, 0), kit)
  add(part(new THREE.CylinderGeometry(0.17, 0.15, 0.24, 12), 0, 0.98, 0), shorts)
  add(part(new THREE.SphereGeometry(0.105, 14, 12), 0, 1.71, 0), skin)
  add(part(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 1.73, -0.01, -0.3), hair)
  add(part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), 0, 1.6, 0), skin)
  g.legs = []; g.arms = []
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.92, 0); g.add(hip)
    add(part(new THREE.CapsuleGeometry(0.075, 0.32, 2, 8), 0, -0.22, 0), skin, hip)
    add(part(new THREE.CapsuleGeometry(0.062, 0.3, 2, 8), 0, -0.62, 0), socks, hip)
    add(part(new THREE.BoxGeometry(0.1, 0.07, 0.26), 0, -0.88, 0.06), 0x111111, hip)
    g.legs.push(hip)
    const sh = new THREE.Group(); sh.position.set(s * 0.23, 1.47, 0); g.add(sh)
    add(part(new THREE.CapsuleGeometry(0.055, 0.2, 2, 8), 0, -0.13, 0), kit, sh)
    add(part(new THREE.CapsuleGeometry(0.045, 0.24, 2, 8), 0, -0.4, 0), skin, sh)
    g.arms.push(sh)
  }
  return g
}

// ---------- costruzione ----------
export function buildStadium(scene, renderer) {
  const S = {}
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.92, side: THREE.DoubleSide })
  // terreno + città
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground)
  const win = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#1a1d24'; g.fillRect(0, 0, w, h); const r = mulberry(9)
    for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { const on = r() < 0.32; g.fillStyle = on ? (r() < .7 ? '#ffd9a0' : '#cfe2ff') : '#252a33'; g.fillRect(x, y, 8, 9) }
  }, true)
  const rnd = mulberry(3)
  for (let i = 0; i < 140; i++) {
    const a = rnd() * Math.PI * 2, d = 150 + rnd() * 260, w = 14 + rnd() * 26, dp = 12 + rnd() * 20, h = 12 + rnd() * 34
    const tx = win.clone(); tx.needsUpdate = true; tx.repeat.set(w / 12, h / 24)
    const wm = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.55, map: tx }), roofM = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 1 })
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), [wm, wm, roofM, roofM, wm, wm])
    m.position.set(Math.cos(a) * d * 1.25, h / 2, Math.sin(a) * d); m.rotation.y = rnd() * Math.PI; scene.add(m)
  }
  // campo, pista blu, corsie, anello
  const grass = new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95 })
  const g0 = new THREE.ShapeGeometry(capsuleShape(TRACK[0]), 1); g0.rotateX(-Math.PI / 2)
  const uv = g0.attributes.uv, ps = g0.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + 80) / 160, 1 - (ps.getZ(i) + 40) / 80)
  const pitch = new THREE.Mesh(g0, grass); pitch.receiveShadow = true; scene.add(pitch)
  scene.add(flat(capsuleShape(TRACK[1], TRACK[0]), 0.01, new THREE.MeshStandardMaterial({ color: 0x2a64b4, roughness: 0.85 })))
  const lane = new THREE.MeshBasicMaterial({ color: 0xdfe8f5, transparent: true, opacity: 0.55 })
  for (let k = 0; k <= 8; k++) { const r = TRACK[0] + 0.15 + k * (TRACK[1] - TRACK[0] - 0.3) / 8; scene.add(flat(capsuleShape(r + 0.03, r - 0.03), 0.02, lane)) }
  scene.add(flat(capsuleShape(LO.r0 - 1, TRACK[1]), 0.0, new THREE.MeshStandardMaterial({ color: 0x5b5f66, roughness: 0.95 })))
  // spalti (gradoni continui) + muri
  const pos = [], idx = []
  const steps = [{ r0: LO.r0 - 1, r1: LO.r0, y: LO.y0 }]
  ROWS[0].forEach((w) => steps.push({ r0: w.r, r1: w.r + LO.depth, y: w.y }))
  steps.push({ r0: UR0 - WALK, r1: UR0, y: ROWS[0][13].y })
  ROWS[1].forEach((w) => steps.push({ r0: w.r, r1: w.r + UP.depth, y: w.y }))
  steps.push({ r0: ROWS[1][13].r + UP.depth, r1: R_OUT, y: ROWS[1][13].y })
  ringStrip(pos, idx, LO.r0 - 1, LO.r0 - 1, 0, LO.y0)
  steps.forEach((s, i) => { ringStrip(pos, idx, s.r0, s.r1, s.y, s.y); if (i) ringStrip(pos, idx, s.r0, s.r0, steps[i - 1].y, s.y) })
  ringStrip(pos, idx, R_OUT, R_OUT, 0, TOP_Y)
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals()
  const bowl = new THREE.Mesh(bg, concrete); bowl.receiveShadow = true; scene.add(bowl)
  // parapetti rossi del secondo anello + vetrata a bordo pista
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.12, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
  const gp = [], gi = []; ringStrip(gp, gi, LO.r0 - 1.05, LO.r0 - 1.05, LO.y0, LO.y0 + 2.2)
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gg.setIndex(gi); gg.computeVertexNormals(); scene.add(new THREE.Mesh(gg, glass))
  const rail = new THREE.MeshStandardMaterial({ color: 0xc23a2c, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })
  const rp = [], ri = []; ringStrip(rp, ri, UR0 - WALK + 0.05, UR0 - WALK + 0.05, ROWS[0][13].y + 1.0, ROWS[0][13].y + 1.08); ringStrip(rp, ri, LO.r0 - 1.05, LO.r0 - 1.05, LO.y0 + 2.2, LO.y0 + 2.26)
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals(); scene.add(new THREE.Mesh(rg, rail))

  // copertura Tribuna A (travi + lamiera + luci sotto)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b3446, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2 * H + 30, 0.5, 26), roofMat); roof.position.set(0, TOP_Y + 7, -(UR0 + 10)); roof.rotation.x = -0.06; scene.add(roof)
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(2 * H + 30, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xe8ebef, roughness: 0.5 })); fascia.position.set(0, TOP_Y + 7.6, -(UR0 - 3)); scene.add(fascia)
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 3 })
  for (let x = -H - 12; x <= H + 12; x += 6) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 26), roofMat); b.position.set(x, TOP_Y + 6.3, -(UR0 + 10)); b.rotation.x = -0.06; scene.add(b)
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.5), lampMat); l.position.set(x + 3, TOP_Y + 6.4, -(UR0 - 1.5)); scene.add(l)
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, TOP_Y + 7, 8), roofMat); c.position.set(x, (TOP_Y + 7) / 2, -(R_OUT + 1)); if ((x + 60) % 12 === 0) scene.add(c)
  }
  // edificio della Tribuna A (sky box illuminati)
  const box = new THREE.Mesh(new THREE.BoxGeometry(2 * H, 4, 4), new THREE.MeshStandardMaterial({ color: 0xdfe3e8, emissive: 0xffe6c0, emissiveIntensity: 0.25 })); box.position.set(0, ROWS[0][13].y + 1.4, -(UR0 - 1)); scene.add(box)

  // tabellone Curva Sud
  const sb = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#04070d'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c0161e'); gr.addColorStop(0.5, '#123a8a'); gr.addColorStop(1, '#c0161e')
    g.fillStyle = gr; g.fillRect(0, 0, w, 96); g.fillStyle = '#fff'; g.font = '800 64px Inter, Arial'; g.textAlign = 'center'; g.fillText('STADIO ANGELO MASSIMINO', w / 2, 70)
    g.font = '900 210px Inter, Arial'; g.fillText('0 - 0', w / 2, 330); g.font = '700 64px Inter, Arial'; g.fillStyle = '#9fc4ff'; g.fillText('CATANIA                 OSPITI', w / 2, 440)
  })
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: sb, emissiveIntensity: 1.4 }))
  scr.position.set(H + R_OUT + 2, TOP_Y + 9, 0); scr.rotation.y = -Math.PI / 2; scene.add(scr)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 13, 24), new THREE.MeshStandardMaterial({ color: 0x1b1f27 })); frame.position.set(H + R_OUT + 2.7, TOP_Y + 9, 0); scene.add(frame)
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1, TOP_Y + 3, 1), frame.material); leg.position.set(H + R_OUT + 3, (TOP_Y + 3) / 2, s * 7); scene.add(leg) }

  // LED a bordo campo (scorrono)
  const led = canvasTex(2048, 64, (g, w, h) => {
    const items = ['CATANIA', '★', 'ROSSAZZURRI', '★', 'STADIO MASSIMINO', '★', 'FORZA CATANIA', '★']
    g.fillStyle = '#071230'; g.fillRect(0, 0, w, h); let x = 10
    g.font = '900 40px Inter, Arial'; g.textBaseline = 'middle'
    for (let k = 0; k < 3; k++) for (const it of items) { g.fillStyle = it === '★' ? '#e1262f' : (k % 2 ? '#ffffff' : '#ff4b55'); g.fillText(it, x, h / 2 + 2); x += g.measureText(it).width + 34 }
  }, true)
  S.led = led
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: led, emissiveIntensity: 1.1 })
  const addLed = (len, x, z, ry) => { const t = led; const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.12), [ledMat.clone(), ledMat.clone(), new THREE.MeshStandardMaterial({ color: 0x111 }), new THREE.MeshStandardMaterial({ color: 0x111 }), ledMat, ledMat]); m.position.set(x, 0.5, z); m.rotation.y = ry; t.repeat.set(1, 1); scene.add(m) }
  addLed(96, 0, -39, 0); addLed(96, 0, 39, Math.PI); addLed(40, -58.5, 0, Math.PI / 2); addLed(40, 58.5, 0, -Math.PI / 2)
  // porte + panchine
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  for (const s of [-1, 1]) {
    const gx = s * 52.5
    for (const z of [-3.66, 3.66]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44, 8), white); p.position.set(gx, 1.22, z); scene.add(p) }
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.32, 8), white); cb.rotation.x = Math.PI / 2; cb.position.set(gx, 2.44, 0); scene.add(cb)
    const net = new THREE.Mesh(new THREE.BoxGeometry(2, 2.44, 7.32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, wireframe: true })); net.position.set(gx + s * 1, 1.22, 0); scene.add(net)
    const bench = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 6, 4, 12), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.5, roughness: 0.1 })); bench.rotation.z = Math.PI / 2; bench.scale.set(1, 1, 0.6); bench.position.set(s * 9, 1, -42); scene.add(bench)
  }

  // torri faro + luci
  S.floods = []
  const lampTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#222'; g.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { const gr = g.createRadialGradient(16 + x * 32, 16 + y * 32, 1, 16 + x * 32, 16 + y * 32, 14); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#bcd4ff'); g.fillStyle = gr; g.fillRect(3 + x * 32, 3 + y * 32, 26, 26) } })
  const coneTex = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.05, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) })
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const a = Math.atan2(sv * 0.9, su), px = su * H + (R_OUT + 9) * Math.cos(a), pz = (R_OUT + 9) * Math.sin(a), top = 50
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, top, 10), new THREE.MeshStandardMaterial({ color: 0x6e747b, metalness: 0.6, roughness: 0.4 })); tower.position.set(px, top / 2, pz); scene.add(tower)
    const head = new THREE.Group(); head.position.set(px, top + 2, pz); head.lookAt(0, 0, 0); scene.add(head)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.6), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: 0x333 })).concat([new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: lampTex, emissiveIntensity: 6 }), new THREE.MeshStandardMaterial({ color: 0x333 })]))
    head.add(panel)
    const sp = new THREE.SpotLight(0xf2f6ff, 2.2, 0, 0.62, 0.55, 0); sp.position.set(px, top + 2, pz); sp.target.position.set(-px * 0.12, 0, -pz * 0.12); scene.add(sp, sp.target)
    if (su < 0 && sv < 0) { sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0012; sp.shadow.normalBias = 0.08; sp.shadow.camera.near = 40; sp.shadow.camera.far = 260 }
    const d = new THREE.Vector3(px, top + 2, pz).length()
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(2, 34, d, 24, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
    cone.position.set(px / 2, (top + 2) / 2, pz / 2); cone.lookAt(0, 0, 0); cone.rotateX(Math.PI / 2); cone.rotateX(Math.PI); scene.add(cone)
    S.floods.push(new THREE.Vector3(px, top + 2, pz))
  }

  // ---------- seggiolini (InstancedMesh) ----------
  const seatGeo = mergeGeometries([part(new THREE.BoxGeometry(0.44, 0.07, 0.38), 0, 0.42, 0.06), part(new THREE.BoxGeometry(0.44, 0.4, 0.06), 0, 0.64, -0.14, -0.12), part(new THREE.BoxGeometry(0.06, 0.4, 0.06), 0, 0.21, 0.04)])
  const seats = []
  const aisle = (s) => (s % 16) < 1.2
  for (const sec of SECTORS) {
    sec.rows = []
    ROWS[sec.tier].forEach((row, ri) => {
      const r = row.r + 0.42, L = (sec.side === 'A' || sec.side === 'B') ? 2 * H * (sec.f[1] - sec.f[0]) : Math.PI * r * (sec.f[1] - sec.f[0])
      const n = Math.floor(L / 0.5); let num = 0; const list = []
      for (let k = 0; k < n; k++) {
        const s = (k + 0.5) * 0.5; if (aisle(s) || s < 0.6 || s > L - 0.6) continue
        const f = sec.f[0] + (s / L) * (sec.f[1] - sec.f[0]), p = sidePoint(sec.side, f, r)
        num++; const seat = { sec, row: ri + 1, num, x: p.x, y: row.y, z: p.z, nx: p.nx, nz: p.nz, f, idx: seats.length }
        seats.push(seat); list.push(seat)
      }
      sec.rows.push({ n: ri + 1, seats: list, r: row.r, y: row.y })
    })
    sec.capacity = sec.rows.reduce((a, r) => a + r.seats.length, 0)
  }
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
  const seatMesh = new THREE.InstancedMesh(seatGeo, seatMat, seats.length)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color()
  const mosaic = mulberry(11)
  seats.forEach((s, i) => {
    e.set(0, Math.atan2(s.nx, s.nz), 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, one); seatMesh.setMatrixAt(i, m4)
    const base = s.sec.tier === 0 ? 0x2a64c8 : 0xc0161e; const m = mosaic()
    col.setHex(m < 0.08 ? 0xe9edf2 : base); if (s.sec.id === 'ELI') col.setHex(0x8e1219); seatMesh.setColorAt(i, col)
  })
  seatMesh.receiveShadow = true; scene.add(seatMesh)
  S.seats = seats; S.seatMesh = seatMesh

  // ---------- tifosi (InstancedMesh, 2 pose) ----------
  S.fanSets = []
  const shirtPal = [0xc0161e, 0x1f4fa8, 0xc0161e, 0xc9cdd3, 0x1b1b1d, 0x2a64c8, 0x8a1016, 0xc0161e, 0x2a64c8]
  const skinPal = [0xc99b7c, 0xa8775a, 0xe2b9a0, 0x7b5640, 0xd4a888]
  const hairPal = [0x1e1712, 0x3b2a1e, 0x0e0e0e, 0x8a8279, 0x5a3b22]
  for (let v = 0; v < 2; v++) {
    const G = fanGeoms(v), mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, seats.length); m.count = 0; m.castShadow = false; scene.add(m); return m }
    S.fanSets.push({ body: mk(G.body, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })), legs: mk(G.legs, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })), head: mk(G.head, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })), hair: mk(G.hair, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })) })
  }
  S.setOccupancy = (match) => {
    const r = mulberry(match.id.charCodeAt(1) * 977)
    const cnt = [0, 0]
    seats.forEach((s) => {
      const base = match.sold * (s.sec.side === 'N' || s.sec.side === 'S' ? 1.18 : s.sec.id === 'ELI' ? 0.7 : 0.95)
      s.sold = r() < base
      if (!s.sold) return
      const v = (s.sec.side === 'N' || s.sec.side === 'S') && r() < 0.35 ? 1 : (r() < 0.06 ? 1 : 0), set = S.fanSets[v], i = cnt[v]++
      e.set(0, Math.atan2(s.nx, s.nz), 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, one)
      for (const k of ['body', 'legs', 'head', 'hair']) set[k].setMatrixAt(i, m4)
      set.body.setColorAt(i, col.setHex(shirtPal[Math.floor(r() * shirtPal.length)]))
      set.legs.setColorAt(i, col.setHex(r() < 0.6 ? 0x23262c : 0x2c3e5c))
      set.head.setColorAt(i, col.setHex(skinPal[Math.floor(r() * skinPal.length)]))
      set.hair.setColorAt(i, col.setHex(hairPal[Math.floor(r() * hairPal.length)]))
      s.fan = { v, i }
    })
    S.fanSets.forEach((set, v) => { for (const k of ['body', 'legs', 'head', 'hair']) { set[k].count = cnt[v]; set[k].instanceMatrix.needsUpdate = true; if (set[k].instanceColor) set[k].instanceColor.needsUpdate = true; set[k].computeBoundingSphere() } })
    S.hidden = []
    SECTORS.forEach((sec) => { sec.free = sec.rows.reduce((a, r) => a + r.seats.filter((x) => !x.sold).length, 0) })
  }

  const zero = new THREE.Matrix4().makeScale(0, 0, 0)
  S.clearAround = (seat, rad) => {
    S.restore()
    for (const s of seats) {
      if (!s.fan || s === seat) continue
      const d = Math.hypot(s.x - seat.x, s.z - seat.z)
      if (d < rad && s.y < seat.y + 0.3) { const set = S.fanSets[s.fan.v]; for (const k of ['body', 'legs', 'head', 'hair']) { set[k].getMatrixAt(s.fan.i, m4); S.hidden.push([set[k], s.fan.i, m4.clone()]); set[k].setMatrixAt(s.fan.i, zero); set[k].instanceMatrix.needsUpdate = true } }
    }
  }
  S.restore = () => { for (const [m, i, mm] of S.hidden || []) { m.setMatrixAt(i, mm); m.instanceMatrix.needsUpdate = true } S.hidden = [] }

  // ---------- giocatori in movimento ----------
  const stripes = canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#1c4ba0' : '#c0161e'; g.fillRect(i * 16, 0, 16, h) } }, true); stripes.repeat.set(2, 1)
  const homeKit = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })
  S.players = []
  const pr = mulberry(21), form = [[-48, 0], [-35, -18], [-36, -5], [-36, 6], [-34, 19], [-20, -12], [-18, 2], [-19, 14], [-6, -20], [-4, 0], [-7, 20]]
  const addP = (kit, sh, so, x, z) => {
    const p = makePlayer(kit, sh, so, skinPal[Math.floor(pr() * 5)], hairPal[Math.floor(pr() * 4)]); p.position.set(x, 0, z)
    p.userData = { home: new THREE.Vector3(x, 0, z), tgt: new THREE.Vector3(x, 0, z), speed: 1.5 + pr() * 3, ph: pr() * 10 }; scene.add(p); S.players.push(p)
  }
  form.forEach(([x, z]) => addP(homeKit, 0xffffff, 0x1c4ba0, x + 2, z))
  form.forEach(([x, z]) => addP(0xf2f2f0, 0x1d2b4a, 0xf2f2f0, -x - 2, -z))
  addP(0xe8d21e, 0x111111, 0x111111, 3, -8)
  S.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); S.ball.castShadow = true; scene.add(S.ball)
  S.ballTo = new THREE.Vector3(); S.ball.position.set(0, 0.12, 0)
  S.update = (dt, t) => {
    led.offset.x = (t * 0.02) % 1
    for (const p of S.players) {
      const u = p.userData
      if (p.position.distanceTo(u.tgt) < 0.6) u.tgt.set(u.home.x + (pr() - 0.5) * 22 + S.ball.position.x * 0.25, 0, Math.max(-32, Math.min(32, u.home.z + (pr() - 0.5) * 16 + S.ball.position.z * 0.2)))
      const d = u.tgt.clone().sub(p.position); const len = d.length(); const sp = Math.min(len, u.speed * dt)
      if (len > 0.01) { p.position.addScaledVector(d.normalize(), sp); p.rotation.y = Math.atan2(d.x, d.z) }
      const sw = Math.sin((t + u.ph) * u.speed * 3.2) * 0.55 * Math.min(1, u.speed / 3)
      p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8
    }
    if (S.ball.position.distanceTo(S.ballTo) < 0.5) { const p = S.players[Math.floor(pr() * 22)]; S.ballTo.set(p.position.x, 0.12, p.position.z) }
    const bd = S.ballTo.clone().sub(S.ball.position); S.ball.position.addScaledVector(bd.normalize(), Math.min(bd.length(), 9 * dt))
  }

  // ---------- zone cliccabili (settori + file) ----------
  const band = (side, f0, f1, ra, ya, rb, yb, n = 40) => {
    const P = [], I = []
    for (let i = 0; i <= n; i++) { const f = f0 + (f1 - f0) * i / n, a = sidePoint(side, f, ra), b = sidePoint(side, f, rb); P.push(a.x, ya, a.z, b.x, yb, b.z); if (i) { const k = (i - 1) * 2; I.push(k, k + 2, k + 1, k + 2, k + 3, k + 1) } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g
  }
  S.sectorMeshes = SECTORS.map((sec) => {
    const R = ROWS[sec.tier], m = new THREE.Mesh(band(sec.side, sec.f[0], sec.f[1], R[0].r - 0.2, R[0].y + 0.9, R[13].r + 0.8, R[13].y + 1.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }))
    m.userData.sec = sec; m.renderOrder = 5; scene.add(m)
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })); scene.add(edge); m.userData.edge = edge
    sec.mesh = m
    sec.rowMeshes = R.map((row, ri) => { const rm = new THREE.Mesh(band(sec.side, sec.f[0], sec.f[1], row.r, row.y + 0.95, row.r + 0.8, row.y + 1.05, 60), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); rm.userData = { sec, row: ri + 1 }; rm.visible = false; rm.renderOrder = 6; scene.add(rm); return rm })
    return m
  })
  return S
}
