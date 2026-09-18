import { describe, expect, it } from "vitest";
import {
  appendRollHistory,
  clearRollHistory,
  loadRollHistory,
  summarizeRollHistory,
} from "../src/history/rollHistory.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("roll history", () => {
  it("stores newest results first and respects the limit", () => {
    const storage = createStorage();
    const result = { dice: [1, 2, 3, 4, 5, 6], tier: "对堂", displayName: "对堂", rank: 2 };

    appendRollHistory(storage, "history", result, 2, 100);
    appendRollHistory(storage, "history", { ...result, displayName: "一秀" }, 2, 200);
    const history = appendRollHistory(storage, "history", { ...result, displayName: "二举" }, 2, 300);

    expect(history.map((entry) => entry.displayName)).toEqual(["二举", "一秀"]);
    expect(loadRollHistory(storage, "history", 2)).toEqual(history);
  });

  it("summarizes rewards and clears stored history", () => {
    const storage = createStorage();
    const history = [
      { id: "1", timestamp: 1, dice: [4, 1, 2, 3, 5, 6], tier: "一秀", displayName: "一秀", rank: 6 },
      { id: "2", timestamp: 2, dice: [4, 4, 1, 2, 3, 5], tier: "二举", displayName: "二举", rank: 5 },
      { id: "3", timestamp: 3, dice: [1, 1, 2, 2, 3, 3], tier: "无奖", displayName: "无奖", rank: 7 },
    ];
    storage.setItem("history", JSON.stringify(history));

    expect(summarizeRollHistory(history, "无奖")).toMatchObject({ total: 3, rewarded: 2 });
    expect(clearRollHistory(storage, "history")).toEqual([]);
    expect(loadRollHistory(storage, "history")).toEqual([]);
  });
});
