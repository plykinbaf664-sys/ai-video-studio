/** Compatibility utility. assets/catalog.json is the only asset registry. */
import {copyFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
const library = await validateDesignLibrary();
const originals = library.assets.filter(a => /^assets\/library\/(sfx|graphics)\/[a-z0-9-]+\.(wav|svg)$/.test(a.path) && a.license.source.includes('original'));
for (const asset of originals) {
  const target = path.join(root, 'public/design-kit', asset.path.replace('assets/library/', ''));
  await mkdir(path.dirname(target), {recursive:true});
  await copyFile(path.join(root, asset.path), target);
}
console.log(`Synced ${originals.length} verified project-owned SVG/WAV assets. Current scenes and music are prepared by npm run prepare:edit.`);
