// Versión de los iconos de la app derivada de su contenido (sha256, 8 hex).
//
//   pnpm --filter web icons:version          # reescribe manifest.json + src/lib/pwa/icon-version.ts
//   pnpm --filter web icons:version --check  # solo verifica; sale con 1 si están desactualizados
//
// Chrome (>=144) solo detecta un icono nuevo en una PWA instalada si cambia la URL del
// icono en el manifest, así que cada cambio de contenido debe producir un `?v=` nuevo.
// Se usa el hash del contenido (y no el número de build) para no pedir al usuario que
// confirme un "cambio de icono" en cada deploy.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ICON_URL = /(\/icons\/[^"?]+\.png)(?:\?v=[^"]*)?"/g

/** Archivos que forman la identidad visual, en orden estable. */
function iconFiles(publicDir) {
  const icons = readdirSync(path.join(publicDir, 'icons'))
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) => `icons/${name}`)
  return [...icons, 'favicon.ico', 'favicon.svg'].filter((rel) => existsSync(path.join(publicDir, rel)))
}

export function computeIconVersion(publicDir) {
  const hash = createHash('sha256')
  for (const rel of iconFiles(publicDir)) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(path.join(publicDir, rel)))
  }
  return hash.digest('hex').slice(0, 8)
}

export function applyVersionToManifest(manifestText, version) {
  return manifestText.replace(ICON_URL, `$1?v=${version}"`)
}

export function renderVersionModule(version) {
  return `// Generado por scripts/icon-version.mjs a partir del contenido de los iconos. No editar a mano.\nexport const ICON_VERSION = '${version}'\n`
}

/** Sincroniza (o verifica con `check`) manifest y módulo TS. Devuelve los archivos desactualizados. */
export function syncIconVersion({ root = process.cwd(), check = false } = {}) {
  const publicDir = path.join(root, 'public')
  const manifestPath = path.join(publicDir, 'manifest.json')
  const modulePath = path.join(root, 'src/lib/pwa/icon-version.ts')
  const version = computeIconVersion(publicDir)

  const targets = [
    [manifestPath, applyVersionToManifest(readFileSync(manifestPath, 'utf-8'), version)],
    [modulePath, renderVersionModule(version)],
  ]
  const stale = targets.filter(([file, next]) => !existsSync(file) || readFileSync(file, 'utf-8') !== next)

  if (!check) {
    for (const [file, next] of stale) {
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, next)
    }
  }
  return { version, stale: stale.map(([file]) => path.relative(root, file)) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check')
  const { version, stale } = syncIconVersion({ check })
  if (check && stale.length > 0) {
    console.error(
      `Versión de iconos desactualizada (${version}) en: ${stale.join(', ')}.\n` +
        'Ejecuta `pnpm --filter web icons:version` y commitea el resultado.',
    )
    process.exit(1)
  }
  console.info(`Iconos v=${version}${stale.length ? ` → actualizado: ${stale.join(', ')}` : ' (sin cambios)'}`)
}
