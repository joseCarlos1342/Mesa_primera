// Genera todos los iconos de la app ("los 4 Ases") a partir de las ilustraciones reales
// de public/cards/01-*.webp. Fuente única: favicon, iconos PWA, maskable, apple-touch y logo.
//
//   pnpm --filter web icons:generate
//
// Paleta tomada de src/design/DESIGN-player.md (surface-felt, surface-poker, border-brass, primary).
import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

// sharp se toma del que ya instala Next (misma versión que usa next/image). No se declara
// como dependencia directa: hacerlo obliga a pnpm a recalcular peers y duplica @colyseus/core
// en el game-server, rompiendo su matchmaking en tests.
const requireFromNext = createRequire(createRequire(import.meta.url).resolve('next/package.json'))
const sharp = requireFromNext('sharp')

const PUBLIC = path.join(process.cwd(), 'public')
const CARDS = path.join(PUBLIC, 'cards')
const ICONS = path.join(PUBLIC, 'icons')

const COLORS = {
  felt: '#0a2a1f',
  feltLight: '#1b4d3e',
  brass: '#8b6b2e',
  gold: '#e2b044',
}

const MASTER = 1024
const CARD_RATIO = 832 / 1276
const ACES = ['oros', 'copas', 'espadas', 'bastos']

/** Fondo de paño: degradado radial y, opcionalmente, esquinas redondeadas con borde de latón. */
function feltSvg(size, { rounded = true, rim = true } = {}) {
  const r = rounded ? size * 0.22 : 0
  const rimW = size * 0.035
  const inset = rimW / 2
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="${COLORS.feltLight}"/>
      <stop offset="1" stop-color="${COLORS.felt}"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  ${
    rim
      ? `<rect x="${inset}" y="${inset}" width="${size - rimW}" height="${size - rimW}" rx="${Math.max(r - inset, 0)}"
          fill="none" stroke="${COLORS.brass}" stroke-width="${rimW}"/>
         <rect x="${rimW * 1.35}" y="${rimW * 1.35}" width="${size - rimW * 2.7}" height="${size - rimW * 2.7}"
          rx="${Math.max(r - rimW * 1.35, 0)}" fill="none" stroke="${COLORS.gold}" stroke-opacity="0.55" stroke-width="${Math.max(size * 0.006, 1)}"/>`
      : ''
  }
</svg>`)
}

/** Carta real con esquinas redondeadas, al alto indicado. */
async function cardImage(suit, height) {
  const width = Math.round(height * CARD_RATIO)
  const radius = Math.round(width * 0.07)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  )
  const edge = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="2"/></svg>`,
  )
  return sharp(path.join(CARDS, `01-${suit}.webp`))
    .resize(width, height, { kernel: 'lanczos3' })
    .composite([
      { input: mask, blend: 'dest-in' },
      { input: edge, blend: 'over' },
    ])
    .png()
    .toBuffer()
}

/** Sombra con la silueta de la carta, difuminada. */
function shadowSvg(width, height, opacity) {
  const radius = Math.round(width * 0.07)
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#000" fill-opacity="${opacity}"/></svg>`,
    ),
  )
    .png()
    .toBuffer()
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Abanico de los 4 ases en un lienzo transparente de `size` px.
 * Se dibuja en un lienzo amplio, se recorta a su contenido y se encaja centrado
 * en una caja de `fit` × size (la versión maskable usa una caja menor).
 */
async function fanLayer(size, fit = 0.8) {
  const work = MASTER * 2
  const cardH = Math.round(MASTER * 0.6)
  const cardW = Math.round(cardH * CARD_RATIO)
  const angles = [-30, -10, 10, 30]
  // Pivote por debajo de las cartas: se abren como una mano real.
  const radius = cardH * 1.25
  const pivotX = work / 2
  const pivotY = work / 2 + radius

  const layers = []
  for (let i = 0; i < ACES.length; i++) {
    const theta = (angles[i] * Math.PI) / 180
    const cx = pivotX + radius * Math.sin(theta)
    const cy = pivotY - radius * Math.cos(theta)

    const card = await sharp(await cardImage(ACES[i], cardH))
      .rotate(angles[i], { background: TRANSPARENT })
      .png()
      .toBuffer()
    const meta = await sharp(card).metadata()

    const shadow = await sharp(await shadowSvg(cardW, cardH, 0.5))
      .rotate(angles[i], { background: TRANSPARENT })
      .extend({ top: 40, bottom: 40, left: 40, right: 40, background: TRANSPARENT })
      .blur(10)
      .png()
      .toBuffer()
    const smeta = await sharp(shadow).metadata()

    layers.push({
      input: shadow,
      left: Math.round(cx - smeta.width / 2 + 10),
      top: Math.round(cy - smeta.height / 2 + 16),
    })
    layers.push({ input: card, left: Math.round(cx - meta.width / 2), top: Math.round(cy - meta.height / 2) })
  }

  const canvas = await sharp({ create: { width: work, height: work, channels: 4, background: TRANSPARENT } })
    .composite(layers)
    .png()
    .toBuffer()
  const box = Math.round(size * fit)
  const fitted = await sharp(canvas)
    .trim({ threshold: 1 })
    .resize(box, box, { fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer()
  const fmeta = await sharp(fitted).metadata()

  return sharp({ create: { width: size, height: size, channels: 4, background: TRANSPARENT } })
    .composite([
      {
        input: fitted,
        left: Math.round((size - fmeta.width) / 2),
        top: Math.round((size - fmeta.height) / 2),
      },
    ])
    .png()
    .toBuffer()
}

async function fanIcon(size, opts) {
  const fan = await fanLayer(size, opts.fit)
  let img = sharp(feltSvg(size, opts)).composite([{ input: fan }])
  if (opts.opaque) img = sharp(await img.png().toBuffer()).flatten({ background: COLORS.felt })
  return img.png({ compressionLevel: 9 }).toBuffer()
}

/**
 * Moneda del As de oros (recorte de la ilustración real) sobre paño: a 16–32 px
 * una carta completa se vuelve una mancha blanca, la moneda dorada se sigue leyendo.
 */
async function coinIcon(size) {
  const master = 256
  // Región de la moneda en la carta original de 832×1276.
  const crop = { left: 158, top: 280, width: 514, height: 514 }
  const coinSize = Math.round(master * 0.9)
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${coinSize}" height="${coinSize}"><circle cx="${coinSize / 2}" cy="${coinSize / 2}" r="${coinSize / 2}" fill="#fff"/></svg>`,
  )
  const coin = await sharp(path.join(CARDS, '01-oros.webp'))
    .extract(crop)
    .resize(coinSize, coinSize, { kernel: 'lanczos3' })
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const offset = Math.round((master - coinSize) / 2)
  const composed = await sharp(feltSvg(master, { rounded: true, rim: false }))
    .composite([{ input: coin, left: offset, top: offset }])
    .png()
    .toBuffer()
  return sharp(composed)
    .resize(size, size, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.5 })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** As de oros solo, centrado: carta completa para 48–64 px. */
async function aceOfCoinsIcon(size) {
  const master = 256
  const cardH = Math.round(master * 0.86)
  const cardW = Math.round(cardH * CARD_RATIO)
  const card = await cardImage('oros', cardH)
  const bg = feltSvg(master, { rounded: true, rim: false })
  const composed = await sharp(bg)
    .composite([{ input: card, left: Math.round((master - cardW) / 2), top: Math.round((master - cardH) / 2) }])
    .png()
    .toBuffer()
  return sharp(composed)
    .resize(size, size, { kernel: 'lanczos3' })
    .sharpen(size <= 32 ? { sigma: 0.6 } : undefined)
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** Contenedor ICO con imágenes PNG embebidas (formato Vista+). */
export function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

function svgWrapping(png, size, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
  <image width="${size}" height="${size}" href="data:image/png;base64,${png.toString('base64')}"/>
</svg>
`
}

async function main() {
  mkdirSync(ICONS, { recursive: true })
  const write = (rel, data) => {
    writeFileSync(path.join(PUBLIC, rel), data)
    console.info(`  ✓ ${rel}`)
  }

  // Master grande del abanico, reducido a cada tamaño para mantener nitidez.
  const fanMaster = await fanIcon(MASTER, { rounded: true, rim: true, fit: 0.86 })
  const appleMaster = await fanIcon(MASTER, { rounded: false, rim: false, opaque: true, fit: 0.82 })
  const maskableMaster = await fanIcon(MASTER, { rounded: false, rim: false, opaque: true, fit: 0.66 })
  const down = (buf, size) => sharp(buf).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()

  for (const size of [512, 384, 192]) write(`icons/icon-${size}.png`, await down(fanMaster, size))
  for (const size of [144, 96]) write(`icons/favicon-${size}.png`, await down(fanMaster, size))
  write('icons/apple-touch-icon-180.png', await down(appleMaster, 180))
  write('icons/maskable-icon-512.png', await down(maskableMaster, 512))

  const small = {
    48: await aceOfCoinsIcon(48),
    32: await coinIcon(32),
    16: await coinIcon(16),
  }
  for (const size of [48, 32, 16]) write(`icons/favicon-${size}.png`, small[size])
  write('favicon.ico', buildIco([16, 32, 48].map((size) => ({ size, data: small[size] }))))
  write('favicon.svg', svgWrapping(await coinIcon(64), 64, 'Primera Riverada los 4 Ases'))

  // Logo del navbar: solo el abanico, sin paño, sobre la barra oscura.
  const logo = await sharp(await fanLayer(MASTER, 1))
    .trim({ threshold: 1 })
    .resize(160, 160, { fit: 'contain', background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toBuffer()
  mkdirSync(path.join(PUBLIC, 'brand'), { recursive: true })
  write('brand/logo-transparent.svg', svgWrapping(logo, 160, 'Primera Riverada los 4 Ases'))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
