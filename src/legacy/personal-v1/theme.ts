import type { Variant } from "./types";
export const tokens = {
  ink: "#111319",
  warm: "#F6F3EC",
  white: "#FFFFFF",
  copper: "#E87942",
  olive: "#6F8B73",
  subBg: "rgba(15,17,23,0.64)",
  edge: "rgba(246,243,236,0.22)",
  primaryFont: "PersonalOnest",
  uiFont: "PersonalInter",
};
export const variants: Record<
  Variant,
  {
    headlineSize: number;
    headlineWeight: number;
    subtitleSize: number;
    animationFrames: number;
    highlight: string;
    topY: number;
    eyebrow: string;
    maxZoom: number;
    proseColor: string;
  }
> = {
  editorial: {
    headlineSize: 78,
    headlineWeight: 750,
    subtitleSize: 44,
    animationFrames: 11,
    highlight: tokens.warm,
    topY: 295,
    eyebrow: "МЫСЛЬ",
    maxZoom: 1.03,
    proseColor: tokens.warm,
  },
  dynamic: {
    headlineSize: 86,
    headlineWeight: 850,
    subtitleSize: 46,
    animationFrames: 6,
    highlight: tokens.copper,
    topY: 285,
    eyebrow: "СУТЬ",
    maxZoom: 1.06,
    proseColor: tokens.white,
  },
  irony: {
    headlineSize: 72,
    headlineWeight: 700,
    subtitleSize: 42,
    animationFrames: 13,
    highlight: tokens.warm,
    topY: 280,
    eyebrow: "НЕУДОБНЫЙ ФАКТ",
    maxZoom: 1.02,
    proseColor: tokens.warm,
  },
};
