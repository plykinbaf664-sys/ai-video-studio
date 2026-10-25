import Ajv2020 from "ajv/dist/2020.js";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { root, fingerprint } from "./media.mjs";
import { assertSupportedStyle } from "../../src/styles/contract.ts";
import {validatePreset} from '../../src/director/editorial-job.ts';

const schemaId = "https://local.ai-video-studio/contracts/design-library.schema.json";
const fail = message => { throw new Error(`Design library: ${message}`); };
const read = async file => JSON.parse(await readFile(file, "utf8"));

export const validateDesignLibrary = async (projectRoot = root, proposedCatalogs = {}) => {
  const base = await realpath(projectRoot);
  const schema = await read(path.join(base, "contracts/design-library.schema.json"));
  const ajv = new Ajv2020({ allErrors: true }).addSchema(schema);
  const shape = (kind, value) => {
    const validate = ajv.getSchema(`${schemaId}#/$defs/${kind}`);
    if (!validate(value)) fail(`${kind} schema: ${JSON.stringify(validate.errors)}`);
  };
  const catalog = async (directory, kind) => {
    const file = proposedCatalogs[directory] ?? await read(path.join(base, directory, "catalog.json"));
    if (file.schemaVersion !== "1.0.0" || !Array.isArray(file.items) || Object.keys(file).some(key => !["schemaVersion", "items"].includes(key))) fail(`invalid catalog ${directory}`);
    const ids = new Set();
    for (const item of file.items) {
      shape(kind, item);
      if (ids.has(item.id)) fail(`duplicate ${kind} id ${item.id}`);
      ids.add(item.id);
    }
    return file.items;
  };
  const localFile = async (relative, directory) => {
    if (typeof relative !== "string" || relative.includes("\\") || path.isAbsolute(relative) || relative.split("/").includes("..") || !relative.startsWith(directory + "/")) fail(`unsafe ${directory} path: ${relative}`);
    const file = await realpath(path.resolve(base, relative));
    if (!file.startsWith(path.join(base, directory) + path.sep)) fail(`linked path leaves ${directory}: ${relative}`);
    const info = await stat(file);
    if (!info.isFile() || info.size === 0) fail(`missing or empty file ${relative}`);
    return file;
  };
  const assets = await catalog("assets", "asset");
  const brandbooks = await catalog("brandbooks", "brandbook");
  const references = await catalog("reference-library", "reference");
  for (const asset of assets) {
    const file = await localFile(asset.path, "assets");
    if (await fingerprint(file) !== asset.sha256) fail(`asset hash mismatch: ${asset.id}`);
    const license = await localFile(asset.license.file, "assets");
    if (!(await readFile(license, "utf8")).trim()) fail(`empty license ${asset.id}`);
    if (asset.runtimeFile && (!asset.runtimeFile.startsWith("generated/assets/") || /[\\:]|(?:^|\/)\.\.(?:\/|$)/.test(asset.runtimeFile))) fail(`unsafe runtime asset path: ${asset.id}`);
    if(asset.visual){
      const provenance=JSON.parse(await readFile(await localFile(asset.visual.provenanceFile,'assets'),'utf8'));
      if(asset.visual.provenanceFile!==asset.license.file||provenance.id!==asset.id||provenance.assetSha256!==asset.sha256||!provenance.origin||!provenance.review?.usable)fail(`missing visual provenance ${asset.id}`);
      if(asset.visual.rights==='licensed'&&(!provenance.sourcePage||!provenance.author||!provenance.licenseUrl||!provenance.attribution||!provenance.review.originVerifiedAt))fail(`uncleared third-party visual ${asset.id}`);
    }
  }
  for (const brand of brandbooks) {
    for (const id of brand.fontAssetIds)
      if (!assets.some(asset => asset.id === id && asset.kind === "font")) fail(`missing font ${id} for brandbook ${brand.id}`);
    if (brand.source.file && await fingerprint(await localFile(brand.source.file, "brandbooks")) !== brand.source.sha256) fail(`brandbook hash mismatch: ${brand.id}`);
  }
  for (const reference of references) {
    if (reference.usage === "licensed-reuse" && !reference.rightsEvidence?.trim()) fail(`reuse has no rights evidence: ${reference.id}`);
    if (reference.approvalStatus === "approved" && reference.usage === "unknown") fail(`approved reference has unknown usage: ${reference.id}`);
    for (const beat of reference.beats)
      if (beat.endMs <= beat.startMs) fail(`invalid reference interval: ${reference.id}`);
    if (reference.source.file && await fingerprint(await localFile(reference.source.file, "reference-library")) !== reference.source.sha256) fail(`reference hash mismatch: ${reference.id}`);
  }
  const runtimeDirectory = path.join(base, "style-presets/runtime");
  const styles = [];
  for (const name of (await readdir(runtimeDirectory)).filter(name => name.endsWith(".json")).sort()) {
    const style = await read(path.join(runtimeDirectory, name));
    shape("style", style);
    if (styles.some(item => item.id === style.id)) fail(`duplicate runtime style ${style.id}`);
    for (const id of style.assetIds)
      if (!assets.some(asset => asset.id === id)) fail(`missing asset ${id} in ${style.id}`);
    if (style.brandbookId && !brandbooks.some(brand => brand.id === style.brandbookId)) fail(`missing brandbook ${style.brandbookId}`);
    for (const id of style.referenceIds)
      if (!references.some(reference => reference.id === id)) fail(`missing reference ${id}`);
    const font = assets.find(asset => asset.id === style.design.font.assetId);
    if (!font || font.kind !== "font" || !style.assetIds.includes(font.id) || font.runtimeFile !== style.design.font.runtimeFile) fail(`unresolved font dependency ${style.id}`);
    if (style.approvalStatus === "approved") {
      if (style.brandbookId && brandbooks.find(brand => brand.id === style.brandbookId).approvalStatus !== "approved") fail(`brandbook not approved: ${style.id}`);
      if (style.referenceIds.some(id => references.find(reference => reference.id === id).approvalStatus !== "approved")) fail(`reference not approved: ${style.id}`);
      if (style.assetIds.some(id => assets.find(asset => asset.id === id).usage !== "approved")) fail(`asset not approved for style: ${style.id}`);
    }
    if (style.implementationStatus === "implemented") assertSupportedStyle(style);
    styles.push(style);
  }
  if (!styles.some(style => style.id === "baseline-unbranded" && style.implementationStatus === "implemented")) fail("implemented baseline missing");
  const grammars=[];
  let grammarFiles=[];
  try{grammarFiles=await readdir(path.join(base,'style-presets/grammars'));}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const name of grammarFiles.filter(n=>n.endsWith('.json')).sort()){
    const grammar=await read(path.join(base,'style-presets/grammars',name));validatePreset(grammar);
    if(grammars.some(g=>g.id===grammar.id)||!styles.some(s=>s.id===grammar.parentStyleId))fail(`invalid grammar parent/id ${grammar.id}`);
    for(const id of grammar.assetIds)if(!assets.some(a=>a.id===id))fail(`missing grammar asset ${id}`);
    for(const id of grammar.referenceIds)if(!references.some(r=>r.id===id))fail(`missing grammar reference ${id}`);
    if(!brandbooks.some(b=>b.id===grammar.brandbookId))fail(`missing grammar brandbook ${grammar.brandbookId}`);
    grammars.push(grammar);
  }
  const drafts = [];
  for (const name of (await readdir(path.join(base, "style-presets"))).filter(name => name.endsWith(".json")).sort()) {
    const draft = await read(path.join(base, "style-presets", name));
    if (!draft.id || !draft.name || draft.implementationStatus !== "not_implemented" || draft.preview?.status !== "not_rendered") fail(`legacy preset must remain a non-rendered draft: ${name}`);
    if (drafts.some(item => item.id === draft.id)) fail(`duplicate draft ${draft.id}`);
    drafts.push({ id: draft.id, name: draft.name, implemented: false, approved: false });
  }
  return { schemaVersion: "1.0.0", styles, grammars, drafts, assets, brandbooks, references,
    summary: { runnableTechnicalBaselines: styles.filter(style => style.implementationStatus === "implemented" && style.approvalStatus === "technical-baseline").length, approvedStyles: styles.filter(style => style.approvalStatus === "approved").length, implementedCandidateStyles: styles.filter(style => style.implementationStatus === "implemented" && style.approvalStatus === "candidate").length, draftPresets: drafts.length, checkedAssets: assets.length, approvedBrandbooks: brandbooks.filter(brand => brand.approvalStatus === "approved").length, approvedReferences: references.filter(reference => reference.approvalStatus === "approved").length } };
};
