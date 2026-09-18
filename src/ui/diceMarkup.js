const PIPS = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "middle-left", "bottom-left", "top-right", "middle-right", "bottom-right"],
};

export function diceFace(value, { small = false } = {}) {
  const sizeClass = small ? "mini-die--small" : "";
  if (value === null) {
    return `<span class="mini-die ${sizeClass} mini-die--blank" aria-label="空位"></span>`;
  }
  if (value === "X") {
    return `<span class="mini-die ${sizeClass} mini-die--wild" aria-label="任意点数"><span class="mini-die__wild">X</span></span>`;
  }

  const dots = PIPS[value]
    .map((position) => `<span class="mini-die__pip mini-die__pip--${position}"></span>`)
    .join("");
  return `<span class="mini-die ${sizeClass} mini-die--${value}" aria-label="${value}点">${dots}</span>`;
}

export function diceSequence(values, options) {
  return values.map((value) => diceFace(value, options)).join("");
}
