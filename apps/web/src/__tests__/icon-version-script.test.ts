/**
 * @jest-environment node
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const SCRIPT = path.resolve(__dirname, '../../scripts/icon-version.mjs')
const WEB_ROOT = path.resolve(__dirname, '../..')

/** Ejecuta el script en `cwd`; devuelve el código de salida. */
function run(cwd: string, ...args: string[]): number {
  try {
    execFileSync(process.execPath, [SCRIPT, ...args], { cwd, stdio: 'pipe' })
    return 0
  } catch (error) {
    return (error as { status: number }).status
  }
}

function readVersion(root: string): string {
  return fs.readFileSync(path.join(root, 'src/lib/pwa/icon-version.ts'), 'utf-8').match(/'([0-9a-f]{8})'/)![1]
}

describe('scripts/icon-version.mjs', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-version-'))
    fs.mkdirSync(path.join(root, 'public/icons'), { recursive: true })
    fs.writeFileSync(path.join(root, 'public/icons/icon-192.png'), 'png-a')
    fs.writeFileSync(path.join(root, 'public/icons/icon-512.png'), 'png-b')
    fs.writeFileSync(path.join(root, 'public/favicon.ico'), 'ico')
    fs.writeFileSync(
      path.join(root, 'public/manifest.json'),
      '{ "icons": [\n  { "src": "/icons/icon-192.png?v=2" },\n  { "src": "/icons/icon-512.png" }\n] }\n',
    )
  })

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

  it('--check falla si el manifest o el módulo están desactualizados y no escribe nada', () => {
    expect(run(root, '--check')).toBe(1)
    expect(fs.existsSync(path.join(root, 'src/lib/pwa/icon-version.ts'))).toBe(false)
  })

  it('reescribe el manifest conservando su formato y es idempotente', () => {
    expect(run(root)).toBe(0)
    const version = readVersion(root)
    const manifest = fs.readFileSync(path.join(root, 'public/manifest.json'), 'utf-8')
    expect(manifest).toBe(
      `{ "icons": [\n  { "src": "/icons/icon-192.png?v=${version}" },\n  { "src": "/icons/icon-512.png?v=${version}" }\n] }\n`,
    )
    expect(run(root, '--check')).toBe(0)
    expect(run(root)).toBe(0)
    expect(readVersion(root)).toBe(version)
  })

  it('cambia la versión cuando cambia un solo byte de un icono', () => {
    run(root)
    const before = readVersion(root)
    fs.writeFileSync(path.join(root, 'public/icons/icon-512.png'), 'png-c')
    expect(run(root, '--check')).toBe(1)
    run(root)
    expect(readVersion(root)).not.toBe(before)
  })

  it('el repositorio está sincronizado (equivale al check del build)', () => {
    expect(run(WEB_ROOT, '--check')).toBe(0)
  })
})
