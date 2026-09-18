import { describe, expect, it } from "vitest";
import { PHYSICS_CONFIG } from "../src/config.js";
import { createSettleTargets } from "../src/physics/DiceScene.js";

describe("createSettleTargets", () => {
  it("keeps all six dice separated and inside the bowl", () => {
    for (let run = 0; run < 100; run += 1) {
      const targets = createSettleTargets(6);
      expect(targets).toHaveLength(6);

      targets.forEach((target) => {
        expect(target.length()).toBeLessThanOrEqual(PHYSICS_CONFIG.settleRadius);
      });

      for (let first = 0; first < targets.length; first += 1) {
        for (let second = first + 1; second < targets.length; second += 1) {
          expect(targets[first].distanceTo(targets[second])).toBeGreaterThanOrEqual(
            PHYSICS_CONFIG.settleMinDistance,
          );
        }
      }
    }
  });
});
