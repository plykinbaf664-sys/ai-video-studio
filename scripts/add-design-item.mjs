import { parseArgs } from "node:util";
import { registerDesignItem } from "./lib/register-design-item.mjs";

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: Object.fromEntries([
    "id", "name", "title", "file", "url", "kind", "license-file", "license-label", "source", "usage", "rights-evidence", "start", "end", "axis", "technique",
  ].map(key => [key, { type: "string" }]).concat([["dry-run", { type: "boolean", default: false }]])) });
  if (positionals.length !== 1) throw new Error("Usage: npm run design:add -- asset|brandbook|reference --id ID ...; see docs/DESIGN_LIBRARY_MANUAL.md");
  console.log(JSON.stringify(await registerDesignItem(positionals[0], values), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
