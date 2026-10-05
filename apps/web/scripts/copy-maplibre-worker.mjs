// MapLibre GL v6 carga su Web Worker desde un archivo aparte que Next.js no emite.
// Copiamos el worker y su dependencia (deben quedar en la misma carpeta) a public/maplibre
// antes de dev/build, siempre desde node_modules para que coincidan con la versión instalada.
// Ver: https://maplibre.org/maplibre-gl-js/docs/ (Installation → Turbopack/Next.js)
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const dist = path.join(path.dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')), 'dist')
const dest = path.join(process.cwd(), 'public', 'maplibre')

mkdirSync(dest, { recursive: true })
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(dest, file))
}
