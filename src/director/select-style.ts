export const personalStyleIds = [
  "personal-editorial-focus",
  "personal-signal-dynamic",
  "personal-dry-irony",
] as const;
export type PersonalStyleId = (typeof personalStyleIds)[number];
/** Recommendation only. Candidates require user visual review; no hidden AI or approvals. */
export const selectPersonalStyle = (input: {
  styleId?: string;
  intent?: "story" | "explanation" | "irony";
  brandId: string;
  comparison?: boolean;
}) => {
  if (input.brandId !== "personal-design-kit")
    throw new Error("No compatible personal brandbook");
  if (
    input.styleId !== undefined &&
    !personalStyleIds.includes(input.styleId as PersonalStyleId)
  )
    throw new Error("Style not implemented");
  if (
    input.intent !== undefined &&
    !["story", "explanation", "irony"].includes(input.intent)
  )
    throw new Error("Unknown content intent");
  const styleId =
    (input.styleId as PersonalStyleId | undefined) ??
    (
      {
        story: "personal-editorial-focus",
        explanation: "personal-signal-dynamic",
        irony: "personal-dry-irony",
      } as const
    )[input.intent ?? "story"];
  return {
    styleId,
    mode: input.styleId ? "manual" : "rule-based-recommendation",
    reason: input.styleId
      ? "Explicit user selection"
      : input.intent === "irony"
        ? "Preserve the setup, pause and spoken payoff"
        : input.intent === "explanation"
          ? "Use structured visual evidence when supported by the words"
          : "Prioritize the speaker and one clear thought",
    approvalStatus: "candidate",
    autoPublish: false,
    rhythm: input.comparison
      ? "Common comparison edit is locked"
      : "Rhythm must be proposed in an explicit source/output edit plan",
  };
};
