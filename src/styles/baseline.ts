import definition from "../../style-presets/runtime/baseline-unbranded.json" with { type: "json" };
import type { StyleContract } from "./contract.ts";
import { assertSupportedStyle } from "./contract.ts";

export const baselineStyle = definition as StyleContract;
assertSupportedStyle(baselineStyle);
