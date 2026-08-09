import { access, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function requireEntryPoint(path, label) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${label} entry point: ${path}`);
  }
}

export async function assemblePages(root = repositoryRoot) {
  const appDirectory = join(root, 'apps', 'lab', 'dist');
  const storybookDirectory = join(root, 'apps', 'lab', 'storybook-static');
  const outputDirectory = join(root, 'dist-pages');
  const storybookOutput = join(outputDirectory, 'storybook');

  await Promise.all([
    requireEntryPoint(join(appDirectory, 'index.html'), 'application'),
    requireEntryPoint(
      join(storybookDirectory, 'index.html'),
      'Storybook',
    ),
  ]);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(appDirectory, outputDirectory, { recursive: true });
  await cp(storybookDirectory, storybookOutput, { recursive: true });

  await Promise.all([
    requireEntryPoint(join(outputDirectory, 'index.html'), 'assembled application'),
    requireEntryPoint(
      join(storybookOutput, 'index.html'),
      'assembled Storybook',
    ),
  ]);

  return outputDirectory;
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    const outputDirectory = await assemblePages();
    console.log(`Assembled GitHub Pages artifact at ${outputDirectory}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
