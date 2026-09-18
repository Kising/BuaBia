import { BOBING_RULES } from "./bobingRules.js";

const VALID_DIE = new Set([1, 2, 3, 4, 5, 6]);

export function normalizeDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 6) {
    throw new Error("evaluateBobing expects an array with exactly 6 dice.");
  }

  return dice.map((value) => {
    const number = Number(value);
    if (!Number.isInteger(number) || !VALID_DIE.has(number)) {
      throw new Error(`Invalid die value: ${value}`);
    }
    return number;
  });
}

export function getCounts(dice) {
  return dice.reduce(
    (counts, value) => {
      counts[value] += 1;
      return counts;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  );
}

function createResult({
  tier,
  rank,
  displayName,
  subtype = null,
  specialName = null,
  bonusTier = null,
  description,
  dice,
  counts,
  zhuangyuanTieBreak = null,
}) {
  return {
    tier,
    subtype,
    specialName,
    bonusTier,
    rank,
    displayName,
    description,
    dice,
    counts,
    zhuangyuanTieBreak,
  };
}

function bonusFromFours(fourCount, rules) {
  if (!rules.allowFourOfKindBonusFour) return null;
  if (fourCount === 1) return rules.labels.yixiu;
  if (fourCount === 2) return rules.labels.erju;
  return null;
}

export function evaluateBobing(rawDice, rules = BOBING_RULES) {
  const dice = normalizeDice(rawDice);
  const counts = getCounts(dice);
  const fourCount = counts[4];
  const labels = rules.labels;
  const sorted = [...dice].sort((a, b) => a - b);
  const isDuitang = sorted.every((value, index) => value === index + 1);
  const nonFourValues = [1, 2, 3, 5, 6];
  const fiveOfKindNonFour = nonFourValues.find((value) => counts[value] === 5);
  const sixOfKindNonFour = nonFourValues.find((value) => counts[value] === 6);
  const fourOfKindNonFour = nonFourValues.find((value) => counts[value] >= 4);

  // 状元特殊组合必须优先，且特殊状元之间的大小顺序单独放在配置里。
  if (fourCount === 6) {
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "六勃红",
      specialName: "六勃红",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元 · 六勃红",
      description: "六颗骰子全部为红四",
      dice,
      counts,
    });
  }

  if (sixOfKindNonFour) {
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "六勃黑",
      specialName: "六勃黑",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元 · 六勃黑",
      description: `六颗骰子全部为${sixOfKindNonFour}点`,
      dice,
      counts,
    });
  }

  if (fourCount === 4 && counts[1] === 2) {
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "状元插金花",
      specialName: "插金花",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元 · 插金花",
      description: "四颗四 + 两颗一",
      dice,
      counts,
      zhuangyuanTieBreak: sorted.filter((value) => value !== 4),
    });
  }

  if (fourCount === 5) {
    const remaining = dice.find((value) => value !== 4);
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "五红",
      specialName: "五红",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元 · 五红",
      description: `五颗红四 + 一颗${remaining}点`,
      dice,
      counts,
    });
  }

  if (fiveOfKindNonFour) {
    const remaining = dice.find((value) => value !== fiveOfKindNonFour);
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "五子",
      specialName: "五子",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元 · 五子",
      description: `五颗${fiveOfKindNonFour}点 + 一颗${remaining}点`,
      dice,
      counts,
    });
  }

  if (fourCount === 4) {
    const tieBreak = sorted.filter((value) => value !== 4);
    return createResult({
      tier: labels.zhuangyuan,
      subtype: "四红",
      specialName: "四红",
      rank: rules.ranks.zhuangyuan,
      displayName: "状元",
      description: `四颗红四 + ${tieBreak.join("、")}点`,
      dice,
      counts,
      zhuangyuanTieBreak: tieBreak,
    });
  }

  if (isDuitang) {
    return createResult({
      tier: labels.duitang,
      rank: rules.ranks.duitang,
      displayName: labels.duitang,
      description: "六颗骰子正好为一至六点",
      dice,
      counts,
    });
  }

  if (fourCount === 3) {
    return createResult({
      tier: labels.sanhong,
      rank: rules.ranks.sanhong,
      displayName: labels.sanhong,
      description: "三颗骰子为红四",
      dice,
      counts,
    });
  }

  if (fourOfKindNonFour) {
    const bonusTier = bonusFromFours(fourCount, rules);
    return createResult({
      tier: labels.sijin,
      bonusTier,
      rank: rules.ranks.sijin,
      displayName: bonusTier ? `${labels.sijin} + ${bonusTier}` : labels.sijin,
      description: bonusTier
        ? `四颗${fourOfKindNonFour}点，并兼中${bonusTier}`
        : `四颗骰子同为${fourOfKindNonFour}点`,
      dice,
      counts,
    });
  }

  if (fourCount === 2) {
    return createResult({
      tier: labels.erju,
      rank: rules.ranks.erju,
      displayName: labels.erju,
      description: "两颗骰子为红四",
      dice,
      counts,
    });
  }

  if (fourCount === 1) {
    return createResult({
      tier: labels.yixiu,
      rank: rules.ranks.yixiu,
      displayName: labels.yixiu,
      description: "一颗骰子为红四",
      dice,
      counts,
    });
  }

  return createResult({
    tier: labels.none,
    rank: rules.ranks.none,
    displayName: labels.none,
    description: "这轮没有命中奖项",
    dice,
    counts,
  });
}
