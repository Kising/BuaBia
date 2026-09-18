# 博饼 | 闽南中秋传统网页小游戏

一个可直接部署到 GitHub Pages 的纯静态“博饼”网页小游戏。项目使用 Three.js 构建红色瓷碗与真实 3D 骰子，cannon-es 负责重力、碰撞、摩擦与滚动，Web Audio API 程序化生成清脆的骰子碰碗音效。

## 技术栈

- Vite
- Three.js
- cannon-es
- Web Audio API
- Vitest
- 原生 HTML/CSS/JavaScript

## 本地运行

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址即可游玩。

## 测试

```bash
npm test
```

测试覆盖 `evaluateBobing()` 的主要博饼组合，包括对堂、一秀、二举、三红、四进、状元插金花、五红、五子、六勃红、六勃黑，也会验证六颗骰子的停稳点互不重叠且位于碗内。

启动开发服务器后，可以另开一个终端运行浏览器回归测试：

```bash
npm run test:e2e
```

该测试会在 390 × 844 的移动端视口连续博饼六轮，检查骰子间距、碗内边界、横向溢出和控制台错误。

## 构建

```bash
npm run build
```

构建产物位于 `dist/`。`vite.config.js` 会在 GitHub Actions 中根据 `GITHUB_REPOSITORY` 自动设置 GitHub Pages 子路径，平时本地构建使用相对路径。

## GitHub Pages 部署

### 方式一：GitHub Actions

项目已包含 `.github/workflows/pages.yml`。

1. 创建 GitHub repository。
2. 将项目 push 到 `main` 分支。
3. 进入 `Settings → Pages`。
4. `Build and deployment` 选择 `GitHub Actions`。
5. 等待 Actions 完成后，在 Pages 页面获取公开访问 URL。

### 方式二：main branch / docs

也可以本地运行 `npm run build`，将 `dist/` 的内容放到仓库根目录或 `docs/` 目录，再在 `Settings → Pages` 中选择对应分支和目录。

## 项目结构

```text
.
├── .github/workflows/pages.yml
├── index.html
├── public/favicon.svg
├── src
│   ├── config.js
│   ├── main.js
│   ├── random.js
│   ├── styles.css
│   ├── physics/DiceScene.js
│   ├── rules/bobingRules.js
│   ├── rules/evaluateBobing.js
│   ├── sound/BobingAudio.js
│   └── ui/diceMarkup.js
├── e2e/physics.spec.js
├── test
│   ├── diceLayout.test.js
│   └── evaluateBobing.test.js
├── package.json
└── vite.config.js
```

## 判奖规则

规则入口为 `src/rules/evaluateBobing.js`，配置集中在 `src/rules/bobingRules.js`。

当前采用晋江常见玩法，并在规则面板中提示闽南各地及不同家庭的特殊规则可能不同。判奖优先级为：特殊状元与高级状元、对堂、三红、四进、二举、一秀、无奖。四进兼中一秀或二举的行为由 `allowFourOfKindBonusFour` 配置控制。

## 开发调试

开发环境下页面会显示 Debug Panel，可输入类似 `4,4,4,4,1,1` 的六颗骰子点数并直接查看判奖结果。生产构建不会显示该面板。
