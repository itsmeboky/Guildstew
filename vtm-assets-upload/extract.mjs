// One-shot extractor — pulls the inline base64 JPEGs out of the
// vtm-character-creator-v6.jsx prototype and writes them to disk
// under vtm-assets-upload/ ready for upload into Supabase storage
// at campaign-assets/VTM/{clans,memory-photos,maps,UI}/.
//
// Re-running is idempotent (file contents are deterministic).
// Not committed long-term — delete this directory after the upload
// step is complete.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOTYPE = process.argv[2];
if (!PROTOTYPE) {
  console.error('Usage: node extract.mjs <path-to-prototype.jsx>');
  process.exit(1);
}

const src = readFileSync(PROTOTYPE, 'utf8');

// Pull the body of a `const NAME = { ... };` or `const NAME = [ ... ];`
// up to the first matching closing brace+semicolon. The base64 strings
// don't contain `}` or `];` so this scan is safe.
function extractBlock(name, open, close) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*\\${open}`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`Constant ${name} not found`);
  const start = m.index + m[0].length;
  // Look for the matching closing-bracket-then-semicolon. Won't be
  // inside a string literal because base64 doesn't contain `;`.
  const endRe = new RegExp(`\\${close}\\s*;`, 'g');
  endRe.lastIndex = start;
  const e = endRe.exec(src);
  if (!e) throw new Error(`End of ${name} not found`);
  return src.slice(start, e.index);
}

function extractAssignment(name) {
  // For `const NAME = 'data:image/...;base64,...';`
  const re = new RegExp(`const\\s+${name}\\s*=\\s*'([^']*)'`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`Constant ${name} not found`);
  return m[1];
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('Not a data URL');
  return { ext: match[1] === 'jpg' ? 'jpeg' : match[1], buf: Buffer.from(match[2], 'base64') };
}

function writeAsset(relPath, dataUrl) {
  const { buf } = dataUrlToBuffer(dataUrl);
  const out = resolve(HERE, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  return { out, bytes: buf.length };
}

// ===== CLAN_PORTRAITS =====
{
  const body = extractBlock('CLAN_PORTRAITS', '{', '}');
  // Parse each key: 'data:...'
  const entryRe = /(\w+):\s*'(data:image\/[^']+)'/g;
  let m;
  while ((m = entryRe.exec(body))) {
    const [, key, dataUrl] = m;
    const { out, bytes } = writeAsset(`campaign-assets/VTM/clans/${key}.jpg`, dataUrl);
    console.log(`clans/${key}.jpg — ${bytes} bytes — ${out}`);
  }
}

// ===== MEMORY_PHOTOS (array of 7) =====
{
  const body = extractBlock('MEMORY_PHOTOS', '[', ']');
  const entries = [...body.matchAll(/'(data:image\/[^']+)'/g)];
  entries.forEach(([, dataUrl], i) => {
    const { out, bytes } = writeAsset(`campaign-assets/VTM/memory-photos/photo${i + 1}.jpg`, dataUrl);
    console.log(`memory-photos/photo${i + 1}.jpg — ${bytes} bytes — ${out}`);
  });
}

// ===== HUNT_MAP =====
{
  const dataUrl = extractAssignment('HUNT_MAP');
  const { out, bytes } = writeAsset('campaign-assets/VTM/maps/manhattan-hunt-map.jpg', dataUrl);
  console.log(`maps/manhattan-hunt-map.jpg — ${bytes} bytes — ${out}`);
}

// ===== ANATOMY_FIGURE =====
{
  const dataUrl = extractAssignment('ANATOMY_FIGURE');
  const { out, bytes } = writeAsset('campaign-assets/VTM/UI/anatomy-figure.jpg', dataUrl);
  console.log(`UI/anatomy-figure.jpg — ${bytes} bytes — ${out}`);
}

// ===== GRIMOIRES =====
{
  const body = extractBlock('GRIMOIRES', '{', '}');
  const entryRe = /(\w+):\s*'(data:image\/[^']+)'/g;
  let m;
  while ((m = entryRe.exec(body))) {
    const [, key, dataUrl] = m;
    const slug = key.toLowerCase();
    const { out, bytes } = writeAsset(`campaign-assets/VTM/UI/grimoire-${slug}.jpg`, dataUrl);
    console.log(`UI/grimoire-${slug}.jpg — ${bytes} bytes — ${out}`);
  }
}

console.log('\nDone. Upload each file to its matching path under Supabase bucket `campaign-assets`.');
