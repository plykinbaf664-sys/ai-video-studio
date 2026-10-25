import { copyFile, mkdir, readFile, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { root, fingerprint } from "./media.mjs";
import { validateDesignLibrary } from "./design-library.mjs";

export const prepareDesignAssets = async () => {
  await validateDesignLibrary();
  const original = path.join(root, "assets/fonts/manrope/Manrope-Variable.ttf");
  const license = path.join(root, "assets/fonts/manrope/OFL.txt");
  const manifest = JSON.parse(
    await readFile(path.join(root, "assets/fonts/manrope/asset.json"), "utf8"),
  );
  const directory = path.join(root, "public/generated/assets/fonts");
  await mkdir(directory, { recursive: true });
  await copyFile(original, path.join(directory, "Manrope-Variable.ttf"));
  await copyFile(license, path.join(directory, "OFL.txt"));
  return { ...manifest, sha256: await fingerprint(original) };
};

export const isolateLegacySidecars = async () => {
  const outputDirectory = path.resolve(root, "out");
  const exportDirectory = path.resolve(
    root,
    "artifacts/caption-exports",
    "legacy",
  );
  if (!exportDirectory.startsWith(path.resolve(root, "artifacts") + path.sep))
    throw new Error("Unexpected subtitle directory.");
  await mkdir(exportDirectory, { recursive: true });
  const moved = [];
  for (const sourceDirectory of [
    outputDirectory,
    path.resolve(outputDirectory, "subtitles"),
  ]) {
    let files;
    try {
      files = await readdir(sourceDirectory);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const sidecars = files.filter((file) =>
      /(?:^|[-_.])semantic-cut(?:[._-].*)?\.(srt|ass|ssa|vtt|sub)$/i.test(file),
    );
    for (const file of sidecars) {
      const source = path.resolve(sourceDirectory, file);
      const destination = path.resolve(
        exportDirectory,
        `${Date.now()}-legacy-${file}`,
      );
      if (
        path.dirname(source) !== sourceDirectory ||
        path.dirname(destination) !== exportDirectory
      )
        throw new Error("Unexpected subtitle path.");
      await rename(source, destination);
      moved.push({ from: source, to: destination });
    }
  }
  return moved;
};
