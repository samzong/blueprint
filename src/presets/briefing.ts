import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { escapeHtml, language, optionalFile, parseObject, requiredString, validateFragment } from "./shared.ts";

type BriefingConfig = {
  lang: string;
  title: string;
};

function parseConfig(raw: string, filename: string): BriefingConfig {
  const config = parseObject(raw, filename);
  return {
    title: requiredString(config, "title", filename),
    lang: language(config, filename),
  };
}

export function validateSlideChrome(content: string, filename: string): void {
  const slides =
    content.match(/<section\b[^>]*\bclass=(["'])[^"']*\bslide\b[^"']*\1[^>]*>[\s\S]*?<\/section>/gi) ?? [];
  if (slides.length < 4) throw new Error(`${filename}: expected a cover and at least three content slides`);
  if (!slides.some((slide) => /\bclass=(["'])[^"']*\bcover\b[^"']*\1/i.test(slide))) {
    throw new Error(`${filename}: missing cover slide`);
  }
  for (const [index, slide] of slides.entries()) {
    if (!/\bclass=(["'])[^"']*\bslide-tag\b[^"']*\1/i.test(slide)) {
      throw new Error(`${filename}: slide ${index + 1} is missing .slide-tag`);
    }
    if (!/\bclass=(["'])[^"']*\bslide-num\b[^"']*\1/i.test(slide)) {
      throw new Error(`${filename}: slide ${index + 1} is missing .slide-num`);
    }
  }
}

export function checkBriefingOutput(html: string, filename: string): void {
  validateSlideChrome(html, filename);
  if (!/\bdata-deck-selector=(["'])\.slide\1/i.test(html)) {
    throw new Error(`${filename}: missing data-deck-selector=".slide"`);
  }
}

function validateSlides(content: string, filename: string): void {
  validateFragment(content, filename);
  validateSlideChrome(content, filename);
}

export async function createBriefing(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceDirectory = path.join(projectDirectory, "src");
  const configFile = path.join(sourceDirectory, "briefing.json");
  const slidesFile = path.join(sourceDirectory, "slides.html");
  const customCssFile = path.join(sourceDirectory, "style.css");
  const [configRaw, slides, customCss, tokens, deckCss, briefingCss, deckRuntime] = await Promise.all([
    readFile(configFile, "utf8"),
    readFile(slidesFile, "utf8"),
    optionalFile(customCssFile),
    readFile(new URL("../shared/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.css", import.meta.url), "utf8"),
    readFile(new URL("./briefing.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.js", import.meta.url), "utf8"),
  ]);

  const config = parseConfig(configRaw, configFile);
  validateSlides(slides, slidesFile);
  if (/<\/style/i.test(customCss)) throw new Error(`${customCssFile}: contains </style`);

  const document = `<!DOCTYPE html>
<html lang="${escapeHtml(config.lang)}" data-deck-selector=".slide" data-deck-progress-host="body" data-deck-next-label="下一页">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=Noto+Sans+SC:wght@300;400;500;600;700;900&amp;family=Noto+Serif+SC:wght@500;600;700&amp;display=swap" rel="stylesheet">
<style>
${tokens.trim()}
${deckCss.trim()}
${briefingCss.trim()}
${customCss.trim()}
</style>
</head>
<body>
${slides.trim()}
<script>
${deckRuntime.trim()}
</script>
</body>
</html>
`;

  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, document);
  return outputFile;
}
