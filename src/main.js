import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import QRCode from 'qrcode'
import './style.css'
import { MATCHES, SECTORS, euro } from './data.js'
import { buildStadium, sidePoint, ROWS } from './stadium.js'

const $ = (s) => document.querySelector(s)
const isMobile = () => innerWidth < 900
const LOGO = './img/logo.png'
const LITE = location.search.includes('lite')

// ---------------- HOME ----------------
$('#cards').innerHTML = MATCHES.map((m, i) => {
  const minP = Math.round(Math.min(...SECTORS.map((s) => s.price[1])) * m.factor)
  return `<button class="card" data-i="${i}" style="animation-delay:${0.15 + i * 0.12}s">
    <div class="ph" style="background-image:url(${m.img})"><div class="date">${m.day}<i>${m.month}</i></div><span class="tag ${m.hot ? 'hot' : ''}">${m.tag}</span></div>
    <div class="bd"><div class="vs"><img class="crest" src="${LOGO}" onerror="this.onerror=null;this.src='./img/logo-placeholder.svg'" alt=""/>${m.home}<i>vs</i><span class="opp">${m.short}</span>${m.away}</div>
    <div class="meta">${m.weekday} · ore ${m.time} · ${m.comp}</div>
    <div class="row2"><div class="avail"><small>${Math.round(m.sold * 100)}% dei posti venduti</small><div class="bar"><i style="width:${m.sold * 100}%"></i></div></div><div class="from"><small>da</small><b>${euro(minP)}</b></div></div>
    <div class="go">Scegli il tuo posto →</div></div></button>`
}).join('')

// ---------------- 3D ----------------
const canvas = $('#c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(LITE ? 0.5 : Math.min(devicePixelRatio, isMobile() ? 1.5 : 1.75))
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene()
const sky = document.createElement('canvas'); sky.width = 4; sky.height = 512
{ const g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#02040a'); gr.addColorStop(0.55, '#081227'); gr.addColorStop(1, '#16223d'); g.fillStyle = gr; g.fillRect(0, 0, 4, 512) }
const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex
scene.fog = new THREE.FogExp2(0x0a1222, 0.0019)
scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x1a1a22, 0.75))
const moon = new THREE.DirectionalLight(0x8fa8ff, 0.35); moon.position.set(-100, 200, 80); scene.add(moon)

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 3000)
camera.position.set(0, 360, 460)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.42; controls.minDistance = 0.3; controls.maxDistance = 420
controls.screenSpacePanning = false

const S = buildStadium(scene, renderer)
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.5, 0.95); composer.addPass(bloom)
composer.addPass(new OutputPass())
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// ---------------- stato ----------------
const st = { match: null, mode: 'home', sec: null, row: null, seat: null, type: 0, hoverSec: null, hoverRow: null, hoverSeat: null, cart: [] }
const priceOf = (sec, type = 0) => Math.round(sec.price[type] * st.match.factor)

// ---------------- camera ----------------
let tween = null
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
function fly(pos, target, fov, dur = 1.6, done) {
  if (LITE) dur = 0.001
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), f0: camera.fov, p1: pos, t1: target, f1: fov, t: 0, dur, done }
  controls.enabled = false
}
function fitDistance(span, fov) {
  const v = THREE.MathUtils.degToRad(fov), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect)
  return Math.max(span / 2 / Math.tan(h / 2), (span * 0.32) / Math.tan(v / 2))
}
function poseOverview() {
  if (camera.aspect < 1) { const k = Math.min(1.6, 0.95 / Math.max(0.42, camera.aspect)); return { pos: new THREE.Vector3(150 * k, 175 * k, 14), target: new THREE.Vector3(0, 0, 0), fov: 42 } }
  return { pos: new THREE.Vector3(18, 112, 128), target: new THREE.Vector3(0, 0, 0), fov: 42 }
}
function secCenter(sec, rowIdx = 7) {
  const fm = (sec.f[0] + sec.f[1]) / 2, R = ROWS[sec.tier][rowIdx - 1], p = sidePoint(sec.side, fm, R.r)
  return { p: new THREE.Vector3(p.x, R.y, p.z), n: new THREE.Vector3(p.nx, 0, p.nz), fm }
}
function spanOf(sec, r) { return (sec.side === 'A' || sec.side === 'B') ? 82 * (sec.f[1] - sec.f[0]) : Math.PI * r * (sec.f[1] - sec.f[0]) * 0.72 }
function poseSector(sec) {
  const c = secCenter(sec), d = Math.min(camera.aspect < 1 ? 95 : 150, Math.max(34, fitDistance(spanOf(sec, c.p.length()) * (camera.aspect < 1 ? 0.55 : 1.08), 42)))
  return { pos: c.p.clone().addScaledVector(c.n, d).add(new THREE.Vector3(0, d * 0.42, 0)), target: c.p.clone().add(new THREE.Vector3(0, -1, 0)), fov: 42 }
}
function poseRow(sec, row) {
  const c = secCenter(sec, row), d = Math.min(46, Math.max(14, fitDistance(Math.min(spanOf(sec, c.p.length()), 20), 40)))
  return { pos: c.p.clone().addScaledVector(c.n, d).add(new THREE.Vector3(0, d * 0.5 + 1, 0)), target: c.p.clone().add(new THREE.Vector3(0, 0.6, 0)), fov: 40 }
}
function poseSeat(s) {
  const eye = new THREE.Vector3(s.x, s.y + 1.18, s.z).addScaledVector(new THREE.Vector3(s.nx, 0, s.nz), 0.05)
  const look = new THREE.Vector3(THREE.MathUtils.clamp(s.x * 0.35, -30, 30), 0, THREE.MathUtils.clamp(s.z * 0.25, -15, 15))
  const dir = look.clone().sub(eye).normalize()
  return { pos: eye, target: eye.clone().addScaledVector(dir, 0.6), fov: camera.aspect < 1 ? 72 : 58 }
}

// ---------------- overlay e marcatori ----------------
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(5,10,25,.85)'; g.stroke(); const t = new THREE.CanvasTexture(c); return t })()
let markers = null, markerSeats = []
const C = { free: new THREE.Color(0x3ddc84), hover: new THREE.Color(0xffffff), sel: new THREE.Color(0xff3340) }
function clearMarkers() { if (markers) { scene.remove(markers); markers.geometry.dispose(); markers = null } }
function buildMarkers(sec, row) {
  clearMarkers(); markerSeats = sec.rows[row - 1].seats.filter((s) => !s.sold)
  const P = new Float32Array(markerSeats.length * 3), Cc = new Float32Array(markerSeats.length * 3)
  markerSeats.forEach((s, i) => { P.set([s.x + s.nx * 0.1, s.y + 0.62, s.z + s.nz * 0.1], i * 3); Cc.set([C.free.r, C.free.g, C.free.b], i * 3) })
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3))
  markers = new THREE.Points(g, new THREE.PointsMaterial({ size: (isMobile() ? 15 : 17) * renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true, map: dotTex, transparent: true, alphaTest: 0.3, depthTest: false, toneMapped: false }))
  markers.renderOrder = 20; scene.add(markers)
}
function paintMarkers() {
  if (!markers) return
  const a = markers.geometry.attributes.color
  markerSeats.forEach((s, i) => { const c = s === st.seat ? C.sel : s === st.hoverSeat ? C.hover : C.free; a.setXYZ(i, c.r, c.g, c.b) })
  a.needsUpdate = true
}
function paintSectors() {
  for (const sec of SECTORS) {
    const m = sec.mesh, on = sec === st.hoverSec || sec === st.sec
    const show = st.mode === 'overview' || (st.mode === 'sector' && sec !== st.sec)
    m.visible = st.mode === 'overview' || st.mode === 'sector'
    m.material.color.set(sec === st.sec ? 0xe1262f : 0xffffff)
    m.material.opacity = st.mode === 'overview' ? (on ? 0.32 : 0.06) : (st.mode === 'sector' && sec === st.sec ? 0.0 : show && on ? 0.18 : 0.0)
    m.userData.edge.material.opacity = st.mode === 'overview' ? (on ? 0.95 : 0.28) : (sec === st.sec && st.mode === 'sector' ? 0.7 : 0)
    sec.rowMeshes.forEach((rm) => {
      rm.visible = sec === st.sec && (st.mode === 'sector' || st.mode === 'row')
      const hov = rm.userData.row === st.hoverRow, sel = rm.userData.row === st.row
      rm.material.color.set(sel ? 0xe1262f : 0xffffff)
      rm.material.opacity = st.mode === 'sector' ? (hov ? 0.55 : rm.userData.row % 2 ? 0.07 : 0.13) : (sel && st.mode === 'row' ? 0.18 : 0)
    })
  }
  document.querySelectorAll('.sec').forEach((b) => { b.classList.toggle('hl', b.dataset.id === st.hoverSec?.id); b.classList.toggle('on', b.dataset.id === st.sec?.id) })
}

// ---------------- UI ----------------
const tip = $('#tip'), hint = $('#hint')
function showTip(x, y, html, cls = '') { tip.innerHTML = html; tip.className = 'tip ' + cls; tip.style.left = Math.min(innerWidth - 100, Math.max(100, x)) + 'px'; tip.style.top = Math.max(120, y) + 'px' }
const hideTip = () => tip.classList.add('hidden')
function renderLegend() {
  $('#secList').innerHTML = SECTORS.map((s) => `<button class="sec" data-id="${s.id}"><i style="background:#${s.tone.toString(16).padStart(6, '0')}"></i><span><b>${s.short}</b><small>${s.free.toLocaleString('it-IT')} posti liberi${s.covered ? ' · coperto' : ''}</small></span><em>${euro(priceOf(s, 1))}</em></button>`).join('')
  document.querySelectorAll('.sec').forEach((b) => {
    const sec = SECTORS.find((s) => s.id === b.dataset.id)
    b.onclick = () => selectSector(sec); b.onmouseenter = () => { if (st.mode === 'overview') { st.hoverSec = sec; paintSectors() } }; b.onmouseleave = () => { st.hoverSec = null; paintSectors() }
  })
}
function setMode(mode) {
  st.mode = mode
  const k = { overview: 0, sector: 1, row: 2, view: 3 }[mode]
  document.querySelectorAll('.crumbs li').forEach((li) => { li.classList.toggle('on', +li.dataset.k === k); li.classList.toggle('done', +li.dataset.k < k) })
  $('#legend').classList.toggle('away', mode !== 'overview')
  $('#viewbar').classList.toggle('hidden', mode !== 'view'); $('#drag').classList.toggle('hidden', mode !== 'view')
  hint.classList.toggle('hidden', mode === 'view')
  const mob = isMobile()
  hint.textContent = mode === 'overview' ? (mob ? 'Tocca un settore · trascina per ruotare' : 'Clicca un settore · trascina per ruotare lo stadio')
    : mode === 'sector' ? `${st.sec.name} · scegli la fila (1 è la più bassa)`
    : mode === 'row' ? `Fila ${st.row} · scegli il posto (verdi = liberi)${mob ? '' : ' · trascina per spostarti'}` : ''
  controls.autoRotate = mode === 'overview'; controls.autoRotateSpeed = 0.35
  controls.enablePan = mode === 'row'; controls.enableZoom = mode !== 'view'
  if (mode === 'view') { controls.minDistance = controls.maxDistance = 0.6; controls.rotateSpeed = -0.35; controls.minPolarAngle = 0.9; controls.maxPolarAngle = 2.0 }
  else { controls.minDistance = mode === 'row' ? 6 : 18; controls.maxDistance = mode === 'overview' ? 420 : 160; controls.rotateSpeed = 0.6; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.42 }
  S.fanSets.forEach(() => {})
  if (mode !== 'row' && mode !== 'view') clearMarkers()
  if (mode !== 'view') S.restore()
  if (markers) markers.visible = mode === 'row'
  hideTip(); paintSectors()
}
function startMatch(m) {
  st.match = m; S.setOccupancy(m); renderLegend()
  $('#mt').textContent = `${m.home} – ${m.away}`; $('#ms').textContent = `${m.weekday} ${m.day} ${m.month.toLowerCase()} · ${m.time} · Stadio Angelo Massimino`
  $('#home').classList.add('out'); $('#app').classList.remove('hidden'); running = true
  camera.position.set(-160, 330, 420); controls.target.set(0, 0, 0); st.sec = null; st.row = null
  setMode('overview'); const o = poseOverview(); fly(o.pos, o.target, o.fov, 3.2)
}
function selectSector(sec) {
  st.sec = sec; st.row = null; st.seat = null; st.hoverSec = null; setMode('sector')
  const p = poseSector(sec); fly(p.pos, p.target, p.fov, 1.8)
}
function selectRow(row) {
  st.row = row; st.seat = null; st.hoverRow = null; buildMarkers(st.sec, row); setMode('row')
  const p = poseRow(st.sec, row); fly(p.pos, p.target, p.fov, 1.5)
  if (!markerSeats.length) hint.textContent = `Fila ${row} esaurita · scegline un'altra`
}
function selectSeat(s) {
  st.seat = s; paintMarkers(); setMode('view'); S.clearAround(s, 4.5)
  const p = poseSeat(s); fly(p.pos, p.target, p.fov, 2.0)
  updateViewbar()
}
function updateViewbar() {
  const s = st.seat, sec = s.sec
  $('#vSec').textContent = sec.name + (sec.covered ? ' · coperto' : '')
  $('#vSeat').textContent = `Fila ${s.row} · Posto ${s.num}`
  const dc = Math.hypot(s.x, s.z), dg = Math.min(Math.hypot(s.x - 52.5, s.z), Math.hypot(s.x + 52.5, s.z))
  $('#vStats').textContent = `${Math.round(dc)} m dal centrocampo · ${s.y.toFixed(1).replace('.', ',')} m d'altezza · ${Math.round(dg)} m dalla porta`
  $('#vPrice').textContent = euro(priceOf(sec, st.type))
  const inCart = st.cart.some((c) => c.seat === s)
  $('#addSeat').textContent = inCart ? 'Nel carrello ✓' : 'Acquista'
}
function neighbor(dir) {
  const list = st.sec.rows[st.seat.row - 1].seats; let i = list.indexOf(st.seat)
  do { i += dir } while (list[i] && list[i].sold)
  if (list[i]) { st.seat = list[i]; S.clearAround(list[i], 4.5); const p = poseSeat(list[i]); fly(p.pos, p.target, p.fov, 0.7); updateViewbar() }
}
$('#prevSeat').onclick = () => neighbor(-1); $('#nextSeat').onclick = () => neighbor(1)
document.querySelectorAll('.vtype button').forEach((b) => (b.onclick = () => { st.type = +b.dataset.t; document.querySelectorAll('.vtype button').forEach((x) => x.classList.toggle('on', x === b)); updateViewbar() }))
$('#back').onclick = () => {
  if (st.mode === 'view') { selectRow(st.row) }
  else if (st.mode === 'row') selectSector(st.sec)
  else if (st.mode === 'sector') { st.sec = null; setMode('overview'); const o = poseOverview(); fly(o.pos, o.target, o.fov, 1.8) }
  else { $('#home').classList.remove('out'); $('#app').classList.add('hidden'); running = false; closeCart() }
}
document.querySelectorAll('#cards .card').forEach((c) => (c.onclick = () => startMatch(MATCHES[+c.dataset.i])))

// ---------------- carrello + checkout ----------------
const drawer = $('#drawer')
const openCart = () => { drawer.classList.add('open'); renderCart() }
function closeCart() { drawer.classList.remove('open') }
$('#cartBtn').onclick = () => (drawer.classList.contains('open') ? closeCart() : openCart())
$('#closeCart').onclick = closeCart
$('#addSeat').onclick = () => {
  if (!st.cart.some((c) => c.seat === st.seat)) st.cart.push({ seat: st.seat, type: st.type })
  $('#cartN').textContent = st.cart.length; $('#cartBtn').classList.remove('bump'); void $('#cartBtn').offsetWidth; $('#cartBtn').classList.add('bump')
  updateViewbar(); openCart()
}
function renderCart(done) {
  const body = $('#cartBody')
  if (done) return
  if (!st.cart.length) { body.innerHTML = `<div class="empty">Il carrello è vuoto.<br/>Scegli un settore, una fila e un posto.</div>`; return }
  const total = st.cart.reduce((a, c) => a + priceOf(c.seat.sec, c.type), 0)
  body.innerHTML = st.cart.map((c, i) => `<div class="item"><span><b>${c.seat.sec.short} · Fila ${c.seat.row} · Posto ${c.seat.num}</b><small>${st.match.home} – ${st.match.away} · ${c.type ? 'Ridotto' : 'Intero'}</small></span><em>${euro(priceOf(c.seat.sec, c.type))}</em><button data-i="${i}" aria-label="Rimuovi">✕</button></div>`).join('')
    + `<div class="sum"><span>Totale</span><span>${euro(total)}</span></div>
    <label class="field">Nome e cognome<input id="fName" placeholder="Mario Rossi" autocomplete="name"/></label>
    <label class="field">E-mail per i biglietti<input id="fMail" type="email" placeholder="mario@email.it" autocomplete="email"/></label>
    <div class="pay">💳 Carta · Apple Pay · Google Pay — <b>demo</b>: nessun addebito reale.</div>
    <button id="pay" class="cta full">Paga ${euro(total)}</button>
    <button id="more" class="cta full" style="background:rgba(255,255,255,.08)">+ Aggiungi un altro posto</button>`
  body.querySelectorAll('.item button').forEach((b) => (b.onclick = () => { st.cart.splice(+b.dataset.i, 1); $('#cartN').textContent = st.cart.length; renderCart(); if (st.seat) updateViewbar() }))
  $('#more').onclick = () => { closeCart(); if (st.mode === 'view') selectRow(st.row) }
  $('#pay').onclick = async () => {
    const name = $('#fName').value.trim(), mail = $('#fMail').value.trim()
    if (name.length < 2 || !/\S+@\S+\.\S+/.test(mail)) { $('#fName').focus(); return }
    $('#pay').disabled = true; $('#pay').textContent = 'Pagamento in corso…'
    await new Promise((r) => setTimeout(r, 1300))
    const items = st.cart.splice(0); $('#cartN').textContent = 0
    const tickets = await Promise.all(items.map(async (c) => {
      const code = `CT-${st.match.id.toUpperCase()}-${c.seat.sec.id}${c.seat.row}-${c.seat.num}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      c.seat.sold = true
      const qr = await QRCode.toDataURL(code, { margin: 1, width: 300, color: { dark: '#0b1426', light: '#ffffff' } })
      return `<div class="ticket"><div class="th"><img src="${LOGO}" onerror="this.onerror=null;this.src='./img/logo-placeholder.svg'"/><span><b>${st.match.home} – ${st.match.away}</b><small>${st.match.weekday} ${st.match.day} ${st.match.month.toLowerCase()} · ${st.match.time} · Stadio Angelo Massimino</small></span></div>
        <div class="tb"><img class="qr" src="${qr}"/><dl><div><dt>Settore</dt><dd>${c.seat.sec.short}</dd></div><div><dt>Tipo</dt><dd>${c.type ? 'Ridotto' : 'Intero'}</dd></div><div><dt>Fila</dt><dd>${c.seat.row}</dd></div><div><dt>Posto</dt><dd>${c.seat.num}</dd></div><div style="grid-column:span 2"><dt>Intestato a</dt><dd>${name.replace(/</g, '')}</dd></div></dl></div></div>`
    }))
    $('#cartBody').innerHTML = `<div class="empty" style="padding:6px 0 16px;color:#3ddc84;font-weight:800">✓ Pagamento riuscito · biglietti inviati a ${mail.replace(/</g, '')}</div>` + tickets.join('')
    S.setOccupancy(st.match); items.forEach((c) => (c.seat.sold = true)); renderLegend(); if (st.seat) updateViewbar()
  }
}

// ---------------- puntatore ----------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
let down = null, mouse = null, needPick = false
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false })
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse = { x: e.clientX, y: e.clientY }; needPick = true } })
canvas.addEventListener('pointerleave', () => { mouse = null; st.hoverSec = st.hoverSeat = null; st.hoverRow = null; hideTip(); paintSectors(); paintMarkers() })
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 || tween) return
  const hit = pick(e.clientX, e.clientY)
  if (st.mode === 'overview' && hit?.sec) selectSector(hit.sec)
  else if (st.mode === 'sector' && hit?.row) selectRow(hit.row)
  else if (st.mode === 'sector' && hit?.sec) selectSector(hit.sec)
  else if (st.mode === 'row' && hit?.seat) selectSeat(hit.seat)
})
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera)
  let res = null
  if (st.mode === 'overview') {
    const h = ray.intersectObjects(SECTORS.map((s) => s.mesh))[0]
    st.hoverSec = h ? h.object.userData.sec : null
    if (st.hoverSec) { const s = st.hoverSec; res = { sec: s }; showTip(x, y, `<b>${s.name}</b><small>${s.free.toLocaleString('it-IT')} posti liberi su ${s.capacity.toLocaleString('it-IT')}${s.covered ? ' · coperto' : ''}</small><div class="bar"><i style="width:${(1 - s.free / s.capacity) * 100}%"></i></div><span class="p">${euro(priceOf(s, 1))}</span>`) } else hideTip()
  } else if (st.mode === 'sector') {
    const h = ray.intersectObjects(st.sec.rowMeshes)[0]
    st.hoverRow = h ? h.object.userData.row : null
    if (st.hoverRow) { const r = st.sec.rows[st.hoverRow - 1], free = r.seats.filter((s) => !s.sold).length; res = { row: st.hoverRow }; showTip(x, y, `<b>Fila ${st.hoverRow}</b><small>${free} posti liberi · ${st.sec.short}</small><span class="p">${euro(priceOf(st.sec))}</span>`, free ? '' : 'sold') }
    else {
      const h2 = ray.intersectObjects(SECTORS.filter((s) => s !== st.sec).map((s) => s.mesh))[0]
      st.hoverSec = h2 ? h2.object.userData.sec : null
      if (st.hoverSec) { res = { sec: st.hoverSec }; showTip(x, y, `<b>${st.hoverSec.name}</b><small>Passa a questo settore</small><span class="p">${euro(priceOf(st.hoverSec, 1))}</span>`) } else hideTip()
    }
  } else if (st.mode === 'row' && markers) {
    ray.params.Points.threshold = Math.max(0.25, camera.position.distanceTo(controls.target) * 0.012)
    const h = ray.intersectObject(markers).sort((a, b) => a.distanceToRay - b.distanceToRay)[0]
    st.hoverSeat = h ? markerSeats[h.index] : null
    if (st.hoverSeat) { const s = st.hoverSeat; res = { seat: s }; showTip(x, y, `<b>Fila ${s.row} · Posto ${s.num}</b><small>${s.sec.short} · intero</small><small>Clicca per vedere la vista</small><span class="p">${euro(priceOf(s.sec))}</span>`) } else hideTip()
    paintMarkers()
  }
  paintSectors(); canvas.style.cursor = res ? 'pointer' : 'grab'
  return res
}

// ---------------- loop ----------------
let running = false, last = performance.now()
function loop(now) {
  requestAnimationFrame(loop)
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (!running) return
  if (tween) {
    tween.t += dt / tween.dur; const k = ease(Math.min(1, tween.t))
    camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k)
    camera.fov = THREE.MathUtils.lerp(tween.f0, tween.f1, k); camera.updateProjectionMatrix()
    if (tween.t >= 1) { const d = tween.done; tween = null; controls.enabled = true; d && d() }
  }
  controls.update()
  if (needPick && mouse && !tween) { needPick = false; pick(mouse.x, mouse.y) }
  S.update(dt, now / 1000)
  composer.render()
}
requestAnimationFrame(loop)
window.__app = { st, startMatch, selectSector, selectRow, selectSeat, S, SECTORS }
