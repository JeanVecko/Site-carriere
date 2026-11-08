// Lance l'API (server/) et le site (site/) en même temps : `npm run dev` depuis la racine.
import { spawn } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const siteDir = path.join(root, 'site');

for (const dir of [serverDir, siteDir]) {
  if (!existsSync(path.join(dir, 'node_modules'))) {
    console.error(`Dépendances manquantes dans ${path.basename(dir)}/. Lancez d'abord : npm install (à la racine).`);
    process.exit(1);
  }
}

const envFile = path.join(serverDir, '.env');
if (!existsSync(envFile)) {
  copyFileSync(path.join(serverDir, '.env.example'), envFile);
  console.error(
    'Le fichier server/.env n\'existait pas : il vient d\'être créé à partir de .env.example.\n' +
      'Renseignez DATABASE_URL, JWT_SECRET, ADMIN_EMAIL et ADMIN_PASSWORD, puis relancez npm run dev.'
  );
  process.exit(1);
}

const colors = { api: '\x1b[36m', site: '\x1b[35m' };
const reset = '\x1b[0m';
const children = [];
let stopping = false;

function run(name, cwd) {
  const child = spawn('npm run dev', { cwd, shell: true, env: process.env });
  const prefix = `${colors[name]}[${name}]${reset} `;
  const pipe = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (stopping) return;
    console.error(`${prefix}arrêté (code ${code}). Arrêt de l'autre processus.`);
    stopAll(code ?? 1);
  });
  children.push(child);
}

function stopAll(code = 0) {
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log('API  : http://localhost:10000/api/health');
console.log('Site : http://localhost:3000\n');
run('api', serverDir);
run('site', siteDir);
