import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const browserDir = join(root, 'dist/descontovivo-ui/browser');
const workerDir = join(root, 'dist/descontovivo-ui/worker-assets');

if (!existsSync(browserDir)) {
  console.error('Erro: output do browser não encontrado.');
  process.exit(1);
}

mkdirSync(workerDir, { recursive: true });
cpSync(browserDir, workerDir, {
  recursive: true,
  filter: (source) => {
    const relativePath = source.slice(browserDir.length + 1);
    return relativePath !== '_redirects' &&
      relativePath !== '.assetsignore' &&
      relativePath !== '__app-shell' &&
      !relativePath.startsWith('__app-shell/');
  },
});

console.log(`Worker assets preparados: ${workerDir}`);
