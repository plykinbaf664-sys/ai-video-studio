import type {StageDirection} from '../director/scene-direction';
export type StyleContract = {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  implementationStatus: "not_implemented" | "implemented";
  approvalStatus: "draft" | "candidate" | "approved" | "technical-baseline";
  brandbookId: string | null;
  referenceIds: string[];
  assetIds: string[];
  staging?:StageDirection;
  rules: {
    rhythm: {
      source: "edit-plan";
      keepCompleteWords: boolean;
      minimumLeadMs: number;
      minimumTailMs: number;
    };
    subtitles: {
      maximumLines: number;
      maximumWordsPerGroup: number;
      maximumCharactersPerGroup: number;
      splitGapMs: number;
      tailMs: number;
      quotesFromRetainedSpeechOnly: boolean;
    };
    graphics: {
      components: string[];
      maximumConcurrentFocus: number;
      insertionPolicy: string;
    };
    motion: { quoteFadeFrames: number; reframe: string };
    sound: {
      preserveOriginalVoice: boolean;
      music: string;
      soundEffects: string;
    };
    transitions: { kind: string; durationFrames: number };
    framing: {
      objectFit: "contain" | "cover";
      automaticSubjectDetection: boolean;
    };
  };
  design: {
    font: {
      assetId: string;
      family: string;
      runtimeFile: string;
      subtitleWeight: number;
      headingWeight: number;
    };
    slot: { x: number; y: number; width: number; maxHeight: number };
    safe: { left: number; right: number; top: number; bottom: number };
    subtitle: { preferredSize: number; minSize: number; lineHeight: number };
    heading: { preferredSize: number; minSize: number; lineHeight: number };
    card: {
      paddingX: number;
      paddingY: number;
      radius: number;
      background: string;
      text: string;
      border: string;
    };
  };
};

export const assertSupportedStyle = (style: StyleContract) => {
  const require = (ok: boolean, message: string) => {
    if (!ok) throw new Error(`Style contract: ${message}`);
  };
  if(style.staging){
    const expected:Record<string,string>={'personal-editorial-focus':'editorial','personal-signal-dynamic':'signal','personal-dry-irony':'paper'};
    require(style.implementationStatus==='implemented'&&expected[style.id]===style.staging.renderer,'scene renderer is not implemented');
    require(style.approvalStatus==='candidate'&&style.brandbookId==='personal-design-kit','scene direction is a candidate personal brand');
    require(style.rules.rhythm.keepCompleteWords&&style.rules.subtitles.maximumLines===2&&style.rules.subtitles.quotesFromRetainedSpeechOnly,'speech preservation is required');
    require(style.rules.graphics.components.every(c=>['spoken-type','portrait-window','quote-poster','glass-flow','chapter-marker'].includes(c)),'unsupported scene component');
    require(style.rules.sound.preserveOriginalVoice&&style.rules.sound.music==='licensed-bed'&&style.rules.transitions.kind==='cut','unsupported scene/audio operation');
    require(style.assetIds.includes(style.staging.musicAssetId)&&style.assetIds.includes(style.design.font.assetId),'missing scene assets');
    require(style.staging.scenes[0]?.from===0&&style.staging.scenes.every((s,i)=>Number.isInteger(s.from)&&s.from>=0&&s.from<450&&(i===0||s.from>style.staging!.scenes[i-1].from)&&Boolean(s.purpose.trim())),'invalid scene schedule');
    require(style.staging.musicPauseDb<=-20&&style.staging.musicPauseDb>=-40&&style.staging.musicDuckDb<=-6&&style.staging.musicDuckDb>=-24,'music level outside supported speech range');
    require(style.design.subtitle.minSize>=50&&style.design.heading.minSize>=60,'unreadable scene type');
    return;
  }
  const personal = [
    "personal-editorial-focus",
    "personal-signal-dynamic",
    "personal-dry-irony",
  ].includes(style.id);
  require((style.id === "baseline-unbranded" || personal) &&
    style.implementationStatus ===
      "implemented", "style has no implemented renderer");
  if (personal)
    require(style.approvalStatus === "candidate" &&
      style.brandbookId ===
        "personal-design-kit", "personal designs remain candidates until visual approval");
  else
    require(style.approvalStatus === "technical-baseline" &&
      style.brandbookId === null &&
      style.referenceIds.length ===
        0, "baseline cannot claim brand or reference approval");
  const r = style.rules;
  require(r.rhythm.source === "edit-plan" &&
    r.rhythm
      .keepCompleteWords, "complete source words and explicit edit plan required");
  require(r.subtitles.maximumLines === 2 &&
    r.subtitles
      .quotesFromRetainedSpeechOnly, "baseline requires two-line captions and retained quotes");
  require(personal
    ? r.graphics.components.every((x) =>
        [
          "subtitles",
          "quote-callout",
          "semantic-brackets",
          "split-quotes",
          "step-indicator",
        ].includes(x),
      )
    : r.graphics.components.length === 2 &&
        r.graphics.components.includes("subtitles") &&
        r.graphics.components.includes(
          "quote-callout",
        ), "unsupported graphic component");
  if (personal) {
    const expected = [
      "subtitles",
      "quote-callout",
      "semantic-brackets",
      ...(style.id === "personal-signal-dynamic"
        ? ["split-quotes", "step-indicator"]
        : []),
    ];
    require(r.graphics.components.length === expected.length &&
      expected.every((x) =>
        r.graphics.components.includes(x),
      ), "personal renderer capability mismatch");
    require(r.sound.soundEffects ===
      (style.id === "personal-editorial-focus"
        ? "none"
        : "semantic-only"), "personal sound direction mismatch");
  }
  require(r.graphics.maximumConcurrentFocus === 1 &&
    r.graphics.insertionPolicy ===
      "semantic_only", "unsupported graphic direction");
  require(r.motion.reframe === "none", "reframe is not implemented");
  require(r.sound.preserveOriginalVoice &&
    r.sound.music === "none" &&
    (r.sound.soundEffects === "none" ||
      (personal &&
        r.sound.soundEffects ===
          "semantic-only")), "music, sound effects and voice replacement are not implemented");
  require(r.transitions.kind === "cut" &&
    r.transitions.durationFrames === 0, "transition is not implemented");
  require(r.framing.objectFit === "contain" &&
    !r.framing
      .automaticSubjectDetection, "automatic framing is not implemented");
  require(style.assetIds.includes(
    style.design.font.assetId,
  ), "font must be a declared asset dependency");
  const { slot, safe, subtitle, heading } = style.design;
  require(slot.x >= safe.left &&
    slot.y >= safe.top &&
    slot.x + slot.width <= 1080 - safe.right &&
    slot.y + slot.maxHeight <=
      1920 - safe.bottom, "text slot exceeds safe area");
  require(subtitle.minSize <= subtitle.preferredSize &&
    heading.minSize <= heading.preferredSize, "invalid type scale");
  require(subtitle.minSize >= 50 &&
    heading.minSize >= 60, "baseline type scale is below the readable minimum");
  for (const color of [
    style.design.card.background,
    style.design.card.text,
    style.design.card.border,
  ]) {
    const rgba =
      /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.exec(
        color,
      );
    require(/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(color) ||
      Boolean(
        rgba && rgba.slice(1, 4).every((value) => Number(value) <= 255),
      ), "unsupported or invalid color literal");
  }
};
