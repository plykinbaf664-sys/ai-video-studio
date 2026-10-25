import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openBrowser, getCompositions, renderStill } from "@remotion/renderer";
import { root, fingerprint } from "./lib/media.mjs";
import { validateDesignLibrary } from "./lib/design-library.mjs";

await validateDesignLibrary();
const directory = path.join(root, "artifacts/design/previews");
await mkdir(directory, { recursive: true });
const browser = await openBrowser("chrome", { browserExecutable: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const serveUrl = path.join(root, "build");
  const compositions = await getCompositions({ serveUrl, puppeteerInstance: browser, port: 3102 });
  const composition = compositions.find(item => item.id === "SemanticCut");
  if (!composition) throw new Error("Semantic composition is missing");
  const frames = [];
  const selectedFrames = [...new Set([Math.min(30, composition.durationInFrames - 1), Math.floor(composition.durationInFrames * 7 / 15), Math.max(0, composition.durationInFrames - 30)])];
  for (const frame of selectedFrames) {
    const output = path.join(directory, `baseline-${frame}.png`);
    await renderStill({ serveUrl, composition, puppeteerInstance: browser, port: 3102, frame, output, imageFormat: "png", scale: 1 / 3, logLevel: "error" });
    frames.push({ frame, output, sha256: await fingerprint(output) });
  }
  const page = await browser.newPage({ context: () => null, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto({ url: "http://localhost:3001/SemanticCut", timeout: 60000 });
  const studio = await page.evaluate(async () => {
    const end = Date.now() + 25000;
    while (Date.now() < end) {
      const cards = [...document.querySelectorAll("[data-studio-text-card]")];
      const scene = cards[0]?.closest("[data-studio-design-frame]");
      const canvasReady = [...(scene?.querySelectorAll("canvas") ?? [])].some(canvas => canvas.width > 100 && canvas.height > 100);
      const htmlVideoReady = [...(scene?.querySelectorAll("video") ?? [])].some(video => video.readyState >= 2);
      if (cards.length === 1 && cards[0].getAttribute("data-visual-qc") === "passed" && (canvasReady || htmlVideoReady)) return { loaded: true, text: cards[0].textContent, geometry: "passed", mediaRendering: canvasReady ? "canvas" : "video" };
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(document.body.innerText.slice(0, 1800));
  });
  const shot = await page._client().send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(directory, "studio.png"), Buffer.from(shot.value.data, "base64"));
  await writeFile(path.join(root, "artifacts/design/preview.validation.json"), JSON.stringify({ checkedAt: new Date().toISOString(), status: "passed", composition: { id: composition.id, frames: composition.durationInFrames, width: composition.width, height: composition.height, fps: composition.fps }, frames, studio, note: "Technical baseline only; no new style approval or MP4 export." }, null, 2) + "\n");
  console.log(JSON.stringify({ status: "passed", frames: frames.length, studio, report: "artifacts/design/preview.validation.json" }, null, 2));
} finally { await browser.close({ silent: true }); }
