import { readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./media.mjs";

// The latest verified version can have a new name when Windows locks an older MP4.
export const getSemanticOutputPath = async () => {
  let previous;
  try {
    previous = JSON.parse(await readFile(path.join(root, "artifacts/reports/semantic-cut.verification.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return path.join(root, "out/semantic-cut.mp4");
    throw error;
  }
  const file = path.resolve(previous.file);
  if (path.dirname(file) !== path.join(root, "out") || !/^semantic-cut(?:-synced(?:-\d+)?)?\.mp4$/i.test(path.basename(file)))
    throw new Error("Unexpected semantic output path in verification report.");
  return file;
};
