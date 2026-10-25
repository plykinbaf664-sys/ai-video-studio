import editorial from "../../../style-presets/archive/personal-v1/personal-editorial-focus.json";
import dynamic from "../../../style-presets/archive/personal-v1/personal-signal-dynamic.json";
import irony from "../../../style-presets/archive/personal-v1/personal-dry-irony.json";
import type { StyleContract } from "../../styles/contract";
import { assertSupportedStyle } from "../../styles/contract";
import type { Variant } from "./types";
export const personalStyles: Record<Variant, StyleContract> = {
  editorial: editorial as StyleContract,
  dynamic: dynamic as StyleContract,
  irony: irony as StyleContract,
};
Object.values(personalStyles).forEach(assertSupportedStyle);
