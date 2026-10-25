import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, fingerprint } from "../lib/media.mjs";

const fonts = [
  { id: "personal-onest", family: "Onest", file: "Onest-Variable.ttf", directory: "Onest", fontUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/onest/Onest%5Bwght%5D.ttf", licenseUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/onest/OFL.txt" },
  { id: "personal-inter", family: "Inter", file: "InterVariable.ttf", directory: "Inter", fontUrl: "https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.ttf", licenseUrl: "https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt" },
];
const fetchMissing = async (url, file) => {
  try { return await readFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(file, bytes, { flag: "wx" });
  return bytes;
};
const hasGlyph = (font, code) => {
  let cmap;
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const offset = 12 + i * 16;
    if (font.toString("ascii", offset, offset + 4) === "cmap") cmap = font.readUInt32BE(offset + 8);
  }
  if (cmap === undefined) throw new Error("No TTF cmap");
  for (let table = 0; table < font.readUInt16BE(cmap + 2); table++) {
    const record = cmap + 4 + table * 8;
    const offset = cmap + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(offset);
    if (format === 12) {
      for (let group = 0; group < font.readUInt32BE(offset + 12); group++) {
        const at = offset + 16 + group * 12;
        if (code >= font.readUInt32BE(at) && code <= font.readUInt32BE(at + 4)) return true;
      }
    }
    if (format === 4) {
      const count = font.readUInt16BE(offset + 6) / 2;
      const endBase = offset + 14;
      const startBase = endBase + count * 2 + 2;
      const deltaBase = startBase + count * 2;
      const rangeBase = deltaBase + count * 2;
      for (let segment = 0; segment < count; segment++) {
        const start = font.readUInt16BE(startBase + segment * 2);
        const end = font.readUInt16BE(endBase + segment * 2);
        if (code < start || code > end) continue;
        const range = font.readUInt16BE(rangeBase + segment * 2);
        let glyph = range ? font.readUInt16BE(rangeBase + segment * 2 + range + (code - start) * 2) : code;
        if (!range || glyph) glyph = (glyph + font.readInt16BE(deltaBase + segment * 2)) & 65535;
        if (glyph) return true;
      }
    }
  }
  return false;
};
const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789";
const report = [];
for (const font of fonts) {
  const directory = path.join(root, "assets/library/fonts", font.directory);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, font.file);
  const bytes = await fetchMissing(font.fontUrl, file);
  const licenseFile = path.join(directory, "OFL.txt");
  const license = await fetchMissing(font.licenseUrl, licenseFile);
  if (!/SIL OPEN FONT LICENSE/i.test(license.toString("utf8"))) throw new Error(`Missing OFL text: ${font.family}`);
  const missingGlyphs = [...alphabet].filter(char => !hasGlyph(bytes, char.codePointAt(0)));
  if (missingGlyphs.length) throw new Error(`Missing Cyrillic/digit glyphs: ${font.family}: ${missingGlyphs.join("")}`);
  report.push({ ...font, path: path.relative(root, file).split(path.sep).join("/"), licenseFile: path.relative(root, licenseFile).split(path.sep).join("/"), sha256: await fingerprint(file), licenseSha256: await fingerprint(licenseFile), bytes: bytes.length, checkedGlyphs: alphabet.length, missingGlyphs });
  const output = path.join(root, "public/design-kit/fonts", font.file);
  await mkdir(path.dirname(output), { recursive: true });
  await copyFile(file, output);
  await copyFile(licenseFile, path.join(path.dirname(output), `${font.family}-OFL.txt`));
}
await mkdir(path.join(root, "artifacts/design-kit"), { recursive: true });
await writeFile(path.join(root, "artifacts/design-kit/fonts.json"), JSON.stringify({ checkedAt: new Date().toISOString(), fonts: report }, null, 2) + "\n");
console.log(JSON.stringify(report.map(font => ({ family: font.family, bytes: font.bytes, cyrillic: "verified", sha256: font.sha256 })), null, 2));
