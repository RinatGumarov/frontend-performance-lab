import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = join(repositoryRoot, 'packages', 'render-observer');

function withoutPackageManagerConfig(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => !name.toLowerCase().startsWith('npm_config_'),
    ),
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: options.env ?? process.env,
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

async function assertReleaseMetadata() {
  const packageJson = JSON.parse(
    await readFile(join(packageDirectory, 'package.json'), 'utf8'),
  );

  if (
    packageJson.repository?.url !==
    'https://github.com/RinatGumarov/frontend-performance-lab'
  ) {
    throw new Error('Package repository URL must match the canonical GitHub URL');
  }
  if (packageJson.peerDependencies?.react !== '>=18 <20') {
    throw new Error('React peer range changed unexpectedly');
  }
  if (packageJson.peerDependenciesMeta?.react?.optional !== true) {
    throw new Error('React must be marked as an optional peer dependency');
  }
}

async function writeCoreConsumer(consumerDirectory, tarballPath) {
  const packageJson = {
    name: 'render-observer-core-consumer-check',
    private: true,
    type: 'module',
    dependencies: {
      '@riguran/render-observer': `file:${tarballPath}`,
      typescript: '~6.0.2',
    },
  };
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      noEmit: true,
    },
    include: ['index.ts'],
  };
  const source = `import { createRenderObserver } from '@riguran/render-observer';

const observer = createRenderObserver({ mode: 'core-only' });
observer.markRender('consumer');
if (observer.getSnapshot().renders.consumer !== 1) {
  throw new Error('Core observer did not record the consumer render');
}
`;

  await Promise.all([
    writeFile(
      join(consumerDirectory, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    ),
    writeFile(
      join(consumerDirectory, 'tsconfig.json'),
      `${JSON.stringify(tsconfig, null, 2)}\n`,
    ),
    writeFile(join(consumerDirectory, 'index.ts'), source),
  ]);
}

async function writeReactConsumer(consumerDirectory, tarballPath) {
  const examplesDirectory = join(consumerDirectory, 'examples');
  await mkdir(examplesDirectory, { recursive: true });

  const packageJson = {
    name: 'render-observer-react-consumer-check',
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
  await assertReleaseMetadata();
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

  const coreConsumerDirectory = join(temporaryDirectory, 'core-consumer');
  await mkdir(coreConsumerDirectory, { recursive: true });
  await writeCoreConsumer(coreConsumerDirectory, tarballPath);
  const npmEnvironment = withoutPackageManagerConfig(process.env);
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    {
      cwd: coreConsumerDirectory,
      env: npmEnvironment,
    },
  );
  run(
    'node',
    [
      '--input-type=module',
      '--eval',
      `const { createRenderObserver } = await import('@riguran/render-observer');
       const observer = createRenderObserver({ mode: 'core-only' });
       observer.markRender('consumer');
       if (observer.getSnapshot().renders.consumer !== 1) process.exit(1);`,
    ],
    { cwd: coreConsumerDirectory },
  );
  run(
    'node',
    [
      '--input-type=module',
      '--eval',
      `try {
         await import('react');
         process.exit(1);
       } catch (error) {
         if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
       }`,
    ],
    { cwd: coreConsumerDirectory },
  );
  run('npm', ['exec', '--', 'tsc', '--noEmit'], {
    cwd: coreConsumerDirectory,
    env: npmEnvironment,
  });

  const reactConsumerDirectory = join(temporaryDirectory, 'react-consumer');
  await mkdir(reactConsumerDirectory, { recursive: true });
  const exampleCount = await writeReactConsumer(
    reactConsumerDirectory,
    tarballPath,
  );
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
    {
      cwd: reactConsumerDirectory,
      env: npmEnvironment,
    },
  );
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
    { cwd: reactConsumerDirectory },
  );
  run('npm', ['exec', '--', 'tsc', '--noEmit'], {
    cwd: reactConsumerDirectory,
    env: npmEnvironment,
  });

  console.log(`Verified ${metadata.name}@${metadata.version}`);
  console.log(`Packed files: ${metadata.files.length}`);
  console.log('Verified framework-free core consumer without React');
  console.log(`Compiled README examples: ${exampleCount}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
