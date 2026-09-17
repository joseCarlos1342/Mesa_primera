import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const ffmpegPath = require('ffmpeg-static')
const ffprobePath = require('ffprobe-static').path
const binDirectories = [path.dirname(ffmpegPath), path.dirname(ffprobePath)]

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--yes', 'hyperframes@0.8.41', 'render', ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      PATH: `${binDirectories.join(path.delimiter)}${path.delimiter}${process.env.PATH ?? ''}`,
    },
    stdio: 'inherit',
  },
)

child.once('error', (error) => {
  process.stderr.write(`No se pudo iniciar HyperFrames: ${error.message}\n`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exitCode = code ?? 1
})
