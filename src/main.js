import "./styles.css";
import { GAME_CONFIG, SITE_CONFIG } from "./config.js";
import { randomDiceResults } from "./random.js";
import { evaluateBobing } from "./rules/evaluateBobing.js";
import { BOBING_RULES } from "./rules/bobingRules.js";
import { BobingAudio } from "./sound/BobingAudio.js";
import { DiceScene } from "./physics/DiceScene.js";
import { diceFace, diceSequence } from "./ui/diceMarkup.js";

const app = document.querySelector("#app");
const storedSound = localStorage.getItem(SITE_CONFIG.storageKeys.soundEnabled);
const state = {
  rolling: false,
  hasRolled: false,
  soundEnabled: storedSound === null ? true : storedSound === "true",
  lastResult: null,
};

app.innerHTML = `
  <div class="shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="${SITE_CONFIG.title} 首页">
        <span class="brand__title">${SITE_CONFIG.title}</span>
        <span class="brand__subtitle">${SITE_CONFIG.subtitle}</span>
      </a>
      <nav class="header-actions" aria-label="页面操作">
        <button class="icon-button sound-toggle" type="button" aria-label="关闭音效" aria-pressed="true">🔊</button>
        <button class="rules-button" type="button">博饼规则</button>
      </nav>
    </header>

    <main class="game-layout">
      <section class="game-stage" aria-label="博饼游戏区域">
        <div class="stage-ornament stage-ornament--moon" aria-hidden="true"></div>
        <div class="stage-ornament stage-ornament--cloud" aria-hidden="true"></div>
        <div class="canvas-wrap">
          <canvas id="dice-canvas" aria-label="六颗骰子在红色瓷碗中滚动"></canvas>
          <div class="confetti" aria-hidden="true"></div>
        </div>
      </section>

      <section class="control-panel" aria-live="polite">
        <div class="result-card" data-empty="true">
          <p class="eyebrow">本轮结果</p>
          <h1 class="result-title">请开始博饼</h1>
          <p class="result-description">六颗骰子入碗后，将按${BOBING_RULES.variantName}自动判奖。</p>
          <div class="result-dice" aria-label="本轮骰子点数"></div>
        </div>

        <button class="primary-action" type="button">开始博饼</button>
        <p class="hint">支持 Space / Enter 触发</p>

        <form class="debug-panel" hidden>
          <label for="debug-dice">Debug Panel</label>
          <div class="debug-panel__row">
            <input id="debug-dice" name="dice" inputmode="numeric" value="4,4,4,4,1,1" aria-label="输入六颗骰子点数" />
            <button type="submit">Test</button>
          </div>
          <output class="debug-output" aria-live="polite"></output>
        </form>
      </section>
    </main>
  </div>

  <div class="modal-backdrop" hidden></div>
  <aside class="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" hidden>
    <div class="rules-modal__handle" aria-hidden="true"></div>
    <div class="rules-modal__header">
      <div>
        <p class="eyebrow">Rules</p>
        <h2 id="rules-title">博饼规则</h2>
      </div>
      <button class="icon-button rules-close" type="button" aria-label="关闭规则">×</button>
    </div>
    <div class="rules-modal__body">
      <section>
        <h3>什么是博饼</h3>
        <p>博饼是流行于闽南地区的中秋传统民俗活动，参与者将六颗骰子掷入瓷碗，根据骰子组合获得对应的科举名称奖项。</p>
      </section>
      <section>
        <h3>基础奖项</h3>
        <div class="rule-list">
          ${ruleRow("状元", [4, 4, 4, 4, 2, 6], "四颗红四或更高特殊组合")}
          ${ruleRow("对堂", [1, 2, 3, 4, 5, 6], "一至六点各一颗")}
          ${ruleRow("三红", [4, 4, 4, 1, 2, 6], "三颗骰子为红四")}
          ${ruleRow("四进", [2, 2, 2, 2, 3, 6], "四颗相同的非四点数字")}
          ${ruleRow("二举", [4, 4, 1, 2, 3, 5], "两颗骰子为红四")}
          ${ruleRow("一秀", [4, 1, 2, 3, 5, 6], "一颗骰子为红四")}
        </div>
      </section>
      <section>
        <h3>特殊状元</h3>
        <div class="rule-list">
          ${ruleRow("四红", [4, 4, 4, 4, 2, 6], "四颗红四")}
          ${ruleRow("五子", [6, 6, 6, 6, 6, 2], "五颗相同的非四点数字")}
          ${ruleRow("五红", [4, 4, 4, 4, 4, 6], "五颗红四")}
          ${ruleRow("插金花", [4, 4, 4, 4, 1, 1], "四颗红四 + 两颗一")}
          ${ruleRow("六勃红", [4, 4, 4, 4, 4, 4], "六颗全部为红四")}
          ${ruleRow("六勃黑", [6, 6, 6, 6, 6, 6], "六颗相同的非四点数字")}
        </div>
        <p class="rules-note">本页面采用${BOBING_RULES.variantName}；闽南各地区及不同家庭的部分特殊规则可能有所不同。</p>
      </section>
      <section class="developer">
        <h3>Developer</h3>
        <p>${SITE_CONFIG.developer}</p>
      </section>
    </div>
  </aside>
`;

function ruleRow(name, values, description) {
  return `
    <article class="rule-row">
      <div>
        <strong>${name}</strong>
        <span>${description}</span>
      </div>
      <div class="rule-dice" aria-label="${name} 示例">${diceSequence(values, { small: true })}</div>
    </article>
  `;
}

const canvas = document.querySelector("#dice-canvas");
const stage = document.querySelector(".game-stage");
const resultCard = document.querySelector(".result-card");
const resultTitle = document.querySelector(".result-title");
const resultDescription = document.querySelector(".result-description");
const resultDice = document.querySelector(".result-dice");
const primaryAction = document.querySelector(".primary-action");
const soundToggle = document.querySelector(".sound-toggle");
const rulesButton = document.querySelector(".rules-button");
const rulesModal = document.querySelector(".rules-modal");
const rulesClose = document.querySelector(".rules-close");
const modalBackdrop = document.querySelector(".modal-backdrop");
const debugPanel = document.querySelector(".debug-panel");
const debugOutput = document.querySelector(".debug-output");
const confetti = document.querySelector(".confetti");

const audio = new BobingAudio({ enabled: state.soundEnabled });
const scene = new DiceScene(canvas, {
  onCollision: ({ impact, pan }) => {
    audio.playCeramicHit({
      intensity: Math.min(1, impact / 5.8),
      pan,
      pitch: 0.88 + Math.min(0.48, impact / 13),
    });
  },
});

if (import.meta.env.DEV) {
  window.__BOBING_DEBUG__ = { scene };
}

if (GAME_CONFIG.debugPanel) {
  debugPanel.hidden = false;
}

syncSoundButton();

primaryAction.addEventListener("click", () => roll());
soundToggle.addEventListener("click", toggleSound);
rulesButton.addEventListener("click", openRules);
rulesClose.addEventListener("click", closeRules);
modalBackdrop.addEventListener("click", closeRules);
document.addEventListener("keydown", handleKeyDown);
debugPanel.addEventListener("submit", handleDebug);

async function roll() {
  if (state.rolling) return;

  state.rolling = true;
  stage.classList.remove("game-stage--zhuangyuan", "game-stage--strong", "game-stage--medium", "game-stage--soft");
  resultCard.dataset.empty = "false";
  resultCard.classList.remove("result-card--enter");
  resultTitle.textContent = "博饼中……";
  resultDescription.textContent = "骰声入碗，稍候开奖。";
  resultDice.innerHTML = "";
  primaryAction.disabled = true;
  primaryAction.textContent = "博饼中……";

  await audio.unlock();
  audio.playStartChime();

  const dice = randomDiceResults(6);
  const result = evaluateBobing(dice);
  await scene.roll(dice);

  window.setTimeout(() => {
    state.lastResult = result;
    showResult(result);
    state.rolling = false;
    state.hasRolled = true;
    primaryAction.disabled = false;
    primaryAction.textContent = "再博一次";
  }, GAME_CONFIG.resultDelayMs);
}

function showResult(result) {
  const isZhuangyuan = result.tier === BOBING_RULES.labels.zhuangyuan;
  const title = result.tier === BOBING_RULES.labels.none ? "这轮无奖" : isZhuangyuan ? "状元！" : result.displayName;
  const description = result.tier === BOBING_RULES.labels.none ? "再博一次试试" : result.description;

  resultTitle.textContent = title;
  resultDescription.innerHTML = isZhuangyuan
    ? `<span>${result.displayName === "状元" ? "状元 · 四红" : result.displayName}</span><small>${description}</small>`
    : description;
  resultDice.innerHTML = diceSequence(result.dice);
  resultCard.classList.remove("result-card--enter");
  requestAnimationFrame(() => resultCard.classList.add("result-card--enter"));

  const feedbackClass = feedbackClassFor(result);
  if (feedbackClass) {
    stage.classList.add(feedbackClass);
  }
  if (isZhuangyuan) {
    burstConfetti();
    if (navigator.vibrate) navigator.vibrate([26, 30, 24]);
  }
}

function feedbackClassFor(result) {
  if (result.tier === BOBING_RULES.labels.zhuangyuan) return "game-stage--zhuangyuan";
  if (result.tier === BOBING_RULES.labels.duitang) return "game-stage--strong";
  if ([BOBING_RULES.labels.sanhong, BOBING_RULES.labels.sijin].includes(result.tier)) return "game-stage--medium";
  if ([BOBING_RULES.labels.erju, BOBING_RULES.labels.yixiu].includes(result.tier)) return "game-stage--soft";
  return "";
}

function burstConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti.innerHTML = Array.from({ length: 22 }, (_, index) => {
    const angle = (index / 22) * Math.PI * 2;
    const distance = 58 + Math.random() * 84;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const delay = Math.random() * 120;
    return `<span style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--delay:${delay.toFixed(0)}ms"></span>`;
  }).join("");
  window.setTimeout(() => {
    confetti.innerHTML = "";
  }, GAME_CONFIG.bowlGlowMs);
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SITE_CONFIG.storageKeys.soundEnabled, String(state.soundEnabled));
  audio.setEnabled(state.soundEnabled);
  syncSoundButton();
}

function syncSoundButton() {
  soundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-label", state.soundEnabled ? "关闭音效" : "开启音效");
  soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
}

function openRules() {
  modalBackdrop.hidden = false;
  rulesModal.hidden = false;
  document.body.classList.add("modal-open");
  rulesClose.focus();
}

function closeRules() {
  modalBackdrop.hidden = true;
  rulesModal.hidden = true;
  document.body.classList.remove("modal-open");
  rulesButton.focus();
}

function handleKeyDown(event) {
  if (event.key === "Escape" && !rulesModal.hidden) {
    closeRules();
    return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if ((event.key === " " || event.key === "Enter") && rulesModal.hidden) {
    event.preventDefault();
    roll();
  }
}

function handleDebug(event) {
  event.preventDefault();
  const formData = new FormData(debugPanel);
  const dice = String(formData.get("dice"))
    .split(",")
    .map((value) => Number(value.trim()));

  try {
    const result = evaluateBobing(dice);
    debugOutput.innerHTML = `${diceSequence(result.dice, { small: true })}<span>${result.displayName}：${result.description}</span>`;
  } catch (error) {
    debugOutput.textContent = error.message;
  }
}
