import { describe, expect, it } from "vitest";
import { PHYSICS_CONFIG } from "../src/config.js";
import * as THREE from "three";
import { createSettleTargets, getTopValueFromQuaternion } from "../src/physics/DiceScene.js";

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

describe("getTopValueFromQuaternion", () => {
  const faceNormals = {
    1: new THREE.Vector3(0, 1, 0),
    2: new THREE.Vector3(0, 0, 1),
    3: new THREE.Vector3(1, 0, 0),
    4: new THREE.Vector3(-1, 0, 0),
    5: new THREE.Vector3(0, 0, -1),
    6: new THREE.Vector3(0, -1, 0),
  };

  it("reads every upward-facing physical side correctly", () => {
    Object.entries(faceNormals).forEach(([value, normal]) => {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
      expect(getTopValueFromQuaternion(quaternion)).toBe(Number(value));
    });
  });
});
