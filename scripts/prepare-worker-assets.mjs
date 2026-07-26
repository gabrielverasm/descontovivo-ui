import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const browserDir = join(root, 'dist/descontovivo-ui/browser');
const workerDir = join(root, 'dist/descontovivo-ui/worker-assets');
const csrShellPath = join(browserDir, 'index.csr.html');
const redirectsPath = join(browserDir, '_redirects');
const routesPath = join(browserDir, '_routes.json');
const functionsDir = join(root, 'functions');
const functionPath = join(functionsDir, '[[path]].ts');
const handlerPath = join(root, 'src/pages-functions/csr-route-handler.ts');
const expectedFunctionRoutes = [
  '/login',
  '/login/*',
  '/cadastro',
  '/cadastro/*',
  '/publicar',
  '/publicar/*',
  '/minha-conta',
  '/minha-conta/*',
  '/erro',
  '/erro/*',
  '/promocoes',
  '/admin',
  '/admin/*',
  '/moderacao',
  '/moderacao/*',
  '/callback',
  '/callback/*',
  '/silent-renew',
  '/silent-renew/*',
];

if (!existsSync(browserDir)) {
  console.error('Erro: output do browser não encontrado.');
  process.exit(1);
}

if (!existsSync(csrShellPath)) {
  console.error(`Erro: shell CSR não encontrado em ${csrShellPath}.`);
  process.exit(1);
}

if (!existsSync(routesPath)) {
  console.error(`Erro: configuração de rotas das Pages Functions não encontrada em ${routesPath}.`);
  process.exit(1);
}

const routesConfig = JSON.parse(readFileSync(routesPath, 'utf-8'));
if (
  routesConfig.version !== 1 ||
  JSON.stringify(routesConfig.include) !== JSON.stringify(expectedFunctionRoutes) ||
  !Array.isArray(routesConfig.exclude) ||
  routesConfig.exclude.length !== 0
) {
  console.error('Erro: _routes.json não limita as invocações exatamente às rotas CSR esperadas.');
  process.exit(1);
}

if (!existsSync(redirectsPath)) {
  console.error(`Erro: arquivo de redirects não encontrado em ${redirectsPath}.`);
  process.exit(1);
}

const csrRedirectPattern = /^\/(?:login|cadastro|publicar|minha-conta|erro|promocoes|admin|moderacao|callback|silent-renew)(?:\/.*)?\s+/m;
const redirects = readFileSync(redirectsPath, 'utf-8');
if (csrRedirectPattern.test(redirects)) {
  console.error('Erro: _redirects ainda contém regras CSR que devem ser atendidas pelas Pages Functions.');
  process.exit(1);
}

if (/\/(?:index\.csr(?:\.html)?|__app-shell\/)/.test(redirects)) {
  console.error('Erro: _redirects ainda aponta para um shell CSR interno.');
  process.exit(1);
}

if (!existsSync(functionPath)) {
  console.error(`Erro: Pages Function catch-all não encontrada em ${functionPath}.`);
  process.exit(1);
}

const functionFiles = readdirSync(functionsDir, { recursive: true })
  .filter((path) => path.endsWith('.ts'));
if (functionFiles.length !== 1 || functionFiles[0] !== '[[path]].ts') {
  console.error('Erro: deve existir somente functions/[[path]].ts para o fallback CSR.');
  process.exit(1);
}

const functionSource = readFileSync(functionPath, 'utf-8');
if (!functionSource.includes("import csrHtml from '../dist/descontovivo-ui/browser/index.csr.html';")) {
  console.error('Erro: a Pages Function não importa index.csr.html como text module.');
  process.exit(1);
}

if (/\bASSETS\b|(?:^|[^\w.])fetch\s*\(/m.test(functionSource)) {
  console.error('Erro: a Pages Function não pode usar ASSETS nem fetch().');
  process.exit(1);
}

if (!existsSync(handlerPath)) {
  console.error(`Erro: handler puro das rotas CSR não encontrado em ${handlerPath}.`);
  process.exit(1);
}

const handlerSource = readFileSync(handlerPath, 'utf-8');
if (/\bASSETS\b|(?:^|[^\w.])fetch\s*\(/m.test(handlerSource)) {
  console.error('Erro: o handler CSR não pode usar ASSETS nem fetch().');
  process.exit(1);
}

rmSync(workerDir, { recursive: true, force: true });
mkdirSync(workerDir, { recursive: true });
cpSync(browserDir, workerDir, {
  recursive: true,
  filter: (source) => {
    const relativePath = source.slice(browserDir.length + 1);
    return relativePath !== '_redirects' &&
      relativePath !== '_routes.json' &&
      relativePath !== '.assetsignore';
  },
});

console.log(`Worker assets preparados: ${workerDir}`);
