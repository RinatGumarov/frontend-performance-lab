import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = join(repositoryRoot, 'packages', 'render-observer');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: process.env,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }

  return result.stdout ?? '';
}

function readPackMetadata(output) {
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

function normalizeFilePath(file) {
  const path = typeof file === 'string' ? file : file.path;
  return path.replace(/^package\//, '');
}

function assertPackageContents(files) {
  const normalized = files.map(normalizeFilePath);
  const forbidden = normalized.filter((path) =>
    /(^|\/)(src|test|tests|coverage)(\/|$)|(^|\/)\.env|pnpm-(lock|workspace)/.test(
      path,
    ),
  );
  const unexpected = normalized.filter(
    (path) =>
      path !== 'package.json' &&
      path !== 'README.md' &&
      path !== 'LICENSE' &&
      !path.startsWith('dist/'),
  );
  const required = [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/react.js',
    'dist/react.d.ts',
  ];
  const missing = required.filter((path) => !normalized.includes(path));

  if (forbidden.length > 0) {
    throw new Error(`Packed forbidden files: ${forbidden.join(', ')}`);
  }
  if (unexpected.length > 0) {
    throw new Error(`Packed unexpected files: ${unexpected.join(', ')}`);
  }
  if (missing.length > 0) {
    throw new Error(`Packed output is missing: ${missing.join(', ')}`);
  }
}

async function writeConsumer(consumerDirectory, tarballPath) {
  const examplesDirectory = join(consumerDirectory, 'examples');
  await mkdir(examplesDirectory, { recursive: true });

  const packageJson = {
    name: 'render-observer-consumer-check',
    private: true,
    type: 'module',
    dependencies: {
      '@riguran/render-observer': `file:${tarballPath}`,
      '@types/react': '^19.2.17',
      react: '19.2.8',
      typescript: '~6.0.2',
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ['examples/**/*'],
  };
  const readme = await readFile(join(packageDirectory, 'README.md'), 'utf8');
  const examples = [...readme.matchAll(/^```(ts|tsx)\n([\s\S]*?)^```$/gm)];
  if (examples.length === 0) {
    throw new Error('Package README contains no TypeScript examples');
  }

  await Promise.all([
    writeFile(
      join(consumerDirectory, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    ),
    writeFile(
      join(consumerDirectory, 'tsconfig.json'),
      `${JSON.stringify(tsconfig, null, 2)}\n`,
    ),
    ...examples.map((example, index) =>
      writeFile(
        join(examplesDirectory, `example-${index + 1}.${example[1]}`),
        example[2],
      ),
    ),
  ]);

  return examples.length;
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'render-observer-'));

try {
  run('pnpm', ['build'], { cwd: packageDirectory });

  const packOutput = run(
    'pnpm',
    ['pack', '--json', '--pack-destination', temporaryDirectory],
    { cwd: packageDirectory, capture: true },
  );
  const metadata = readPackMetadata(packOutput);
  const tarballPath = resolve(temporaryDirectory, metadata.filename);

  assertPackageContents(metadata.files);
  await readFile(tarballPath);

  const consumerDirectory = join(temporaryDirectory, 'consumer');
  const exampleCount = await writeConsumer(consumerDirectory, tarballPath);
  run('pnpm', ['install', '--ignore-workspace'], { cwd: consumerDirectory });
  run(
    'node',
    [
      '--input-type=module',
      '--eval',
      `const core = await import('@riguran/render-observer');
       const react = await import('@riguran/render-observer/react');
       if (typeof core.createRenderObserver !== 'function' ||
           typeof react.useRenderSnapshot !== 'function') process.exit(1);`,
    ],
    { cwd: consumerDirectory },
  );
  run('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: consumerDirectory });

  console.log(`Verified ${metadata.name}@${metadata.version}`);
  console.log(`Packed files: ${metadata.files.length}`);
  console.log(`Compiled README examples: ${exampleCount}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
