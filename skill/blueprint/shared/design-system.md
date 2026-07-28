# blueprint Shared Design System

所有 preset **必须**遵守这套 token，除非该 preset 指定了 theme 文件。
当前例外：`briefing` → 额外遵守 `shared/themes/briefing.md`（以 theme 的 `:root` 与 slide 组件为准；本文件的字体族与反模式仍适用）。

新 preset 想引入新 token：能共享的先升级本文件；仅某 preset 使用的放进 `shared/themes/<name>.md`。

## Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;family=Noto+Sans+SC:wght@400;500;700;900&amp;display=swap" rel="stylesheet">
```

- Sans: `Inter, "Noto Sans SC", system-ui, sans-serif`
- Mono: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`
- Body: 16px / line-height 1.5
- Font features: `'ss01', 'cv11'`
- Antialiased: `-webkit-font-smoothing: antialiased`

## Color Tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#ffffff` | Primary background |
| `bg-subtle` | `#fafafa` | Section alternate / canvas |
| `bg-muted` | `#f5f5f5` | Cards on subtle bg |
| `fg` | `#0a0a0a` | Primary text |
| `fg-muted` | `#525252` | Secondary text |
| `fg-subtle` | `#a3a3a3` | Tertiary text / captions |
| `border` | `#e7e7e7` | Default border |
| `border-strong` | `#d4d4d4` | Emphasized border |
| `accent` | `#2563eb` | Primary accent (blue) |
| `accent-soft` | `#dbeafe` | Accent background |
| `accent-ultra` | `#eff6ff` | Accent ultra-light |
| `highlight` | `#fef08a` | Inline highlight (yellow) |

Vendor accent palette (用于多方对比类内容)：

| Vendor slot | Color |
|---|---|
| Slot A | `#0f766e` (teal) |
| Slot B | `#c2410c` (orange) |
| Slot C | `#2563eb` (blue) |
| Slot D | `#7c3aed` (purple) |

## Spacing & Layout

- Section padding: `110px 48px 72px` (top-bottom 大留白是叙事关键)
- Section max-width: `1280px`，narrow 模式 `960px`
- Card border-radius: `6-8px`（保持克制，不用 16px+ 的圆角）
- Shadow: `0 18px 60px -32px rgba(15, 23, 42, 0.32)` —— 仅用于浮起重点卡

## Tailwind CSS 4 Theme Snippet

```css
@theme {
  --font-sans: Inter, "Noto Sans SC", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --color-bg: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-bg-muted: #f5f5f5;
  --color-card: #ffffff;
  --color-fg: #0a0a0a;
  --color-fg-muted: #525252;
  --color-fg-subtle: #a3a3a3;
  --color-line: #e7e7e7;
  --color-line-soft: #f0f0f0;
  --color-line-strong: #d4d4d4;
  --color-accent: #2563eb;
  --color-accent-soft: #dbeafe;
  --color-accent-ultra: #eff6ff;
  --color-highlight: #fef08a;
  --shadow-lift: 0 18px 60px -32px rgba(15, 23, 42, 0.32);
}
```

## Common Utility Classes

- `.mono` → 切换到 JetBrains Mono
- `.canvas-bg` → 浅网格背景（用于 prototype/dossier 的画布区）：
  ```css
  background-color: #fafafa;
  background-image:
    linear-gradient(rgba(10,10,10,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,10,10,0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  ```
- `.bg-grid` → 圆点背景（pitch 用）：
  ```css
  background-image: radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0);
  background-size: 24px 24px;
  ```

## Iconography

- React 项目实际需要图标时才加 `lucide-react`；单文件 HTML 用 inline SVG
- 风格：1.5px stroke，18-20px 尺寸，跟正文颜色 `currentColor`

## Motion

- 默认用 CSS transition；只有生成物确实需要编排式 React 动效时才加 `framer-motion`
- 默认 transition：`duration: 0.4, ease: [0.22, 1, 0.36, 1]`
- 滚动入场：`opacity 0→1, y 16→0`，单次触发
- 不用弹簧/夸张动效，企业级克制感优先

## 排版规则

- 标题字重 700-900；英文标题默认 `letter-spacing: -0.02em`，不要把英文负字距套到中文
- 中英混排时正文用 `font-feature-settings: 'ss01'` 改善 Inter 数字观感
- Mono 用于：版本号、时间戳、代码片段、数据指标、技术术语 inline
- Highlight 用 `.highlight` 包裹关键短语（黄色背景），每段最多 1 处

中文页面用语言作用域覆盖排版，不影响英文页面和 `.mono`：

```css
html:lang(zh-CN) body { line-height: 1.65; letter-spacing: 0.012em; }
html:lang(zh-CN) h1 { letter-spacing: 0.005em; line-height: 1.08; }
html:lang(zh-CN) h2 { letter-spacing: 0.008em; line-height: 1.13; }
html:lang(zh-CN) h3 { letter-spacing: 0.012em; }
html:lang(zh-CN) p { line-height: 1.75; }
html:lang(zh-CN) .mono { letter-spacing: 0; }
```

## Slide 原语（briefing）

全屏说明页使用 `section.slide` 体系，细节与 CSS 以 `shared/themes/briefing.md` 为准。类名约定：

- `.slide` / `.slide-inner` / `.slide-tag` / `.slide-num`
- `.cover` / `.section-divider` / `.alt`
- `.matrix` / `.stage-row` / `.stage` / `.checklist` / `.callout` / `.card-grid`

`pitch` **不要**改用这套 slide chrome（保持自身 section 叙事）。

## 反模式（不要做）

- ❌ 大圆角（16px+）— 跟克制企业感冲突
- ❌ 渐变作主色 — 只在 Slot D/特殊 hero 用
- ❌ Emoji 当图标 — 用 Lucide
- ❌ 投影过重 — 仅 `boxShadow.lift` 一档
- ❌ 多种字体族 — 默认只 Inter + JetBrains Mono + Noto Sans SC；`briefing` 可额外用 Noto Serif SC（仅 `.serif`）
- ❌ `briefing` 默认 CTA / 请示拍板收尾
- ❌ 把 `pitch` 的营销 section 顺序套到 `briefing`
