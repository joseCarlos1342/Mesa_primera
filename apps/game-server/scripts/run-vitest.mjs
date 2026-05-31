import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

if (args[0] === '--') {
  args.shift();
}

const vitestArgs = args.filter((arg) => arg !== '--runInBand');
const child = spawn('vitest', ['run', ...vitestArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
