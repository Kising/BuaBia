import "./styles.css";
import { GAME_CONFIG, SITE_CONFIG } from "./config.js";
import { evaluateBobing } from "./rules/evaluateBobing.js";
import { BOBING_RULES } from "./rules/bobingRules.js";
import { BobingAudio } from "./sound/BobingAudio.js";
import { DiceScene } from "./physics/DiceScene.js";
import { diceFace, diceSequence } from "./ui/diceMarkup.js";
import {
  appendRollHistory,
  clearRollHistory,
  loadRollHistory,
  summarizeRollHistory,
} from "./history/rollHistory.js";
import {
  advanceTurn,
  buildMultiplayerStandings,
  createMultiplayerSession,
  loadMultiplayerSession,
  saveMultiplayerSession,
} from "./multiplayer/multiplayer.js";

const app = document.querySelector("#app");
const storedSound = localStorage.getItem(SITE_CONFIG.storageKeys.soundEnabled);
const storedCheatMode = localStorage.getItem(SITE_CONFIG.storageKeys.cheatMode);
const state = {
  rolling: false,
  hasRolled: false,
  soundEnabled: storedSound === null ? true : storedSound === "true",
  cheatMode: storedCheatMode === "true",
  lastResult: null,
  multiplayer: loadMultiplayerSession(localStorage, SITE_CONFIG.storageKeys.multiplayerSession),
  history: loadRollHistory(
    localStorage,
    SITE_CONFIG.storageKeys.rollHistory,
    GAME_CONFIG.maxHistoryEntries,
  ),
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
        <button class="cheat-toggle" type="button" aria-label="开启 Cheat 模式" aria-pressed="false" title="大幅提高红四出现概率"><span aria-hidden="true">四</span><small>Cheat</small></button>
        <button class="multiplayer-button" type="button"><span aria-hidden="true">众</span><small>多人</small></button>
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
        <div class="turn-banner" hidden>
          <span class="turn-banner__round"></span>
          <strong class="turn-banner__player"></strong>
          <span class="turn-banner__hint">请把手机交给这位玩家</span>
        </div>
        <div class="result-card" data-empty="true">
          <p class="eyebrow">本轮结果</p>
          <h1 class="result-title">请开始博饼</h1>
          <p class="result-description">六颗骰子入碗后，将按${BOBING_RULES.variantName}自动判奖。</p>
          <div class="result-dice" aria-label="本轮骰子点数"></div>
        </div>

        <button class="primary-action" type="button">开始博饼</button>
        <p class="hint">支持 Space / Enter 触发</p>
        <p class="responsible-inline">游戏仅供娱乐，请勿参与赌博行为。</p>

        <section class="multiplayer-scoreboard" hidden aria-label="多人模式积分">
          <div class="scoreboard-heading"><span>本局战况</span><strong class="scoreboard-champion">状元待定</strong></div>
          <div class="scoreboard-players"></div>
        </section>

        <details class="history-panel">
          <summary class="history-toggle">
            <span>
              <small>History</small>
              <strong>博饼记录</strong>
            </span>
            <span class="history-count">0 博</span>
          </summary>
          <div class="history-content">
            <p class="history-summary"></p>
            <ol class="history-list" aria-label="最近博饼记录"></ol>
            <p class="history-empty">还没有记录，先博一回。</p>
            <footer class="history-footer">
              <span>记录仅保存在此设备</span>
              <button class="history-clear" type="button" hidden>清空</button>
            </footer>
          </div>
        </details>

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
  <aside class="multiplayer-modal" role="dialog" aria-modal="true" aria-labelledby="multiplayer-title" hidden>
    <div class="rules-modal__handle" aria-hidden="true"></div>
    <div class="rules-modal__header">
      <div><p class="eyebrow">Local Party</p><h2 id="multiplayer-title">本地多人模式</h2></div>
      <button class="icon-button multiplayer-close" type="button" aria-label="关闭多人模式设置">×</button>
    </div>
    <div class="multiplayer-modal__body">
      <form class="multiplayer-form">
        <label class="player-count-label" for="player-count">玩家人数 <span>2</span></label>
        <input id="player-count" name="playerCount" type="range" min="2" max="8" value="2" />
        <div class="player-name-fields"></div>
        <button class="multiplayer-start" type="submit">开始多人博饼</button>
      </form>
      <div class="multiplayer-active" hidden>
        <p class="multiplayer-active__summary"></p>
        <button class="multiplayer-stop" type="button">结束本局并返回单人模式</button>
      </div>
      <p class="responsible-notice">游戏仅供娱乐，请勿参与赌博行为。</p>
    </div>
  </aside>
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
          ${ruleRow("状元", [4, 4, 4, 4, null, null], "四颗红四；余下两骰用于同类比较")}
          ${ruleRow("对堂", [1, 2, 3, 4, 5, 6], "一至六点各一颗")}
          ${ruleRow("三红", [4, 4, 4, null, null, null], "三颗骰子为红四")}
          ${ruleRow("四进", [2, 2, 2, 2, null, null], "四颗相同的非四点数字")}
          ${ruleRow("二举", [4, 4, null, null, null, null], "两颗骰子为红四")}
          ${ruleRow("一秀", [4, null, null, null, null, null], "一颗骰子为红四")}
        </div>
      </section>
      <section>
        <h3>特殊状元</h3>
        <p class="rule-order">以下由低到高排列，插金花为本页面最高状元。</p>
        <div class="rule-list">
          ${ruleRow("四红", [4, 4, 4, 4, null, null], "四颗红四；同类比较余下两骰点数和")}
          ${ruleRow("五子", [6, 6, 6, 6, 6, "X"], "五颗相同非四；同类按余骰 X 比大小")}
          ${ruleRow("五红", [4, 4, 4, 4, 4, "X"], "五颗红四；同类按余骰 X 比大小")}
          ${ruleRow("六勃黑", [6, 6, 6, 6, 6, 6], "六颗相同的非四点数字")}
          ${ruleRow("六勃红", [4, 4, 4, 4, 4, 4], "六颗全部为红四")}
          ${ruleRow("状元插金花", [4, 4, 4, 4, 1, 1], "四颗红四 + 两颗一；最高状元")}
        </div>
        <p class="comparison-note">同类比较点数相同时，以先博得者为大。各地对六勃与插金花的排序可能不同，可在规则配置中调整。</p>
        <p class="rules-note">本页面采用${BOBING_RULES.variantName}；闽南各地区及不同家庭的部分特殊规则可能有所不同。</p>
      </section>
      <section class="developer">
        <h3>Developer</h3>
        <p>${SITE_CONFIG.developer}</p>
      </section>
      <p class="responsible-notice">游戏仅供娱乐，请勿参与赌博行为。</p>
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
const resultEyebrow = resultCard.querySelector(".eyebrow");
const resultTitle = document.querySelector(".result-title");
const resultDescription = document.querySelector(".result-description");
const resultDice = document.querySelector(".result-dice");
const primaryAction = document.querySelector(".primary-action");
const soundToggle = document.querySelector(".sound-toggle");
const cheatToggle = document.querySelector(".cheat-toggle");
const multiplayerButton = document.querySelector(".multiplayer-button");
const multiplayerModal = document.querySelector(".multiplayer-modal");
const multiplayerClose = document.querySelector(".multiplayer-close");
const multiplayerForm = document.querySelector(".multiplayer-form");
const multiplayerActive = document.querySelector(".multiplayer-active");
const multiplayerActiveSummary = document.querySelector(".multiplayer-active__summary");
const multiplayerStop = document.querySelector(".multiplayer-stop");
const playerCount = document.querySelector("#player-count");
const playerCountValue = document.querySelector(".player-count-label span");
const playerNameFields = document.querySelector(".player-name-fields");
const turnBanner = document.querySelector(".turn-banner");
const turnRound = document.querySelector(".turn-banner__round");
const turnPlayer = document.querySelector(".turn-banner__player");
const turnHint = document.querySelector(".turn-banner__hint");
const scoreboard = document.querySelector(".multiplayer-scoreboard");
const scoreboardChampion = document.querySelector(".scoreboard-champion");
const scoreboardPlayers = document.querySelector(".scoreboard-players");
const rulesButton = document.querySelector(".rules-button");
const rulesModal = document.querySelector(".rules-modal");
const rulesClose = document.querySelector(".rules-close");
const modalBackdrop = document.querySelector(".modal-backdrop");
const debugPanel = document.querySelector(".debug-panel");
const debugOutput = document.querySelector(".debug-output");
const confetti = document.querySelector(".confetti");
const historyPanel = document.querySelector(".history-panel");
const historyCount = document.querySelector(".history-count");
const historySummary = document.querySelector(".history-summary");
const historyList = document.querySelector(".history-list");
const historyEmpty = document.querySelector(".history-empty");
const historyClear = document.querySelector(".history-clear");
let clearHistoryArmed = false;
let clearHistoryTimer = null;

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
syncCheatButton();
renderPlayerNameFields();
renderMultiplayer();
renderHistory();
historyPanel.open = state.history.length > 0;

primaryAction.addEventListener("click", () => roll());
soundToggle.addEventListener("click", toggleSound);
cheatToggle.addEventListener("click", toggleCheatMode);
multiplayerButton.addEventListener("click", openMultiplayer);
multiplayerClose.addEventListener("click", closeMultiplayer);
multiplayerForm.addEventListener("submit", startMultiplayer);
multiplayerStop.addEventListener("click", stopMultiplayer);
playerCount.addEventListener("input", renderPlayerNameFields);
rulesButton.addEventListener("click", openRules);
rulesClose.addEventListener("click", closeRules);
modalBackdrop.addEventListener("click", closeOpenModal);
document.addEventListener("keydown", handleKeyDown);
debugPanel.addEventListener("submit", handleDebug);
historyClear.addEventListener("click", handleClearHistory);

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
  cheatToggle.disabled = true;
  primaryAction.textContent = "博饼中……";

  await audio.unlock();
  audio.playStartChime();

  const cheatModeForRoll = state.cheatMode;
  const activePlayer = state.multiplayer?.players[state.multiplayer.currentIndex] || null;
  if (activePlayer) {
    resultEyebrow.textContent = `${activePlayer.name} · 本轮结果`;
    turnHint.textContent = "正在博饼";
    turnPlayer.textContent = activePlayer.name;
  } else {
    resultEyebrow.textContent = "本轮结果";
  }
  const dice = await scene.roll({ cheatMode: cheatModeForRoll });
  const result = evaluateBobing(dice);

  window.setTimeout(() => {
    state.lastResult = result;
    showResult(result);
    state.history = appendRollHistory(
      localStorage,
      SITE_CONFIG.storageKeys.rollHistory,
      result,
      GAME_CONFIG.maxHistoryEntries,
      Date.now(),
      {
        cheatMode: cheatModeForRoll,
        sessionId: state.multiplayer?.id,
        playerId: activePlayer?.id,
        playerName: activePlayer?.name,
      },
    );
    if (state.multiplayer) {
      state.multiplayer = advanceTurn(state.multiplayer);
      saveMultiplayerSession(localStorage, SITE_CONFIG.storageKeys.multiplayerSession, state.multiplayer);
      renderMultiplayer();
    }
    renderHistory();
    state.rolling = false;
    state.hasRolled = true;
    primaryAction.disabled = false;
    cheatToggle.disabled = false;
    primaryAction.textContent = state.multiplayer
      ? `${state.multiplayer.players[state.multiplayer.currentIndex].name} 开始博饼`
      : "再博一次";
  }, GAME_CONFIG.resultDelayMs);
}

function renderHistory() {
  const summary = summarizeRollHistory(state.history, BOBING_RULES.labels.none);
  historyCount.textContent = `${summary.total} 博`;
  historySummary.textContent = summary.total
    ? summary.rewarded
      ? `中奖 ${summary.rewarded} 次${summary.topRewards.length ? ` · ${summary.topRewards.join(" · ")}` : ""}`
      : "尚未中奖，再博一次试试。"
    : "";
  historyEmpty.hidden = summary.total > 0;
  historyClear.hidden = summary.total === 0;
  historyList.replaceChildren();

  state.history.slice(0, 12).forEach((entry) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const resultBlock = document.createElement("div");
    resultBlock.className = "history-item__result";
    const name = document.createElement("strong");
    name.textContent = entry.displayName;
    if (entry.cheatMode) {
      const cheatBadge = document.createElement("span");
      cheatBadge.className = "history-cheat";
      cheatBadge.textContent = "Cheat";
      name.append(cheatBadge);
    }
    const time = document.createElement("time");
    time.dateTime = new Date(entry.timestamp).toISOString();
    time.textContent = new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(entry.timestamp);
    resultBlock.append(name, time);
    if (entry.playerName) {
      const player = document.createElement("span");
      player.className = "history-player";
      player.textContent = entry.playerName;
      resultBlock.prepend(player);
    }

    const dice = document.createElement("div");
    dice.className = "history-item__dice";
    dice.setAttribute("aria-label", `骰子点数 ${entry.dice.join("、")}`);
    dice.innerHTML = diceSequence(entry.dice, { small: true });
    item.append(resultBlock, dice);
    historyList.append(item);
  });
}

function handleClearHistory() {
  if (!clearHistoryArmed) {
    clearHistoryArmed = true;
    historyClear.textContent = "再次点击确认";
    window.clearTimeout(clearHistoryTimer);
    clearHistoryTimer = window.setTimeout(resetClearHistoryButton, 3000);
    return;
  }

  state.history = clearRollHistory(localStorage, SITE_CONFIG.storageKeys.rollHistory);
  resetClearHistoryButton();
  renderHistory();
}

function resetClearHistoryButton() {
  clearHistoryArmed = false;
  historyClear.textContent = "清空";
  window.clearTimeout(clearHistoryTimer);
  clearHistoryTimer = null;
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

function toggleCheatMode() {
  if (state.rolling) return;
  state.cheatMode = !state.cheatMode;
  localStorage.setItem(SITE_CONFIG.storageKeys.cheatMode, String(state.cheatMode));
  syncCheatButton();
}

function syncCheatButton() {
  cheatToggle.classList.toggle("cheat-toggle--active", state.cheatMode);
  cheatToggle.setAttribute("aria-label", state.cheatMode ? "关闭 Cheat 模式" : "开启 Cheat 模式");
  cheatToggle.setAttribute("aria-pressed", String(state.cheatMode));
}

function renderPlayerNameFields() {
  const count = Number(playerCount.value);
  const existing = [...playerNameFields.querySelectorAll("input")].map((input) => input.value);
  playerCountValue.textContent = String(count);
  playerNameFields.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const label = document.createElement("label");
    label.textContent = `玩家 ${index + 1}`;
    const input = document.createElement("input");
    input.name = `player-${index}`;
    input.maxLength = 12;
    input.required = true;
    input.autocomplete = "off";
    input.value = existing[index] || `玩家 ${index + 1}`;
    label.append(input);
    playerNameFields.append(label);
  }
}

function openMultiplayer() {
  multiplayerForm.hidden = Boolean(state.multiplayer);
  multiplayerActive.hidden = !state.multiplayer;
  if (state.multiplayer) {
    multiplayerActiveSummary.textContent = `第 ${state.multiplayer.round} 轮 · ${state.multiplayer.players.length} 位玩家 · 当前轮到 ${state.multiplayer.players[state.multiplayer.currentIndex].name}`;
  }
  modalBackdrop.hidden = false;
  multiplayerModal.hidden = false;
  document.body.classList.add("modal-open");
  (state.multiplayer ? multiplayerStop : playerCount).focus();
}

function closeMultiplayer() {
  multiplayerModal.hidden = true;
  modalBackdrop.hidden = rulesModal.hidden;
  document.body.classList.toggle("modal-open", !rulesModal.hidden);
  multiplayerButton.focus();
}

function startMultiplayer(event) {
  event.preventDefault();
  const names = [...playerNameFields.querySelectorAll("input")].map((input) => input.value);
  state.multiplayer = createMultiplayerSession(names);
  saveMultiplayerSession(localStorage, SITE_CONFIG.storageKeys.multiplayerSession, state.multiplayer);
  state.hasRolled = false;
  renderMultiplayer();
  closeMultiplayer();
}

function stopMultiplayer() {
  state.multiplayer = saveMultiplayerSession(
    localStorage,
    SITE_CONFIG.storageKeys.multiplayerSession,
    null,
  );
  state.hasRolled = false;
  renderMultiplayer();
  closeMultiplayer();
}

function renderMultiplayer() {
  const active = Boolean(state.multiplayer);
  multiplayerButton.classList.toggle("multiplayer-button--active", active);
  multiplayerButton.setAttribute("aria-pressed", String(active));
  turnBanner.hidden = !active;
  scoreboard.hidden = !active;
  if (!active) {
    primaryAction.textContent = state.hasRolled ? "再博一次" : "开始博饼";
    return;
  }

  const player = state.multiplayer.players[state.multiplayer.currentIndex];
  turnRound.textContent = `第 ${state.multiplayer.round} 轮`;
  turnPlayer.textContent = player.name;
  turnHint.textContent = "请把手机交给这位玩家";
  primaryAction.textContent = `${player.name} 开始博饼`;

  const standings = buildMultiplayerStandings(state.multiplayer, state.history);
  scoreboardChampion.textContent = standings.champion
    ? `当前状元：${standings.champion.player.name} · ${standings.champion.result.displayName}`
    : "当前状元：尚未产生";
  scoreboardPlayers.replaceChildren();
  standings.players.forEach((standing, index) => {
    const row = document.createElement("div");
    row.className = "scoreboard-player";
    if (standing.id === player.id) row.classList.add("scoreboard-player--current");
    const order = document.createElement("span");
    order.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("strong");
    name.textContent = standing.name;
    const tally = document.createElement("span");
    tally.textContent = `${standing.rolls} 博 · ${standing.rewardSummary || "暂无奖励"}`;
    row.append(order, name, tally);
    scoreboardPlayers.append(row);
  });
}

function openRules() {
  multiplayerModal.hidden = true;
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

function closeOpenModal() {
  if (!multiplayerModal.hidden) closeMultiplayer();
  else if (!rulesModal.hidden) closeRules();
}

function handleKeyDown(event) {
  if (event.key === "Escape" && (!rulesModal.hidden || !multiplayerModal.hidden)) {
    closeOpenModal();
    return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if ((event.key === " " || event.key === "Enter") && rulesModal.hidden && multiplayerModal.hidden) {
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
