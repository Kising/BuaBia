import { BOBING_RULES } from "../rules/bobingRules.js";
import { evaluateBobing } from "../rules/evaluateBobing.js";

const MAX_PLAYERS = 8;

export function createMultiplayerSession(names, now = Date.now()) {
  const players = names
    .map((name) => String(name).trim())
    .filter(Boolean)
    .slice(0, MAX_PLAYERS)
    .map((name, index) => ({ id: `player-${now}-${index}`, name: name.slice(0, 12) }));
  if (players.length < 2) throw new Error("多人模式至少需要两位玩家。");
  return { id: `session-${now}`, startedAt: now, currentIndex: 0, round: 1, players };
}

export function saveMultiplayerSession(storage, key, session) {
  if (!session) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(session));
  return session;
}

export function loadMultiplayerSession(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "null");
    if (!value || !Array.isArray(value.players) || value.players.length < 2) return null;
    const players = value.players.slice(0, MAX_PLAYERS).map((player, index) => ({
      id: String(player.id || `player-${index}`),
      name: String(player.name || `玩家 ${index + 1}`).slice(0, 12),
    }));
    const currentIndex = Number.isInteger(value.currentIndex)
      ? Math.max(0, Math.min(players.length - 1, value.currentIndex))
      : 0;
    return {
      id: String(value.id || "session"),
      startedAt: Number.isFinite(value.startedAt) ? value.startedAt : Date.now(),
      currentIndex,
      round: Number.isInteger(value.round) && value.round > 0 ? value.round : 1,
      players,
    };
  } catch {
    return null;
  }
}

export function advanceTurn(session) {
  const nextIndex = (session.currentIndex + 1) % session.players.length;
  return {
    ...session,
    currentIndex: nextIndex,
    round: nextIndex === 0 ? session.round + 1 : session.round,
  };
}

function compareNumberArrays(left = [], right = []) {
  const a = [...left].sort((x, y) => y - x);
  const b = [...right].sort((x, y) => y - x);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
}

export function compareZhuangyuanResults(left, right, rules = BOBING_RULES) {
  const leftIndex = rules.zhuangyuanSubtypeOrder.indexOf(left.subtype);
  const rightIndex = rules.zhuangyuanSubtypeOrder.indexOf(right.subtype);
  if (leftIndex !== rightIndex) return rightIndex - leftIndex;

  if (left.subtype === "五红") {
    return left.dice.find((value) => value !== 4) - right.dice.find((value) => value !== 4);
  }
  if (left.subtype === "五子") {
    const leftRepeated = Number(Object.keys(left.counts).find((value) => left.counts[value] === 5));
    const rightRepeated = Number(Object.keys(right.counts).find((value) => right.counts[value] === 5));
    return leftRepeated - rightRepeated
      || left.dice.find((value) => value !== leftRepeated) - right.dice.find((value) => value !== rightRepeated);
  }
  return compareNumberArrays(left.zhuangyuanTieBreak, right.zhuangyuanTieBreak);
}

export function buildMultiplayerStandings(session, history) {
  if (!session) return { players: [], champion: null };
  const players = session.players.map((player) => {
    const rolls = history.filter((entry) => entry.sessionId === session.id && entry.playerId === player.id);
    const rewards = rolls.filter((entry) => entry.tier !== BOBING_RULES.labels.none);
    const rewardCounts = rewards.reduce((counts, entry) => {
      counts[entry.displayName] = (counts[entry.displayName] || 0) + 1;
      return counts;
    }, {});
    return {
      ...player,
      rolls: rolls.length,
      rewards: rewards.length,
      rewardSummary: Object.entries(rewardCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([name, count]) => `${name}×${count}`)
        .join(" · "),
      zhuangyuan: rolls
        .map((entry) => ({ entry, result: evaluateBobing(entry.dice) }))
        .filter(({ result }) => result.tier === BOBING_RULES.labels.zhuangyuan),
    };
  });

  let champion = null;
  players.forEach((player) => {
    player.zhuangyuan.forEach((candidate) => {
      const comparison = champion ? compareZhuangyuanResults(candidate.result, champion.result) : 1;
      const candidateTime = Number.isFinite(candidate.entry.timestamp) ? candidate.entry.timestamp : Infinity;
      const championTime = Number.isFinite(champion?.entry.timestamp) ? champion.entry.timestamp : Infinity;
      if (!champion || comparison > 0 || (comparison === 0 && candidateTime < championTime)) {
        champion = { ...candidate, player };
      }
    });
  });
  return { players, champion };
}
