const VALID_DIE_VALUES = new Set([1, 2, 3, 4, 5, 6]);

function normalizeEntry(entry) {
  if (!entry || !Array.isArray(entry.dice) || entry.dice.length !== 6) return null;
  if (!entry.dice.every((value) => VALID_DIE_VALUES.has(value))) return null;
  if (!Number.isFinite(entry.timestamp)) return null;
  if (typeof entry.tier !== "string" || typeof entry.displayName !== "string") return null;

  return {
    id: typeof entry.id === "string" ? entry.id : String(entry.timestamp),
    timestamp: entry.timestamp,
    dice: [...entry.dice],
    tier: entry.tier.slice(0, 20),
    displayName: entry.displayName.slice(0, 30),
    rank: Number.isFinite(entry.rank) ? entry.rank : 99,
  };
}

export function loadRollHistory(storage, key, limit = 40) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

export function appendRollHistory(storage, key, result, limit = 40, timestamp = Date.now()) {
  const entry = {
    id: `${timestamp}-${result.dice.join("")}`,
    timestamp,
    dice: [...result.dice],
    tier: result.tier,
    displayName: result.displayName,
    rank: result.rank,
  };
  const history = [entry, ...loadRollHistory(storage, key, limit)].slice(0, limit);

  try {
    storage.setItem(key, JSON.stringify(history));
  } catch {
    return history;
  }
  return history;
}

export function clearRollHistory(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // The in-memory UI can still be cleared when storage is unavailable.
  }
  return [];
}

export function summarizeRollHistory(history, noPrizeLabel = "无奖") {
  const rewarded = history.filter((entry) => entry.tier !== noPrizeLabel);
  const counts = rewarded.reduce((result, entry) => {
    result[entry.displayName] = (result[entry.displayName] || 0) + 1;
    return result;
  }, {});
  const topRewards = Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, 3)
    .map(([name, count]) => `${name} ${count}`);

  return {
    total: history.length,
    rewarded: rewarded.length,
    topRewards,
  };
}
