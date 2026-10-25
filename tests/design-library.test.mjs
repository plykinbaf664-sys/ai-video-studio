import assert from "node:assert/strict";
import { test } from "node:test";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { root } from "../scripts/lib/media.mjs";
import { validateDesignLibrary } from "../scripts/lib/design-library.mjs";
import { assertSupportedStyle } from "../src/styles/contract.ts";
import { baselineStyle } from "../src/styles/baseline.ts";
import { registerDesignItem } from "../scripts/lib/register-design-item.mjs";

const clone = () => structuredClone(baselineStyle);
const save = async (file, data) => writeFile(file, JSON.stringify(data));
const fixture = async (context) => {
  const parent = path.join(root, ".cache/design-tests");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, "catalog-"));
  for (const name of ["contracts", "assets/fonts/manrope", "brandbooks", "reference-library", "style-presets/runtime"])
    await mkdir(path.join(directory, name), { recursive: true });
  for (const name of ["contracts/design-library.schema.json", "assets/catalog.json", "assets/fonts/manrope/Manrope-Variable.ttf", "assets/fonts/manrope/OFL.txt", "brandbooks/catalog.json", "reference-library/catalog.json", "style-presets/runtime/baseline-unbranded.json"])
    await copyFile(path.join(root, name), path.join(directory, name));
  const assets = JSON.parse(await readFile(path.join(directory, "assets/catalog.json"), "utf8"));
  assets.items = assets.items.filter(item => item.id === "baseline-manrope-variable");
  await save(path.join(directory, "assets/catalog.json"), assets);
  for (const catalog of ["brandbooks", "reference-library"]) await save(path.join(directory, catalog, "catalog.json"), {schemaVersion:"1.0.0",items:[]});
  context.after(async () => {
    const actual = await realpath(directory);
    const allowed = await realpath(parent);
    assert.equal(path.dirname(actual), allowed);
    assert.ok(path.basename(actual).startsWith("catalog-"));
    await rm(actual, { recursive: true });
  });
  return directory;
};

test("catalog distinguishes the technical baseline, three personal candidates and twenty unavailable styles", async () => {
  const library = await validateDesignLibrary();
  assert.deepEqual(library.summary, { runnableTechnicalBaselines: 1, approvedStyles: 0, implementedCandidateStyles: 3, draftPresets: 20, checkedAssets: library.assets.length, approvedBrandbooks: 0, approvedReferences: 0 });
  assert.ok(library.assets.length>=12);
  assert.equal(library.styles.filter(item=>item.id.startsWith("personal-")&&item.approvalStatus==="candidate").length,3);
  assert.equal(library.assets[0].id, baselineStyle.design.font.assetId);
});

test("unsupported sound, transitions, reframing and graphic components fail instead of disappearing", () => {
  for (const mutate of [
    style => { style.rules.sound.music = "licensed-bed"; },
    style => { style.rules.transitions.kind = "crossfade"; },
    style => { style.rules.motion.reframe = "purpose-driven"; },
    style => { style.rules.graphics.components.push("data-card"); },
    style => { style.approvalStatus = "approved"; },
    style => { style.design.card.text = "not-a-color"; },
  ]) {
    const style = clone();
    mutate(style);
    assert.throws(() => assertSupportedStyle(style), /Style contract:/);
  }
});

test("style schema rejects silently ignored fields and missing direction axes", async context => {
  const directory = await fixture(context);
  const file = path.join(directory, "style-presets/runtime/baseline-unbranded.json");
  const style = clone();
  style.rules.motion.secretEffect = "glitch";
  await save(file, style);
  await assert.rejects(validateDesignLibrary(directory), /style schema/);
  delete style.rules.motion.secretEffect;
  delete style.rules.sound;
  await save(file, style);
  await assert.rejects(validateDesignLibrary(directory), /style schema/);
});

test("tampered and missing assets, licenses and traversal paths fail", async context => {
  const directory = await fixture(context);
  const file = path.join(directory, "assets/catalog.json");
  const original = JSON.parse(await readFile(file, "utf8"));
  for (const [mutate, expected] of [
    [asset => { asset.sha256 = "0".repeat(64); }, /hash mismatch/],
    [asset => { asset.path = "assets/missing.ttf"; }, /ENOENT/],
    [asset => { asset.license.file = "assets/missing-license.txt"; }, /ENOENT/],
    [asset => { asset.path = "assets/../public/source.mp4"; }, /unsafe/],
  ]) {
    const catalog = structuredClone(original);
    mutate(catalog.items[0]);
    await save(file, catalog);
    await assert.rejects(validateDesignLibrary(directory), expected);
  }
});

test("references and brandbooks must resolve, and reuse requires recorded rights", async context => {
  const directory = await fixture(context);
  const file = path.join(directory, "style-presets/runtime/baseline-unbranded.json");
  const style = clone();
  style.referenceIds = ["missing-reference"];
  await save(file, style);
  await assert.rejects(validateDesignLibrary(directory), /missing reference/);
  style.referenceIds = [];
  style.brandbookId = "missing-brand";
  await save(file, style);
  await assert.rejects(validateDesignLibrary(directory), /missing brandbook/);
  await save(file, clone());
  await save(path.join(directory, "reference-library/catalog.json"), { schemaVersion: "1.0.0", items: [{ id: "sample", title: "Sample", approvalStatus: "draft", source: { url: "https://example.com/sample" }, usage: "licensed-reuse", rightsEvidence: null, beats: [] }] });
  await assert.rejects(validateDesignLibrary(directory), /no rights evidence/);
});

test("asset registration hashes actual files, starts as candidate, and dry-run leaves catalog unchanged", async context => {
  const directory = await fixture(context);
  const catalogFile = path.join(directory, "assets/catalog.json");
  const before = await readFile(catalogFile, "utf8");
  const options = { id: "new-font", file: "assets/fonts/manrope/Manrope-Variable.ttf", "license-file": "assets/fonts/manrope/OFL.txt", "license-label": "SIL OFL", source: "Fixture source" };
  const preview = await registerDesignItem("asset", { ...options, "dry-run": true }, directory);
  assert.equal(preview.status, "validated-dry-run");
  assert.equal(await readFile(catalogFile, "utf8"), before);
  const actual = await registerDesignItem("asset", options, directory);
  assert.equal(actual.item.usage, "candidate");
  assert.equal(actual.item.sha256, JSON.parse(before).items[0].sha256);
  assert.equal(JSON.parse(await readFile(catalogFile, "utf8")).items.length, 2);
  await assert.rejects(registerDesignItem("asset", options, directory), /already exists/);
});

test("brandbook and annotated reference registration preserve source hashes without approving material", async context => {
  const directory = await fixture(context);
  await mkdir(path.join(directory, "brandbooks/media"), { recursive: true });
  await writeFile(path.join(directory, "brandbooks/media/brief.md"), "A local brand description, fixture only.");
  const brand = await registerDesignItem("brandbook", { id: "test-brand", name: "Test brand", file: "brandbooks/media/brief.md" }, directory);
  assert.equal(brand.item.approvalStatus, "draft");
  assert.match(brand.item.source.sha256, /^[a-f0-9]{64}$/);
  const reference = await registerDesignItem("reference", { id: "test-reference", title: "Reference fixture", url: "https://example.com/reference", start: "4.2", end: "7.8", axis: "typography", technique: "Short phrase grouping" }, directory);
  assert.equal(reference.item.approvalStatus, "draft");
  assert.equal(reference.item.usage, "reference-only");
  assert.deepEqual(reference.item.beats[0], { startMs: 4200, endMs: 7800, axis: "typography", technique: "Short phrase grouping" });
  await assert.rejects(registerDesignItem("reference", { id: "bad-ref", title: "Bad", url: "https://example.com/reference", start: "5", end: "2", axis: "motion", technique: "Bad time" }, directory), /invalid reference/);
  await assert.rejects(registerDesignItem("asset", { id: "bad-asset", usage: "approved" }, directory), /unsupported option/);
});
