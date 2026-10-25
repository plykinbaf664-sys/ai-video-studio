import {
  prepareDesignAssets,
  isolateLegacySidecars,
} from "./lib/design-assets.mjs";
try {
  const font = await prepareDesignAssets();
  const moved = await isolateLegacySidecars();
  console.log(
    JSON.stringify({ font, relocatedSubtitleSidecars: moved }, null, 2),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
