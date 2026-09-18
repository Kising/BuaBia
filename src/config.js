export const SITE_CONFIG = {
  title: "博饼",
  subtitle: "闽南中秋传统民俗",
  developer: "Kising Zhang",
  storageKeys: {
    soundEnabled: "bobing:sound-enabled",
    cheatMode: "bobing:cheat-mode",
    rollHistory: "bobing:roll-history",
  },
};

export const GAME_CONFIG = {
  diceCount: 6,
  resultDelayMs: 420,
  maxDevicePixelRatio: 2,
  throwDurationMs: 3000,
  minimumRollDurationMs: 2200,
  maximumRollDurationMs: 4700,
  stableDurationMs: 420,
  cheatFourProbability: 0.72,
  maxHistoryEntries: 40,
  debugPanel: import.meta.env.DEV,
  bowlGlowMs: 1800,
};

export const PHYSICS_CONFIG = {
  timeStep: 1 / 60,
  maxSubSteps: 5,
  gravity: -13.6,
  diceSize: 0.64,
  bowlRadius: 2.55,
  bowlInnerRadius: 2.18,
  bowlContainmentRadius: 1.78,
  settleRadius: 1.48,
  settleMinDistance: 0.98,
  bowlWallHeight: 5,
  wallSegments: 40,
  throwHeight: 2.85,
};
