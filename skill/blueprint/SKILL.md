---
name: blueprint
description: >
  Scaffold a new web page/project with one of five preset structures (pitch / prototype / dossier / briefing / archive),
  all sharing the user's unified design system (Inter + JetBrains Mono, neutral palette, blue accent).
  briefing adds a single-file slide-deck preset for internal docs; archive compiles a Markdown corpus into a searchable single-file reader.
  Use when: user says "blueprint", "new page", "start a new site", "新建一个网页", "起一个原型",
  "做个 pitch", "做个调研页", "做个 briefing", "内部说明页", "职责边界页", "新项目脚手架", or wants to spin up a fresh
  HTML/React project that follows their established visual conventions. Collects only missing
  topic, preset, or output-path inputs before generating. Do NOT use for editing existing projects
  (use the project's own conventions) or for non-web outputs.
---

**回复语言**：与用户对话用中文。生成的代码、注释、文件名、git 文本一律英文。

# blueprint

把用户已经收敛的「单文件 HTML / 单文件 React Demo / Vite+React+TS Dossier / 单文件 Briefing Deck」四种工作模式固化为可复用脚手架。`pitch` / `prototype` / `dossier` 共享默认 Design System；`briefing` 额外使用 `shared/themes/briefing.md`。新加风格 = 新加一个 preset 或 theme 文件，不动核心。

Also supports `archive`: Markdown corpus compiled to a searchable single-file reader with `shared/themes/win98-web.md`.

## 输入收集

只收集会改变结果且用户尚未提供的信息。不要重复询问已明确的 topic、preset 或路径。

优先使用当前环境可用的结构化用户提问工具；没有该工具时，用一条简短消息一次问完缺失项。最多一次阻塞提问。

需要的信息：

1. **Topic**：一句话主题，例如“面向投资人介绍 Forge 的 pitch”或“产品与市场职责边界说明”。
2. **输出目录**：用户未指定时，demo / example / scratch 默认放当前仓库 `.local/<slug>`；独立项目才询问目标目录。
3. **Preset**：`pitch` / `prototype` / `dossier` / `briefing`。用户已点名或主题唯一命中推荐规则时直接采用，不再确认。
   Also accept `archive` when the topic is a Markdown corpus / docs library / searchable document set.

### Preset 推荐规则

根据 topic 匹配关键词。唯一命中时直接采用并说明一句理由；多项命中或完全不命中时，才问用户主要受众。

| 关键词命中 | 推荐 | 理由 |
|---|---|---|
| 投资人 / 路演 / pitch / 一页 / 介绍 X 是什么 / landing | `pitch` | 单页叙事，最快出活 |
| 原型 / 交互 / Demo / Tab / 点击 / mock UI | `prototype` | 可点击演示，单文件易迭代 |
| 调研 / 对比 / teardown / 尽调 / 白皮书 / dossier / 报告 / 多页 | `dossier` | 数据驱动，能长期维护 |
| 职责 / 边界 / 对齐 / 说明 / 工作坊 / RACI / 治理 / 流程澄清 / briefing / 教案 / 观察记录 | `briefing` | 全屏 slide 说明页，中性页型库 |
| docs corpus / Markdown folder / archive / knowledge base / multi-doc report / search docs | `archive` | Compile Markdown into a browsable single-file archive |
| 都不命中或同时命中多个 | 问用户：「主要给谁看？投资人 / 可点击演示 / 长期研究文档 / 内部说明对齐」 | — |
| no hit or multiple hits including archive | Ask: primary audience — investors / clickable demo / long-form research / internal alignment / Markdown corpus | — |

### Prototype 子档位

再问一次：

- 单页面、交互态 ≤3 个、做完就归档 → **prototype-lite**（单文件 HTML + React/Babel CDN）
- 多页面或要持续加功能 → **prototype-full**（Vite + React + TS，等同 dossier 栈）

如果用户没明确，默认 **prototype-lite**（vibe coding 哲学：能简就简）。

### Briefing 无额外皮肤选择

`briefing` **只有一套 theme**（`shared/themes/briefing.md`）。不要再问 ink/paper/深浅色。
`archive` has one theme only (`shared/themes/win98-web.md`). Do not ask for OS skin variants.

## 生成

确认后：

1. 先执行 `blueprint --version`。命令不可用时停止生成，明确告知用户需要安装 blueprint；不要退回复制旧模板。
2. Load `shared/design-system.md` —— 所有 preset 的基础约束。
3. 若 preset = `briefing`，再 Load `shared/themes/briefing.md`（覆盖/扩展 token 与 slide 组件；以 theme 为准）。
   If preset = `archive`, also Load `shared/themes/win98-web.md`.
4. Load `presets/<preset>.md` —— 包含 source contract 与内容规则。
5. 在指定目录生成项目。**目录非空时停下问用户**，不要覆盖。
6. `pitch` / `briefing` 只写 `src/` 语义源，再调用 `blueprint create <preset> <output>` 生成根目录 `index.html`，随后执行 `blueprint check <output>/index.html`。不要手写或复制 shared CSS/runtime。
   Same for `archive`: write `src/` semantic sources only, then `blueprint create archive <output>` and `blueprint check <output>/index.html`.
7. `prototype` / `dossier` 先调用对应的 `blueprint create prototype-lite|prototype-full|dossier <output>`，再按 preset 文档填充真实内容。不要手写工具链骨架。
8. `blueprint create` maintains `.blueprint.json` at the project root. Do not hand-write, delete, or copy that file to create a new project.
9. Finish with a short markdown report:
   - 已生成的文件清单（树状）
   - 启动命令（`blueprint preview <output>/index.html` 或 `pnpm install && pnpm dev`）
   - 下一步建议（写主题内容、替换占位）

## 发布

不要自动发布。只有用户检查预览后明确要求发布，才使用 Cloudflare Workers Static Assets：

- `pitch` / `briefing` / `prototype-lite`：`blueprint deploy <output>/index.html --name <worker-name>`
- `archive` single-file deploy: `blueprint deploy <output>/index.html --name <worker-name>`
- `prototype-full` / `dossier`：先在项目内执行 `pnpm install && pnpm build`，再执行 `blueprint deploy <output>/dist --name <worker-name>`

不要询问 `worker-name`。根据发布文件所在位置自动生成：

- 位于 Git 仓库内：`<repo-name>-<task-name>`
- 不在 Git 仓库内：`<task-name>`

`repo-name` 取最近 Git 根目录的目录名；`task-name` 根据当前任务或输出用途生成简短稳定的 slug。整体转为小写，把非字母数字字符压成 `-`，去掉首尾 `-`，并确保不超过 63 个字符。用户明确指定完整名称时以用户输入为准。

By default omit `--account`. The CLI reuses the project's recorded account, `CLOUDFLARE_ACCOUNT_ID`, or the only available account, in that order; only when none of those uniquely resolve an account, and the account also cannot be safely inferred from the current repo and task context, ask the user and append `--account <name-or-id>`. After a successful verified publish, the CLI writes the account, Worker name, and URL back to `.blueprint.json`. Return the `Published` URL to the user.

## Project discovery

- Current directory: `blueprint list`
- Specific directory: `blueprint list --root <path>`
- Machine-readable output: append `--json` to the commands above

Project paths come from scan results; do not write absolute paths into `.blueprint.json`. `deployed` means blueprint recorded a successful, URL-verified publish; if the remote is deleted externally, the local record does not disappear automatically.

**不要**：
- 不要自动 `git init` / `pnpm install` / 起 dev server —— 让用户自己来
- 不要生成 README 之外的额外 docs（如 ARCHITECTURE.md、CONTRIBUTING.md）
- 不要加 ESLint / Prettier / Husky 等用户没要的工具
- 不要写代码注释（遵循适用的仓库规则）
- 不要把 `pitch` / `briefing` 的 `src/*.html` 当成可直接打开的页面；只预览编译后的根目录 `index.html`
- Do not treat `archive` `src/` contents as openable pages; preview only the compiled root `index.html`
- `briefing` 不要默认生成 CTA / Contact / 请示拍板页
- `pitch` / `briefing` 的键盘切页、右侧 `.deck-rail`、播放进度与移动端导航由 compiler 注入；不要在语义源重复实现

## 加新 Preset

用户说"我要加一个新的 X 风格"时：

1. 在 `presets/` 下新建 `<name>.md`
2. 必须复用 `shared/design-system.md` 的 token —— 如需新 token 先升级 shared，再在 preset 里引用；若是独立皮肤则加 `shared/themes/<name>.md`
3. 在本 SKILL.md 的 Step 1 options 列表里加上新名字
4. 在 Step 2 推荐规则表里补关键词

## 文件布局

```
<skill-root>/blueprint/
├── SKILL.md                       # 本文件
├── shared/
│   ├── design-system.md           # 默认 token + 字体 + 共用规范
│   └── themes/
│       ├── briefing.md            # briefing only theme (slide deck)
│       └── win98-web.md           # archive theme (Win95/98 Web)
└── presets/
    ├── archive.md                 # archive compiler source contract
    ├── pitch.md                   # pitch compiler source contract
    ├── prototype.md               # prototype-lite / prototype-full scaffold contract
    ├── dossier.md                 # dossier scaffold contract
    └── briefing.md                # briefing compiler source contract
```
