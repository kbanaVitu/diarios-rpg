import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const apiProc = spawn(process.execPath, ['server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '3000' }
});

const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const viteProc = spawn(process.execPath, [viteBin], {
  cwd: rootDir,
  stdio: 'inherit'
});

function cleanup() {
  apiProc.kill();
  viteProc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

