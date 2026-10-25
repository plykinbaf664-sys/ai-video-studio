/** Verify the untouched import and actual active libraries; never use demo captions. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root, fingerprint} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
const archive = path.join(root, 'archives/personal-design-kit-v1');
const manifest = JSON.parse(await readFile(path.join(archive, 'FILE_MANIFEST.json'), 'utf8'));
for (const item of manifest.files) {
  const file = path.resolve(archive, item.path);
  if (!file.startsWith(archive + path.sep)) throw new Error('Unsafe import manifest path');
  if (await fingerprint(file) !== item.sha256) throw new Error(`Original kit changed: ${item.path}`);
}
const library = await validateDesignLibrary();
const report = {at:new Date().toISOString(), status:'passed', originalManifestFiles:manifest.files.length, ...library.summary, videoReferences:library.references.filter(x=>x.source.file?.toLowerCase().endsWith('.mp4')).length, musicAssets:library.assets.filter(x=>x.id.startsWith('music-')).length, limitation:'File/dependency integrity only. Actual rendered media checks are in artifacts/reference-edit/. No demo captions are executed.'};
await mkdir('artifacts/project-audit', {recursive:true});
await writeFile('artifacts/project-audit/design-kit.validation.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
