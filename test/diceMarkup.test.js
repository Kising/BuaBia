import { describe, expect, it } from "vitest";
import { diceFace, diceSequence } from "../src/ui/diceMarkup.js";

describe("rule dice markup", () => {
  it("renders blank and wildcard dice for rule examples", () => {
    expect(diceFace(null, { small: true })).toContain("mini-die--blank");
    expect(diceFace("X", { small: true })).toContain("mini-die--wild");
    expect(diceSequence([4, 4, 4, 4, null, null], { small: true })).toMatch(/空位/g);
  });
});
