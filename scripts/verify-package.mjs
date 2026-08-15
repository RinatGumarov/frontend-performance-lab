// Packs @riguran/render-observer and installs the tarball into throwaway
// consumer projects: once without React, to confirm the core entry point does
// not need it, and once with React, to confirm the subpath and its types
// resolve. Runs before publishing, not on every CI push.
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = join(repositoryRoot, 'packages', 'render-observer');

const EXPECTED_FILES = [
  'package.json',
  'README.md',
  'LICENSE',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/react.js',
  'dist/react.d.ts',
];

// pnpm exports npm_config_* into the environment; npm in the consumer project
// would inherit the workspace store and stop behaving like a clean install.
const cleanEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) => !name.toLowerCase().startsWith('npm_config_'),
  ),
);

function run(command, args, { cwd = repositoryRoot, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: cleanEnvironment,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }

  return result.stdout ?? '';
}

function assertPackageContents(files) {
  const packed = files.map((file) =>
    (typeof file === 'string' ? file : file.path).replace(/^package\//, ''),
  );
  const missing = EXPECTED_FILES.filter((path) => !packed.includes(path));
  const unexpected = packed.filter(
    (path) => !EXPECTED_FILES.includes(path) && !path.startsWith('dist/'),
  );

  if (missing.length > 0) {
    throw new Error(`Tarball is missing: ${missing.join(', ')}`);
  }
  if (unexpected.length > 0) {
    throw new Error(`Tarball contains unexpected files: ${unexpected.join(', ')}`);
  }
}

async function createConsumer(directory, dependencies, entry, source) {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, 'package.json'),
      `${JSON.stringify({ name: 'consumer-check', private: true, type: 'module', dependencies }, null, 2)}\n`,
    ),
    writeFile(
      join(directory, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022', 'DOM'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
          },
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(join(directory, entry), source),
  ]);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: directory,
  });
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'render-observer-'));

try {
  run('pnpm', ['build'], { cwd: packageDirectory });

  const packed = JSON.parse(
    run('pnpm', ['pack', '--json', '--pack-destination', temporaryDirectory], {
      cwd: packageDirectory,
      capture: true,
    }),
  );
  const metadata = Array.isArray(packed) ? packed[0] : packed;
  const tarball = `file:${resolve(temporaryDirectory, metadata.filename)}`;
  assertPackageContents(metadata.files);

  const core = join(temporaryDirectory, 'core-consumer');
  await createConsumer(
    core,
    { '@riguran/render-observer': tarball, typescript: '~6.0.2' },
    'index.ts',
    `import { createRenderObserver } from '@riguran/render-observer';

const observer = createRenderObserver({ mode: 'core-only' });
observer.markRender('consumer');
if (observer.getSnapshot().renders.consumer !== 1) {
  throw new Error('Core observer did not record the consumer render');
}
`,
  );
  run('node', ['index.ts'], { cwd: core });
  run('node', [
    '--input-type=module',
    '--eval',
    `try {
       await import('react');
       process.exit(1);
     } catch (error) {
       if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
     }`,
  ], { cwd: core });
  run('npm', ['exec', '--', 'tsc', '--noEmit'], { cwd: core });

  const withReact = join(temporaryDirectory, 'react-consumer');
  await createConsumer(
    withReact,
    {
      '@riguran/render-observer': tarball,
      '@types/react': '^19.2.17',
      react: '19.2.8',
      typescript: '~6.0.2',
    },
    'index.tsx',
    `import { createRenderObserver } from '@riguran/render-observer';
import { RenderProfiler, useRenderSnapshot } from '@riguran/render-observer/react';

const observer = createRenderObserver();

export function Evidence() {
  const snapshot = useRenderSnapshot(observer);

  return (
    <RenderProfiler id="dashboard" observer={observer}>
      <output>{snapshot.renders.dashboard ?? 0}</output>
    </RenderProfiler>
  );
}
`,
  );
  run('npm', ['exec', '--', 'tsc', '--noEmit'], { cwd: withReact });

  console.log(`Verified ${metadata.name}@${metadata.version}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
