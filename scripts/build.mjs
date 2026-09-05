import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const native = process.argv.includes('--native');
const output = resolve(root, native ? 'www' : 'dist');
const dirs = ['app', 'auth', 'calc', 'font', 'lib', 'res', 'theme'];
const pages = (await readdir(root)).filter(name => name.endsWith('.html'));
const files = [...pages, 'manifest.json', 'db.txt', 'LICENSE', 'sw.js'];
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(resolve(root, dir), { withFileTypes: true })) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/.test(path) && path !== 'app/precache.js') result.push(path);
  }
  return result;
}
for (const dir of dirs) files.push(...await walk(dir));
const publicFiles = files.sort();
// Only public, immutable shell assets are precached. Account HTML is network-only.
const precache = publicFiles.filter(path => !path.endsWith('.html') || ['index.html', 'offline.html'].includes(path))
  .filter(path => !['sw.js', 'LICENSE'].includes(path));
const hash = createHash('sha256');
for (const path of publicFiles) { hash.update(path); hash.update(await readFile(resolve(root, path))); }
const cacheScript = 'self.CYPHERS_PRECACHE = ' + JSON.stringify({ version: hash.digest('hex').slice(0, 20), files: precache }, null, 2) + ';\n';
await writeFile(resolve(root, 'app/precache.js'), cacheScript);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of [...publicFiles, 'app/precache.js']) {
  const target = resolve(output, path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await cp(resolve(root, path), target);
}
await writeFile(resolve(output, '.nojekyll'), '');
if (native) {
  await build({ entryPoints: [resolve(root, 'app/native.mjs')], outfile: resolve(output, 'app/native.js'), bundle: true, format: 'iife', target: ['safari15', 'chrome100'], minify: true });
  for (const page of pages) {
    const target = resolve(output, page);
    let html = await readFile(target, 'utf8');
    // Synchronous bootstrap must precede auth scripts on every page.
    html = html.includes('<script')
      ? html.replace('<script', '<script src="app/native.js"></script>\n<script')
      : html.replace('</head>', '<script src="app/native.js"></script>\n</head>');
    await writeFile(target, html);
  }
  await rm(resolve(output, 'sw.js'));
  await rm(resolve(output, 'app/precache.js'));
}
console.log(`Built ${native ? 'bundled mobile app' : 'web app'}: ${output}`);
