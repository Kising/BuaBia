import { describe, expect, it } from "vitest";
import { evaluateBobing } from "../src/rules/evaluateBobing.js";

const cases = [
  [[4, 2, 3, 5, 6, 1], "对堂", null],
  [[4, 2, 2, 3, 5, 6], "一秀", null],
  [[4, 4, 1, 2, 3, 5], "二举", null],
  [[4, 4, 4, 1, 2, 6], "三红", null],
  [[2, 2, 2, 2, 3, 6], "四进", null],
  [[2, 2, 2, 2, 4, 6], "四进 + 一秀", "一秀"],
  [[2, 2, 2, 2, 4, 4], "四进 + 二举", "二举"],
  [[4, 4, 4, 4, 2, 6], "状元", "四红"],
  [[4, 4, 4, 4, 1, 1], "状元 · 插金花", "状元插金花"],
  [[4, 4, 4, 4, 4, 6], "状元 · 五红", "五红"],
  [[6, 6, 6, 6, 6, 2], "状元 · 五子", "五子"],
  [[4, 4, 4, 4, 4, 4], "状元 · 六勃红", "六勃红"],
  [[6, 6, 6, 6, 6, 6], "状元 · 六勃黑", "六勃黑"],
];

describe("evaluateBobing", () => {
  it.each(cases)("%s -> %s", (dice, displayName, subtype) => {
    const result = evaluateBobing(dice);

    expect(result.displayName).toBe(displayName);
    if (subtype) {
      expect(result.subtype ?? result.bonusTier).toBe(subtype);
    }
  });

  it("throws for invalid dice", () => {
    expect(() => evaluateBobing([1, 2, 3])).toThrow();
    expect(() => evaluateBobing([1, 2, 3, 4, 5, 7])).toThrow();
  });
});
