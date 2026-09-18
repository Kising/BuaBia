const PIPS = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "middle-left", "bottom-left", "top-right", "middle-right", "bottom-right"],
};

export function diceFace(value, { small = false } = {}) {
  const dots = PIPS[value]
    .map((position) => `<span class="mini-die__pip mini-die__pip--${position}"></span>`)
    .join("");
  return `<span class="mini-die ${small ? "mini-die--small" : ""} mini-die--${value}" aria-label="${value}点">${dots}</span>`;
}

export function diceSequence(values, options) {
  return values.map((value) => diceFace(value, options)).join("");
}
