import { mkdir, open, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { root, fingerprint } from "./media.mjs";
import { validateDesignLibrary } from "./design-library.mjs";

const fail = message => { throw new Error(`Design import: ${message}`); };

// Explicit import only: no folder scan, downloads, file moves, approvals or rendering.
export const registerDesignItem = async (kind, options, projectRoot = root) => {
  if (!["asset", "brandbook", "reference"].includes(kind)) fail("expected asset, brandbook or reference");
  const permittedOptions = new Set(["id", "dry-run", ...{
    asset: ["file", "kind", "license-file", "license-label", "source"],
    brandbook: ["name", "file", "url"],
    reference: ["title", "file", "url", "usage", "rights-evidence", "start", "end", "axis", "technique"],
  }[kind]]);
  if (Object.keys(options).some(key => !permittedOptions.has(key))) fail(`unsupported option for ${kind}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.id ?? "")) fail("id must contain lowercase Latin letters, digits and hyphens");
  const directory = { asset: "assets", brandbook: "brandbooks", reference: "reference-library" }[kind];
  const base = await realpath(projectRoot);
  const filePath = async value => {
    if (!value) fail("file is required");
    const absolute = path.resolve(base, value);
    const actual = await realpath(absolute);
    if (!actual.startsWith(path.join(base, directory) + path.sep)) fail(`file must be inside ${directory}/ and cannot link outside it`);
    const info = await stat(actual);
    if (!info.isFile() || !info.size) fail("file must exist and be nonempty");
    return path.relative(base, actual).split(path.sep).join("/");
  };
  const provenance = async () => {
    if (Boolean(options.file) === Boolean(options.url)) fail("provide exactly one of --file or --url");
    if (options.url) {
      const url = new URL(options.url);
      if (url.protocol !== "https:") fail("reference URL must use https");
      return { url: url.href };
    }
    const file = await filePath(options.file);
    return { file, sha256: await fingerprint(path.join(base, file)) };
  };
  let item;
  if (kind === "asset") {
    if (!options["license-file"] || !options["license-label"] || !options.source) fail("asset needs --license-file, --license-label and --source");
    const file = await filePath(options.file);
    const extension = path.extname(file).toLowerCase();
    const inferred = /\.(ttf|otf|woff2)$/.test(extension) ? "font" : /\.(png|jpg|jpeg|webp|svg)$/.test(extension) ? "graphic" : /\.(wav|mp3|m4a|ogg|flac)$/.test(extension) ? "audio" : /\.(mp4|mov|webm)$/.test(extension) ? "video" : null;
    const assetKind = options.kind ?? inferred;
    if (!assetKind) fail("unknown file extension; specify --kind font|graphic|audio|video");
    item = { id: options.id, kind: assetKind, path: file, sha256: await fingerprint(path.join(base, file)), usage: "candidate", license: { label: options["license-label"], file: await filePath(options["license-file"]), source: options.source } };
    if (assetKind === "font") {
      if (!/\.(ttf|otf|woff2)$/.test(extension)) fail("font must be .ttf, .otf or .woff2");
      item.runtimeFile = `generated/assets/fonts/${options.id}${extension}`;
    }
  } else if (kind === "brandbook") {
    if (!options.name) fail("brandbook needs --name");
    item = { id: options.id, name: options.name, approvalStatus: "draft", source: await provenance(), fontAssetIds: [], palette: [], restrictions: [] };
  } else {
    if (!options.title) fail("reference needs --title");
    const beats = [];
    if ([options.start, options.end, options.axis, options.technique].some(value => value !== undefined)) {
      if ([options.start, options.end, options.axis, options.technique].some(value => value === undefined)) fail("beat needs --start, --end, --axis and --technique together; times are seconds of the reference");
      const startMs = Math.round(Number(options.start) * 1000);
      const endMs = Math.round(Number(options.end) * 1000);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) fail("invalid reference start/end seconds");
      beats.push({ startMs, endMs, axis: options.axis, technique: options.technique });
    }
    item = { id: options.id, title: options.title, approvalStatus: "draft", source: await provenance(), usage: options.usage ?? "reference-only", rightsEvidence: options["rights-evidence"] ?? null, beats };
  }
  const catalogFile = path.join(base, directory, "catalog.json");
  let lock;
  let pending;
  let pendingCreated = false;
  const lockFile = path.join(base, directory, ".catalog.json.lock");
  if (!options["dry-run"]) lock = await open(lockFile, "wx");
  try {
  const previousText = await readFile(catalogFile, "utf8");
  const catalog = JSON.parse(previousText);
  if (catalog.items.some(existing => existing.id === item.id)) fail(`id already exists: ${item.id}; no files overwritten`);
  catalog.items.push(item);
  await validateDesignLibrary(base, { [directory]: catalog });
  if (!options["dry-run"]) {
    if (await readFile(catalogFile, "utf8") !== previousText) fail("catalog changed during validation; retry without overwriting it");
    const history = path.join(base, "artifacts/design/import-history");
    await mkdir(history, { recursive: true });
    const token = randomUUID();
    await writeFile(path.join(history, `${token}-${kind}-before.json`), previousText, { flag: "wx" });
    pending = path.join(base, directory, `.catalog-${token}.pending`);
    await writeFile(pending, JSON.stringify(catalog, null, 2) + "\n", { flag: "wx" });
    pendingCreated = true;
    await rename(pending, catalogFile);
    pending = undefined;
  }
  return { status: options["dry-run"] ? "validated-dry-run" : "registered", catalog: `${directory}/catalog.json`, item, note: "Draft/candidate only. No source files moved, downloaded, approved or applied to a style." };
  } finally {
    try { if (pending && pendingCreated) await unlink(pending); }
    finally { if (lock) { await lock.close(); await unlink(lockFile); } }
  }
};
