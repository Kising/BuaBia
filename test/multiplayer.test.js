import { describe, expect, it } from "vitest";
import { evaluateBobing } from "../src/rules/evaluateBobing.js";
import {
  advanceTurn,
  buildMultiplayerStandings,
  compareZhuangyuanResults,
  createMultiplayerSession,
} from "../src/multiplayer/multiplayer.js";

describe("multiplayer", () => {
  it("rotates players and advances rounds", () => {
    const session = createMultiplayerSession(["阿明", "小月"], 100);
    expect(advanceTurn(session)).toMatchObject({ currentIndex: 1, round: 1 });
    expect(advanceTurn(advanceTurn(session))).toMatchObject({ currentIndex: 0, round: 2 });
  });

  it("compares configured zhuangyuan types and same-type tie breaks", () => {
    expect(compareZhuangyuanResults(
      evaluateBobing([4, 4, 4, 4, 1, 1]),
      evaluateBobing([4, 4, 4, 4, 4, 4]),
    )).toBeGreaterThan(0);
    expect(compareZhuangyuanResults(
      evaluateBobing([4, 4, 4, 4, 4, 6]),
      evaluateBobing([4, 4, 4, 4, 4, 2]),
    )).toBeGreaterThan(0);
  });

  it("builds per-player totals and names the strongest zhuangyuan", () => {
    const session = createMultiplayerSession(["甲", "乙"], 100);
    const history = [
      { sessionId: session.id, playerId: session.players[0].id, tier: "状元", dice: [4, 4, 4, 4, 2, 6] },
      { sessionId: session.id, playerId: session.players[1].id, tier: "状元", dice: [4, 4, 4, 4, 1, 1] },
    ];
    const standings = buildMultiplayerStandings(session, history);
    expect(standings.players.map(({ rolls }) => rolls)).toEqual([1, 1]);
    expect(standings.champion.player.name).toBe("乙");
  });

  it("keeps the earlier player ahead when zhuangyuan results are identical", () => {
    const session = createMultiplayerSession(["先手", "后手"], 100);
    const dice = [4, 4, 4, 4, 2, 6];
    const standings = buildMultiplayerStandings(session, [
      { sessionId: session.id, playerId: session.players[1].id, tier: "状元", dice, timestamp: 200, displayName: "状元" },
      { sessionId: session.id, playerId: session.players[0].id, tier: "状元", dice, timestamp: 100, displayName: "状元" },
    ]);
    expect(standings.champion.player.name).toBe("先手");
  });
});
