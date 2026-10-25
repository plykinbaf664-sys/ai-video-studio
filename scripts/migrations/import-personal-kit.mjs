import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, fingerprint } from "../lib/media.mjs";

const directory = path.join(root, "archives/personal-design-kit-v1");
const manifest = JSON.parse(await readFile(path.join(directory, "FILE_MANIFEST.json"), "utf8"));
const files = [];
const walk = async (base, prefix = "") => {
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("Linked kit entry is not allowed");
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await walk(path.join(base, entry.name), relative + "/");
    else files.push(relative);
  }
};
await walk(directory);
for (const item of manifest.files) {
  const file = path.resolve(directory, item.path);
  if (!file.startsWith(directory + path.sep)) throw new Error("Unsafe manifest path");
  if (await fingerprint(file) !== item.sha256 || (await lstat(file)).size !== item.bytes) throw new Error(`Kit manifest mismatch: ${item.path}`);
}
const destinationFor = relative => {
  if (relative.startsWith("src/design/")) return relative.replace("src/design/", "src/design/personal/");
  if (relative.startsWith("style-presets/")) return relative.replace("style-presets/", "style-presets/personal/");
  if (relative === "FILE_MANIFEST.json") return "docs/design-kit/FILE_MANIFEST.original.json";
  if (relative === "design-kit-three-styles-overview.png") return "docs/design-kit/overview.png";
  return relative;
};
const mapping = [];
// Preflight every collision before copying anything.
for (const relative of files) {
  const destination = destinationFor(relative);
  const output = path.resolve(root, destination);
  if (!output.startsWith(root) || ["AGENTS.md", "src/index.ts", "src/Root.tsx", "package.json"].includes(destination)) throw new Error(`Protected target: ${destination}`);
  let existing = false;
  try { await lstat(output); existing = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
  const hash = await fingerprint(path.join(directory, relative));
  if (existing && await fingerprint(output) !== hash) throw new Error(`Destination already has different content: ${destination}`);
  mapping.push({ from: relative, to: destination, sha256: hash, manifestListed: manifest.files.some(item => item.path === relative), copied: !existing });
}
for (const item of mapping) {
  if (!item.copied) continue;
  await mkdir(path.dirname(path.join(root, item.to)), { recursive: true });
  await copyFile(path.join(directory, item.from), path.join(root, item.to), constants.COPYFILE_EXCL);
}
await mkdir(path.join(root, "artifacts/design-kit"), { recursive: true });
await writeFile(path.join(root, "artifacts/design-kit/import.json"), JSON.stringify({ checkedAt: new Date().toISOString(), sourceKit: directory, originalKitRetained: true, manifestFilesVerified: manifest.files.length, mapping }, null, 2) + "\n");
console.log(JSON.stringify({ verifiedManifestFiles: manifest.files.length, copied: mapping.filter(item => item.copied).length, unmappedByOriginalManifest: mapping.filter(item => !item.manifestListed).map(item => item.from), preserved: ["AGENTS.md", "src/index.ts", "src/Root.tsx", "package.json", "src/design/EditorialText.tsx"], report: "artifacts/design-kit/import.json" }, null, 2));
