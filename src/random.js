export function randomDiceResults(count = 6) {
  const values = new Uint32Array(count);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => (value % 6) + 1);
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

export function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
