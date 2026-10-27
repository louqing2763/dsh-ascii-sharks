# dsh-ascii-sharks

把一片 ASCII 海洋放到 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web 介面後面：逐格光柵化的魚群與鯊魚、會隨對話節奏起浪的潮汐、還有把訊息表面換成液態玻璃。

引擎移植自 [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks)（MIT，零依賴 canvas 專案）。

## 功能

| | |
|---|---|
| **背景** | 整片海掛在 `body` 的底層，三欄面板透出海面；魚群、鯊魚、格線全部逐格光柵化，跟上游同一套顆粒 |
| **思考潮汐** | 我正在生成時，鯊魚改為主動追獵魚群、海面起浪；停下來約 1.5 秒退潮，被吃掉的魚之後從畫面邊緣成群游回 |
| **液態玻璃** | 回覆卡片、使用者氣泡、工具卡、輸入框各自一塊毛玻璃：染色 + 上緣反光 + 落影 |
| **互動** | 滑鼠靠近魚群會散開；點水面會有漣漪 |
| **可調** | 設定 → ascii-sharks：海面亮度、飽和、左欄不透明度、文字區濃度、左欄模糊、對話區玻璃、魚的體型／數量、鯊魚體型、思考聯動、更新率、閒置降頻、滑鼠互動、點擊濺水 |
| **乾淨卸載** | 關掉外掛會移除 canvas、`<style>`、body 屬性與所有 CSS 變數 |

## 安裝

### 1. 插件市場索引（推薦）

在「設定 → 插件市場 → 索引源」加入：

```
https://raw.githubusercontent.com/louqing2763/dsh-ascii-sharks/main/market.json
```

然後到「發現」頁安裝 `dsh-ascii-sharks`。

### 2. 本機路徑或 tarball

側欄 → **外掛** → **添加外掛**，貼上其中一種：

```
# 原始碼目錄（開發時）
C:\path\to\dsh-ascii-sharks

# 打包檔
C:\path\to\dsh-ascii-sharks-0.1.0.tgz
```

安裝 → 啟用 → **整個 App 關掉再開**。

### 3. Git

```
dsh plugin --profile <name> add "git+https://github.com/louqing2763/dsh-ascii-sharks"
```

> 桌面版的 `desktop` profile 由 App 獨佔管理，CLI 會拒絕；請用 App 內的「添加外掛」。

## 建置

```
node build.mjs
```

用 Node 24 的 `module.stripTypeScriptTypes`（`transform` 模式，支援 constructor 的 parameter properties）把 `src/*.ts` 轉成 JS，再用一支 80 行的 mini-bundler 包成 DSH 的 Lazy-CJS 格式（`window.__ModuleLoader__.load({ id, factory(require) })`）。**不需要 `npm install`，沒有任何建置依賴。**

## 宿主契約

用到的都是宿主提供的穩定 hook：

| 用途 | 選擇器 |
|---|---|
| 外框 | `div:has(> [data-shell-overlay])` |
| 中欄 / 左欄 | `div:has(> [data-slot='main'])` / `[data-slot='sidebar']` |
| 對話面板根（會自己畫 `bg-base`） | `[data-phase]` |
| 訊息列 | `[data-chat-flow-kind]`（`user…` / `turn-process` / 其他） |
| 使用者氣泡 | `[class*='_bubble']`（宿主的 class 是雜湊前綴 + 固定後綴） |
| 底部淡出遮罩 | `[class*='_fade']`（宿主把內容淡出到自己的底色，會蓋出黑邊，這裡打掉） |
| 思考中訊號 | `[data-streaming]`（只在 reasoning 串流時存在） |
| 捲動區 | `[data-conversation-scroll]` |

## 已知限制

- **視窗底部約 30px 的黑帶不是本外掛畫的**。洋紅測試證明畫布鋪到該處、DOM 掃描證明沒有任何元素上色，關閉外掛也依然存在——那是宿主自己的表面，外掛碰不到。目前用「海往邊緣沉成深海藍」讓接縫消失。
- 多智能體（subagent）的思考不在主對話快照裡，所以潮汐只反映主對話。
- DSH 升級若改了上表的 `data-*` 或 class 後綴，需要重對一次選擇器。

## 授權

MIT。引擎 `src/{math,species,world,renderer}.ts` 來自 upstream，版權見 [LICENSE](LICENSE)。
