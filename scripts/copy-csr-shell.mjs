import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const candidates = [
  join(root, 'dist/descontovivo-ui/browser'),
  join(root, 'dist/descontovivo-ui'),
];

const outDir = candidates.find((dir) => existsSync(join(dir, 'index.csr.html')));

if (!outDir) {
  console.error('Erro: index.csr.html não encontrado no output do build.');
  process.exit(1);
}

const source = join(outDir, 'index.csr.html');
const targets = [
  join(outDir, '__app-shell/index.html'),
  join(outDir, '404.html'),
];
const shell = readFileSync(source, 'utf8');

if (!shell.includes('<app-root></app-root>')) {
  console.error('Erro: index.csr.html não contém o shell CSR neutro esperado.');
  process.exit(1);
}

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`CSR shell copiado: ${source} -> ${target}`);
}
