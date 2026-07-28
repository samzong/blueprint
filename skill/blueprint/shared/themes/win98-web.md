# Theme: win98-web

`archive` uses a Windows 95/98 Classic-inspired Web document shell. It is a browser-native editorial theme, not an operating-system replica.

## Visual contract

- Canvas: `#c0c0c0`
- Sidebar: `#e0e0e0`
- Controls: `#d8d8d8` with native-looking `outset`, `inset`, and `ridge` borders
- Active document: `#000080` background with white text
- Links: browser blue `#0000ee`
- Article: white inset panel
- Body copy: Times New Roman
- Headings and navigation: Arial / Helvetica
- Code: Courier New; block code is black with green text
- Corners remain square; do not add gradients, modern shadows, glass effects, pill controls, or rounded cards

## Layout contract

- Desktop: sticky `280px` document rail plus fluid article
- Mobile below `820px`: rail stacks above the article and is capped at `45vh`
- Document buttons remain full-width, left-aligned, and visibly pressed/selected
- Tables and code blocks scroll horizontally instead of widening the page

## Interaction contract

- Search filters document titles and paths immediately
- Navigation uses hash routes so direct links and reloads work under `gofs` and single-file deployment
- Download produces a ZIP with the original relative Markdown paths
- Mermaid stays optional and loads only when the active document contains a diagram
