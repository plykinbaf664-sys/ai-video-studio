import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./lib/media.mjs";
import { validateDesignLibrary } from "./lib/design-library.mjs";

try {
  const catalog = await validateDesignLibrary();
  const directory = path.join(root, "artifacts/design");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "catalog.validation.json"), JSON.stringify({ checkedAt: new Date().toISOString(), ...catalog }, null, 2) + "\n");
  console.log(JSON.stringify({ status: "passed", ...catalog.summary, report: "artifacts/design/catalog.validation.json", note: "Technical baseline is not an approved professional style. Legacy presets are not executable." }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
