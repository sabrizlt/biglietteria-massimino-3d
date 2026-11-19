// Dati della biglietteria: partite, settori e prezzi. In produzione arrivano dall'API.
export const CLUB = { name: 'Catania', stadium: 'Stadio Angelo Massimino', city: 'Catania' }

export const MATCHES = [
  { id: 'm1', home: 'Catania', away: 'Atletico Etna', short: 'ETN', day: '07', month: 'DIC', weekday: 'Domenica', time: '20:30', comp: 'Serie C · 16ª giornata', img: './img/card1.jpg', factor: 1.0, sold: 0.55, tag: 'Disponibile' },
  { id: 'm2', home: 'Catania', away: 'Sporting Ionio', short: 'SPI', day: '20', month: 'DIC', weekday: 'Sabato', time: '18:00', comp: 'Serie C · 18ª giornata', img: './img/card2.jpg', factor: 1.15, sold: 0.78, tag: 'Ultimi posti', hot: true },
  { id: 'm3', home: 'Catania', away: 'Real Peloro', short: 'RPE', day: '10', month: 'GEN', weekday: 'Sabato', time: '20:45', comp: 'Coppa Italia Serie C · Ottavi', img: './img/card3.jpg', factor: 0.8, sold: 0.35, tag: 'In vendita' },
]

// side: A = Tribuna A (coperta), B = Tribuna B, N = Curva Nord, S = Curva Sud. tier 0 = inferiore, 1 = superiore. f = tratto del lato (0..1)
export const SECTORS = [
  { id: 'TAI', name: 'Tribuna A Inferiore', short: 'Tribuna A Inf.', side: 'A', tier: 0, f: [0, 1], price: [45, 35], covered: true, tone: 0x2f6fd0 },
  { id: 'ELI', name: 'Tribuna Elite', short: 'Elite', side: 'A', tier: 1, f: [0.36, 0.64], price: [70, 60], covered: true, tone: 0xc8a24a },
  { id: 'TAN', name: 'Tribuna A Superiore Nord', short: 'Tribuna A Sup. N', side: 'A', tier: 1, f: [0, 0.35], price: [45, 35], covered: true, tone: 0xc0161e },
  { id: 'TAS', name: 'Tribuna A Superiore Sud', short: 'Tribuna A Sup. S', side: 'A', tier: 1, f: [0.65, 1], price: [45, 35], covered: true, tone: 0xc0161e },
  { id: 'TBI', name: 'Tribuna B Inferiore', short: 'Tribuna B Inf.', side: 'B', tier: 0, f: [0, 1], price: [30, 22], tone: 0x2f6fd0 },
  { id: 'TBS', name: 'Tribuna B Superiore', short: 'Tribuna B Sup.', side: 'B', tier: 1, f: [0, 1], price: [30, 22], tone: 0xc0161e },
  { id: 'CNI', name: 'Curva Nord Inferiore', short: 'Curva Nord Inf.', side: 'N', tier: 0, f: [0.05, 0.95], price: [16, 12], tone: 0x2f6fd0 },
  { id: 'CNS', name: 'Curva Nord Superiore', short: 'Curva Nord Sup.', side: 'N', tier: 1, f: [0.05, 0.95], price: [16, 12], tone: 0xc0161e },
  { id: 'CSI', name: 'Curva Sud Inferiore', short: 'Curva Sud Inf.', side: 'S', tier: 0, f: [0.05, 0.95], price: [16, 12], tone: 0x2f6fd0 },
  { id: 'CSS', name: 'Curva Sud Superiore', short: 'Curva Sud Sup.', side: 'S', tier: 1, f: [0.05, 0.95], price: [16, 12], tone: 0xc0161e },
]

export const euro = (n) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
