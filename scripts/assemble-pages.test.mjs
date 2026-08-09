import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assemblePages } from './assemble-pages.mjs';

async function createInput(root) {
  const app = join(root, 'apps/lab/dist');
  const storybook = join(root, 'apps/lab/storybook-static');
  await Promise.all([
    mkdir(join(app, 'assets'), { recursive: true }),
    mkdir(storybook, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(app, 'index.html'), '<main>lab</main>'),
    writeFile(join(app, 'assets/app.js'), 'export {};'),
    writeFile(join(storybook, 'index.html'), '<main>storybook</main>'),
  ]);
}

test('assembles the app and Storybook while replacing only dist-pages', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'pages-assembly-'));
  context.after(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(root, { recursive: true, force: true });
  });
  await createInput(root);
  await mkdir(join(root, 'dist-pages'), { recursive: true });
  await writeFile(join(root, 'dist-pages/stale.txt'), 'stale');

  await assemblePages(root);

  assert.equal(
    await readFile(join(root, 'dist-pages/index.html'), 'utf8'),
    '<main>lab</main>',
  );
  assert.equal(
    await readFile(join(root, 'dist-pages/storybook/index.html'), 'utf8'),
    '<main>storybook</main>',
  );
  await assert.rejects(access(join(root, 'dist-pages/stale.txt')));
});

test('keeps an existing artifact when a required input is missing', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'pages-assembly-'));
  context.after(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, 'apps/lab/dist'), { recursive: true });
  await writeFile(join(root, 'apps/lab/dist/index.html'), '<main>lab</main>');
  await mkdir(join(root, 'dist-pages'), { recursive: true });
  const sentinel = join(root, 'dist-pages/keep.txt');
  await writeFile(sentinel, 'keep');

  await assert.rejects(
    assemblePages(root),
    /missing Storybook entry point/i,
  );
  assert.equal(await readFile(sentinel, 'utf8'), 'keep');
});
